<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Inspeccion;
use App\Models\InspeccionItem;
use App\Models\InspeccionHallazgo;
use App\Models\AccionSeguimiento;
use App\Services\AuditoriaService;
use App\Services\FirmaService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class InspeccionController extends Controller
{
    public function __construct(
        private AuditoriaService $auditoria,
        private FirmaService $firmaService,
    ) {}

    /**
     * GET /api/inspecciones
     */
    // ── Programa mensual: estado de todos los catálogos ────────────────────
    public function programaMensual(Request $request): JsonResponse
    {
        $eid  = $request->user()->empresa_id;
        $anio = $request->integer('anio', now()->year);
        $mes  = $request->integer('mes',  now()->month);

        $desde = sprintf('%04d-%02d-01', $anio, $mes);
        $hasta = date('Y-m-t', strtotime($desde));

        // Solo catálogos activos con frecuencia mensual que tengan al menos 1 equipo activo
        $catalogos = DB::table('equipos_catalogo as ec')
            ->leftJoin('inspeccion_submodulos as sm', 'sm.id', '=', 'ec.submodulo_id')
            ->where('ec.activo', true)
            ->where('ec.frecuencia_inspeccion', 'mensual')
            ->whereExists(fn($q) => $q
                ->from('equipos')
                ->whereColumn('equipos.equipo_catalogo_id', 'ec.id')
                ->where('equipos.empresa_id', $eid)
                ->whereIn('equipos.estado', ['operativo', 'en_mantenimiento'])
                ->whereNull('equipos.deleted_at')
            )
            ->orderBy('sm.codigo')
            ->orderBy('ec.orden')
            ->get(['ec.id','ec.codigo','ec.nombre','ec.submodulo_id','sm.codigo as submod_codigo','sm.nombre as submod_nombre']);

        // Inspecciones existentes en el mes para estos catálogos
        $inspExistentes = DB::table('inspecciones')
            ->where('empresa_id', $eid)
            ->whereIn('equipo_catalogo_id', $catalogos->pluck('id'))
            ->whereBetween('planificada_para', [$desde, $hasta])
            ->whereNull('deleted_at')
            ->get(['id','codigo','equipo_catalogo_id','equipo_id','estado','planificada_para','porcentaje_cumplimiento','area_id','inspector_id','inspector_usuario_id'])
            ->groupBy('equipo_catalogo_id');

        // Equipos físicos por catálogo
        $equiposPorCat = DB::table('equipos')
            ->where('empresa_id', $eid)
            ->whereIn('equipo_catalogo_id', $catalogos->pluck('id'))
            ->whereNull('deleted_at')
            ->get(['id','codigo','nombre','area_id','equipo_catalogo_id'])
            ->groupBy('equipo_catalogo_id');

        // Índice de equipos por ID para lookup rápido
        $equiposPorId = DB::table('equipos')
            ->where('empresa_id', $eid)
            ->whereIn('equipo_catalogo_id', $catalogos->pluck('id'))
            ->whereNull('deleted_at')
            ->pluck('codigo', 'id');

        // Áreas
        $areas = DB::table('areas')->pluck('nombre','id');

        // Hallazgos críticos abiertos por catálogo (sin subsanar/verificar)
        $hallazgosCriticosPorCat = DB::table('inspecciones_hallazgos as h')
            ->join('inspecciones as i', 'i.id', '=', 'h.inspeccion_id')
            ->where('i.empresa_id', $eid)
            ->whereIn('i.equipo_catalogo_id', $catalogos->pluck('id'))
            ->where('h.criticidad', 'critico')
            ->whereNotIn('h.estado', ['subsanado', 'verificado'])
            ->whereNull('i.deleted_at')
            ->select('i.equipo_catalogo_id', DB::raw('COUNT(*) as total'))
            ->groupBy('i.equipo_catalogo_id')
            ->pluck('total', 'equipo_catalogo_id');

        // Hallazgos NC abiertos (cualquier criticidad, sin cerrar)
        $hallazgosNCPorCat = DB::table('inspecciones_hallazgos as h')
            ->join('inspecciones as i', 'i.id', '=', 'h.inspeccion_id')
            ->where('i.empresa_id', $eid)
            ->whereIn('i.equipo_catalogo_id', $catalogos->pluck('id'))
            ->whereNotIn('h.estado', ['subsanado', 'verificado'])
            ->whereNull('i.deleted_at')
            ->select('i.equipo_catalogo_id', DB::raw('COUNT(*) as total'))
            ->groupBy('i.equipo_catalogo_id')
            ->pluck('total', 'equipo_catalogo_id');

        // Última inspección ejecutada por catálogo (antes del mes consultado)
        $ultimaInspPorCat = DB::table('inspecciones')
            ->where('empresa_id', $eid)
            ->whereIn('equipo_catalogo_id', $catalogos->pluck('id'))
            ->whereIn('estado', ['ejecutada', 'con_hallazgos', 'cerrada'])
            ->where('planificada_para', '<', $desde)
            ->whereNull('deleted_at')
            ->select('equipo_catalogo_id', DB::raw('MAX(planificada_para) as ultima_fecha'))
            ->groupBy('equipo_catalogo_id')
            ->pluck('ultima_fecha', 'equipo_catalogo_id');

        $hoy         = now()->toDateString();
        $esMesFuturo = $desde > $hoy;
        $esMesPasado = $hasta < $hoy;

        $resultado = $catalogos->map(function ($cat) use ($inspExistentes, $equiposPorCat, $equiposPorId, $areas, $hallazgosCriticosPorCat, $hallazgosNCPorCat, $ultimaInspPorCat, $hoy, $esMesFuturo, $esMesPasado, $desde) {
            $insps   = $inspExistentes->get($cat->id, collect());
            $equipos = $equiposPorCat->get($cat->id, collect());

            // Crear índice de inspecciones por equipo_id
            $inspeccionesPorEquipo = $insps->keyBy('equipo_id');

            // Contar equipos con inspecciones completadas (basado en equipos, no en total de inspecciones)
            $totalEquipos = $equipos->count();
            $equiposCompletados = 0;
            $equiposProgramados = 0;

            // Si NO hay equipos físicos, contar inspecciones directamente
            if ($totalEquipos === 0) {
                $totalEquipos = $insps->count();
                $equiposCompletados = $insps->whereIn('estado', ['ejecutada','con_hallazgos','cerrada'])->count();
                $equiposProgramados = $insps->where('estado', 'programada')->count();
            } else {
                // Para catálogos con 1 solo equipo, si hay inspecciones sin equipo_id, asignarlas al único equipo
                if ($totalEquipos === 1 && $inspeccionesPorEquipo->has(null)) {
                    $inspSinEquipo = $inspeccionesPorEquipo->get(null);
                    $inspeccionesPorEquipo->put($equipos->first()->id, $inspSinEquipo);
                }

                foreach ($equipos as $eq) {
                    $insp = $inspeccionesPorEquipo->get($eq->id);
                    if ($insp) {
                        if (in_array($insp->estado, ['ejecutada','con_hallazgos','cerrada'])) {
                            $equiposCompletados++;
                        } elseif ($insp->estado === 'programada') {
                            $equiposProgramados++;
                        }
                    }
                }
            }

            // Porcentaje basado en equipos/inspecciones completados
            $pctCumpl = $totalEquipos > 0 ? round(($equiposCompletados / $totalEquipos) * 100, 1) : null;

            // Estado basado en equipos
            $estado = 'sin_programar';
            if ($equiposCompletados + $equiposProgramados > 0) {
                if ($equiposCompletados === $totalEquipos) $estado = 'completada';
                elseif ($equiposCompletados > 0)           $estado = 'en_progreso';
                else                                       $estado = 'programada';
            }

            // ── Score de riesgo y semáforo ───────────────────────────────────
            $criticosAbiertos = (int) $hallazgosCriticosPorCat->get($cat->id, 0);
            $ncAbiertos       = (int) $hallazgosNCPorCat->get($cat->id, 0);
            $ultimaFecha      = $ultimaInspPorCat->get($cat->id);
            $diasSinInsp      = $ultimaFecha
                ? (int) \Carbon\Carbon::parse($ultimaFecha)->diffInDays(now())
                : 365;

            // Fórmula: críticos pesan más, luego NC abiertos, luego tiempo sin inspeccionar
            $scoreRiesgo = ($criticosAbiertos * 5) + ($ncAbiertos * 2) + min(30, (int) ($diasSinInsp / 30));

            if ($esMesFuturo) {
                $semaforo = 'gris';
            } elseif ($criticosAbiertos > 0) {
                $semaforo = 'rojo';
            } elseif ($esMesPasado) {
                // Mes pasado: sin completar = rojo, bajo pct = amarillo
                $semaforo = in_array($estado, ['sin_programar', 'programada'])
                    ? 'rojo'
                    : ($estado === 'en_progreso' ? 'amarillo' : (($pctCumpl ?? 0) >= 70 ? 'verde' : 'amarillo'));
            } else {
                // Mes actual
                $tieneVencida = $insps->where('estado', 'programada')
                    ->filter(fn($i) => $i->planificada_para < $hoy)->isNotEmpty();
                $diaHoy   = now()->day;
                $totalDias = (int) date('t', strtotime($desde));
                $pctMes   = round($diaHoy / $totalDias * 100);

                if ($tieneVencida || ($estado === 'sin_programar' && $pctMes > 70)) {
                    $semaforo = 'rojo';
                } elseif ($ncAbiertos > 0 || ($estado === 'sin_programar' && $pctMes > 30)) {
                    $semaforo = 'amarillo';
                } elseif ($estado === 'completada') {
                    $semaforo = ($pctCumpl ?? 0) >= 70 ? 'verde' : 'amarillo';
                } elseif ($estado === 'en_progreso') {
                    $semaforo = 'verde';
                } elseif ($estado === 'programada') {
                    $semaforo = 'amarillo'; // Programada pero no ejecutada aún
                } else {
                    $semaforo = 'gris';
                }
            }

            return [
                'catalogo_id'      => $cat->id,
                'catalogo_codigo'  => $cat->codigo,
                'catalogo_nombre'  => $cat->nombre,
                'submodulo'        => $cat->submod_codigo ?? '?',
                'submodulo_nombre' => $cat->submod_nombre ?? 'General',
                'equipos_count'    => $equipos->count(),
                'equipos'          => $equipos->map(fn($eq) => [
                    'id'           => $eq->id,
                    'codigo'       => $eq->codigo,
                    'nombre'       => $eq->nombre,
                    'area'         => $areas[$eq->area_id] ?? '—',
                    'area_id'      => $eq->area_id,
                    'inspeccion'   => $inspeccionesPorEquipo->get($eq->id) ? [
                        'id'          => $inspeccionesPorEquipo[$eq->id]->id,
                        'codigo'      => $inspeccionesPorEquipo[$eq->id]->codigo,
                        'estado'      => $inspeccionesPorEquipo[$eq->id]->estado,
                        'fecha'       => $inspeccionesPorEquipo[$eq->id]->planificada_para,
                        'pct'                  => $inspeccionesPorEquipo[$eq->id]->porcentaje_cumplimiento,
                        'inspector_id'         => $inspeccionesPorEquipo[$eq->id]->inspector_id,
                        'inspector_usuario_id' => $inspeccionesPorEquipo[$eq->id]->inspector_usuario_id,
                    ] : null,
                ])->values(),
                'inspecciones'     => $insps->map(fn($i) => [
                    'id'           => $i->id,
                    'codigo'       => $i->codigo,
                    'estado'       => $i->estado,
                    'fecha'        => $i->planificada_para,
                    'pct'          => $i->porcentaje_cumplimiento,
                    'area'                 => $areas[$i->area_id] ?? '—',
                    'equipo_codigo'        => $i->equipo_id ? ($equiposPorId[$i->equipo_id] ?? null) : null,
                    'inspector_id'         => $i->inspector_id,
                    'inspector_usuario_id' => $i->inspector_usuario_id,
                ])->values(),
                'total_programadas'   => $totalEquipos,
                'ejecutadas'          => $equiposCompletados,
                'pendientes'          => $equiposProgramados,
                'pct_cumplimiento'    => $pctCumpl,
                'estado'              => $estado,
                'score_riesgo'        => $scoreRiesgo,
                'semaforo'            => $semaforo,
                'criticos_abiertos'   => $criticosAbiertos,
                'nc_abiertos'         => $ncAbiertos,
                'dias_sin_inspeccion' => $diasSinInsp,
            ];
        });

        // KPIs por sub-módulo
        $porSubmod = $resultado->groupBy('submodulo')->map(fn($g) => [
            'total'      => $g->count(),
            'completadas'=> $g->where('estado','completada')->count(),
            'programadas'=> $g->whereIn('estado',['programada','en_progreso'])->count(),
            'sin_prog'   => $g->where('estado','sin_programar')->count(),
            'pct'        => $g->where('pct_cumplimiento','!=',null)->avg('pct_cumplimiento'),
        ]);

        return response()->json([
            'anio'       => $anio,
            'mes'        => $mes,
            'catalogos'  => $resultado->values(),
            'por_submodulo' => $porSubmod,
            'resumen'    => [
                'total'       => $resultado->count(),
                'completadas' => $resultado->where('estado','completada')->count(),
                'en_progreso' => $resultado->where('estado','en_progreso')->count(),
                'programadas' => $resultado->where('estado','programada')->count(),
                'sin_prog'    => $resultado->where('estado','sin_programar')->count(),
                'rojo'        => $resultado->where('semaforo','rojo')->count(),
                'amarillo'    => $resultado->where('semaforo','amarillo')->count(),
                'verde'       => $resultado->where('semaforo','verde')->count(),
            ],
        ]);
    }

    // ── Generar programa mensual masivo ──────────────────────────────────────
    public function generarPrograma(Request $request): JsonResponse
    {
        $eid  = $request->user()->empresa_id;
        $anio = $request->integer('anio', now()->year);
        $mes  = $request->integer('mes',  now()->month);
        $sobreescribir        = $request->boolean('sobreescribir', false);
        $inspectorUsuarioId   = $request->integer('inspector_usuario_id') ?: null;

        $desde = sprintf('%04d-%02d-01', $anio, $mes);
        $hasta = date('Y-m-t', strtotime($desde));

        // Solo catálogos activos con frecuencia mensual que tengan equipos activos
        $catalogos = \App\Models\EquipoCatalogo::where('activo', true)
            ->where('frecuencia_inspeccion', 'mensual')
            ->whereHas('equiposInventario', fn($q) => $q
                ->where('empresa_id', $eid)
                ->whereIn('estado', ['operativo', 'en_mantenimiento'])
                ->whereNull('deleted_at')
            )
            ->with('submodulo')
            ->get();

        $creadas = 0; $omitidas = 0;

        foreach ($catalogos as $cat) {
            // Verificar si ya existe una inspección este mes
            $existe = Inspeccion::where('empresa_id', $eid)
                ->where('equipo_catalogo_id', $cat->id)
                ->whereBetween('planificada_para', [$desde, $hasta])
                ->whereNull('deleted_at')
                ->exists();

            if ($existe && !$sobreescribir) { $omitidas++; continue; }

            // Buscar primer equipo físico para obtener area_id
            $equipo = DB::table('equipos')
                ->where('empresa_id', $eid)
                ->where('equipo_catalogo_id', $cat->id)
                ->whereNull('deleted_at')
                ->first();

            $areaId = $equipo?->area_id
                ?? DB::table('areas')->where('empresa_id', $eid)->value('id');

            if (!$areaId) { $omitidas++; continue; }

            $tipo = $cat->submodulo?->tipo_inspeccion ?? 'equipos';

            Inspeccion::create([
                'empresa_id'         => $eid,
                'sede_id'            => 1,
                'area_id'            => $areaId,
                'tipo'               => $tipo,
                'titulo'             => $cat->nombre,
                'planificada_para'    => $desde,
                'equipo_catalogo_id'  => $cat->id,
                'submodulo_id'        => $cat->submodulo_id,
                'inspector_usuario_id'=> $inspectorUsuarioId,
                'estado'             => 'programada',
                'codigo'             => Inspeccion::generarCodigo($eid, $tipo),
                'elaborado_por'      => $request->user()->id,
            ]);
            $creadas++;
        }

        return response()->json([
            'creadas'  => $creadas,
            'omitidas' => $omitidas,
            'mes'      => $mes,
            'anio'     => $anio,
            'message'  => "$creadas inspecciones creadas para " . date('F Y', strtotime($desde)),
        ]);
    }

    // ── Tabla inspecciones DIARIAS (frecuencia=diaria) ─────────────────────
    public function tablaDiaria(Request $request): JsonResponse
    {
        $eid = $request->user()->empresa_id;
        $catsDiarios = DB::table('equipos_catalogo')
            ->where('frecuencia_inspeccion', 'diaria')
            ->pluck('id');

        $query = Inspeccion::where('empresa_id', $eid)
            ->whereIn('equipo_catalogo_id', $catsDiarios)
            ->with(['area:id,nombre', 'equipoCatalogo:id,nombre,codigo']);

        if ($request->filled('estado'))       $query->where('estado', $request->estado);
        if ($request->filled('equipo_catalogo_id')) $query->where('equipo_catalogo_id', $request->equipo_catalogo_id);
        if ($request->filled('fecha_desde'))  $query->where('planificada_para', '>=', $request->fecha_desde);
        if ($request->filled('fecha_hasta'))  $query->where('planificada_para', '<=', $request->fecha_hasta);
        if ($request->filled('search')) {
            $q = $request->search;
            $query->where(fn($s) => $s->where('codigo','like',"%{$q}%")->orWhere('titulo','like',"%{$q}%"));
        }

        return response()->json(
            $query->orderByDesc('planificada_para')
                ->paginate(min($request->integer('per_page', 20), 100))
        );
    }

    // ── Tabla inspecciones MENSUALES (no-diarias) ───────────────────────────
    public function tablaMensual(Request $request): JsonResponse
    {
        $eid = $request->user()->empresa_id;
        $catsDiarios = DB::table('equipos_catalogo')
            ->where('frecuencia_inspeccion', 'diaria')
            ->pluck('id');

        $query = Inspeccion::where('empresa_id', $eid)
            ->where(fn($q) =>
                $q->whereNotIn('equipo_catalogo_id', $catsDiarios)
                  ->orWhereNull('equipo_catalogo_id')
            )
            ->with(['area:id,nombre', 'sede:id,nombre']);

        if ($request->filled('estado'))      $query->where('estado', $request->estado);
        if ($request->filled('tipo'))        $query->where('tipo', $request->tipo);
        if ($request->filled('fecha_desde')) $query->where('planificada_para', '>=', $request->fecha_desde);
        if ($request->filled('fecha_hasta')) $query->where('planificada_para', '<=', $request->fecha_hasta);
        if ($request->filled('search')) {
            $q = $request->search;
            $query->where(fn($s) => $s->where('codigo','like',"%{$q}%")->orWhere('titulo','like',"%{$q}%"));
        }

        return response()->json(
            $query->withCount(['hallazgos'])
                ->orderByDesc('planificada_para')
                ->paginate(min($request->integer('per_page', 20), 100))
        );
    }

    public function index(Request $request): JsonResponse
    {
        $query = Inspeccion::where('empresa_id', $request->user()->empresa_id)
            ->with(['area:id,nombre', 'sede:id,nombre', 'inspector:id,nombres,apellidos', 'inspectorUsuario:id,nombre', 'equipo:id,codigo,nombre,serie']);

        if ($request->filled('estado'))             $query->where('estado', $request->estado);
        if ($request->filled('tipo'))               $query->where('tipo', $request->tipo);
        if ($request->filled('area_id'))            $query->where('area_id', $request->area_id);
        if ($request->filled('equipo_catalogo_id')) $query->where('equipo_catalogo_id', $request->equipo_catalogo_id);
        if ($request->filled('anio'))               $query->whereYear('planificada_para', $request->integer('anio'));
        if ($request->filled('fecha_desde'))        $query->where('planificada_para', '>=', $request->fecha_desde);
        if ($request->filled('fecha_hasta'))        $query->where('planificada_para', '<=', $request->fecha_hasta);
        if ($request->filled('search')) {
            $q = $request->search;
            $query->where(fn($sub) =>
                $sub->where('codigo', 'like', "%{$q}%")
                    ->orWhere('titulo', 'like', "%{$q}%")
            );
        }

        $inspecciones = $query->withCount([
                'hallazgos',
                'items',
                'hallazgos as total_hallazgos_criticos' => fn($q) => $q->where('criticidad', 'critico'),
            ])
            ->orderByDesc('planificada_para')
            ->paginate(min($request->integer('per_page', 20), 100));

        return response()->json($inspecciones);
    }

    /**
     * POST /api/inspecciones
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'sede_id'              => 'nullable|exists:sedes,id',
            'area_id'              => 'nullable|exists:areas,id',
            'tipo'                 => ['required', Rule::in(['equipos','infraestructura','emergencias','epps','orden_limpieza','higiene','general','taller','almacen','oficinas'])],
            'titulo'               => 'required|string|max:255',
            'descripcion'          => 'nullable|string',
            'planificada_para'     => 'required|date',
            'inspector_id'         => 'nullable|exists:personal,id',
            'supervisor_id'        => 'nullable|exists:personal,id',
            'equipo_catalogo_id'   => 'nullable|exists:equipos_catalogo,id',
            'equipo_id'            => 'nullable|exists:equipos,id',
            'submodulo_id'         => 'nullable|exists:inspeccion_submodulos,id',
            'turno'                => 'nullable|in:mañana,tarde,noche',
            'requiere_firma'       => 'boolean',
            'items'                => 'nullable|array',
            'items.*.categoria'    => 'required_with:items|string|max:150',
            'items.*.descripcion'  => 'required_with:items|string',
            'items.*.es_critico'   => 'boolean',
            'items.*.puntaje_maximo' => 'integer|min:1|max:10',
        ]);

        $usuario = $request->user();

        $inspeccion = DB::transaction(function () use ($validated, $usuario) {
            $inspeccion = Inspeccion::create([
                ...$validated,
                'empresa_id'    => $usuario->empresa_id,
                'codigo'        => Inspeccion::generarCodigo($usuario->empresa_id, $validated['tipo']),
                'elaborado_por' => $usuario->id,
                'estado'        => 'programada',
            ]);

            foreach ($validated['items'] ?? [] as $idx => $itemData) {
                InspeccionItem::create([
                    'inspeccion_id'  => $inspeccion->id,
                    'numero_item'    => $idx + 1,
                    'categoria'      => $itemData['categoria'],
                    'descripcion'    => $itemData['descripcion'],
                    'es_critico'     => $itemData['es_critico'] ?? false,
                    'aplica'         => true,
                    'puntaje_maximo' => $itemData['puntaje_maximo'] ?? 1,
                ]);
            }

            return $inspeccion;
        });

        $this->auditoria->registrar(
            modulo: 'inspecciones',
            accion: 'crear',
            usuario: $usuario,
            modelo: 'Inspeccion',
            modeloId: $inspeccion->id,
            valorNuevo: ['codigo' => $inspeccion->codigo, 'tipo' => $inspeccion->tipo],
            request: $request
        );

        return response()->json(
            $inspeccion->load(['items', 'area', 'sede', 'inspector', 'inspectorUsuario', 'equipo:id,codigo,nombre']),
            201
        );
    }

    /**
     * GET /api/inspecciones/{id}
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $inspeccion = Inspeccion::where('empresa_id', $request->user()->empresa_id)
            ->with([
                'area', 'sede', 'inspector:id,nombres,apellidos,dni',
                'inspectorUsuario:id,nombre,nombres,apellidos,email',
                'supervisor:id,nombres,apellidos',
                'elaborador:id,nombre',
                'equipo:id,codigo,nombre',
                'equipoCatalogo:id,nombre,frecuencia_inspeccion',
                'items.hallazgo',
                'hallazgos.responsable:id,nombres,apellidos',
                'hallazgos.area:id,nombre',
                'firmas' => fn($q) => $q->where('rechazada', false),
            ])
            ->findOrFail($id);

        $inspeccion->tipo_label = $inspeccion->tipo_label;
        $inspeccion->total_hallazgos_criticos = $inspeccion->total_hallazgos_criticos;

        // Para inspecciones de checklist, cargar respuestas con pregunta
        if ($inspeccion->equipo_catalogo_id) {
            $inspeccion->respuestas_checklist = \App\Models\InspeccionRespuesta::where('inspeccion_id', $inspeccion->id)
                ->with(['pregunta:id,texto,tipo_respuesta,orden,permite_nota,permite_cantidad,permite_fecha_vencimiento'])
                ->orderBy('pregunta_id')
                ->get()
                ->map(fn($r) => [
                    'id'                   => $r->id,
                    'pregunta_id'          => $r->pregunta_id,
                    'texto'                => $r->pregunta?->texto,
                    'tipo_respuesta'       => $r->pregunta?->tipo_respuesta,
                    'orden'                => $r->pregunta?->orden,
                    'resultado'            => $r->resultado,
                    'nota'                 => $r->nota,
                    'cantidad'             => $r->cantidad,
                    'fecha_vencimiento_item' => $r->fecha_vencimiento_item?->format('Y-m-d'),
                ]);

            // Enriquecer con datos del equipo_catalogo
            $catalogo = \App\Models\EquipoCatalogo::find($inspeccion->equipo_catalogo_id);
            if ($catalogo) {
                $inspeccion->equipo_catalogo_nombre = $catalogo->nombre;
                $inspeccion->frecuencia_inspeccion = $catalogo->frecuencia_inspeccion; // diaria, mensual, etc.
            }
        }

        return response()->json($inspeccion);
    }

    /**
     * PUT /api/inspecciones/{id}
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $inspeccion = Inspeccion::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);

        if ($inspeccion->estado === 'cerrada') {
            return response()->json(['message' => 'No se puede modificar una inspección cerrada.'], 422);
        }

        $validated = $request->validate([
            'titulo'               => 'sometimes|string|max:255',
            'descripcion'          => 'nullable|string',
            'planificada_para'     => 'sometimes|date',
            'inspector_id'          => 'sometimes|nullable|exists:personal,id',
            'inspector_usuario_id'  => 'sometimes|nullable|exists:usuarios,id',
            'supervisor_id'         => 'nullable|exists:personal,id',
            'estado'               => ['sometimes', Rule::in(['programada','en_ejecucion','ejecutada','con_hallazgos','cerrada','anulada'])],
            'observaciones_generales' => 'nullable|string',
            'items'                => 'sometimes|array',
            'items.*.categoria'    => 'nullable|string|max:150',
            'items.*.descripcion'  => 'required_with:items|string',
            'items.*.es_critico'   => 'boolean',
            'items.*.puntaje_maximo' => 'integer|min:1|max:10',
        ]);

        $anterior = $inspeccion->toArray();
        $inspeccion->update(collect($validated)->except('items')->toArray());

        // Reemplazar ítems solo si la inspección aún no ha sido ejecutada
        if ($request->has('items') && in_array($inspeccion->estado, ['programada', 'en_ejecucion'])) {
            $inspeccion->items()->delete();
            foreach ($request->input('items', []) as $idx => $itemData) {
                if (empty(trim($itemData['descripcion'] ?? ''))) continue;
                InspeccionItem::create([
                    'inspeccion_id'  => $inspeccion->id,
                    'numero_item'    => $idx + 1,
                    'categoria'      => $itemData['categoria'] ?? '',
                    'descripcion'    => $itemData['descripcion'],
                    'es_critico'     => $itemData['es_critico'] ?? false,
                    'aplica'         => true,
                    'puntaje_maximo' => $itemData['puntaje_maximo'] ?? 1,
                ]);
            }
        }

        $this->auditoria->registrarCambioModelo(
            modulo: 'inspecciones',
            accion: 'actualizar',
            usuario: $request->user(),
            modelo: 'Inspeccion',
            modeloId: $inspeccion->id,
            anterior: $anterior,
            nuevo: $inspeccion->toArray(),
            request: $request
        );

        return response()->json($inspeccion->fresh(['items', 'area', 'sede', 'inspector', 'inspectorUsuario']));
    }

    // ── Eliminar todas las inspecciones programadas 0% de un mes ─────────────
    public function limpiarProgramadas(Request $request): JsonResponse
    {
        $eid  = $request->user()->empresa_id;
        $anio = $request->integer('anio', now()->year);
        $mes  = $request->integer('mes',  now()->month);

        $desde = sprintf('%04d-%02d-01', $anio, $mes);
        $hasta = date('Y-m-t', strtotime($desde));

        $eliminadas = Inspeccion::where('empresa_id', $eid)
            ->where('estado', 'programada')
            ->whereBetween('planificada_para', [$desde, $hasta])
            ->where(fn($q) => $q->whereNull('porcentaje_cumplimiento')
                                ->orWhere('porcentaje_cumplimiento', 0))
            ->delete();

        return response()->json([
            'message'    => "{$eliminadas} inspección(es) programadas eliminadas.",
            'eliminadas' => $eliminadas,
        ]);
    }

    /**
     * DELETE /api/inspecciones/{id}
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $inspeccion = Inspeccion::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);

        if ($inspeccion->estado === 'cerrada') {
            return response()->json(['message' => 'No se puede eliminar una inspección cerrada.'], 422);
        }

        $inspeccion->delete();

        $this->auditoria->registrar(
            modulo: 'inspecciones',
            accion: 'eliminar',
            usuario: $request->user(),
            modelo: 'Inspeccion',
            modeloId: $id,
            request: $request
        );

        return response()->json(['message' => 'Inspección eliminada.']);
    }

    /**
     * POST /api/inspecciones/{id}/ejecutar — Registrar resultados de cada ítem
     */
    public function ejecutar(Request $request, int $id): JsonResponse
    {
        $inspeccion = Inspeccion::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);

        if (!in_array($inspeccion->estado, ['programada', 'en_ejecucion'])) {
            return response()->json(['message' => 'La inspección no puede ejecutarse en su estado actual.'], 422);
        }

        $validated = $request->validate([
            'items'                      => 'required|array|min:1',
            'items.*.id'                 => 'required|exists:inspecciones_items,id',
            'items.*.aplica'             => 'boolean',
            'items.*.resultado'          => ['required', Rule::in(['conforme','no_conforme','no_aplica','observacion'])],
            'items.*.puntaje_obtenido'   => 'nullable|integer|min:0',
            'items.*.observaciones'      => 'nullable|string',
            'observaciones_generales'    => 'nullable|string',
        ]);

        DB::transaction(function () use ($inspeccion, $validated, $request) {
            foreach ($validated['items'] as $itemData) {
                InspeccionItem::where('id', $itemData['id'])
                    ->where('inspeccion_id', $inspeccion->id)
                    ->update([
                        'aplica'           => $itemData['aplica'] ?? true,
                        'resultado'        => $itemData['resultado'],
                        'puntaje_obtenido' => $itemData['puntaje_obtenido'] ?? ($itemData['resultado'] === 'conforme' ? 1 : 0),
                        'observaciones'    => $itemData['observaciones'] ?? null,
                    ]);
            }

            $inspeccion->update([
                'estado'                  => 'en_ejecucion',
                'ejecutada_en'            => now(),
                'observaciones_generales' => $validated['observaciones_generales'] ?? $inspeccion->observaciones_generales,
            ]);

            $inspeccion->calcularPuntaje();

            // Si hay ítems no conformes, cambiar estado
            $tieneNoConformes = InspeccionItem::where('inspeccion_id', $inspeccion->id)
                ->where('resultado', 'no_conforme')->exists();

            if ($tieneNoConformes) {
                $inspeccion->update(['estado' => 'con_hallazgos']);
            } else {
                $inspeccion->update(['estado' => 'ejecutada']);
            }
        });

        return response()->json($inspeccion->fresh(['items', 'hallazgos']));
    }

    /**
     * POST /api/inspecciones/{id}/hallazgos — Registrar hallazgo
     */
    public function registrarHallazgo(Request $request, int $id): JsonResponse
    {
        $inspeccion = Inspeccion::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);

        $validated = $request->validate([
            'inspeccion_item_id'      => 'nullable|exists:inspecciones_items,id',
            'descripcion'             => 'required|string',
            'tipo'                    => ['required', Rule::in(['no_conformidad','observacion','oportunidad_mejora'])],
            'criticidad'              => ['required', Rule::in(['leve','moderado','critico'])],
            'responsable_id'          => 'nullable|exists:personal,id',
            'fecha_limite_correccion' => 'nullable|date|after:today',
            'observaciones'           => 'nullable|string',
            'generar_seguimiento'     => 'boolean',
            'foto_base64'             => 'nullable|string',
        ]);

        $hallazgo = DB::transaction(function () use ($inspeccion, $validated, $request) {
            $conteo = InspeccionHallazgo::where('inspeccion_id', $inspeccion->id)->count() + 1;

            $fotoPath = null;
            if (!empty($validated['foto_base64'])) {
                $b64 = preg_replace('/^data:image\/\w+;base64,/', '', $validated['foto_base64']);
                $decoded = base64_decode($b64);
                if ($decoded !== false) {
                    $fname = 'inspecciones/hallazgos/' . $inspeccion->id . '_' . time() . '.jpg';
                    Storage::disk('public')->put($fname, $decoded);
                    $fotoPath = $fname;
                }
            }
            unset($validated['foto_base64']);

            $hallazgo = InspeccionHallazgo::create([
                ...$validated,
                'inspeccion_id'      => $inspeccion->id,
                'numero_hallazgo'    => sprintf('H-%03d', $conteo),
                'estado'             => 'pendiente',
                'evidencia_antes_path' => $fotoPath,
            ]);

            // Generar acción de seguimiento automáticamente si se solicitó
            if ($validated['generar_seguimiento'] ?? false) {
                $accion = AccionSeguimiento::create([
                    'empresa_id'       => $inspeccion->empresa_id,
                    'origen_tipo'      => 'inspeccion',
                    'origen_id'        => $inspeccion->id,
                    'codigo'           => AccionSeguimiento::generarCodigo($inspeccion->empresa_id),
                    'tipo'             => 'correctiva',
                    'titulo'           => "Hallazgo {$hallazgo->numero_hallazgo}: {$inspeccion->titulo}",
                    'descripcion'      => $hallazgo->descripcion,
                    'responsable_id'   => $validated['responsable_id'],
                    'area_id'          => $inspeccion->area_id,
                    'prioridad'        => $validated['criticidad'] === 'critico' ? 'alta' : 'media',
                    'fecha_programada' => now()->toDateString(),
                    'fecha_limite'     => $validated['fecha_limite_correccion'] ?? now()->addDays(7)->toDateString(),
                    'estado'           => 'pendiente',
                ]);

                $hallazgo->update(['accion_seguimiento_id' => $accion->id]);
            }

            return $hallazgo;
        });

        $result = $hallazgo->load(['responsable:id,nombres,apellidos', 'accion']);
        if ($hallazgo->evidencia_antes_path) {
            $result->foto_url = Storage::disk('public')->url($hallazgo->evidencia_antes_path);
        }

        return response()->json($result, 201);
    }

    /**
     * GET /api/inspecciones/{id}/reporte
     */
    public function reporte(Request $request, int $id): JsonResponse
    {
        $inspeccion = Inspeccion::where('empresa_id', $request->user()->empresa_id)
            ->with([
                'area:id,nombre', 'sede:id,nombre',
                'inspector:id,nombres,apellidos',
                'items',
                'hallazgos.responsable:id,nombres,apellidos',
            ])
            ->findOrFail($id);

        $resumenItems = $inspeccion->items->groupBy('categoria')->map(function ($items, $cat) {
            $conformes  = $items->where('resultado', 'conforme')->count();
            $total      = $items->where('aplica', true)->count();
            return [
                'categoria'  => $cat,
                'total'      => $total,
                'conformes'  => $conformes,
                'porcentaje' => $total > 0 ? round($conformes / $total * 100) : 0,
            ];
        })->values();

        return response()->json([
            'inspeccion'    => $inspeccion,
            'resumen_items' => $resumenItems,
            'hallazgos'     => $inspeccion->hallazgos,
        ]);
    }

    /**
     * POST /api/inspecciones/{id}/cerrar
     */
    public function cerrar(Request $request, int $id): JsonResponse
    {
        $inspeccion = Inspeccion::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);

        if (!in_array($inspeccion->estado, ['ejecutada', 'con_hallazgos'])) {
            return response()->json(['message' => 'Solo se puede cerrar una inspección ejecutada.'], 422);
        }

        $inspeccion->update(['estado' => 'cerrada']);

        // Re-inspección automática si hay hallazgos críticos sin resolver
        $reinspeccion = null;
        if ($inspeccion->equipo_catalogo_id) {
            $criticos = InspeccionHallazgo::where('inspeccion_id', $inspeccion->id)
                ->where('criticidad', 'critico')
                ->whereNotIn('estado', ['subsanado', 'verificado'])
                ->count();

            if ($criticos > 0) {
                $reinspeccion = Inspeccion::create([
                    'empresa_id'         => $inspeccion->empresa_id,
                    'sede_id'            => $inspeccion->sede_id,
                    'area_id'            => $inspeccion->area_id,
                    'tipo'               => $inspeccion->tipo,
                    'titulo'             => 'Re-inspección: ' . $inspeccion->titulo,
                    'descripcion'        => "Re-inspección automática por {$criticos} hallazgo(s) crítico(s) en {$inspeccion->codigo}.",
                    'planificada_para'   => now()->addDays(15)->toDateString(),
                    'equipo_catalogo_id' => $inspeccion->equipo_catalogo_id,
                    'equipo_id'          => $inspeccion->equipo_id,
                    'submodulo_id'       => $inspeccion->submodulo_id,
                    'inspector_id'       => $inspeccion->inspector_id,
                    'supervisor_id'      => $inspeccion->supervisor_id,
                    'estado'             => 'programada',
                    'codigo'             => Inspeccion::generarCodigo($inspeccion->empresa_id, $inspeccion->tipo),
                    'elaborado_por'      => $request->user()->id,
                ]);
            }
        }

        return response()->json([
            'message'      => 'Inspección cerrada correctamente.',
            'reinspeccion' => $reinspeccion ? [
                'id'     => $reinspeccion->id,
                'codigo' => $reinspeccion->codigo,
                'fecha'  => $reinspeccion->planificada_para,
            ] : null,
        ]);
    }

    /**
     * GET /api/inspecciones/{id}/hallazgos-previos
     * Hallazgos abiertos de inspecciones anteriores del mismo equipo/catálogo
     */
    public function hallazgosPrevios(Request $request, int $id): JsonResponse
    {
        $inspeccion = Inspeccion::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);

        if (!$inspeccion->equipo_catalogo_id) {
            return response()->json(['hallazgos' => []]);
        }

        $hallazgos = InspeccionHallazgo::whereHas('inspeccion', function ($q) use ($inspeccion) {
            $q->where('empresa_id', $inspeccion->empresa_id)
              ->where('equipo_catalogo_id', $inspeccion->equipo_catalogo_id)
              ->when($inspeccion->equipo_id, fn($s) => $s->where('equipo_id', $inspeccion->equipo_id))
              ->where('id', '!=', $inspeccion->id)
              ->whereIn('estado', ['ejecutada', 'con_hallazgos', 'cerrada']);
        })
        ->whereNotIn('estado', ['verificado', 'subsanado'])
        ->with(['inspeccion:id,codigo,planificada_para', 'responsable:id,nombres,apellidos'])
        ->orderByRaw("FIELD(criticidad,'critico','moderado','leve')")
        ->orderBy('fecha_limite_correccion')
        ->get();

        return response()->json(['hallazgos' => $hallazgos]);
    }

    /**
     * POST /api/inspecciones/{id}/verificar-hallazgo/{hallazgoId}
     * Marca un hallazgo de inspección anterior como verificado en la inspección actual
     */
    public function verificarHallazgoPrevio(Request $request, int $id, int $hallazgoId): JsonResponse
    {
        $inspeccion = Inspeccion::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);
        $hallazgo   = InspeccionHallazgo::findOrFail($hallazgoId);

        $origen = Inspeccion::find($hallazgo->inspeccion_id);
        if (!$origen || $origen->empresa_id !== $inspeccion->empresa_id) {
            return response()->json(['message' => 'Hallazgo no autorizado.'], 403);
        }

        $nota = "✓ Verificado en {$inspeccion->codigo} el " . now()->format('d/m/Y');
        $hallazgo->update([
            'estado'       => 'verificado',
            'observaciones' => $hallazgo->observaciones
                ? $hallazgo->observaciones . "\n" . $nota
                : $nota,
        ]);

        return response()->json(['message' => 'Hallazgo verificado.', 'hallazgo' => $hallazgo->fresh()]);
    }

    /**
     * GET /api/inspecciones/estadisticas
     */
    public function estadisticas(Request $request): JsonResponse
    {
        $empresaId = $request->user()->empresa_id;
        $base      = Inspeccion::where('empresa_id', $empresaId);

        // Totales por estado (sin agrupar por tipo para obtener el total real)
        $porEstado = (clone $base)
            ->selectRaw('estado, COUNT(*) as total')
            ->groupBy('estado')
            ->pluck('total', 'estado');

        // Totales por tipo
        $porTipo = (clone $base)
            ->selectRaw('tipo, COUNT(*) as total')
            ->groupBy('tipo')
            ->pluck('total', 'tipo');

        // % cumplimiento = tasa de ejecución (inspecciones ejecutadas / total programadas)
        // Métrica estándar SST: cuántas de las inspecciones programadas se llevaron a cabo
        $totalInspecciones  = (clone $base)->count();
        $totalEjecutadas    = (clone $base)
            ->whereIn('estado', ['ejecutada', 'con_hallazgos', 'cerrada'])
            ->count();
        $pctEjecucion = $totalInspecciones > 0
            ? round($totalEjecutadas / $totalInspecciones * 100, 1)
            : 0;

        // También calcular el promedio de calidad de las inspeccionadas (para referencia)
        $promCalidad = (clone $base)
            ->whereIn('estado', ['ejecutada', 'con_hallazgos', 'cerrada'])
            ->whereNotNull('porcentaje_cumplimiento')
            ->avg('porcentaje_cumplimiento');

        return response()->json([
            'por_estado' => [
                'programada'    => [['total' => $porEstado['programada']    ?? 0]],
                'en_ejecucion'  => [['total' => $porEstado['en_ejecucion']  ?? 0]],
                'ejecutada'     => [['total' => $porEstado['ejecutada']     ?? 0]],
                'con_hallazgos' => [['total' => $porEstado['con_hallazgos'] ?? 0]],
                'cerrada'       => [['total' => $porEstado['cerrada']       ?? 0]],
                'anulada'       => [['total' => $porEstado['anulada']       ?? 0]],
            ],
            'por_tipo'                        => $porTipo,
            'total'                           => $totalInspecciones,
            'ejecutadas'                      => $totalEjecutadas,
            // % ejecución = inspeccionadas/total (métrica SST correcta)
            'porcentaje_cumplimiento_promedio' => $pctEjecucion,
            // % calidad = promedio de notas de las ejecutadas (dato adicional)
            'promedio_calidad_ejecutadas'      => round($promCalidad ?? 0, 1),
        ]);
    }

    public function dashboard(Request $request): JsonResponse
    {
        $empresaId  = $request->user()->empresa_id;
        $equipoId   = $request->filled('equipo_id')  ? (int)$request->equipo_id  : null;
        $resultado  = $request->filled('resultado')   ? $request->resultado       : null; // conforme|regular|no_conforme|sin_resultado
        $meses      = max(3, min(12, $request->integer('meses', 6)));

        // Base con filtros opcionales
        $base = Inspeccion::where('empresa_id', $empresaId);
        if ($equipoId) $base->where('equipo_catalogo_id', $equipoId);
        if ($resultado) {
            match($resultado) {
                'conforme'      => $base->where('porcentaje_cumplimiento', '>=', 80),
                'regular'       => $base->whereBetween('porcentaje_cumplimiento', [50, 79.99]),
                'no_conforme'   => $base->where('porcentaje_cumplimiento', '<', 50)->whereNotNull('porcentaje_cumplimiento'),
                'sin_resultado' => $base->whereNull('porcentaje_cumplimiento'),
                default         => null,
            };
        }

        // KPIs generales
        $total       = (clone $base)->count();
        $porEstado   = (clone $base)->selectRaw('estado, COUNT(*) as total')->groupBy('estado')->pluck('total','estado');
        $pctPromedio = (clone $base)->whereIn('estado',['ejecutada','con_hallazgos','cerrada'])->avg('porcentaje_cumplimiento');

        // Checklist KPIs
        $baseChk = (clone $base)->whereNotNull('equipo_catalogo_id');
        $chkTotal   = (clone $baseChk)->count();
        $chkComplet = (clone $baseChk)->whereIn('estado',['ejecutada','con_hallazgos','cerrada'])->count();
        $chkPct     = (clone $baseChk)->avg('porcentaje_cumplimiento');
        $accionesAb = DB::table('inspeccion_acciones_checklist as a')
            ->join('inspecciones as i','a.inspeccion_id','=','i.id')
            ->where('i.empresa_id', $empresaId)->where('a.estado','!=','cerrado')->count();

        // Por sub-módulo
        $porSubmodulo = (clone $baseChk)
            ->join('inspeccion_submodulos as s','inspecciones.submodulo_id','=','s.id')
            ->select('s.nombre','s.codigo',
                DB::raw('COUNT(*) as total'),
                DB::raw('ROUND(AVG(inspecciones.porcentaje_cumplimiento),1) as puntaje_prom'))
            ->groupBy('s.id','s.nombre','s.codigo')->get();

        // Últimos N meses
        $porMes = (clone $base)
            ->where('planificada_para', '>=', now()->subMonths($meses - 1)->startOfMonth())
            ->selectRaw("DATE_FORMAT(planificada_para,'%Y-%m') as mes, COUNT(*) as total, ROUND(AVG(porcentaje_cumplimiento),1) as pct_prom")
            ->groupBy('mes')->orderBy('mes')->get();

        // Por tipo con promedio de cumplimiento
        $porTipo = (clone $base)
            ->selectRaw('tipo, COUNT(*) as total, ROUND(AVG(porcentaje_cumplimiento),1) as pct_prom')
            ->groupBy('tipo')
            ->get();

        // Top NC equipos
        $topNC = DB::table('inspeccion_respuestas as r')
            ->join('inspecciones as i','r.inspeccion_id','=','i.id')
            ->join('equipos_catalogo as e','i.equipo_catalogo_id','=','e.id')
            ->where('i.empresa_id', $empresaId)->where('r.resultado','N')
            ->when($equipoId, fn($q) => $q->where('i.equipo_catalogo_id', $equipoId))
            ->select('e.nombre as equipo', DB::raw('COUNT(*) as nc_total'))
            ->groupBy('e.id','e.nombre')->orderByDesc('nc_total')->limit(5)->get();

        // Últimas 5 inspecciones (con filtros)
        $ultimas = (clone $base)
            ->with(['area:id,nombre','equipoCatalogo:id,nombre'])
            ->orderByDesc('created_at')->limit(5)
            ->get(['id','codigo','titulo','tipo','estado','porcentaje_cumplimiento','planificada_para','area_id','equipo_catalogo_id']);

        // Lista de equipos disponibles para filtro (solo los que tienen inspecciones)
        $equiposDisponibles = \App\Models\EquipoCatalogo::whereIn('id',
            Inspeccion::where('empresa_id', $empresaId)->whereNotNull('equipo_catalogo_id')->pluck('equipo_catalogo_id')
        )->orderBy('nombre')->get(['id','nombre','codigo']);

        return response()->json([
            'total'           => $total,
            'por_estado'      => $porEstado,
            'pct_promedio'    => round($pctPromedio ?? 0, 1),
            'checklist'       => [
                'total'      => $chkTotal,
                'completadas'=> $chkComplet,
                'pct_prom'   => round($chkPct ?? 0, 1),
                'acciones_abiertas' => $accionesAb,
            ],
            'por_submodulo'        => $porSubmodulo,
            'por_mes'              => $porMes,
            'por_tipo'             => $porTipo,
            'top_nc'               => $topNC,
            'ultimas'              => $ultimas,
            'equipos_disponibles'  => $equiposDisponibles,
            'filtros_activos'      => [
                'equipo_id' => $equipoId,
                'resultado' => $resultado,
                'meses'     => $meses,
            ],
        ]);
    }

    // ── Listar inspecciones de checklist programadas ─────────────────────

    public function programadasChecklist(Request $request): JsonResponse
    {
        $eid = $request->user()->empresa_id;

        $inspecciones = Inspeccion::where('empresa_id', $eid)
            ->whereNotNull('equipo_catalogo_id')
            ->with([
                'area:id,nombre',
                'inspector:id,nombres,apellidos',
                'equipoCatalogo:id,nombre,codigo,frecuencia_inspeccion',
            ])
            ->orderBy('planificada_para')
            ->get(['id','codigo','titulo','estado','planificada_para','porcentaje_cumplimiento',
                   'equipo_catalogo_id','area_id','inspector_id','turno','submodulo_id']);

        // Agrupar por equipo_catalogo
        $porEquipo = $inspecciones->groupBy('equipo_catalogo_id')->map(function ($items, $catId) {
            $ultimo = $items->whereIn('estado',['ejecutada','con_hallazgos','cerrada'])->sortByDesc('planificada_para')->first();
            $proxima = $items->where('estado','programada')->sortBy('planificada_para')->first();
            $cat = $items->first()->equipoCatalogo;

            return [
                'catalogo_id'       => $catId,
                'catalogo_nombre'   => $cat?->nombre,
                'catalogo_codigo'   => $cat?->codigo,
                'frecuencia'        => $cat?->frecuencia_inspeccion,
                'total'             => $items->count(),
                'programadas'       => $items->where('estado','programada')->count(),
                'completadas'       => $items->whereIn('estado',['ejecutada','con_hallazgos','cerrada'])->count(),
                'pct_prom'          => round($items->whereNotNull('porcentaje_cumplimiento')->avg('porcentaje_cumplimiento') ?? 0, 1),
                'ultima_inspeccion' => $ultimo ? [
                    'id'              => $ultimo->id,
                    'codigo'          => $ultimo->codigo,
                    'fecha'           => $ultimo->planificada_para,
                    'estado'          => $ultimo->estado,
                    'porcentaje'      => $ultimo->porcentaje_cumplimiento,
                ] : null,
                'proxima_programada'=> $proxima ? [
                    'id'     => $proxima->id,
                    'codigo' => $proxima->codigo,
                    'fecha'  => $proxima->planificada_para,
                    'turno'  => $proxima->turno,
                ] : null,
                'inspecciones'      => $items->map(fn($i) => [
                    'id'          => $i->id,
                    'codigo'      => $i->codigo,
                    'estado'      => $i->estado,
                    'fecha'       => $i->planificada_para,
                    'porcentaje'  => $i->porcentaje_cumplimiento,
                    'inspector'   => $i->inspector ? "{$i->inspector->nombres} {$i->inspector->apellidos}" : null,
                    'area'        => $i->area?->nombre,
                    'turno'       => $i->turno,
                ])->values(),
            ];
        })->values();

        // KPIs rápidos
        $totalProgramadas = $inspecciones->where('estado','programada')->count();
        $vencidas = $inspecciones->where('estado','programada')
            ->where('planificada_para','<', now()->toDateString())->count();

        return response()->json([
            'por_equipo'        => $porEquipo,
            'total_programadas' => $totalProgramadas,
            'total_vencidas'    => $vencidas,
            'total_equipos'     => $porEquipo->count(),
        ]);
    }

    // ── Programar nueva inspección de checklist ───────────────────────────

    public function programarChecklist(Request $request): JsonResponse
    {
        $eid = $request->user()->empresa_id;

        $data = $request->validate([
            'equipo_catalogo_id' => 'required|exists:equipos_catalogo,id',
            'equipo_id'          => 'nullable|exists:equipos,id',
            'planificada_para'   => 'required|date|after_or_equal:today',
            'inspector_id'       => 'nullable|exists:personal,id',
            'turno'              => 'nullable|in:mañana,tarde,noche',
            'area_id'            => 'nullable|exists:areas,id',
            'observaciones'      => 'nullable|string',
            'foto_base64'        => 'nullable|string',
        ]);

        $catalogo = \App\Models\EquipoCatalogo::findOrFail($data['equipo_catalogo_id']);

        // Buscar sub-módulo del catálogo
        $submodulo = \App\Models\InspeccionSubmodulo::find($catalogo->submodulo_id);
        $tipo = $submodulo?->tipo_inspeccion ?? 'equipos';

        // Si no se provee area_id, tomarlo del equipo específico o del primer equipo del catálogo
        $areaId = $data['area_id'] ?? null;
        if (!$areaId) {
            // Si se especifica equipo_id, usar su área
            if (!empty($data['equipo_id'])) {
                $equipo = \App\Models\Equipo::find($data['equipo_id']);
                $areaId = $equipo?->area_id;
            }
            // Si no, tomar área del primer equipo del catálogo
            if (!$areaId) {
                $equipo = \App\Models\Equipo::where('equipo_catalogo_id', $data['equipo_catalogo_id'])
                    ->where('empresa_id', $eid)
                    ->whereNull('deleted_at')
                    ->first();
                $areaId = $equipo?->area_id;
            }
        }

        // Fallback: usar la primera área disponible si aún es null
        if (!$areaId) {
            $areaId = \App\Models\Area::whereNull('deleted_at')->value('id') ?? 1;
        }

        // Si no se especifica inspector, asignar automáticamente el usuario actual
        $inspectorId = $data['inspector_id'] ?? $request->user()->personal_id;

        // Guardar foto de inicio si se envía
        $fotoPath = null;
        if (!empty($data['foto_base64'])) {
            $b64 = preg_replace('/^data:image\/\w+;base64,/', '', $data['foto_base64']);
            $decoded = base64_decode($b64);
            if ($decoded !== false) {
                $fname = 'inspecciones/inicio/' . uniqid() . '_' . time() . '.jpg';
                \Illuminate\Support\Facades\Storage::disk('public')->put($fname, $decoded);
                $fotoPath = $fname;
            }
        }

        $inspeccion = Inspeccion::create([
            'empresa_id'         => $eid,
            'sede_id'            => 1,
            'area_id'            => $areaId,
            'tipo'               => $tipo,
            'titulo'             => $catalogo->nombre,
            'planificada_para'   => $data['planificada_para'],
            'inspector_id'       => $inspectorId,
            'turno'              => $data['turno'] ?? 'mañana',
            'equipo_catalogo_id' => $data['equipo_catalogo_id'],
            'equipo_id'          => $data['equipo_id'] ?? null,
            'submodulo_id'       => $catalogo->submodulo_id,
            'estado'             => 'programada',
            'foto_inicio_path'   => $fotoPath,
            'codigo'             => Inspeccion::generarCodigo($eid, $tipo),
            'elaborado_por'      => $request->user()->id,
            'observaciones_generales' => $data['observaciones'] ?? null,
        ]);

        return response()->json($inspeccion->load(['area:id,nombre','equipoCatalogo:id,nombre,codigo','equipo:id,codigo,nombre']), 201);
    }

    // ── Tendencia mensual del programa (últimos N meses) ─────────────────────
    public function tendenciaMensual(Request $request): JsonResponse
    {
        $eid   = $request->user()->empresa_id;
        $meses = max(3, min(12, $request->integer('meses', 6)));

        $catsDiarios = DB::table('equipos_catalogo')
            ->where('frecuencia_inspeccion', 'diaria')
            ->pluck('id');

        $desde = now()->subMonths($meses - 1)->startOfMonth()->toDateString();

        $porMes = DB::table('inspecciones')
            ->where('empresa_id', $eid)
            ->whereNotIn('equipo_catalogo_id', $catsDiarios)
            ->whereNull('deleted_at')
            ->where('planificada_para', '>=', $desde)
            ->selectRaw("DATE_FORMAT(planificada_para,'%Y-%m') as mes")
            ->selectRaw('COUNT(*) as total')
            ->selectRaw("SUM(CASE WHEN estado IN ('ejecutada','con_hallazgos','cerrada') THEN 1 ELSE 0 END) as completadas")
            ->selectRaw("ROUND(AVG(CASE WHEN estado IN ('ejecutada','con_hallazgos','cerrada') AND porcentaje_cumplimiento IS NOT NULL THEN porcentaje_cumplimiento END),1) as pct_promedio")
            ->groupBy('mes')
            ->orderBy('mes')
            ->get();

        $criticosPorMes = DB::table('inspecciones_hallazgos as h')
            ->join('inspecciones as i', 'i.id', '=', 'h.inspeccion_id')
            ->where('i.empresa_id', $eid)
            ->whereNotIn('i.equipo_catalogo_id', $catsDiarios)
            ->whereNull('i.deleted_at')
            ->where('i.planificada_para', '>=', $desde)
            ->where('h.criticidad', 'critico')
            ->selectRaw("DATE_FORMAT(i.planificada_para,'%Y-%m') as mes")
            ->selectRaw('COUNT(*) as criticos')
            ->groupBy('mes')
            ->pluck('criticos', 'mes');

        $datos = $porMes->map(fn($m) => [
            'mes'              => $m->mes,
            'total'            => $m->total,
            'completadas'      => (int) $m->completadas,
            'pct_ejecucion'    => $m->total > 0 ? round($m->completadas / $m->total * 100, 1) : 0,
            'pct_cumplimiento' => $m->pct_promedio,
            'criticos'         => (int) $criticosPorMes->get($m->mes, 0),
        ]);

        return response()->json(['meses' => $meses, 'datos' => $datos]);
    }

    // ── Mis inspecciones asignadas ────────────────────────────────────────────
    public function misInspecciones(Request $request): JsonResponse
    {
        $user = $request->user();

        // Solo inspecciones asignadas explícitamente a este usuario
        $query = Inspeccion::where('empresa_id', $user->empresa_id)
            ->where('inspector_usuario_id', $user->id)
            ->whereNull('deleted_at')
            ->whereNotIn('estado', ['anulada'])
            ->with(['area:id,nombre', 'equipoCatalogo:id,nombre,codigo']);

        // Filtro de mes opcional. Sin mes → muestra todas (pendientes no cerradas por defecto)
        if ($request->filled('mes') && $request->filled('anio')) {
            $desde = sprintf('%04d-%02d-01', $request->integer('anio'), $request->integer('mes'));
            $hasta = date('Y-m-t', strtotime($desde));
            $query->whereBetween('planificada_para', [$desde, $hasta]);
        } elseif (!$request->boolean('todas', false)) {
            // Por defecto: solo no cerradas (pendientes + en progreso + ejecutadas sin cerrar)
            $query->whereNotIn('estado', ['cerrada']);
        }

        if ($request->filled('estado')) {
            $query->where('estado', $request->estado);
        }

        $inspecciones = $query->orderBy('planificada_para')->get();

        return response()->json([
            'inspecciones' => $inspecciones,
            'resumen' => [
                'total'       => $inspecciones->count(),
                'programadas' => $inspecciones->where('estado', 'programada')->count(),
                'en_progreso' => $inspecciones->where('estado', 'en_ejecucion')->count(),
                'ejecutadas'  => $inspecciones->whereIn('estado', ['ejecutada', 'con_hallazgos', 'cerrada'])->count(),
            ],
        ]);
    }

    /**
     * GET /api/inspecciones/kpi-equipos?periodo=semana
     * KPI de cumplimiento de inspecciones agrupado por tipo de equipo (catálogo).
     * periodo: hoy | semana | mes
     * Devuelve resumen general + array de equipos con pct_actual, pct_anterior, delta, hist[7].
     */
    public function kpiEquipos(Request $request): JsonResponse
    {
        $eid    = $request->user()->empresa_id;
        $period = $request->input('periodo', 'semana');
        if (!in_array($period, ['hoy', 'semana', 'mes'])) {
            $period = 'semana';
        }

        $estados     = ['ejecutada', 'cerrada', 'con_hallazgos'];
        $estadosSql  = "'ejecutada','cerrada','con_hallazgos'";
        $pctExpr     = "AVG(CASE WHEN estado IN ({$estadosSql}) AND porcentaje_cumplimiento IS NOT NULL THEN porcentaje_cumplimiento END)";
        $cntExpr     = "SUM(CASE WHEN estado IN ({$estadosSql}) THEN 1 ELSE 0 END)";

        // ── Rangos del período actual y anterior ──────────────────────────────
        [$desde, $hasta, $prevDesde, $prevHasta] = $this->_kpiRangos($period);

        // ── Catálogos activos ─────────────────────────────────────────────────
        $catalogos = DB::table('equipos_catalogo')
            ->where('activo', true)
            ->orderBy('orden')
            ->get(['id', 'nombre', 'codigo']);

        $catIds = $catalogos->pluck('id');

        // ── Stats período actual por catálogo ─────────────────────────────────
        $actual = DB::table('inspecciones')
            ->whereNull('deleted_at')
            ->where('empresa_id', $eid)
            ->whereIn('equipo_catalogo_id', $catIds)
            ->whereBetween('planificada_para', [$desde, $hasta])
            ->selectRaw("equipo_catalogo_id,
                COUNT(*) as total,
                {$cntExpr} as realizadas,
                {$pctExpr} as pct")
            ->groupBy('equipo_catalogo_id')
            ->get()
            ->keyBy('equipo_catalogo_id');

        // ── Stats período anterior por catálogo ───────────────────────────────
        $prev = DB::table('inspecciones')
            ->whereNull('deleted_at')
            ->where('empresa_id', $eid)
            ->whereIn('equipo_catalogo_id', $catIds)
            ->whereBetween('planificada_para', [$prevDesde, $prevHasta])
            ->selectRaw("equipo_catalogo_id, {$pctExpr} as pct")
            ->groupBy('equipo_catalogo_id')
            ->get()
            ->keyBy('equipo_catalogo_id');

        // ── Histórico (7 buckets) ─────────────────────────────────────────────
        $buckets     = $this->_kpiBuckets($period);
        $histData    = $this->_kpiHist($eid, $catIds, $period, $buckets, $estadosSql);

        // ── Armar respuesta por equipo ────────────────────────────────────────
        $equipos = [];
        foreach ($catalogos as $cat) {
            $a = $actual->get($cat->id);
            if (!$a || $a->total == 0) {
                continue; // sin inspecciones en el período → omitir
            }
            $p          = $prev->get($cat->id);
            $pctActual  = $a->pct !== null  ? round((float) $a->pct, 1)  : null;
            $pctAnterior= $p?->pct !== null ? round((float) $p->pct, 1) : null;

            $hist = array_map(function ($b) use ($histData, $cat) {
                $val = $histData[$cat->id][$b['key']] ?? null;
                return $val !== null ? round((float) $val, 1) : null;
            }, $buckets);

            $equipos[] = [
                'id'           => $cat->id,
                'nombre'       => $cat->nombre,
                'codigo'       => $cat->codigo,
                'total'        => (int) $a->total,
                'realizadas'   => (int) $a->realizadas,
                'pct_actual'   => $pctActual,
                'pct_anterior' => $pctAnterior,
                'delta'        => $pctActual !== null && $pctAnterior !== null
                    ? round($pctActual - $pctAnterior, 1)
                    : null,
                'hist'         => $hist,
                'hist_labels'  => array_column($buckets, 'label'),
            ];
        }

        // ── Resumen global ────────────────────────────────────────────────────
        $col        = collect($equipos);
        $pcts       = $col->whereNotNull('pct_actual')->pluck('pct_actual');
        $prevPcts   = $col->whereNotNull('pct_anterior')->pluck('pct_anterior');

        $cumActual  = $pcts->count()     > 0 ? round($pcts->avg(), 1)     : null;
        $cumAnterior= $prevPcts->count() > 0 ? round($prevPcts->avg(), 1) : null;

        return response()->json([
            'periodo' => $period,
            'desde'   => $desde,
            'hasta'   => $hasta,
            'resumen' => [
                'cumplimiento_general'  => $cumActual,
                'cumplimiento_anterior' => $cumAnterior,
                'tendencia'             => $cumActual !== null && $cumAnterior !== null
                    ? round($cumActual - $cumAnterior, 1) : null,
                'realizadas'            => $col->sum('realizadas'),
                'programadas'           => $col->sum('total'),
                'criticos'              => $col->where('pct_actual', '<', 65)->count(),
            ],
            'equipos'      => $equipos,
            'hist_labels'  => array_column($buckets, 'label'),
        ]);
    }

    private function _kpiRangos(string $period): array
    {
        $hoy = now()->startOfDay();

        return match ($period) {
            'hoy' => [
                $hoy->toDateTimeString(),
                $hoy->copy()->endOfDay()->toDateTimeString(),
                $hoy->copy()->subDay()->toDateTimeString(),
                $hoy->copy()->subDay()->endOfDay()->toDateTimeString(),
            ],
            'semana' => [
                $hoy->copy()->startOfWeek()->toDateString(),
                $hoy->copy()->endOfWeek()->toDateString(),
                $hoy->copy()->subWeek()->startOfWeek()->toDateString(),
                $hoy->copy()->subWeek()->endOfWeek()->toDateString(),
            ],
            default => [
                $hoy->copy()->startOfMonth()->toDateString(),
                $hoy->copy()->endOfMonth()->toDateString(),
                $hoy->copy()->subMonth()->startOfMonth()->toDateString(),
                $hoy->copy()->subMonth()->endOfMonth()->toDateString(),
            ],
        };
    }

    private function _kpiBuckets(string $period): array
    {
        $now     = now();
        $buckets = [];

        if ($period === 'hoy') {
            for ($i = 6; $i >= 0; $i--) {
                $h = $now->copy()->subHours($i);
                $buckets[] = [
                    'key'   => $h->format('H'),
                    'label' => $h->format('H:i'),
                ];
            }
        } elseif ($period === 'semana') {
            for ($i = 6; $i >= 0; $i--) {
                $d = $now->copy()->subDays($i);
                $buckets[] = [
                    'key'   => $d->toDateString(),
                    'label' => $d->locale('es')->isoFormat('ddd'),
                ];
            }
        } else {
            for ($i = 6; $i >= 0; $i--) {
                $w = $now->copy()->subWeeks($i);
                $buckets[] = [
                    'key'   => $w->format('oW'), // ISO year+week e.g. "202527"
                    'label' => 'S' . $w->isoWeek(),
                ];
            }
        }

        return $buckets;
    }

    private function _kpiHist($eid, $catIds, string $period, array $buckets, string $estadosSql): array
    {
        $pctExpr = "AVG(CASE WHEN estado IN ({$estadosSql}) AND porcentaje_cumplimiento IS NOT NULL THEN porcentaje_cumplimiento END)";

        if ($period === 'hoy') {
            $desde = now()->subHours(6)->startOfHour()->toDateTimeString();
            $rows  = DB::table('inspecciones')
                ->whereNull('deleted_at')
                ->where('empresa_id', $eid)
                ->whereIn('equipo_catalogo_id', $catIds)
                ->where('planificada_para', '>=', $desde)
                ->selectRaw("equipo_catalogo_id, LPAD(HOUR(planificada_para),2,'0') as bk, {$pctExpr} as pct")
                ->groupBy('equipo_catalogo_id', 'bk')
                ->get();
        } elseif ($period === 'semana') {
            $desde = now()->subDays(6)->startOfDay()->toDateString();
            $rows  = DB::table('inspecciones')
                ->whereNull('deleted_at')
                ->where('empresa_id', $eid)
                ->whereIn('equipo_catalogo_id', $catIds)
                ->where('planificada_para', '>=', $desde)
                ->selectRaw("equipo_catalogo_id, DATE(planificada_para) as bk, {$pctExpr} as pct")
                ->groupBy('equipo_catalogo_id', 'bk')
                ->get();
        } else {
            $desde = now()->subWeeks(6)->startOfWeek()->toDateString();
            $rows  = DB::table('inspecciones')
                ->whereNull('deleted_at')
                ->where('empresa_id', $eid)
                ->whereIn('equipo_catalogo_id', $catIds)
                ->where('planificada_para', '>=', $desde)
                ->selectRaw("equipo_catalogo_id, DATE_FORMAT(planificada_para, '%x%V') as bk, {$pctExpr} as pct")
                ->groupBy('equipo_catalogo_id', 'bk')
                ->get();
        }

        // Index: [catId][bucketKey] = pct
        $map = [];
        foreach ($rows as $row) {
            $map[$row->equipo_catalogo_id][$row->bk] = $row->pct;
        }

        return $map;
    }

    /**
     * GET /api/inspecciones/pendientes-firma
     * Inspecciones con estado de firmas. tipo=diaria|mensual
     */
    public function pendientesFirma(Request $request): JsonResponse
    {
        $eid  = $request->user()->empresa_id;
        $tipo = $request->input('tipo', 'diaria'); // diaria | mensual
        $dias = max(1, min(90, $request->integer('dias', $tipo === 'mensual' ? 60 : 7)));
        $desde = now()->subDays($dias)->toDateString();

        $catsDiarios = DB::table('equipos_catalogo')
            ->where('frecuencia_inspeccion', 'diaria')
            ->pluck('id');

        $query = Inspeccion::where('empresa_id', $eid)
            ->where('planificada_para', '>=', $desde)
            ->with(['area:id,nombre', 'equipoCatalogo:id,nombre,codigo'])
            ->orderByDesc('planificada_para');

        if ($tipo === 'diaria') {
            // Incluir: equipos con frecuencia diaria Y cualquier inspección de tipo 'equipos' (Mis Equipos Hoy)
            $query->where(fn($q) =>
                $q->whereIn('equipo_catalogo_id', $catsDiarios)
                  ->orWhere('tipo', 'equipos')
            );
        } else {
            // mensual: excluir diarios, incluir inspeciones con catálogo mensual o sin catálogo
            $query->where(fn($q) =>
                $q->whereNotIn('equipo_catalogo_id', $catsDiarios)
                  ->orWhereNull('equipo_catalogo_id')
            );
        }

        $inspecciones = $query->get();

        $ids = $inspecciones->pluck('id');

        // Firmas del checklist (canvas: inspector + responsable_area)
        $firmasCanvas = DB::table('inspeccion_firmas_canvas')
            ->whereIn('inspeccion_id', $ids)
            ->get(['inspeccion_id', 'rol_firma', 'nombre_firmante', 'firmado_at'])
            ->groupBy('inspeccion_id');

        // Firma de APROBACIÓN (tabla firmas, accion_firma = 'aprueba')
        $firmasAprueba = DB::table('firmas')
            ->where('documento_tipo', 'App\\Models\\Inspeccion')
            ->whereIn('documento_id', $ids)
            ->where('accion_firma', 'aprueba')
            ->get(['documento_id', 'firmante_nombre', 'firmante_rol', 'firmado_en'])
            ->keyBy('documento_id');

        $resultado = $inspecciones->map(function ($i) use ($firmasCanvas, $firmasAprueba) {
            $fc          = $firmasCanvas->get($i->id, collect());
            $inspector   = $fc->firstWhere('rol_firma', 'inspector');
            $responsable = $fc->firstWhere('rol_firma', 'responsable_area');
            $aprobacion  = $firmasAprueba->get($i->id);

            $estadoEjecutado = in_array($i->estado, ['ejecutada', 'con_hallazgos', 'cerrada']);

            return [
                'id'                      => $i->id,
                'codigo'                  => $i->codigo,
                'titulo'                  => $i->equipoCatalogo?->nombre ?? $i->titulo,
                'equipo_codigo'           => $i->equipoCatalogo?->codigo,
                'area'                    => $i->area?->nombre ?? 'Sin área',
                'turno'                   => $i->turno,
                'estado'                  => $i->estado,
                'planificada_para'        => $i->planificada_para,
                'porcentaje_cumplimiento' => $i->porcentaje_cumplimiento,
                'firma_inspector'         => $inspector  ? ['nombre' => $inspector->nombre_firmante,  'fecha' => $inspector->firmado_at]  : null,
                'firma_responsable'       => $responsable ? ['nombre' => $responsable->nombre_firmante, 'fecha' => $responsable->firmado_at] : null,
                'firma_aprobacion'        => $aprobacion  ? ['nombre' => $aprobacion->firmante_nombre, 'fecha' => $aprobacion->firmado_en, 'rol' => $aprobacion->firmante_rol] : null,
                // Pendiente de aprobación: ejecutada/cerrada sin firma de aprobación
                'pendiente_aprobacion'    => $estadoEjecutado && !$aprobacion,
                'pendiente_firma'         => !$inspector || !$responsable,
            ];
        });

        return response()->json([
            'total'               => $resultado->count(),
            'pendientes'          => $resultado->where('pendiente_aprobacion', true)->count(),
            'inspecciones'        => $resultado->values(),
        ]);
    }

    /**
     * GET /api/inspecciones/alertas
     */
    public function alertas(Request $request): JsonResponse
    {
        $empresaId = $request->user()->empresa_id;

        // Inspecciones programadas que vencen en ≤7 días sin ejecutar
        $proximas = Inspeccion::where('empresa_id', $empresaId)
            ->where('estado', 'programada')
            ->whereBetween('planificada_para', [now()->toDateString(), now()->addDays(7)->toDateString()])
            ->with(['area:id,nombre', 'inspector:id,nombres,apellidos'])
            ->orderBy('planificada_para')
            ->get(['id', 'codigo', 'titulo', 'tipo', 'estado', 'planificada_para', 'area_id', 'inspector_id']);

        // Inspecciones vencidas (programada, planificada_para < hoy)
        $vencidas = Inspeccion::where('empresa_id', $empresaId)
            ->where('estado', 'programada')
            ->where('planificada_para', '<', now()->toDateString())
            ->with(['area:id,nombre', 'inspector:id,nombres,apellidos'])
            ->orderBy('planificada_para')
            ->get(['id', 'codigo', 'titulo', 'tipo', 'estado', 'planificada_para', 'area_id', 'inspector_id']);

        // Inspecciones en ejecución sin cerrar por más de 3 días
        $enEjecucionAntiguas = Inspeccion::where('empresa_id', $empresaId)
            ->where('estado', 'en_ejecucion')
            ->where('updated_at', '<', now()->subDays(3))
            ->with(['area:id,nombre', 'inspector:id,nombres,apellidos'])
            ->orderBy('updated_at')
            ->get(['id', 'codigo', 'titulo', 'tipo', 'estado', 'planificada_para', 'area_id', 'inspector_id', 'updated_at']);

        // Hallazgos vencidos sin cerrar
        $hallazgosVencidos = InspeccionHallazgo::whereHas('inspeccion', fn($q) => $q->where('empresa_id', $empresaId))
            ->whereNotIn('estado', ['subsanado', 'verificado'])
            ->whereNotNull('fecha_limite_correccion')
            ->where('fecha_limite_correccion', '<', now()->toDateString())
            ->with([
                'inspeccion:id,codigo,titulo',
                'responsable:id,nombres,apellidos',
                'area:id,nombre',
            ])
            ->orderBy('fecha_limite_correccion')
            ->limit(50)
            ->get();

        $totalAlertas = $proximas->count() + $vencidas->count()
                      + $enEjecucionAntiguas->count() + $hallazgosVencidos->count();

        return response()->json([
            'total_alertas'          => $totalAlertas,
            'proximas_a_vencer'      => $proximas,
            'vencidas'               => $vencidas,
            'en_ejecucion_antiguas'  => $enEjecucionAntiguas,
            'hallazgos_vencidos'     => $hallazgosVencidos,
        ]);
    }

    /**
     * POST /api/inspecciones/{id}/enviar-a-firma
     */
    public function enviarAFirma(Request $request, int $id): JsonResponse
    {
        $inspeccion = Inspeccion::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);

        $estadosPermitidos = ['programada', 'ejecutada', 'con_hallazgos', 'en_ejecucion'];
        if (!in_array($inspeccion->estado, $estadosPermitidos)) {
            return response()->json(['message' => 'La inspección no puede enviarse a firma en su estado actual.'], 422);
        }

        $solicitud = $this->firmaService->crearSolicitud(
            documento: $inspeccion,
            solicitadoPor: $request->user(),
            titulo: "Inspección {$inspeccion->codigo} — {$inspeccion->titulo}",
            diasLimite: 3
        );

        $inspeccion->update(['requiere_firma' => true]);

        return response()->json(['message' => 'Solicitud de firma enviada.', 'solicitud' => $solicitud], 201);
    }

    /**
     * POST /api/inspecciones/{id}/rechazar
     * Rechazar inspección y devolverla al inspector (permite reabrir cerradas)
     */
    public function rechazar(Request $request, int $id): JsonResponse
    {
        $inspeccion = Inspeccion::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);

        $validated = $request->validate([
            'motivo' => 'required|string|min:10|max:500',
        ]);

        // Permitir rechazar inspecciones ejecutadas, con hallazgos o cerradas
        if (!in_array($inspeccion->estado, ['ejecutada', 'con_hallazgos', 'cerrada'])) {
            return response()->json([
                'message' => 'Solo se pueden rechazar inspecciones ejecutadas o cerradas.'
            ], 422);
        }

        // Agregar motivo de rechazo a observaciones
        $observacionesAnteriores = $inspeccion->observaciones_generales ?? '';
        $nuevasObservaciones = "🔴 RECHAZADA - " . $validated['motivo'] . "\n\n" . $observacionesAnteriores;

        $inspeccion->update([
            'estado' => 'en_ejecucion',
            'observaciones_generales' => $nuevasObservaciones,
        ]);

        $this->auditoria->registrar(
            modulo: 'inspecciones',
            accion: 'rechazar',
            usuario: $request->user(),
            modelo: 'Inspeccion',
            modeloId: $inspeccion->id,
            valorNuevo: ['motivo' => $validated['motivo']],
            request: $request
        );

        return response()->json([
            'message' => 'Inspección rechazada y devuelta al inspector',
            'inspeccion' => $inspeccion->fresh(),
        ]);
    }

    /**
     * PUT /api/inspecciones/{inspeccionId}/hallazgos/{hallazgoId}
     */
    public function actualizarHallazgo(Request $request, int $inspeccionId, int $hallazgoId): JsonResponse
    {
        $inspeccion = Inspeccion::where('empresa_id', $request->user()->empresa_id)->findOrFail($inspeccionId);
        $hallazgo   = InspeccionHallazgo::where('inspeccion_id', $inspeccion->id)->findOrFail($hallazgoId);

        $validated = $request->validate([
            'estado'                  => ['sometimes', Rule::in(['pendiente','en_proceso','subsanado','verificado','vencido'])],
            'responsable_id'          => 'nullable|exists:personal,id',
            'fecha_limite_correccion' => 'nullable|date',
            'observaciones'           => 'nullable|string',
            'foto_despues_base64'     => 'nullable|string',
        ]);

        if (!empty($validated['foto_despues_base64'])) {
            $b64 = preg_replace('/^data:image\/\w+;base64,/', '', $validated['foto_despues_base64']);
            $decoded = base64_decode($b64);
            if ($decoded !== false) {
                $fname = 'inspecciones/hallazgos/after_' . $hallazgo->id . '_' . time() . '.jpg';
                Storage::disk('public')->put($fname, $decoded);
                $validated['evidencia_despues_path'] = $fname;
            }
            unset($validated['foto_despues_base64']);
        }

        $hallazgo->update($validated);

        return response()->json($hallazgo->fresh(['responsable:id,nombres,apellidos', 'area:id,nombre']));
    }
}
