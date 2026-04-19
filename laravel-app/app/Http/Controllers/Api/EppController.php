<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EppCategoria;
use App\Models\EppInventario;
use App\Models\EppEntrega;
use App\Services\AuditoriaService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class EppController extends Controller
{
    public function __construct(
        private AuditoriaService $auditoria
    ) {}

    /**
     * GET /api/epps
     */
    public function index(Request $request): JsonResponse
    {
        $query = EppInventario::where('empresa_id', $request->user()->empresa_id)
            ->with('categoria:id,nombre,requiere_talla');

        if ($request->filled('categoria_id')) {
            $query->where('categoria_id', $request->categoria_id);
        }
        if (!$request->has('activo') || $request->boolean('activo', true)) {
            $query->where('activo', true);
        }
        if ($request->boolean('stock_critico')) {
            $query->whereColumn('stock_disponible', '<=', 'stock_minimo');
        }
        if ($request->filled('search')) {
            $q = $request->search;
            $query->where(fn($s) =>
                $s->where('nombre', 'like', "%{$q}%")
                  ->orWhere('codigo_interno', 'like', "%{$q}%")
                  ->orWhere('marca', 'like', "%{$q}%")
            );
        }

        $items = $query->orderBy('nombre')
            ->paginate(min($request->integer('per_page', 15), 100));

        $items->getCollection()->transform(function ($item) {
            $item->stock_critico = $item->stock_critico;
            return $item;
        });

        return response()->json($items);
    }

    /**
     * POST /api/epps
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'categoria_id'     => 'required|exists:epps_categorias,id',
            'nombre'           => 'required|string|max:150',
            'marca'            => 'nullable|string|max:100',
            'modelo'           => 'nullable|string|max:100',
            'codigo_interno'   => 'nullable|string|max:50',
            'talla'            => 'nullable|string|max:20',
            'stock_total'      => 'required|integer|min:0',
            'stock_disponible' => 'required|integer|min:0',
            'stock_minimo'     => 'required|integer|min:0',
            'unidad'           => 'required|string|max:20',
            'costo_unitario'   => 'nullable|numeric|min:0',
            'proveedor'        => 'nullable|string|max:150',
        ]);

        $item = EppInventario::create([
            ...$validated,
            'empresa_id' => $request->user()->empresa_id,
            'activo'     => true,
        ]);

        $this->auditoria->registrar(
            modulo: 'epps',
            accion: 'crear',
            usuario: $request->user(),
            modelo: 'EppInventario',
            modeloId: $item->id,
            valorNuevo: ['nombre' => $item->nombre],
            request: $request
        );

        return response()->json($item->load('categoria'), 201);
    }

    /**
     * GET /api/epps/{id}
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $item = EppInventario::where('empresa_id', $request->user()->empresa_id)
            ->with([
                'categoria',
                'entregas' => fn($q) => $q->with('personal:id,nombres,apellidos')->latest()->limit(20),
            ])
            ->findOrFail($id);

        $item->stock_critico = $item->stock_critico;

        return response()->json($item);
    }

    /**
     * PUT /api/epps/{id}
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $item = EppInventario::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);

        $validated = $request->validate([
            'categoria_id'     => 'sometimes|exists:epps_categorias,id',
            'nombre'           => 'sometimes|string|max:150',
            'marca'            => 'nullable|string|max:100',
            'modelo'           => 'nullable|string|max:100',
            'codigo_interno'   => 'nullable|string|max:50',
            'talla'            => 'nullable|string|max:20',
            'stock_total'      => 'sometimes|integer|min:0',
            'stock_disponible' => 'sometimes|integer|min:0',
            'stock_minimo'     => 'sometimes|integer|min:0',
            'unidad'           => 'sometimes|string|max:20',
            'costo_unitario'   => 'nullable|numeric|min:0',
            'proveedor'        => 'nullable|string|max:150',
            'activo'           => 'boolean',
        ]);

        $item->update($validated);

        $this->auditoria->registrar(
            modulo: 'epps',
            accion: 'actualizar',
            usuario: $request->user(),
            modelo: 'EppInventario',
            modeloId: $item->id,
            valorNuevo: $validated,
            request: $request
        );

        return response()->json($item->load('categoria'));
    }

    /**
     * DELETE /api/epps/{id}
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $item = EppInventario::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);
        $item->delete();

        return response()->json(['message' => 'EPP eliminado correctamente']);
    }

    /**
     * GET /api/epps/categorias
     */
    public function categorias(Request $request): JsonResponse
    {
        $cats = EppCategoria::where('empresa_id', $request->user()->empresa_id)
            ->where('activa', true)
            ->orderBy('nombre')
            ->get();

        return response()->json($cats);
    }

    /**
     * GET /api/epps/estadisticas
     */
    public function estadisticas(Request $request): JsonResponse
    {
        $empresaId = $request->user()->empresa_id;

        $stockCritico = EppInventario::where('empresa_id', $empresaId)
            ->where('activo', true)
            ->whereColumn('stock_disponible', '<=', 'stock_minimo')
            ->count();

        $totalItems = EppInventario::where('empresa_id', $empresaId)
            ->where('activo', true)
            ->count();

        $entregasMes = EppEntrega::where('empresa_id', $empresaId)
            ->whereMonth('fecha_entrega', now()->month)
            ->whereYear('fecha_entrega', now()->year)
            ->count();

        $porCategoria = EppInventario::where('epps_inventario.empresa_id', $empresaId)
            ->join('epps_categorias', 'epps_categorias.id', '=', 'epps_inventario.categoria_id')
            ->selectRaw('epps_categorias.nombre as categoria, COUNT(*) as total, SUM(stock_disponible) as stock_sum')
            ->groupBy('epps_categorias.id', 'epps_categorias.nombre')
            ->get();

        return response()->json([
            'stock_critico'  => $stockCritico,
            'total_items'    => $totalItems,
            'entregas_mes'   => $entregasMes,
            'por_categoria'  => $porCategoria,
        ]);
    }

    /**
     * POST /api/epps/entregas
     */
    public function registrarEntrega(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'personal_id'       => 'required|exists:personal,id',
            'inventario_id'     => 'required|exists:epps_inventario,id',
            'cantidad'          => 'required|integer|min:1',
            'fecha_entrega'     => 'required|date',
            'fecha_vencimiento' => 'nullable|date|after:fecha_entrega',
            'motivo_entrega'    => 'required|in:ingreso,reposicion,deterioro,talla,perdida',
            'observaciones'     => 'nullable|string',
        ]);

        $inventario = EppInventario::where('empresa_id', $request->user()->empresa_id)
            ->findOrFail($validated['inventario_id']);

        if ($inventario->stock_disponible < $validated['cantidad']) {
            return response()->json([
                'message' => "Stock insuficiente. Disponible: {$inventario->stock_disponible}",
            ], 422);
        }

        $entrega = DB::transaction(function () use ($validated, $request, $inventario) {
            $entrega = EppEntrega::create([
                ...$validated,
                'empresa_id'    => $request->user()->empresa_id,
                'entregado_por' => $request->user()->id,
                'estado'        => 'entregado',
            ]);

            $inventario->decrement('stock_disponible', $validated['cantidad']);

            return $entrega;
        });

        $this->auditoria->registrar(
            modulo: 'epps',
            accion: 'entrega',
            usuario: $request->user(),
            modelo: 'EppEntrega',
            modeloId: $entrega->id,
            valorNuevo: ['personal_id' => $entrega->personal_id, 'inventario_id' => $entrega->inventario_id],
            request: $request
        );

        return response()->json(
            $entrega->load(['personal:id,nombres,apellidos', 'inventario:id,nombre']),
            201
        );
    }

    /**
     * POST /api/epps/entregas/{id}/devolucion
     */
    public function registrarDevolucion(Request $request, int $id): JsonResponse
    {
        $entrega = EppEntrega::where('empresa_id', $request->user()->empresa_id)
            ->where('estado', 'entregado')
            ->findOrFail($id);

        $validated = $request->validate([
            'fecha_devolucion' => 'nullable|date',
            'estado'           => 'in:devuelto,perdido',
            'observaciones'    => 'nullable|string',
        ]);

        DB::transaction(function () use ($entrega, $validated) {
            $nuevoEstado = $validated['estado'] ?? 'devuelto';

            $entrega->update([
                'estado'           => $nuevoEstado,
                'fecha_devolucion' => $validated['fecha_devolucion'] ?? now()->toDateString(),
                'observaciones'    => $validated['observaciones'] ?? $entrega->observaciones,
            ]);

            if ($nuevoEstado === 'devuelto') {
                $entrega->inventario->increment('stock_disponible', $entrega->cantidad);
            }
        });

        return response()->json(['message' => 'Devolución registrada correctamente']);
    }

    /**
     * GET /api/epps/{id}/entregas
     */
    public function entregas(Request $request, int $id): JsonResponse
    {
        EppInventario::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);

        $entregas = EppEntrega::where('inventario_id', $id)
            ->with('personal:id,nombres,apellidos,dni')
            ->orderByDesc('fecha_entrega')
            ->paginate(20);

        return response()->json($entregas);
    }

    /**
     * GET /api/epps/dashboard
     */
    public function dashboard(Request $request): JsonResponse
    {
        $empresaId = $request->user()->empresa_id;

        $totalItems = EppInventario::where('empresa_id', $empresaId)->where('activo', true)->count();
        $stockCritico = EppInventario::where('empresa_id', $empresaId)->where('activo', true)
            ->whereColumn('stock_disponible', '<=', 'stock_minimo')->count();
        $entregasMes = EppEntrega::where('empresa_id', $empresaId)
            ->whereMonth('fecha_entrega', now()->month)->whereYear('fecha_entrega', now()->year)->count();
        $devolucionesMes = EppEntrega::where('empresa_id', $empresaId)
            ->whereIn('estado', ['devuelto', 'perdido'])
            ->whereMonth('updated_at', now()->month)->whereYear('updated_at', now()->year)->count();

        $porCategoria = EppInventario::where('epps_inventario.empresa_id', $empresaId)
            ->join('epps_categorias', 'epps_categorias.id', '=', 'epps_inventario.categoria_id')
            ->selectRaw('epps_categorias.nombre as name, COUNT(*) as value, SUM(stock_disponible) as stock')
            ->groupBy('epps_categorias.id', 'epps_categorias.nombre')
            ->get();

        $porMes = DB::table('epps_entregas')
            ->where('empresa_id', $empresaId)
            ->where('fecha_entrega', '>=', now()->subMonths(6)->startOfMonth())
            ->selectRaw("DATE_FORMAT(fecha_entrega,'%Y-%m') as mes, COUNT(*) as total")
            ->groupBy('mes')
            ->orderBy('mes')
            ->get();

        $topEntregados = DB::table('epps_entregas')
            ->join('epps_inventario', 'epps_inventario.id', '=', 'epps_entregas.inventario_id')
            ->where('epps_entregas.empresa_id', $empresaId)
            ->selectRaw('epps_inventario.nombre, COUNT(*) as total_entregas')
            ->groupBy('epps_inventario.id', 'epps_inventario.nombre')
            ->orderByDesc('total_entregas')
            ->limit(5)
            ->get();

        $ultimasEntregas = EppEntrega::where('epps_entregas.empresa_id', $empresaId)
            ->with(['personal:id,nombres,apellidos', 'inventario:id,nombre'])
            ->orderByDesc('fecha_entrega')
            ->limit(5)
            ->get();

        return response()->json([
            'total_items'       => $totalItems,
            'stock_critico'     => $stockCritico,
            'entregas_mes'      => $entregasMes,
            'devoluciones_mes'  => $devolucionesMes,
            'por_categoria'     => $porCategoria,
            'por_mes'           => $porMes,
            'top_entregados'    => $topEntregados,
            'ultimas_entregas'  => $ultimasEntregas,
        ]);
    }

    /**
     * GET /api/epps/trazabilidad
     */
    public function trazabilidad(Request $request): JsonResponse
    {
        $empresaId = $request->user()->empresa_id;
        $query = EppEntrega::where('epps_entregas.empresa_id', $empresaId)
            ->with(['personal:id,nombres,apellidos,dni', 'inventario:id,nombre,categoria_id', 'inventario.categoria:id,nombre']);

        if ($request->filled('personal_id')) $query->where('personal_id', $request->personal_id);
        if ($request->filled('inventario_id')) $query->where('inventario_id', $request->inventario_id);
        if ($request->filled('estado')) $query->where('estado', $request->estado);
        if ($request->filled('desde')) $query->where('fecha_entrega', '>=', $request->desde);
        if ($request->filled('hasta')) $query->where('fecha_entrega', '<=', $request->hasta);

        return response()->json($query->orderByDesc('fecha_entrega')->paginate(50));
    }

    /**
     * GET /api/epps/proveedores
     */
    public function proveedores(Request $request): JsonResponse
    {
        if (!Schema::hasTable('epp_proveedores')) return response()->json([]);
        $rows = DB::table('epp_proveedores')
            ->where('empresa_id', $request->user()->empresa_id)
            ->orderBy('nombre')->get();
        return response()->json($rows);
    }

    /**
     * POST /api/epps/proveedores
     */
    public function storeProveedor(Request $request): JsonResponse
    {
        $v = $request->validate([
            'nombre'   => 'required|string|max:120',
            'ruc'      => 'nullable|string|max:20',
            'contacto' => 'nullable|string|max:100',
            'telefono' => 'nullable|string|max:20',
            'email'    => 'nullable|email|max:100',
        ]);
        $id = DB::table('epp_proveedores')->insertGetId(array_merge($v, [
            'empresa_id' => $request->user()->empresa_id,
            'activo'     => 1,
            'created_at' => now(), 'updated_at' => now(),
        ]));
        return response()->json(DB::table('epp_proveedores')->find($id), 201);
    }

    /**
     * PUT /api/epps/proveedores/{id}
     */
    public function updateProveedor(Request $request, int $id): JsonResponse
    {
        $v = $request->validate([
            'nombre'   => 'sometimes|string|max:120',
            'ruc'      => 'nullable|string|max:20',
            'contacto' => 'nullable|string|max:100',
            'telefono' => 'nullable|string|max:20',
            'email'    => 'nullable|email|max:100',
            'activo'   => 'boolean',
        ]);
        DB::table('epp_proveedores')
            ->where('id', $id)->where('empresa_id', $request->user()->empresa_id)
            ->update(array_merge($v, ['updated_at' => now()]));
        return response()->json(DB::table('epp_proveedores')->find($id));
    }

    /**
     * DELETE /api/epps/proveedores/{id}
     */
    public function destroyProveedor(Request $request, int $id): JsonResponse
    {
        DB::table('epp_proveedores')
            ->where('id', $id)->where('empresa_id', $request->user()->empresa_id)->delete();
        return response()->json(['message' => 'Proveedor eliminado']);
    }

    /**
     * GET /api/epps/mantenimiento
     */
    public function mantenimiento(Request $request): JsonResponse
    {
        if (!Schema::hasTable('epp_mantenimiento')) return response()->json(['registros' => [], 'stats' => [], 'alertas' => []]);
        $empresaId = $request->user()->empresa_id;

        $registros = DB::table('epp_mantenimiento as m')
            ->join('epps_inventario as i', 'i.id', '=', 'm.inventario_id')
            ->where('m.empresa_id', $empresaId)
            ->select('m.*', 'i.nombre as epp_nombre', 'i.codigo_interno as epp_codigo')
            ->orderByDesc('m.fecha')
            ->get();

        $hoy = now()->toDateString();
        $en7dias = now()->addDays(7)->toDateString();

        $inspMes = DB::table('epp_mantenimiento')
            ->where('empresa_id', $empresaId)
            ->whereMonth('fecha', now()->month)->whereYear('fecha', now()->year)
            ->count();

        $dados_baja = DB::table('epp_mantenimiento')
            ->where('empresa_id', $empresaId)->where('tipo', 'baja')->count();

        $prox_venc = DB::table('epp_mantenimiento')
            ->where('empresa_id', $empresaId)
            ->whereNotNull('proxima_fecha')
            ->whereBetween('proxima_fecha', [$hoy, $en7dias])
            ->count();

        $alertas = DB::table('epp_mantenimiento as m')
            ->join('epps_inventario as i', 'i.id', '=', 'm.inventario_id')
            ->where('m.empresa_id', $empresaId)
            ->whereNotNull('m.proxima_fecha')
            ->where('m.proxima_fecha', '<', $hoy)
            ->select('i.codigo_interno', 'i.nombre')
            ->get();

        return response()->json([
            'registros' => $registros,
            'stats'     => ['insp_mes' => $inspMes, 'dados_baja' => $dados_baja, 'prox_venc' => $prox_venc],
            'alertas'   => $alertas,
        ]);
    }

    /**
     * POST /api/epps/mantenimiento
     */
    public function storeMantenimiento(Request $request): JsonResponse
    {
        $v = $request->validate([
            'inventario_id'  => 'required|exists:epps_inventario,id',
            'tipo'           => 'required|in:mantenimiento,inspeccion,retiro,baja',
            'tipo_inspeccion'=> 'nullable|string|max:120',
            'fecha'          => 'required|date',
            'proxima_fecha'  => 'nullable|date',
            'responsable'    => 'nullable|string|max:120',
            'resultado'      => 'nullable|in:conforme,no_conforme,requiere_accion',
            'observaciones'  => 'nullable|string',
        ]);
        $id = DB::table('epp_mantenimiento')->insertGetId(array_merge($v, [
            'empresa_id' => $request->user()->empresa_id,
            'created_at' => now(),
        ]));
        return response()->json(DB::table('epp_mantenimiento')->find($id), 201);
    }

    /**
     * GET /api/epps/capacitaciones
     */
    public function capacitaciones(Request $request): JsonResponse
    {
        if (!Schema::hasTable('epp_capacitaciones')) return response()->json(['data' => [], 'meta' => null]);
        $query = DB::table('epp_capacitaciones as c')
            ->leftJoin('epps_categorias as cat', 'cat.id', '=', 'c.categoria_id')
            ->where('c.empresa_id', $request->user()->empresa_id)
            ->select('c.*', 'cat.nombre as categoria_nombre');
        return response()->json($query->orderByDesc('c.fecha')->paginate(20));
    }

    /**
     * POST /api/epps/capacitaciones
     */
    public function storeCapacitacion(Request $request): JsonResponse
    {
        $v = $request->validate([
            'tema'              => 'required|string|max:200',
            'instructor'        => 'nullable|string|max:120',
            'fecha'             => 'required|date',
            'categoria_id'      => 'nullable|exists:epps_categorias,id',
            'inventario_id'     => 'nullable|exists:epps_inventario,id',
            'num_participantes' => 'nullable|integer|min:0',
            'evidencia_url'     => 'nullable|string|max:255',
            'observaciones'     => 'nullable|string',
        ]);
        $id = DB::table('epp_capacitaciones')->insertGetId(array_merge($v, [
            'empresa_id' => $request->user()->empresa_id,
            'created_at' => now(),
        ]));
        return response()->json(DB::table('epp_capacitaciones')->find($id), 201);
    }

    /**
     * POST /api/epps/categorias
     */
    public function storeCategoria(Request $request): JsonResponse
    {
        $v = $request->validate([
            'nombre'         => 'required|string|max:100',
            'requiere_talla' => 'boolean',
            'color'          => 'nullable|string|max:20',
        ]);
        $cat = EppCategoria::create(array_merge($v, [
            'empresa_id' => $request->user()->empresa_id,
            'activa'     => true,
        ]));
        return response()->json($cat, 201);
    }

    /**
     * PUT /api/epps/categorias/{id}
     */
    public function updateCategoria(Request $request, int $id): JsonResponse
    {
        $cat = EppCategoria::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);
        $v = $request->validate([
            'nombre'         => 'sometimes|string|max:100',
            'requiere_talla' => 'boolean',
            'activa'         => 'boolean',
            'color'          => 'nullable|string|max:20',
        ]);
        $cat->update($v);
        return response()->json($cat);
    }

    /**
     * DELETE /api/epps/categorias/{id}
     */
    public function destroyCategoria(Request $request, int $id): JsonResponse
    {
        $cat = EppCategoria::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);
        $cat->delete();
        return response()->json(['message' => 'Categoría eliminada']);
    }
}
