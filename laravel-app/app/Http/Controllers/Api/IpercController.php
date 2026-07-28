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
            ->with(['area:id,nombre,tipo', 'sede:id,nombre', 'elaborador:id,nombre', 'procesos']);

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
                            'ip_residual'             => !empty($peligro['ip_residual']) ? (int)$peligro['ip_residual'] : null,
                            'is_residual'             => !empty($peligro['is_residual']) ? (int)$peligro['is_residual'] : null,
                            // Los campos calculados se llenan automáticamente vía model hook
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
            'area_id'           => 'sometimes|exists:areas,id',
            'sede_id'           => 'nullable|exists:sedes,id',
            'titulo'            => 'sometimes|string|max:255',
            'alcance'           => 'nullable|string',
            'metodologia'       => ['sometimes', Rule::in(['IPERC_CONTINUO','IPERC_LINEA_BASE','IPERC_ESPECIFICO'])],
            'fecha_elaboracion' => 'sometimes|date',
            'fecha_vigencia'    => 'nullable|date',
            'estado'            => ['sometimes', Rule::in(['borrador','en_revision','aprobado','vencido','archivado'])],
            'observaciones'     => 'nullable|string',
            'procesos'          => 'nullable|array',
        ]);

        $anterior = $iperc->toArray();

        DB::transaction(function () use ($iperc, $validated) {
            $iperc->update(collect($validated)->except('procesos')->toArray());

            if (array_key_exists('procesos', $validated)) {
                // Eliminar procesos existentes (en cascada: peligros y controles)
                foreach ($iperc->procesos()->with('peligros.controles')->get() as $proc) {
                    foreach ($proc->peligros as $pel) {
                        $pel->controles()->delete();
                    }
                    $proc->peligros()->delete();
                }
                $iperc->procesos()->delete();

                // Recrear procesos con los datos enviados
                foreach ($validated['procesos'] ?? [] as $idx => $proceso) {
                    $procModel = IpercProceso::create([
                        'iperc_id'       => $iperc->id,
                        'proceso'        => $proceso['proceso'],
                        'actividad'      => $proceso['actividad'],
                        'tarea'          => $proceso['tarea'] ?? null,
                        'tipo_actividad' => $proceso['tipo_actividad'] ?? 'rutinaria',
                        'orden'          => $idx,
                    ]);

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
                            'ip_residual'             => !empty($peligro['ip_residual']) ? (int)$peligro['ip_residual'] : null,
                            'is_residual'             => !empty($peligro['is_residual']) ? (int)$peligro['is_residual'] : null,
                            'indice_probabilidad'     => 0,
                            'nivel_riesgo_inicial'    => 0,
                            'clasificacion_inicial'   => 'trivial',
                        ]);

                        foreach ($peligro['controles'] ?? [] as $control) {
                            IpercControl::create([
                                'iperc_peligro_id'      => $pelModel->id,
                                'tipo_control'          => $control['tipo_control'],
                                'descripcion'           => $control['descripcion'],
                                'estado_implementacion' => 'pendiente',
                            ]);
                        }
                    }
                }
            }
        });

        $this->auditoria->registrarCambioModelo(
            modulo: 'iperc',
            accion: 'actualizar',
            usuario: $request->user(),
            modelo: 'Iperc',
            modeloId: $iperc->id,
            anterior: $anterior,
            nuevo: $iperc->fresh()->toArray(),
            request: $request
        );

        return response()->json($iperc->load(['area', 'sede', 'procesos.peligros.controles']));
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
     * GET /api/iperc/riesgo-residual — Todos los peligros con su estado de evaluación residual
     */
    public function riesgoResidual(Request $request): JsonResponse
    {
        $empresaId = $request->user()->empresa_id;

        $query = DB::table('iperc_peligros as p')
            ->join('iperc_procesos as pr', 'p.iperc_proceso_id', '=', 'pr.id')
            ->join('iperc', 'pr.iperc_id', '=', 'iperc.id')
            ->join('areas', 'iperc.area_id', '=', 'areas.id')
            ->where('iperc.empresa_id', $empresaId)
            ->whereNull('iperc.deleted_at')
            ->select([
                'p.id', 'p.descripcion_peligro', 'p.riesgo',
                'p.clasificacion_inicial', 'p.nivel_riesgo_inicial',
                'p.clasificacion_residual', 'p.nivel_riesgo_residual',
                'p.ip_residual', 'p.is_residual',
                'pr.proceso', 'iperc.codigo', 'iperc.id as iperc_id',
                'areas.nombre as area_nombre',
            ]);

        // Filtrar por clasificación residual (o inicial si no tiene residual)
        if ($request->filled('clasificacion')) {
            $query->where(function ($q) use ($request) {
                $q->where('p.clasificacion_residual', $request->clasificacion)
                  ->orWhere(function ($q2) use ($request) {
                      $q2->whereNull('p.clasificacion_residual')
                         ->where('p.clasificacion_inicial', $request->clasificacion);
                  });
            });
        }

        // Filtrar solo evaluados o pendientes
        if ($request->filled('estado_residual')) {
            if ($request->estado_residual === 'evaluado') {
                $query->whereNotNull('p.ip_residual');
            } elseif ($request->estado_residual === 'pendiente') {
                $query->whereNull('p.ip_residual');
            }
        }

        $per = min($request->get('per_page', 20), 100);
        // Poner primero los no evaluados (ip_residual null) y luego por nivel inicial desc
        return response()->json(
            $query->orderByRaw('p.ip_residual IS NOT NULL ASC, p.nivel_riesgo_inicial DESC')
                  ->paginate($per)
        );
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
     * GET /api/iperc/exposicion — Matriz de exposición: peligros por área ↔ cargos/personal expuesto.
     * Deriva la exposición al nivel de área (el IPERC se elabora por área operativa).
     */
    public function exposicion(Request $request): JsonResponse
    {
        $empresaId = $request->user()->empresa_id;

        // Peligros de IPERC aprobados, agrupados por área
        $peligros = DB::table('iperc_peligros as p')
            ->join('iperc_procesos as pr', 'p.iperc_proceso_id', '=', 'pr.id')
            ->join('iperc', 'pr.iperc_id', '=', 'iperc.id')
            ->where('iperc.empresa_id', $empresaId)
            ->whereNull('iperc.deleted_at')
            ->where('iperc.estado', 'aprobado')
            ->select([
                'iperc.area_id',
                'p.tipo_peligro', 'p.descripcion_peligro',
                'p.clasificacion_inicial', 'p.nivel_riesgo_inicial',
                'p.es_riesgo_significativo',
            ])
            ->orderByRaw('p.nivel_riesgo_inicial DESC')
            ->get()
            ->groupBy('area_id');

        // Cargos y conteo de personal por área
        $cargos = DB::table('cargos as car')
            ->leftJoin('personal as per', function ($j) {
                $j->on('per.cargo_id', '=', 'car.id')->whereNull('per.deleted_at');
            })
            ->where('car.empresa_id', $empresaId)
            ->select([
                'car.area_id', 'car.id', 'car.nombre',
                DB::raw('COUNT(DISTINCT per.id) as total_personal'),
            ])
            ->groupBy('car.area_id', 'car.id', 'car.nombre')
            ->get()
            ->groupBy('area_id');

        $areas = DB::table('areas')
            ->where('empresa_id', $empresaId)
            ->select('id', 'nombre')
            ->orderBy('nombre')
            ->get();

        $resultado = $areas->map(function ($area) use ($peligros, $cargos) {
            $pels = $peligros->get($area->id, collect());
            $cgs  = $cargos->get($area->id, collect());
            return [
                'area_id'        => $area->id,
                'area_nombre'    => $area->nombre,
                'total_peligros' => $pels->count(),
                'significativos' => $pels->where('es_riesgo_significativo', true)->count(),
                'peligros'       => $pels->take(30)->values(),
                'cargos'         => $cgs->values(),
                'total_personal' => $cgs->sum('total_personal'),
            ];
        })->filter(fn($a) => $a['total_peligros'] > 0 || $a['total_personal'] > 0)->values();

        return response()->json(['areas' => $resultado]);
    }

    /**
     * GET /api/iperc/matriz-grid — Distribución de peligros en la grilla IP × IS
     * Devuelve el conteo de peligros por cada celda (índice_probabilidad, índice_severidad).
     */
    public function matrizGrid(Request $request): JsonResponse
    {
        $empresaId = $request->user()->empresa_id;

        $q = DB::table('iperc_peligros as p')
            ->join('iperc_procesos as pr', 'p.iperc_proceso_id', '=', 'pr.id')
            ->join('iperc', 'pr.iperc_id', '=', 'iperc.id')
            ->where('iperc.empresa_id', $empresaId)
            ->whereNull('iperc.deleted_at');

        // Filtro opcional: usar riesgo residual en vez de inicial
        $usarResidual = $request->boolean('residual');

        if ($request->filled('estado')) {
            $q->where('iperc.estado', $request->estado);
        }

        $celdas = $q->selectRaw(
            $usarResidual
                ? 'COALESCE(p.ip_residual, p.indice_probabilidad) as ip, COALESCE(p.is_residual, p.indice_severidad) as is_val, COUNT(*) as total'
                : 'p.indice_probabilidad as ip, p.indice_severidad as is_val, COUNT(*) as total'
        )
        ->groupBy('ip', 'is_val')
        ->get();

        // Construir grilla: severidad 1-4 (filas) × IP 4-16 (columnas)
        $grid = [];
        foreach ($celdas as $c) {
            $ip = (int) $c->ip; $is = (int) $c->is_val;
            if ($ip < 4 || $ip > 16 || $is < 1 || $is > 4) continue;
            $nivel = $ip * $is;
            $grid[] = [
                'ip'            => $ip,
                'is'            => $is,
                'nivel'         => $nivel,
                'clasificacion' => IpercPeligro::clasificar($nivel),
                'total'         => (int) $c->total,
            ];
        }

        return response()->json([
            'celdas'  => $grid,
            'niveles' => Iperc::NIVELES_RIESGO,
            'ip_min'  => 4, 'ip_max' => 16,
            'is_min'  => 1, 'is_max' => 4,
        ]);
    }

    /**
     * GET /api/iperc/plan-accion — Controles que requieren acción (plan de tratamiento)
     * Prioriza controles pendientes/en proceso de riesgos significativos.
     */
    public function planAccion(Request $request): JsonResponse
    {
        $empresaId = $request->user()->empresa_id;
        $hoy       = now()->toDateString();

        $q = DB::table('iperc_controles as c')
            ->join('iperc_peligros as p', 'c.iperc_peligro_id', '=', 'p.id')
            ->join('iperc_procesos as pr', 'p.iperc_proceso_id', '=', 'pr.id')
            ->join('iperc', 'pr.iperc_id', '=', 'iperc.id')
            ->join('areas', 'iperc.area_id', '=', 'areas.id')
            ->leftJoin('personal as per', 'c.responsable_id', '=', 'per.id')
            ->where('iperc.empresa_id', $empresaId)
            ->whereNull('iperc.deleted_at')
            ->whereIn('c.estado_implementacion', ['pendiente', 'en_proceso']);

        if ($request->boolean('solo_significativos')) {
            $q->where('p.es_riesgo_significativo', true);
        }
        if ($request->filled('estado')) {
            $q->where('c.estado_implementacion', $request->estado);
        }

        $items = $q->select([
                'c.id', 'c.tipo_control', 'c.descripcion', 'c.estado_implementacion',
                'c.fecha_implementacion', 'c.responsable_id',
                'p.descripcion_peligro', 'p.clasificacion_inicial', 'p.nivel_riesgo_inicial',
                'p.es_riesgo_significativo',
                'pr.proceso', 'iperc.codigo', 'iperc.id as iperc_id',
                'areas.nombre as area_nombre',
                DB::raw("TRIM(CONCAT(COALESCE(per.nombres,''), ' ', COALESCE(per.apellidos,''))) as responsable_nombre"),
            ])
            ->orderByRaw('p.es_riesgo_significativo DESC, p.nivel_riesgo_inicial DESC')
            ->limit(200)
            ->get()
            ->map(function ($it) use ($hoy) {
                $it->vencido = $it->fecha_implementacion && $it->fecha_implementacion < $hoy;
                return $it;
            });

        return response()->json([
            'items'          => $items,
            'total'          => $items->count(),
            'vencidos'       => $items->where('vencido', true)->count(),
            'significativos' => $items->where('es_riesgo_significativo', true)->count(),
        ]);
    }

    /**
     * PATCH /api/iperc/controles/{controlId} — Actualizar seguimiento de un control
     */
    public function actualizarControl(Request $request, int $controlId): JsonResponse
    {
        $validated = $request->validate([
            'estado_implementacion' => ['sometimes', Rule::in(['pendiente','en_proceso','implementado','verificado'])],
            'fecha_implementacion'  => 'nullable|date',
            'responsable_id'        => 'nullable|exists:personal,id',
        ]);

        // Verificar que el control pertenezca a un IPERC de la empresa
        $control = IpercControl::whereHas('peligro.proceso.iperc', function ($q) use ($request) {
            $q->where('empresa_id', $request->user()->empresa_id);
        })->findOrFail($controlId);

        $control->update($validated);

        return response()->json([
            'message' => 'Control actualizado.',
            'control' => $control->fresh(),
        ]);
    }

    /**
     * POST /api/iperc/{id}/nueva-version
     * Clona un IPERC (aprobado o vencido) como nuevo borrador version+1,
     * enlazado a su versión padre. Archiva la versión anterior.
     */
    public function nuevaVersion(Request $request, int $id): JsonResponse
    {
        $usuario = $request->user();
        $origen  = Iperc::where('empresa_id', $usuario->empresa_id)
            ->with('procesos.peligros.controles')
            ->findOrFail($id);

        if (!in_array($origen->estado, ['aprobado', 'vencido'])) {
            return response()->json([
                'message' => 'Solo se puede versionar un IPERC aprobado o vencido.',
            ], 422);
        }

        $nueva = DB::transaction(function () use ($origen, $usuario) {
            $nueva = Iperc::create([
                'empresa_id'        => $origen->empresa_id,
                'sede_id'           => $origen->sede_id,
                'area_id'           => $origen->area_id,
                'codigo'            => Iperc::generarCodigo($origen->empresa_id, $origen->area_id),
                'titulo'            => $origen->titulo,
                'alcance'           => $origen->alcance,
                'metodologia'       => $origen->metodologia,
                'fecha_elaboracion' => now()->toDateString(),
                'fecha_vigencia'    => null,
                'version'           => (int) $origen->version + 1,
                'version_padre_id'  => $origen->id,
                'elaborado_por'     => $usuario->id,
                'estado'            => 'borrador',
                'observaciones'     => "Nueva versión derivada de {$origen->codigo} (v{$origen->version}).",
            ]);

            // Clonar procesos → peligros → controles
            foreach ($origen->procesos as $proc) {
                $nuevoProc = IpercProceso::create([
                    'iperc_id'       => $nueva->id,
                    'proceso'        => $proc->proceso,
                    'actividad'      => $proc->actividad,
                    'tarea'          => $proc->tarea,
                    'tipo_actividad' => $proc->tipo_actividad,
                    'orden'          => $proc->orden,
                ]);

                foreach ($proc->peligros as $pel) {
                    $nuevoPel = IpercPeligro::create([
                        'iperc_proceso_id'        => $nuevoProc->id,
                        'tipo_peligro'            => $pel->tipo_peligro,
                        'descripcion_peligro'     => $pel->descripcion_peligro,
                        'riesgo'                  => $pel->riesgo,
                        'consecuencia'            => $pel->consecuencia,
                        'prob_personas_expuestas' => $pel->prob_personas_expuestas,
                        'prob_procedimientos'     => $pel->prob_procedimientos,
                        'prob_capacitacion'       => $pel->prob_capacitacion,
                        'prob_exposicion'         => $pel->prob_exposicion,
                        'indice_severidad'        => $pel->indice_severidad,
                        'ip_residual'             => $pel->ip_residual,
                        'is_residual'             => $pel->is_residual,
                        'indice_probabilidad'     => 0,
                        'nivel_riesgo_inicial'    => 0,
                        'clasificacion_inicial'   => 'trivial',
                    ]);

                    foreach ($pel->controles as $ctrl) {
                        IpercControl::create([
                            'iperc_peligro_id'      => $nuevoPel->id,
                            'tipo_control'          => $ctrl->tipo_control,
                            'descripcion'           => $ctrl->descripcion,
                            'responsable_id'        => $ctrl->responsable_id,
                            'estado_implementacion' => 'pendiente',
                        ]);
                    }
                }
            }

            // Archivar la versión anterior
            $origen->update(['estado' => 'archivado']);

            return $nueva;
        });

        $this->auditoria->registrar(
            modulo: 'iperc',
            accion: 'nueva_version',
            usuario: $usuario,
            modelo: 'Iperc',
            modeloId: $nueva->id,
            valorNuevo: ['codigo' => $nueva->codigo, 'version' => $nueva->version, 'origen' => $origen->codigo],
            request: $request
        );

        return response()->json([
            'message' => "Nueva versión {$nueva->codigo} (v{$nueva->version}) creada como borrador.",
            'iperc'   => $nueva->load(['procesos.peligros.controles', 'area', 'sede']),
        ], 201);
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
