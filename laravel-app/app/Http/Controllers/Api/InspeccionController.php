<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Inspeccion;
use App\Models\InspeccionItem;
use App\Models\InspeccionHallazgo;
use App\Models\AccionSeguimiento;
use App\Services\AuditoriaService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class InspeccionController extends Controller
{
    public function __construct(
        private AuditoriaService $auditoria
    ) {}

    /**
     * GET /api/inspecciones
     */
    public function index(Request $request): JsonResponse
    {
        $query = Inspeccion::where('empresa_id', $request->user()->empresa_id)
            ->with(['area:id,nombre', 'sede:id,nombre', 'inspector:id,nombres,apellidos']);

        if ($request->filled('estado'))    $query->where('estado', $request->estado);
        if ($request->filled('tipo'))      $query->where('tipo', $request->tipo);
        if ($request->filled('area_id'))   $query->where('area_id', $request->area_id);
        if ($request->filled('fecha_desde')) $query->where('planificada_para', '>=', $request->fecha_desde);
        if ($request->filled('fecha_hasta')) $query->where('planificada_para', '<=', $request->fecha_hasta);
        if ($request->filled('search')) {
            $q = $request->search;
            $query->where(fn($sub) =>
                $sub->where('codigo', 'like', "%{$q}%")
                    ->orWhere('titulo', 'like', "%{$q}%")
            );
        }

        $inspecciones = $query->withCount(['hallazgos', 'items'])
            ->orderByDesc('planificada_para')
            ->paginate(min($request->integer('per_page', 20), 100));

        $inspecciones->getCollection()->transform(function ($item) {
            $item->tipo_label = $item->tipo_label;
            $item->total_hallazgos_criticos = $item->total_hallazgos_criticos;
            return $item;
        });

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
            'tipo'                 => ['required', Rule::in(['equipos','infraestructura','emergencias','epps','orden_limpieza','higiene','general'])],
            'titulo'               => 'required|string|max:255',
            'descripcion'          => 'nullable|string',
            'planificada_para'     => 'required|date',
            'inspector_id'         => 'nullable|exists:personal,id',
            'supervisor_id'        => 'nullable|exists:personal,id',
            'equipo_catalogo_id'   => 'nullable|exists:equipos_catalogo,id',
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
            $inspeccion->load(['items', 'area', 'sede', 'inspector']),
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
                'supervisor:id,nombres,apellidos',
                'elaborador:id,nombre',
                'items.hallazgo',
                'hallazgos.responsable:id,nombres,apellidos',
                'hallazgos.area:id,nombre',
                'firmas' => fn($q) => $q->where('rechazada', false),
            ])
            ->findOrFail($id);

        $inspeccion->tipo_label = $inspeccion->tipo_label;
        $inspeccion->total_hallazgos_criticos = $inspeccion->total_hallazgos_criticos;

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
            'titulo'       => 'sometimes|string|max:255',
            'descripcion'  => 'nullable|string',
            'planificada_para' => 'sometimes|date',
            'inspector_id' => 'sometimes|exists:personal,id',
            'supervisor_id'=> 'nullable|exists:personal,id',
            'estado'       => ['sometimes', Rule::in(['programada','en_ejecucion','ejecutada','con_hallazgos','cerrada','anulada'])],
            'observaciones_generales' => 'nullable|string',
        ]);

        $anterior = $inspeccion->toArray();
        $inspeccion->update($validated);

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

        return response()->json($inspeccion);
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

        return response()->json(['message' => 'Inspección cerrada correctamente.']);
    }

    /**
     * GET /api/inspecciones/estadisticas
     */
    public function estadisticas(Request $request): JsonResponse
    {
        $empresaId = $request->user()->empresa_id;

        $stats = Inspeccion::where('empresa_id', $empresaId)
            ->selectRaw('estado, tipo, COUNT(*) as total')
            ->groupBy('estado', 'tipo')
            ->get();

        $porcentajePromedio = Inspeccion::where('empresa_id', $empresaId)
            ->where('estado', 'cerrada')
            ->avg('porcentaje_cumplimiento');

        return response()->json([
            'por_estado' => $stats->groupBy('estado'),
            'por_tipo'   => $stats->groupBy('tipo'),
            'porcentaje_cumplimiento_promedio' => round($porcentajePromedio ?? 0, 1),
        ]);
    }

    public function dashboard(Request $request): JsonResponse
    {
        $empresaId = $request->user()->empresa_id;

        // KPIs generales
        $base = Inspeccion::where('empresa_id', $empresaId);
        $total        = (clone $base)->count();
        $porEstado    = (clone $base)->selectRaw('estado, COUNT(*) as total')->groupBy('estado')->pluck('total','estado');
        $pctPromedio  = (clone $base)->whereIn('estado',['ejecutada','con_hallazgos','cerrada'])->avg('porcentaje_cumplimiento');

        // Checklist KPIs
        $baseChk = Inspeccion::where('empresa_id', $empresaId)->whereNotNull('equipo_catalogo_id');
        $chkTotal     = (clone $baseChk)->count();
        $chkComplet   = (clone $baseChk)->whereIn('estado',['ejecutada','con_hallazgos','cerrada'])->count();
        $chkPct       = (clone $baseChk)->avg('porcentaje_cumplimiento');
        $accionesAb   = DB::table('inspeccion_acciones_checklist as a')
            ->join('inspecciones as i','a.inspeccion_id','=','i.id')
            ->where('i.empresa_id', $empresaId)->where('a.estado','!=','cerrado')->count();

        // Por sub-módulo
        $porSubmodulo = (clone $baseChk)
            ->join('inspeccion_submodulos as s','inspecciones.submodulo_id','=','s.id')
            ->select('s.nombre','s.codigo',
                DB::raw('COUNT(*) as total'),
                DB::raw('ROUND(AVG(inspecciones.porcentaje_cumplimiento),1) as puntaje_prom'))
            ->groupBy('s.id','s.nombre','s.codigo')->get();

        // Últimos 6 meses
        $porMes = Inspeccion::where('empresa_id', $empresaId)
            ->where('planificada_para', '>=', now()->subMonths(5)->startOfMonth())
            ->selectRaw("DATE_FORMAT(planificada_para,'%Y-%m') as mes, COUNT(*) as total, ROUND(AVG(porcentaje_cumplimiento),1) as pct_prom")
            ->groupBy('mes')->orderBy('mes')->get();

        // Por tipo
        $porTipo = (clone $base)->selectRaw('tipo, COUNT(*) as total')->groupBy('tipo')->get();

        // Top NC equipos
        $topNC = DB::table('inspeccion_respuestas as r')
            ->join('inspecciones as i','r.inspeccion_id','=','i.id')
            ->join('equipos_catalogo as e','i.equipo_catalogo_id','=','e.id')
            ->where('i.empresa_id', $empresaId)->where('r.resultado','N')
            ->select('e.nombre as equipo', DB::raw('COUNT(*) as nc_total'))
            ->groupBy('e.id','e.nombre')->orderByDesc('nc_total')->limit(5)->get();

        // Últimas 5 inspecciones
        $ultimas = Inspeccion::where('empresa_id', $empresaId)
            ->with(['area:id,nombre','equipoCatalogo:id,nombre'])
            ->orderByDesc('created_at')->limit(5)
            ->get(['id','codigo','titulo','tipo','estado','porcentaje_cumplimiento','planificada_para','area_id','equipo_catalogo_id']);

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
            'por_submodulo'   => $porSubmodulo,
            'por_mes'         => $porMes,
            'por_tipo'        => $porTipo,
            'top_nc'          => $topNC,
            'ultimas'         => $ultimas,
        ]);
    }
}
