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
}
