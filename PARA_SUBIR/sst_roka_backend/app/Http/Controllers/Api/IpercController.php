<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Iperc;
use App\Models\IpercProceso;
use App\Models\IpercPeligro;
use App\Models\IpercControl;
use App\Services\AuditoriaService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class IpercController extends Controller
{
    public function __construct(
        private AuditoriaService $auditoria
    ) {}

    /**
     * GET /api/iperc — Listar matrices IPERC
     */
    public function index(Request $request): JsonResponse
    {
        $empresaId = $request->user()->empresa_id;

        $query = Iperc::where('empresa_id', $empresaId)
            ->with(['area:id,nombre,tipo', 'sede:id,nombre', 'elaborador:id,nombre']);

        // Filtros
        if ($request->filled('estado'))       $query->where('estado', $request->estado);
        if ($request->filled('area_id'))      $query->where('area_id', $request->area_id);
        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('codigo',  'like', "%{$request->search}%")
                  ->orWhere('titulo', 'like', "%{$request->search}%");
            });
        }

        $per = min($request->get('per_page', 20), 100);
        $iperc = $query->orderByDesc('fecha_elaboracion')->paginate($per);

        // Agregar resumen de riesgos
        $iperc->getCollection()->transform(function ($item) {
            $item->resumen_riesgos = $item->resumen_riesgos;
            $item->esta_vencido    = $item->esta_vencido;
            return $item;
        });

        return response()->json($iperc);
    }

    /**
     * POST /api/iperc — Crear nueva matriz IPERC
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'sede_id'           => 'nullable|exists:sedes,id',
            'area_id'           => 'nullable|exists:areas,id',
            'titulo'            => 'required|string|max:255',
            'alcance'           => 'nullable|string',
            'metodologia'       => ['required', Rule::in(['IPERC_CONTINUO','IPERC_LINEA_BASE','IPERC_ESPECIFICO'])],
            'fecha_elaboracion' => 'required|date',
            'fecha_vigencia'    => 'nullable|date|after:fecha_elaboracion',
            'revisado_por'      => 'nullable|exists:usuarios,id',
            'aprobado_por'      => 'nullable|exists:usuarios,id',
            'procesos'          => 'nullable|array',
        ]);

        $usuario = $request->user();

        $iperc = DB::transaction(function () use ($validated, $usuario) {
            $iperc = Iperc::create([
                ...$validated,
                'empresa_id'    => $usuario->empresa_id,
                'codigo'        => Iperc::generarCodigo($usuario->empresa_id, $validated['area_id']),
                'elaborado_por' => $usuario->id,
                'version'       => 1,
                'estado'        => 'borrador',
            ]);

            // Crear procesos si se enviaron
            if (!empty($validated['procesos'])) {
                foreach ($validated['procesos'] as $idx => $proceso) {
                    $procModel = IpercProceso::create([
                        'iperc_id'       => $iperc->id,
                        'proceso'        => $proceso['proceso'],
                        'actividad'      => $proceso['actividad'],
                        'tarea'          => $proceso['tarea'] ?? null,
                        'tipo_actividad' => $proceso['tipo_actividad'] ?? 'rutinaria',
                        'orden'          => $idx,
                    ]);

                    // Crear peligros del proceso
                    foreach ($proceso['peligros'] ?? [] as $peligro) {
                        $pelModel = IpercPeligro::create([
                            'iperc_proceso_id'        => $procModel->id,
                            'tipo_peligro'            => $peligro['tipo_peligro'],
                            'descripcion_peligro'     => $peligro['descripcion_peligro'],
                            'riesgo'                  => $peligro['riesgo'],
                            'consecuencia'            => $peligro['consecuencia'] ?? null,
                            'prob_personas_expuestas' => $peligro['prob_personas_expuestas'],
                            'prob_procedimientos'     => $peligro['prob_procedimientos'],
                            'prob_capacitacion'       => $peligro['prob_capacitacion'],
                            'prob_exposicion'         => $peligro['prob_exposicion'],
                            'indice_severidad'        => $peligro['indice_severidad'],
                            // Los campos calculados se llenan automáticamente en el modelo
                            'indice_probabilidad'     => 0,
                            'nivel_riesgo_inicial'    => 0,
                            'clasificacion_inicial'   => 'trivial',
                        ]);

                        // Controles
                        foreach ($peligro['controles'] ?? [] as $control) {
                            IpercControl::create([
                                'iperc_peligro_id'       => $pelModel->id,
                                'tipo_control'           => $control['tipo_control'],
                                'descripcion'            => $control['descripcion'],
                                'responsable_id'         => $control['responsable_id'] ?? null,
                                'estado_implementacion'  => 'pendiente',
                            ]);
                        }
                    }
                }
            }

            return $iperc;
        });

        $this->auditoria->registrar(
            modulo: 'iperc',
            accion: 'crear',
            usuario: $usuario,
            modelo: 'Iperc',
            modeloId: $iperc->id,
            valorNuevo: ['codigo' => $iperc->codigo],
            request: $request
        );

        return response()->json(
            $iperc->load(['procesos.peligros.controles', 'area', 'sede']),
            201
        );
    }

    /**
     * GET /api/iperc/{id}
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $iperc = Iperc::where('empresa_id', $request->user()->empresa_id)
            ->with([
                'area', 'sede', 'elaborador:id,nombre',
                'revisor:id,nombre', 'aprobador:id,nombre',
                'procesos.peligros.controles',
                'procesos.peligros.eppsRequeridos',
                'firmas' => fn($q) => $q->where('rechazada', false),
            ])
            ->findOrFail($id);

        $iperc->resumen_riesgos = $iperc->resumen_riesgos;
        $iperc->esta_vencido    = $iperc->esta_vencido;

        return response()->json($iperc);
    }

    /**
     * PUT /api/iperc/{id}
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $iperc = Iperc::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);

        if ($iperc->estado === 'aprobado') {
            return response()->json([
                'message' => 'No se puede modificar un IPERC aprobado. Cree una nueva versión.',
            ], 422);
        }

        $validated = $request->validate([
            'titulo'            => 'sometimes|string|max:255',
            'alcance'           => 'nullable|string',
            'fecha_vigencia'    => 'nullable|date',
            'estado'            => ['sometimes', Rule::in(['borrador','en_revision','aprobado','vencido','archivado'])],
            'observaciones'     => 'nullable|string',
        ]);

        $anterior = $iperc->toArray();
        $iperc->update($validated);

        $this->auditoria->registrarCambioModelo(
            modulo: 'iperc',
            accion: 'actualizar',
            usuario: $request->user(),
            modelo: 'Iperc',
            modeloId: $iperc->id,
            anterior: $anterior,
            nuevo: $iperc->toArray(),
            request: $request
        );

        return response()->json($iperc);
    }

    /**
     * DELETE /api/iperc/{id}
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $iperc = Iperc::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);

        if ($iperc->estado === 'aprobado') {
            return response()->json(['message' => 'No se puede eliminar un IPERC aprobado.'], 422);
        }

        $iperc->delete();

        $this->auditoria->registrar(
            modulo: 'iperc',
            accion: 'eliminar',
            usuario: $request->user(),
            modelo: 'Iperc',
            modeloId: $id,
            request: $request
        );

        return response()->json(['message' => 'IPERC eliminado.']);
    }

    /**
     * GET /api/iperc/estadisticas — Dashboard stats
     */
    public function estadisticas(Request $request): JsonResponse
    {
        $empresaId = $request->user()->empresa_id;

        $porEstado = DB::table('iperc')
            ->where('empresa_id', $empresaId)->whereNull('deleted_at')
            ->selectRaw('estado, COUNT(*) as total')->groupBy('estado')
            ->pluck('total', 'estado');

        $porClasif = DB::table('iperc_peligros as p')
            ->join('iperc_procesos as pr', 'p.iperc_proceso_id', '=', 'pr.id')
            ->join('iperc', 'pr.iperc_id', '=', 'iperc.id')
            ->where('iperc.empresa_id', $empresaId)->whereNull('iperc.deleted_at')
            ->selectRaw('clasificacion_inicial, COUNT(*) as total')->groupBy('clasificacion_inicial')
            ->pluck('total', 'clasificacion_inicial');

        $controlesPorEstado = DB::table('iperc_controles as c')
            ->join('iperc_peligros as p', 'c.iperc_peligro_id', '=', 'p.id')
            ->join('iperc_procesos as pr', 'p.iperc_proceso_id', '=', 'pr.id')
            ->join('iperc', 'pr.iperc_id', '=', 'iperc.id')
            ->where('iperc.empresa_id', $empresaId)->whereNull('iperc.deleted_at')
            ->selectRaw('estado_implementacion, COUNT(*) as total')->groupBy('estado_implementacion')
            ->pluck('total', 'estado_implementacion');

        $vencidos = Iperc::where('empresa_id', $empresaId)
            ->where('estado', '!=', 'archivado')->whereNotNull('fecha_vigencia')
            ->whereDate('fecha_vigencia', '<', now())->count();

        $significativos = DB::table('iperc_peligros as p')
            ->join('iperc_procesos as pr', 'p.iperc_proceso_id', '=', 'pr.id')
            ->join('iperc', 'pr.iperc_id', '=', 'iperc.id')
            ->where('iperc.empresa_id', $empresaId)->whereNull('iperc.deleted_at')
            ->where('p.es_riesgo_significativo', true)->count();

        $totalPeligros = DB::table('iperc_peligros as p')
            ->join('iperc_procesos as pr', 'p.iperc_proceso_id', '=', 'pr.id')
            ->join('iperc', 'pr.iperc_id', '=', 'iperc.id')
            ->where('iperc.empresa_id', $empresaId)->whereNull('iperc.deleted_at')->count();

        $totalProcesos = DB::table('iperc_procesos as pr')
            ->join('iperc', 'pr.iperc_id', '=', 'iperc.id')
            ->where('iperc.empresa_id', $empresaId)->whereNull('iperc.deleted_at')->count();

        return response()->json([
            'total_iperc'          => array_sum($porEstado->toArray()),
            'por_estado'           => $porEstado,
            'vencidos'             => $vencidos,
            'significativos'       => $significativos,
            'total_peligros'       => $totalPeligros,
            'total_procesos'       => $totalProcesos,
            'por_clasificacion'    => $porClasif,
            'controles_por_estado' => $controlesPorEstado,
        ]);
    }

    /**
     * GET /api/iperc/procesos-all — Todos los procesos de la empresa
     */
    public function procesosAll(Request $request): JsonResponse
    {
        $empresaId = $request->user()->empresa_id;

        $query = DB::table('iperc_procesos as pr')
            ->join('iperc', 'pr.iperc_id', '=', 'iperc.id')
            ->join('areas', 'iperc.area_id', '=', 'areas.id')
            ->where('iperc.empresa_id', $empresaId)->whereNull('iperc.deleted_at')
            ->select([
                'pr.id', 'pr.proceso', 'pr.actividad', 'pr.tarea',
                'pr.tipo_actividad', 'iperc.codigo', 'iperc.titulo',
                'iperc.estado', 'iperc.id as iperc_id', 'areas.nombre as area_nombre',
            ]);

        if ($request->filled('tipo_actividad')) $query->where('pr.tipo_actividad', $request->tipo_actividad);
        if ($request->filled('search')) {
            $q = $request->search;
            $query->where(fn($sq) => $sq->where('pr.proceso', 'like', "%{$q}%")->orWhere('pr.actividad', 'like', "%{$q}%"));
        }

        $per = min($request->get('per_page', 20), 100);
        return response()->json($query->orderBy('pr.id', 'desc')->paginate($per));
    }

    /**
     * GET /api/iperc/peligros-all — Todos los peligros de la empresa
     */
    public function peligrosAll(Request $request): JsonResponse
    {
        $empresaId = $request->user()->empresa_id;

        $query = DB::table('iperc_peligros as p')
            ->join('iperc_procesos as pr', 'p.iperc_proceso_id', '=', 'pr.id')
            ->join('iperc', 'pr.iperc_id', '=', 'iperc.id')
            ->join('areas', 'iperc.area_id', '=', 'areas.id')
            ->where('iperc.empresa_id', $empresaId)->whereNull('iperc.deleted_at')
            ->select([
                'p.id', 'p.tipo_peligro', 'p.descripcion_peligro', 'p.riesgo',
                'p.clasificacion_inicial', 'p.clasificacion_residual',
                'p.nivel_riesgo_inicial', 'p.nivel_riesgo_residual',
                'p.es_riesgo_significativo', 'p.ip_residual', 'p.is_residual',
                'pr.proceso', 'pr.actividad', 'iperc.codigo', 'iperc.id as iperc_id',
                'areas.nombre as area_nombre',
            ]);

        if ($request->filled('tipo_peligro'))   $query->where('p.tipo_peligro', $request->tipo_peligro);
        if ($request->filled('clasificacion'))  $query->where('p.clasificacion_inicial', $request->clasificacion);
        if ($request->boolean('significativo')) $query->where('p.es_riesgo_significativo', true);
        if ($request->filled('search')) {
            $q = $request->search;
            $query->where(fn($sq) => $sq->where('p.descripcion_peligro', 'like', "%{$q}%")->orWhere('p.riesgo', 'like', "%{$q}%"));
        }

        $per = min($request->get('per_page', 20), 100);
        return response()->json($query->orderByRaw('p.nivel_riesgo_inicial DESC')->paginate($per));
    }

    /**
     * GET /api/iperc/controles-all — Todos los controles de la empresa
     */
    public function controlesAll(Request $request): JsonResponse
    {
        $empresaId = $request->user()->empresa_id;

        $query = DB::table('iperc_controles as c')
            ->join('iperc_peligros as p', 'c.iperc_peligro_id', '=', 'p.id')
            ->join('iperc_procesos as pr', 'p.iperc_proceso_id', '=', 'pr.id')
            ->join('iperc', 'pr.iperc_id', '=', 'iperc.id')
            ->join('areas', 'iperc.area_id', '=', 'areas.id')
            ->leftJoin('personal as per', 'c.responsable_id', '=', 'per.id')
            ->where('iperc.empresa_id', $empresaId)->whereNull('iperc.deleted_at')
            ->select([
                'c.id', 'c.tipo_control', 'c.descripcion', 'c.estado_implementacion',
                'c.fecha_implementacion', 'c.costo_estimado',
                'p.descripcion_peligro', 'p.clasificacion_inicial',
                'pr.proceso', 'iperc.codigo', 'iperc.id as iperc_id',
                'areas.nombre as area_nombre',
                DB::raw("TRIM(CONCAT(COALESCE(per.nombres,''), ' ', COALESCE(per.apellidos,''))) as responsable_nombre"),
            ]);

        if ($request->filled('tipo_control')) $query->where('c.tipo_control', $request->tipo_control);
        if ($request->filled('estado'))       $query->where('c.estado_implementacion', $request->estado);

        $per = min($request->get('per_page', 20), 100);
        return response()->json($query->orderBy('c.estado_implementacion')->paginate($per));
    }

    /**
     * GET /api/iperc/riesgo-residual — Peligros con evaluación residual
     */
    public function riesgoResidual(Request $request): JsonResponse
    {
        $empresaId = $request->user()->empresa_id;

        $query = DB::table('iperc_peligros as p')
            ->join('iperc_procesos as pr', 'p.iperc_proceso_id', '=', 'pr.id')
            ->join('iperc', 'pr.iperc_id', '=', 'iperc.id')
            ->join('areas', 'iperc.area_id', '=', 'areas.id')
            ->where('iperc.empresa_id', $empresaId)->whereNull('iperc.deleted_at')
            ->whereNotNull('p.ip_residual')
            ->select([
                'p.id', 'p.descripcion_peligro', 'p.riesgo',
                'p.clasificacion_inicial', 'p.nivel_riesgo_inicial',
                'p.clasificacion_residual', 'p.nivel_riesgo_residual',
                'p.ip_residual', 'p.is_residual',
                'pr.proceso', 'iperc.codigo', 'iperc.id as iperc_id',
                'areas.nombre as area_nombre',
            ]);

        if ($request->filled('clasificacion')) $query->where('p.clasificacion_residual', $request->clasificacion);

        $per = min($request->get('per_page', 20), 100);
        return response()->json($query->orderByRaw('p.nivel_riesgo_residual DESC')->paginate($per));
    }

    /**
     * GET /api/iperc/puestos — Cargos/puestos con exposición a riesgos
     */
    public function puestos(Request $request): JsonResponse
    {
        $empresaId = $request->user()->empresa_id;

        $cargos = DB::table('cargos as car')
            ->join('areas', 'car.area_id', '=', 'areas.id')
            ->leftJoin('personal as per', 'per.cargo_id', '=', 'car.id')
            ->where('car.empresa_id', $empresaId)
            ->select([
                'car.id', 'car.nombre', 'car.nivel',
                'areas.nombre as area_nombre',
                DB::raw('COUNT(DISTINCT per.id) as total_personal'),
            ])
            ->groupBy('car.id', 'car.nombre', 'car.nivel', 'areas.nombre')
            ->orderBy('areas.nombre')->orderBy('car.nombre')
            ->get();

        return response()->json($cargos);
    }

    /**
     * GET /api/iperc/alertas — Alertas de riesgos activos
     */
    public function alertas(Request $request): JsonResponse
    {
        $empresaId = $request->user()->empresa_id;

        $significativos = DB::table('iperc_peligros as p')
            ->join('iperc_procesos as pr', 'p.iperc_proceso_id', '=', 'pr.id')
            ->join('iperc', 'pr.iperc_id', '=', 'iperc.id')
            ->join('areas', 'iperc.area_id', '=', 'areas.id')
            ->where('iperc.empresa_id', $empresaId)->whereNull('iperc.deleted_at')
            ->where('p.es_riesgo_significativo', true)
            ->where('iperc.estado', 'aprobado')
            ->select([
                'p.id', 'p.descripcion_peligro', 'p.riesgo',
                'p.clasificacion_inicial', 'p.nivel_riesgo_inicial',
                'pr.proceso', 'iperc.codigo', 'iperc.id as iperc_id',
                'areas.nombre as area_nombre',
            ])
            ->orderByRaw('p.nivel_riesgo_inicial DESC')
            ->limit(50)->get();

        $proximosVencer = Iperc::where('empresa_id', $empresaId)
            ->whereIn('estado', ['aprobado', 'borrador'])
            ->whereNotNull('fecha_vigencia')
            ->whereDate('fecha_vigencia', '>=', now())
            ->whereDate('fecha_vigencia', '<=', now()->addDays(30))
            ->with('area:id,nombre')
            ->select('id', 'codigo', 'titulo', 'fecha_vigencia', 'area_id', 'estado')
            ->get()
            ->map(fn($i) => array_merge($i->toArray(), [
                'dias_restantes' => (int) now()->diffInDays($i->fecha_vigencia, false),
            ]));

        $vencidos = Iperc::where('empresa_id', $empresaId)
            ->whereNotIn('estado', ['archivado'])
            ->whereNotNull('fecha_vigencia')
            ->whereDate('fecha_vigencia', '<', now())
            ->with('area:id,nombre')
            ->select('id', 'codigo', 'titulo', 'fecha_vigencia', 'area_id', 'estado')
            ->limit(20)->get();

        return response()->json([
            'riesgos_significativos' => $significativos,
            'proximos_vencer'        => $proximosVencer,
            'vencidos'               => $vencidos,
        ]);
    }

    /**
     * GET /api/iperc/matriz-riesgos — Datos para matriz visual 5x5
     */
    public function matrizRiesgos(Request $request): JsonResponse
    {
        $empresaId = $request->user()->empresa_id;

        // Matriz 5x5 (severidad × probabilidad)
        $matriz = DB::table('iperc_peligros as p')
            ->join('iperc_procesos as pr', 'p.iperc_proceso_id', '=', 'pr.id')
            ->join('iperc', 'pr.iperc_id', '=', 'iperc.id')
            ->where('iperc.empresa_id', $empresaId)
            ->whereNull('iperc.deleted_at')
            ->where('iperc.estado', 'aprobado')
            ->selectRaw('clasificacion_inicial, COUNT(*) as total')
            ->groupBy('clasificacion_inicial')
            ->pluck('total', 'clasificacion_inicial');

        return response()->json([
            'trivial'     => $matriz['trivial']     ?? 0,
            'tolerable'   => $matriz['tolerable']   ?? 0,
            'moderado'    => $matriz['moderado']    ?? 0,
            'importante'  => $matriz['importante']  ?? 0,
            'intolerable' => $matriz['intolerable'] ?? 0,
            'niveles'     => Iperc::NIVELES_RIESGO,
        ]);
    }

    /**
     * POST /api/iperc/{id}/enviar-a-firma — Iniciar flujo de firma
     */
    public function enviarAFirma(Request $request, int $id): JsonResponse
    {
        $iperc = Iperc::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);

        if ($iperc->estado !== 'borrador') {
            return response()->json(['message' => 'Solo un IPERC en borrador puede enviarse a firma.'], 422);
        }

        $firmaService = app(\App\Services\FirmaService::class);
        $solicitud = $firmaService->crearSolicitud(
            documento: $iperc,
            solicitadoPor: $request->user(),
            titulo: "IPERC {$iperc->codigo} — {$iperc->titulo}",
        );

        $iperc->update(['estado' => 'en_revision']);

        return response()->json([
            'message'   => 'IPERC enviado al flujo de firma.',
            'solicitud' => $solicitud,
        ]);
    }
}
