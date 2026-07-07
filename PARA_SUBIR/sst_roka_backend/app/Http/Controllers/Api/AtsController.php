<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Ats;
use App\Models\AtsTarea;
use App\Models\AtsPeligro;
use App\Models\AtsControl;
use App\Models\AtsParticipante;
use App\Services\AuditoriaService;
use App\Services\FirmaService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
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
        ]);

        $ats = Ats::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);

        if ($ats->estado !== 'en_ejecucion') {
            return response()->json(['message' => 'El ATS debe estar en ejecución para registrar avance de tareas.'], 422);
        }

        $tarea = AtsTarea::where('ats_id', $id)->findOrFail($tareaId);
        $tarea->update([
            'estado_ejecucion' => $validated['estado_ejecucion'],
            'observaciones'    => $validated['observaciones'] ?? null,
        ]);

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

        $ats->update(['estado' => 'en_ejecucion']);

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
}
