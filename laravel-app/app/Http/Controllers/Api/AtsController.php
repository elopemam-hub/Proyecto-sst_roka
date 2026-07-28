<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Ats;
use App\Models\AtsTarea;
use App\Models\AtsPeligro;
use App\Models\AtsControl;
use App\Models\AtsParticipante;
use App\Models\PermisoTrabajo;
use App\Services\AuditoriaService;
use App\Services\FirmaService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class AtsController extends Controller
{
    public function __construct(
        private AuditoriaService $auditoria,
        private FirmaService $firmaService
    ) {}

    /**
     * GET /api/ats
     */
    public function index(Request $request): JsonResponse
    {
        $query = Ats::where('empresa_id', $request->user()->empresa_id)
            ->with(['area:id,nombre', 'supervisor:id,nombres,apellidos']);

        if ($request->filled('estado'))       $query->where('estado', $request->estado);
        if ($request->filled('nivel_riesgo')) $query->where('nivel_riesgo', $request->nivel_riesgo);
        if ($request->filled('area_id'))      $query->where('area_id', $request->area_id);
        if ($request->filled('fecha_desde'))  $query->where('fecha_ejecucion', '>=', $request->fecha_desde);
        if ($request->filled('fecha_hasta'))  $query->where('fecha_ejecucion', '<=', $request->fecha_hasta);

        return response()->json($query->orderByDesc('fecha_ejecucion')->paginate(20));
    }

    // ─── Helpers privados ────────────────────────────────────────────────────

    private function normalizarInput(array $input): array
    {
        if (!isset($input['titulo_trabajo']) && isset($input['titulo']))
            $input['titulo_trabajo'] = $input['titulo'];
        if (!isset($input['descripcion']) && isset($input['descripcion_trabajo']))
            $input['descripcion'] = $input['descripcion_trabajo'];
        if (!isset($input['fecha_ejecucion']) && isset($input['fecha_trabajo']))
            $input['fecha_ejecucion'] = $input['fecha_trabajo'];
        if (!isset($input['supervisor_id']) && isset($input['supervisor_responsable_id']))
            $input['supervisor_id'] = $input['supervisor_responsable_id'];
        if (!isset($input['requiere_permiso_especial']) && isset($input['requiere_permiso_trabajo']))
            $input['requiere_permiso_especial'] = $input['requiere_permiso_trabajo'];

        if (isset($input['tareas'])) {
            $input['tareas'] = array_map(function ($t) {
                if (!isset($t['descripcion_tarea']) && isset($t['descripcion']))
                    $t['descripcion_tarea'] = $t['descripcion'];
                return $t;
            }, $input['tareas']);
        }

        if (empty($input['nivel_riesgo'])) {
            $sevToNivel = ['leve' => 'bajo', 'moderada' => 'medio', 'grave' => 'alto', 'muy_grave' => 'critico'];
            $niveles    = ['bajo' => 1, 'medio' => 2, 'alto' => 3, 'critico' => 4];
            $max = 'bajo';
            foreach ($input['tareas'] ?? [] as $t) {
                foreach ($t['peligros'] ?? [] as $p) {
                    $nr = isset($p['severidad']) ? ($sevToNivel[$p['severidad']] ?? 'bajo') : ($p['nivel_riesgo'] ?? 'bajo');
                    if (($niveles[$nr] ?? 0) > ($niveles[$max] ?? 0)) $max = $nr;
                }
            }
            $input['nivel_riesgo'] = $max ?: 'medio';
        }

        return $input;
    }

    private function reglasValidacion(): array
    {
        return [
            'area_id'                    => 'nullable|exists:areas,id',
            'iperc_id'                   => 'nullable|exists:iperc,id',
            'titulo_trabajo'             => 'required|string|max:255',
            'descripcion'                => 'nullable|string',
            'ubicacion'                  => 'nullable|string|max:255',
            'fecha_ejecucion'            => 'required|date',
            'hora_inicio'                => 'nullable|date_format:H:i',
            'hora_fin'                   => 'nullable|date_format:H:i',
            'nivel_riesgo'               => ['required', Rule::in(['bajo','medio','alto','critico'])],
            'requiere_permiso_especial'  => 'boolean',
            'tipos_permiso'              => 'nullable|array',
            'epps_requeridos'            => 'nullable|array',
            'supervisor_id'              => 'nullable|exists:personal,id',
            'tareas'                     => 'required|array|min:1',
            'tareas.*.descripcion_tarea' => 'required|string',
            'tareas.*.peligros'          => 'nullable|array',
            'tareas.*.peligros.*.tipo_peligro' => 'nullable|string',
            'tareas.*.peligros.*.descripcion'  => 'nullable|string',
            'tareas.*.peligros.*.riesgo'       => 'nullable|string',
            'tareas.*.peligros.*.severidad'    => 'nullable|string',
            'tareas.*.peligros.*.probabilidad' => 'nullable|integer|min:1|max:4',
            'tareas.*.controles'               => 'nullable|array',
            'tareas.*.controles.*.tipo_control' => 'nullable|string',
            'tareas.*.controles.*.descripcion'  => 'nullable|string',
            'participantes'               => 'required|array|min:1',
            'participantes.*.personal_id' => 'required|exists:personal,id',
            'participantes.*.rol'         => ['nullable', Rule::in(['supervisor','ejecutor','observador','ayudante'])],
        ];
    }

    private function crearTareasConPeligros(int $atsId, array $tareas): void
    {
        foreach ($tareas as $idx => $tareaData) {
            $peligrosArr  = $tareaData['peligros']  ?? [];
            $controlesArr = $tareaData['controles'] ?? [];

            // Resumen en texto para campos legacy
            $peligrosTexto = null;
            if (!empty($peligrosArr)) {
                $lines = array_filter(array_map(fn($p) =>
                    !empty($p['descripcion'])
                        ? '[' . strtoupper($p['tipo_peligro'] ?? 'OTRO') . '] ' . ($p['descripcion']) . ': ' . ($p['riesgo'] ?? '')
                        : null,
                    $peligrosArr
                ));
                $peligrosTexto = !empty($lines) ? implode("\n", $lines) : null;
            }

            $medidasArr = [];
            foreach ($controlesArr as $c) {
                if (!empty($c['descripcion']))
                    $medidasArr[] = '[' . strtoupper($c['tipo_control'] ?? 'ADM') . '] ' . $c['descripcion'];
            }
            $medidasTexto = !empty($medidasArr) ? implode("\n", $medidasArr) : null;

            $tarea = AtsTarea::create([
                'ats_id'             => $atsId,
                'orden'              => $idx,
                'descripcion_tarea'  => $tareaData['descripcion_tarea'],
                'peligros_asociados' => $peligrosTexto,
                'medidas_control'    => $medidasTexto,
            ]);

            foreach ($peligrosArr as $peligroData) {
                if (empty($peligroData['descripcion'])) continue;
                AtsPeligro::create([
                    'ats_tarea_id' => $tarea->id,
                    'tipo_peligro' => $peligroData['tipo_peligro'] ?? 'otro',
                    'descripcion'  => $peligroData['descripcion'],
                    'riesgo'       => $peligroData['riesgo'] ?? '',
                    'severidad'    => $peligroData['severidad'] ?? 'leve',
                    'probabilidad' => $peligroData['probabilidad'] ?? 1,
                ]);
            }

            foreach ($controlesArr as $controlData) {
                if (empty($controlData['descripcion'])) continue;
                AtsControl::create([
                    'ats_tarea_id' => $tarea->id,
                    'tipo_control' => $controlData['tipo_control'] ?? 'administrativo',
                    'descripcion'  => $controlData['descripcion'],
                    'implementado' => $controlData['implementado'] ?? false,
                ]);
            }
        }
    }

    // ─── CRUD ────────────────────────────────────────────────────────────────

    /**
     * POST /api/ats
     */
    public function store(Request $request): JsonResponse
    {
        $input = $this->normalizarInput($request->all());
        $request->replace($input);

        $validated = $request->validate($this->reglasValidacion());
        $usuario   = $request->user();

        $ats = DB::transaction(function () use ($validated, $usuario) {
            $ats = Ats::create([
                'empresa_id'               => $usuario->empresa_id,
                'area_id'                  => $validated['area_id']   ?? null,
                'iperc_id'                 => $validated['iperc_id']  ?? null,
                'codigo'                   => Ats::generarCodigo($usuario->empresa_id, $validated['area_id'] ?? null),
                'titulo_trabajo'           => $validated['titulo_trabajo'],
                'descripcion'              => $validated['descripcion']  ?? null,
                'ubicacion'                => $validated['ubicacion']    ?? null,
                'fecha_ejecucion'          => $validated['fecha_ejecucion'],
                'hora_inicio'              => $validated['hora_inicio']  ?? null,
                'hora_fin'                 => $validated['hora_fin']     ?? null,
                'nivel_riesgo'             => $validated['nivel_riesgo'],
                'requiere_permiso_especial'=> $validated['requiere_permiso_especial'] ?? false,
                'tipos_permiso'            => $validated['tipos_permiso']   ?? [],
                'epps_requeridos'          => $validated['epps_requeridos'] ?? null,
                'supervisor_id'            => $validated['supervisor_id'] ?? null,
                'elaborado_por'            => $usuario->id,
                'estado'                   => 'borrador',
            ]);

            $this->crearTareasConPeligros($ats->id, $validated['tareas']);

            foreach ($validated['participantes'] as $part) {
                AtsParticipante::create([
                    'ats_id'      => $ats->id,
                    'personal_id' => $part['personal_id'],
                    'rol'         => $part['rol'] ?? 'ejecutor',
                ]);
            }

            return $ats;
        });

        $this->auditoria->registrar(
            modulo: 'ats',
            accion: 'crear',
            usuario: $usuario,
            modelo: 'Ats',
            modeloId: $ats->id,
            valorNuevo: ['codigo' => $ats->codigo, 'nivel_riesgo' => $ats->nivel_riesgo],
            request: $request
        );

        return response()->json(
            $ats->load(['tareas.peligros', 'tareas.controles', 'participantes.personal:id,nombres,apellidos', 'area', 'supervisor']),
            201
        );
    }

    /**
     * GET /api/ats/{id}
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $ats = Ats::where('empresa_id', $request->user()->empresa_id)
            ->with([
                'area', 'supervisor:id,nombres,apellidos,dni',
                'elaborador:id,nombre',
                'tareas.peligros', 'tareas.controles',
                'participantes.personal:id,nombres,apellidos,dni',
                'permisos', 'iperc:id,codigo,titulo',
                'firmas' => fn($q) => $q->where('rechazada', false)->with('usuario:id,nombre'),
            ])
            ->findOrFail($id);

        return response()->json($ats);
    }

    /**
     * PUT /api/ats/{id}
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $input = $this->normalizarInput($request->all());
        $request->replace($input);

        $validated = $request->validate($this->reglasValidacion());
        $usuario   = $request->user();

        $ats = Ats::where('empresa_id', $usuario->empresa_id)->findOrFail($id);

        if (!in_array($ats->estado, ['borrador', 'pendiente_firma'])) {
            return response()->json(['message' => 'Solo se puede editar un ATS en borrador o pendiente de firma.'], 422);
        }

        $ats = DB::transaction(function () use ($ats, $validated) {
            $ats->update([
                'area_id'                  => $validated['area_id']   ?? $ats->area_id,
                'iperc_id'                 => $validated['iperc_id']  ?? $ats->iperc_id,
                'titulo_trabajo'           => $validated['titulo_trabajo'],
                'descripcion'              => $validated['descripcion']  ?? null,
                'ubicacion'                => $validated['ubicacion']    ?? null,
                'fecha_ejecucion'          => $validated['fecha_ejecucion'],
                'hora_inicio'              => $validated['hora_inicio']  ?? null,
                'hora_fin'                 => $validated['hora_fin']     ?? null,
                'nivel_riesgo'             => $validated['nivel_riesgo'],
                'requiere_permiso_especial'=> $validated['requiere_permiso_especial'] ?? false,
                'tipos_permiso'            => $validated['tipos_permiso']   ?? [],
                'epps_requeridos'          => $validated['epps_requeridos'] ?? null,
                'supervisor_id'            => $validated['supervisor_id'] ?? null,
            ]);

            // Eliminar y recrear tareas (cascade elimina peligros y controles)
            $ats->tareas()->delete();
            $this->crearTareasConPeligros($ats->id, $validated['tareas']);

            // Eliminar y recrear participantes
            $ats->participantes()->delete();
            foreach ($validated['participantes'] as $part) {
                AtsParticipante::create([
                    'ats_id'      => $ats->id,
                    'personal_id' => $part['personal_id'],
                    'rol'         => $part['rol'] ?? 'ejecutor',
                ]);
            }

            return $ats->fresh();
        });

        $this->auditoria->registrar(
            modulo: 'ats',
            accion: 'actualizar',
            usuario: $usuario,
            modelo: 'Ats',
            modeloId: $ats->id,
            valorNuevo: ['titulo_trabajo' => $ats->titulo_trabajo, 'nivel_riesgo' => $ats->nivel_riesgo],
            request: $request
        );

        return response()->json(
            $ats->load(['tareas.peligros', 'tareas.controles', 'participantes.personal:id,nombres,apellidos', 'area', 'supervisor'])
        );
    }

    /**
     * DELETE /api/ats/{id}
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $ats = Ats::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);

        if (!in_array($ats->estado, ['borrador', 'cancelado'])) {
            return response()->json(['message' => 'Solo se puede eliminar un ATS en borrador o cancelado.'], 422);
        }

        $ats->delete();

        return response()->json(['message' => 'ATS eliminado correctamente.']);
    }

    /**
     * PATCH /api/ats/{id}/tareas/{tareaId}
     */
    public function actualizarEstadoTarea(Request $request, int $id, int $tareaId): JsonResponse
    {
        $validated = $request->validate([
            'estado_ejecucion' => ['required', Rule::in(['pendiente', 'ejecutada', 'omitida'])],
            'observaciones'    => 'nullable|string|max:500',
            'evidencia_foto'   => 'nullable|string', // base64 (data URI)
            'geo_lat'          => 'nullable|numeric|between:-90,90',
            'geo_lng'          => 'nullable|numeric|between:-180,180',
        ]);

        $ats = Ats::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);

        if ($ats->estado !== 'en_ejecucion') {
            return response()->json(['message' => 'El ATS debe estar en ejecución para registrar avance de tareas.'], 422);
        }

        $tarea = AtsTarea::where('ats_id', $id)->findOrFail($tareaId);

        $datos = [
            'estado_ejecucion' => $validated['estado_ejecucion'],
            'observaciones'    => $validated['observaciones'] ?? $tarea->observaciones,
            'geo_lat'          => $validated['geo_lat'] ?? $tarea->geo_lat,
            'geo_lng'          => $validated['geo_lng'] ?? $tarea->geo_lng,
        ];

        // Guardar foto de evidencia (base64 → archivo)
        if (!empty($validated['evidencia_foto'])) {
            $path = $this->guardarEvidenciaFoto($validated['evidencia_foto'], $ats->id, $tarea->id);
            if ($path) $datos['evidencia_foto'] = $path;
        }

        if ($validated['estado_ejecucion'] === 'ejecutada') {
            $datos['ejecutada_en'] = now();
        }

        $tarea->update($datos);

        return response()->json($tarea);
    }

    /**
     * GET /api/ats/estadisticas
     */
    public function estadisticas(Request $request): JsonResponse
    {
        $empresaId  = $request->user()->empresa_id;
        $hoy        = now()->toDateString();
        $mesInicio  = now()->startOfMonth()->toDateString();
        $en48h      = now()->addHours(48)->toDateString();

        $rows = Ats::where('empresa_id', $empresaId)
            ->selectRaw('estado, nivel_riesgo, fecha_ejecucion')
            ->get();

        $porEstado   = $rows->groupBy('estado')->map(fn($g) => $g->count());
        $porRiesgo   = $rows->groupBy('nivel_riesgo')->map(fn($g) => $g->count());
        $hoyCount    = $rows->filter(fn($r) => substr((string)($r->fecha_ejecucion ?? ''), 0, 10) === $hoy)->count();
        $mesCount    = $rows->filter(fn($r) => substr((string)($r->fecha_ejecucion ?? ''), 0, 10) >= $mesInicio)->count();
        $proximos    = $rows->filter(function ($r) use ($hoy, $en48h) {
            $f = substr((string)($r->fecha_ejecucion ?? ''), 0, 10);
            return $f >= $hoy && $f <= $en48h && !in_array($r->estado, ['cerrado', 'cancelado']);
        })->count();

        return response()->json([
            'total'        => $rows->count(),
            'por_estado'   => $porEstado,
            'por_riesgo'   => $porRiesgo,
            'hoy'          => $hoyCount,
            'este_mes'     => $mesCount,
            'proximos_48h' => $proximos,
            'en_curso'     => $porEstado['en_ejecucion']    ?? 0,
            'pendientes'   => $porEstado['pendiente_firma'] ?? 0,
            'criticos'     => $porRiesgo['critico']         ?? 0,
            'autorizados'  => $porEstado['autorizado']      ?? 0,
        ]);
    }

    /**
     * GET /api/ats/analitica — Indicadores avanzados del módulo ATS
     */
    public function analitica(Request $request): JsonResponse
    {
        $empresaId = $request->user()->empresa_id;

        $ats = Ats::where('empresa_id', $empresaId)
            ->with('area:id,nombre')
            ->get(['id', 'area_id', 'estado', 'nivel_riesgo', 'tipos_permiso', 'fecha_ejecucion', 'created_at', 'autorizado_en']);

        // Tendencia mensual (últimos 6 meses)
        $tendencia = [];
        for ($i = 5; $i >= 0; $i--) {
            $mes = now()->subMonths($i);
            $key = $mes->format('Y-m');
            $tendencia[$key] = [
                'mes'   => $mes->translatedFormat('M'),
                'total' => 0,
                'cerrados' => 0,
            ];
        }
        foreach ($ats as $a) {
            $key = substr((string) $a->fecha_ejecucion, 0, 7);
            if (isset($tendencia[$key])) {
                $tendencia[$key]['total']++;
                if ($a->estado === 'cerrado') $tendencia[$key]['cerrados']++;
            }
        }

        // Por tipo de permiso (desde el JSON tipos_permiso)
        $porTipoPermiso = [];
        foreach ($ats as $a) {
            foreach (($a->tipos_permiso ?? []) as $tp) {
                $porTipoPermiso[$tp] = ($porTipoPermiso[$tp] ?? 0) + 1;
            }
        }
        arsort($porTipoPermiso);

        // Por área
        $porArea = $ats->groupBy(fn($a) => $a->area?->nombre ?? 'Sin área')
            ->map(fn($g) => $g->count())
            ->sortDesc();

        // Por nivel de riesgo
        $porRiesgo = $ats->groupBy('nivel_riesgo')->map(fn($g) => $g->count());

        // Tiempo medio de autorización (horas): created_at → autorizado_en
        $conAutorizacion = $ats->filter(fn($a) => $a->autorizado_en && $a->created_at);
        $tiempoMedioHoras = $conAutorizacion->count() > 0
            ? round($conAutorizacion->avg(fn($a) => $a->created_at->diffInHours($a->autorizado_en)), 1)
            : null;

        // Tasa de cierre (cerrados / no cancelados)
        $noCancelados = $ats->where('estado', '!=', 'cancelado')->count();
        $cerrados     = $ats->where('estado', 'cerrado')->count();
        $tasaCierre   = $noCancelados > 0 ? round($cerrados / $noCancelados * 100) : 0;

        return response()->json([
            'tendencia'           => array_values($tendencia),
            'por_tipo_permiso'    => $porTipoPermiso,
            'por_area'            => $porArea,
            'por_riesgo'          => $porRiesgo,
            'tiempo_medio_horas'  => $tiempoMedioHoras,
            'tasa_cierre'         => $tasaCierre,
            'total'               => $ats->count(),
        ]);
    }

    /**
     * GET /api/ats/alertas
     */
    public function alertas(Request $request): JsonResponse
    {
        $empresaId = $request->user()->empresa_id;
        $hoy       = now()->toDateString();

        $proximos = now()->addDays(7)->toDateString();

        $base = Ats::where('empresa_id', $empresaId)
            ->with(['area:id,nombre', 'supervisor:id,nombres,apellidos']);

        // ATS programados en los próximos 7 días sin firmas completas
        $sinFirmasHoy = (clone $base)
            ->whereDate('fecha_ejecucion', '>=', $hoy)
            ->whereDate('fecha_ejecucion', '<=', $proximos)
            ->whereIn('estado', ['borrador', 'pendiente_firma'])
            ->orderBy('fecha_ejecucion')
            ->get(['id', 'codigo', 'titulo_trabajo', 'area_id', 'supervisor_id', 'fecha_ejecucion', 'hora_inicio', 'estado']);

        // ATS autorizados que aún no han iniciado
        $autorizadosParados = (clone $base)
            ->where('estado', 'autorizado')
            ->orderBy('fecha_ejecucion')
            ->get(['id', 'codigo', 'titulo_trabajo', 'area_id', 'fecha_ejecucion', 'hora_inicio']);

        // ATS en ejecución sin cerrar (cualquier fecha)
        $enEjecucionLarga = (clone $base)
            ->where('estado', 'en_ejecucion')
            ->orderBy('fecha_ejecucion')
            ->get(['id', 'codigo', 'titulo_trabajo', 'area_id', 'fecha_ejecucion', 'hora_inicio']);

        // ATS de riesgo alto o crítico aún activos
        $criticosActivos = (clone $base)
            ->whereIn('nivel_riesgo', ['alto', 'critico'])
            ->whereNotIn('estado', ['cerrado', 'cancelado'])
            ->orderBy('fecha_ejecucion')
            ->get(['id', 'codigo', 'titulo_trabajo', 'area_id', 'estado', 'nivel_riesgo', 'fecha_ejecucion']);

        return response()->json([
            'sin_firmas_hoy'      => $sinFirmasHoy,
            'autorizados_parados' => $autorizadosParados,
            'en_ejecucion_larga'  => $enEjecucionLarga,
            'criticos_activos'    => $criticosActivos,
            'total_alertas'       => $sinFirmasHoy->count()
                + $autorizadosParados->count()
                + $enEjecucionLarga->count()
                + $criticosActivos->count(),
        ]);
    }

    /**
     * POST /api/ats/{id}/autorizar
     */
    public function autorizar(Request $request, int $id): JsonResponse
    {
        $ats = Ats::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);

        if ($ats->estado !== 'pendiente_firma') {
            return response()->json(['message' => 'Solo un ATS pendiente de firma puede autorizarse.'], 422);
        }

        // PETAR obligatorio: si el trabajo requiere permiso especial, todos los permisos deben estar aprobados
        if ($ats->requiere_permiso_especial) {
            $permisos = $ats->permisos()->get();
            if ($permisos->isEmpty()) {
                return response()->json(['message' => 'Este ATS requiere permiso de trabajo (PETAR). Registre y apruebe los permisos antes de autorizar.'], 422);
            }
            $noAprobados = $permisos->where('estado', '!=', 'aprobado');
            if ($noAprobados->isNotEmpty()) {
                return response()->json([
                    'message' => 'No se puede autorizar: hay permisos de trabajo sin aprobar (' . $noAprobados->count() . ').',
                ], 422);
            }
        }

        $ats->update([
            'estado'       => 'autorizado',
            'autorizado_en'=> now(),
        ]);

        $this->auditoria->registrar(
            modulo: 'ats',
            accion: 'autorizar',
            usuario: $request->user(),
            modelo: 'Ats',
            modeloId: $ats->id,
            valorNuevo: ['estado' => 'autorizado'],
            request: $request
        );

        return response()->json(['message' => 'ATS autorizado. Ya puede iniciarse la ejecución.']);
    }

    /**
     * POST /api/ats/{id}/iniciar
     */
    public function iniciarEjecucion(Request $request, int $id): JsonResponse
    {
        $ats = Ats::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);

        if ($ats->estado !== 'autorizado') {
            return response()->json(['message' => 'Solo un ATS autorizado puede iniciarse.'], 422);
        }

        $validated = $request->validate([
            'charla_seguridad' => 'nullable|string|max:2000',
        ]);

        $ats->update([
            'estado'           => 'en_ejecucion',
            'charla_seguridad' => $validated['charla_seguridad'] ?? null,
        ]);

        $this->auditoria->registrar(
            modulo: 'ats',
            accion: 'iniciar_ejecucion',
            usuario: $request->user(),
            modelo: 'Ats',
            modeloId: $ats->id,
            valorNuevo: ['estado' => 'en_ejecucion'],
            request: $request
        );

        return response()->json(['message' => 'Ejecución iniciada. Los trabajadores pueden comenzar.']);
    }

    /**
     * POST /api/ats/{id}/detener — Parar el trabajo (stop work)
     */
    public function detener(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'motivo_detencion' => 'required|string|min:5|max:500',
        ]);

        $ats = Ats::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);

        if ($ats->estado !== 'en_ejecucion') {
            return response()->json(['message' => 'Solo se puede detener un ATS en ejecución.'], 422);
        }

        $ats->update([
            'detenido'         => true,
            'detenido_en'      => now(),
            'motivo_detencion' => $validated['motivo_detencion'],
        ]);

        $this->auditoria->registrar(
            modulo: 'ats', accion: 'detener', usuario: $request->user(),
            modelo: 'Ats', modeloId: $ats->id,
            valorNuevo: ['motivo' => $validated['motivo_detencion']], request: $request
        );

        return response()->json(['message' => 'Trabajo detenido. Corrija la condición antes de reanudar.']);
    }

    /**
     * POST /api/ats/{id}/reanudar — Reanudar tras un stop work
     */
    public function reanudar(Request $request, int $id): JsonResponse
    {
        $ats = Ats::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);

        if (!$ats->detenido) {
            return response()->json(['message' => 'El ATS no está detenido.'], 422);
        }

        $ats->update(['detenido' => false, 'detenido_en' => null, 'motivo_detencion' => null]);

        return response()->json(['message' => 'Trabajo reanudado.']);
    }

    /**
     * POST /api/ats/{id}/participantes/{participanteId}/firmar
     * Registra la firma/asistencia de un participante en campo.
     */
    public function firmarParticipante(Request $request, int $id, int $participanteId): JsonResponse
    {
        $ats = Ats::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);

        if (!in_array($ats->estado, ['autorizado', 'pendiente_firma', 'en_ejecucion'])) {
            return response()->json(['message' => 'El ATS no admite firmas de participantes en este estado.'], 422);
        }

        $participante = AtsParticipante::where('ats_id', $id)->findOrFail($participanteId);
        $participante->update(['firmado_en' => now()]);

        return response()->json(['message' => 'Firma de participante registrada.', 'participante' => $participante]);
    }

    /**
     * Decodifica una imagen base64 (data URI) y la guarda; devuelve la URL pública.
     */
    private function guardarEvidenciaFoto(string $base64, int $atsId, int $tareaId): ?string
    {
        if (preg_match('/^data:image\/(\w+);base64,/', $base64, $m)) {
            $ext  = strtolower($m[1] === 'jpeg' ? 'jpg' : $m[1]);
            $data = base64_decode(substr($base64, strpos($base64, ',') + 1));
            if ($data === false) return null;
            $nombre = "ats_evidencias/ats{$atsId}_t{$tareaId}_" . time() . ".{$ext}";
            Storage::disk('public')->put($nombre, $data);
            return Storage::url($nombre);
        }
        return null;
    }

    /**
     * POST /api/ats/{id}/cancelar
     */
    public function cancelar(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'motivo_cancelacion' => 'nullable|string|max:500',
        ]);

        $ats = Ats::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);

        if (!in_array($ats->estado, ['borrador', 'pendiente_firma', 'autorizado'])) {
            return response()->json(['message' => 'No se puede cancelar un ATS en estado ' . $ats->estado . '.'], 422);
        }

        $ats->update([
            'estado'               => 'cancelado',
            'cerrado_por'          => $request->user()->id,
            'cerrado_en'           => now(),
            'observaciones_cierre' => $validated['motivo_cancelacion'] ?? null,
        ]);

        return response()->json(['message' => 'ATS cancelado.']);
    }

    /**
     * POST /api/ats/{id}/solicitar-firmas
     */
    public function solicitarFirmas(Request $request, int $id): JsonResponse
    {
        $ats = Ats::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);

        if ($ats->estado !== 'borrador') {
            return response()->json(['message' => 'Solo un ATS en borrador puede enviarse a firmas.'], 422);
        }

        $solicitud = $this->firmaService->crearSolicitud(
            documento: $ats,
            solicitadoPor: $request->user(),
            titulo: "ATS {$ats->codigo} — {$ats->titulo_trabajo}",
            diasLimite: 1
        );

        $ats->update(['estado' => 'pendiente_firma']);

        return response()->json(['message' => 'Solicitud de firmas creada.', 'solicitud' => $solicitud]);
    }

    /**
     * POST /api/ats/{id}/cerrar
     */
    public function cerrar(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'observaciones_cierre' => 'required|string|min:10',
            'hora_fin'             => 'required|date_format:H:i',
        ]);

        $ats = Ats::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);

        if ($ats->estado !== 'en_ejecucion') {
            return response()->json(['message' => 'Solo un ATS en ejecución puede cerrarse.'], 422);
        }

        $ats->update([
            'estado'               => 'cerrado',
            'hora_fin'             => $validated['hora_fin'],
            'cerrado_en'           => now(),
            'cerrado_por'          => $request->user()->id,
            'observaciones_cierre' => $validated['observaciones_cierre'],
        ]);

        return response()->json(['message' => 'ATS cerrado correctamente.']);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PETAR — Permisos de trabajo de alto riesgo
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Catálogo de requisitos verificables por tipo de permiso (checklist PETAR)
     */
    const REQUISITOS_PERMISO = [
        'trabajo_altura' => [
            'label' => 'Trabajo en altura (>1.8 m)',
            'requisitos' => [
                'Arnés de cuerpo entero certificado y en buen estado',
                'Línea de vida y puntos de anclaje verificados (>2268 kg)',
                'Personal con capacitación vigente en trabajo en altura',
                'Delimitación y señalización del área inferior',
                'Condiciones climáticas adecuadas (sin lluvia/viento fuerte)',
                'Escaleras/andamios inspeccionados y certificados',
            ],
        ],
        'espacios_confinados' => [
            'label' => 'Espacios confinados',
            'requisitos' => [
                'Monitoreo de atmósfera (O2, gases inflamables y tóxicos)',
                'Ventilación forzada operativa',
                'Vigía externo permanente asignado',
                'Medios y plan de rescate disponibles',
                'Bloqueo y etiquetado de energías (LOTO)',
                'Sistema de comunicación continuo',
            ],
        ],
        'trabajo_caliente' => [
            'label' => 'Trabajo en caliente (soldadura/corte)',
            'requisitos' => [
                'Extintor apropiado a menos de 8 m',
                'Retiro/protección de material combustible en 11 m',
                'Vigía contra incendios asignado',
                'EPP de soldadura completo',
                'Área señalizada y delimitada',
                'Verificación post-trabajo (30 min)',
            ],
        ],
        'trabajo_electrico' => [
            'label' => 'Trabajo eléctrico',
            'requisitos' => [
                'Bloqueo y etiquetado (LOTO) aplicado',
                'Verificación de ausencia de tensión',
                'EPP dieléctrico según nivel de tensión',
                'Herramientas aisladas certificadas',
                'Personal eléctrico autorizado',
                'Puesta a tierra temporal instalada',
            ],
        ],
        'izaje_cargas' => [
            'label' => 'Izaje de cargas',
            'requisitos' => [
                'Certificación vigente de grúa/equipo de izaje',
                'Inspección de eslingas, ganchos y accesorios',
                'Radio de operación delimitado y despejado',
                'Operador y rigger certificados',
                'Plan de izaje aprobado',
                'Condiciones de viento dentro de límite',
            ],
        ],
        'excavacion' => [
            'label' => 'Excavación',
            'requisitos' => [
                'Verificación de servicios enterrados (agua, gas, eléctrico)',
                'Entibado o talud según profundidad',
                'Señalización y barreras perimetrales',
                'Acceso seguro (escaleras cada 7.5 m)',
                'Monitoreo de estabilidad del terreno',
            ],
        ],
        'quimicos_peligrosos' => [
            'label' => 'Manejo de químicos peligrosos',
            'requisitos' => [
                'Hojas de seguridad (MSDS/SDS) disponibles',
                'EPP químico específico (guantes, respirador, etc.)',
                'Ventilación adecuada del área',
                'Kit antiderrame disponible',
                'Ducha y lavaojos de emergencia operativos',
            ],
        ],
        'radiaciones_ionizantes' => [
            'label' => 'Radiaciones ionizantes',
            'requisitos' => [
                'Dosímetro personal asignado',
                'Señalización de zona controlada',
                'Personal certificado en protección radiológica',
                'Blindaje y control de acceso',
                'Control de tiempo de exposición',
            ],
        ],
    ];

    /**
     * GET /api/ats/permisos/requisitos — Catálogo de checklists PETAR
     */
    public function requisitosPermiso(): JsonResponse
    {
        return response()->json(self::REQUISITOS_PERMISO);
    }

    /**
     * POST /api/ats/{id}/permisos — Crear un permiso de trabajo para el ATS
     */
    public function crearPermiso(Request $request, int $id): JsonResponse
    {
        $ats = Ats::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);

        $validated = $request->validate([
            'tipo_permiso'           => ['required', Rule::in(array_keys(self::REQUISITOS_PERMISO))],
            'fecha_validez'          => 'required|date',
            'hora_inicio_validez'    => 'required|date_format:H:i',
            'hora_fin_validez'       => 'required|date_format:H:i',
            'requisitos_cumplidos'   => 'nullable|array',
            'equipos_requeridos'     => 'nullable|string',
            'condiciones_especiales' => 'nullable|string',
        ]);

        $permiso = PermisoTrabajo::create([
            ...$validated,
            'ats_id'         => $ats->id,
            'codigo_permiso' => $this->generarCodigoPermiso($ats),
            'estado'         => 'solicitado',
        ]);

        return response()->json(['message' => 'Permiso creado.', 'permiso' => $permiso], 201);
    }

    /**
     * PUT /api/ats/permisos/{permisoId} — Actualizar checklist/datos del permiso
     */
    public function actualizarPermiso(Request $request, int $permisoId): JsonResponse
    {
        $permiso = $this->permisoDeEmpresa($request, $permisoId);

        if (in_array($permiso->estado, ['aprobado', 'cerrado'])) {
            return response()->json(['message' => 'No se puede modificar un permiso aprobado o cerrado.'], 422);
        }

        $validated = $request->validate([
            'fecha_validez'          => 'sometimes|date',
            'hora_inicio_validez'    => 'sometimes|date_format:H:i',
            'hora_fin_validez'       => 'sometimes|date_format:H:i',
            'requisitos_cumplidos'   => 'nullable|array',
            'equipos_requeridos'     => 'nullable|string',
            'condiciones_especiales' => 'nullable|string',
        ]);

        $permiso->update($validated);

        return response()->json(['message' => 'Permiso actualizado.', 'permiso' => $permiso->fresh()]);
    }

    /**
     * POST /api/ats/permisos/{permisoId}/aprobar — Aprobar el permiso (requiere checklist completo)
     */
    public function aprobarPermiso(Request $request, int $permisoId): JsonResponse
    {
        $permiso = $this->permisoDeEmpresa($request, $permisoId);

        if ($permiso->estado !== 'solicitado') {
            return response()->json(['message' => 'Solo un permiso solicitado puede aprobarse.'], 422);
        }

        // Todos los requisitos del catálogo deben estar marcados como cumplidos
        $catalogo   = self::REQUISITOS_PERMISO[$permiso->tipo_permiso]['requisitos'] ?? [];
        $cumplidos  = $permiso->requisitos_cumplidos ?? [];
        $faltantes  = array_filter($catalogo, fn($r) => empty($cumplidos[$r]));

        if (!empty($faltantes)) {
            return response()->json([
                'message'   => 'No se puede aprobar: faltan requisitos por verificar.',
                'faltantes' => array_values($faltantes),
            ], 422);
        }

        $permiso->update([
            'estado'       => 'aprobado',
            'aprobado_por' => $request->user()->id,
            'aprobado_en'  => now(),
        ]);

        return response()->json(['message' => 'Permiso aprobado.', 'permiso' => $permiso->fresh()]);
    }

    /**
     * DELETE /api/ats/permisos/{permisoId}
     */
    public function eliminarPermiso(Request $request, int $permisoId): JsonResponse
    {
        $permiso = $this->permisoDeEmpresa($request, $permisoId);

        if ($permiso->estado === 'aprobado') {
            return response()->json(['message' => 'No se puede eliminar un permiso aprobado.'], 422);
        }

        $permiso->delete();

        return response()->json(['message' => 'Permiso eliminado.']);
    }

    private function permisoDeEmpresa(Request $request, int $permisoId): PermisoTrabajo
    {
        return PermisoTrabajo::whereHas('ats', function ($q) use ($request) {
            $q->where('empresa_id', $request->user()->empresa_id);
        })->findOrFail($permisoId);
    }

    private function generarCodigoPermiso(Ats $ats): string
    {
        $anio  = now()->year;
        $count = PermisoTrabajo::whereHas('ats', fn($q) => $q->where('empresa_id', $ats->empresa_id))
            ->whereYear('created_at', $anio)->count() + 1;
        return sprintf('PETAR-%d-%04d', $anio, $count);
    }
}
