<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EppCategoria;
use App\Models\EppInventario;
use App\Models\EppEntrega;
use App\Models\EppMovimiento;
use App\Models\PersonalTalla;
use App\Services\AuditoriaService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

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
            ->with('categoria:id,nombre,requiere_talla')
            ->withCount(['entregas as total_entregas_activas' => function ($q) {
                $q->where('estado', 'entregado');
            }]);

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
            'consumo_anual'    => 'nullable|integer|min:0',
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
     * POST /api/epps/{id}/imagen
     */
    public function subirImagen(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'imagen' => 'required|image|mimes:jpg,jpeg,png,webp|max:4096',
        ]);

        $item = EppInventario::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);

        // Borrar la imagen anterior para no dejar archivos huérfanos
        if ($item->imagen_path) {
            Storage::disk('public')->delete($item->imagen_path);
        }

        $file     = $request->file('imagen');
        $filename = 'epp_' . $item->id . '_' . time() . '.' . $file->getClientOriginalExtension();
        $path     = $file->storeAs('epps/imagenes', $filename, 'public');

        $item->update(['imagen_path' => $path]);

        $this->auditoria->registrar(
            modulo: 'epps',
            accion: 'actualizar',
            usuario: $request->user(),
            modelo: 'EppInventario',
            modeloId: $item->id,
            valorNuevo: ['imagen_path' => $path],
            request: $request
        );

        return response()->json([
            'message'     => 'Imagen actualizada',
            'imagen_path' => $path,
            'imagen_url'  => $item->imagen_url,
        ]);
    }

    /**
     * DELETE /api/epps/{id}/imagen
     */
    public function eliminarImagen(Request $request, int $id): JsonResponse
    {
        $item = EppInventario::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);

        if ($item->imagen_path) {
            Storage::disk('public')->delete($item->imagen_path);
            $item->update(['imagen_path' => null]);
        }

        return response()->json(['message' => 'Imagen eliminada']);
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
            'firma'             => 'nullable|string|regex:/^data:image\/(png|jpeg|jpg);base64,/',
        ]);

        // MEJORA CRÍTICA 1: Bloqueo pesimista para evitar race conditions
        $entrega = DB::transaction(function () use ($validated, $request) {
            // Bloquear el registro para evitar entregas simultáneas
            $inventario = EppInventario::where('empresa_id', $request->user()->empresa_id)
                ->with('categoria')
                ->lockForUpdate()
                ->findOrFail($validated['inventario_id']);

            // Validar stock DESPUÉS del bloqueo
            if ($inventario->stock_disponible < $validated['cantidad']) {
                throw new \Exception("Stock insuficiente. Disponible: {$inventario->stock_disponible}");
            }

            // Guardar firma si existe
            $firmaPath = null;
            if (!empty($validated['firma'])) {
                $firmaBase64 = preg_replace('/^data:image\/\w+;base64,/', '', $validated['firma']);
                $firmaPath = 'firmas/epps/' . uniqid() . '_' . time() . '.png';
                \Storage::disk('public')->put($firmaPath, base64_decode($firmaBase64));
            }

            // FASE 6: Calcular fecha_vencimiento automáticamente
            $fechaVencimiento = $validated['fecha_vencimiento'];
            if (!$fechaVencimiento && $inventario->categoria && $inventario->categoria->vida_util_meses) {
                $fechaVencimiento = \Carbon\Carbon::parse($validated['fecha_entrega'])
                    ->addMonths($inventario->categoria->vida_util_meses)
                    ->toDateString();
            }

            // Crear entrega
            $entrega = EppEntrega::create([
                'empresa_id'        => $request->user()->empresa_id,
                'personal_id'       => $validated['personal_id'],
                'inventario_id'     => $validated['inventario_id'],
                'cantidad'          => $validated['cantidad'],
                'fecha_entrega'     => $validated['fecha_entrega'],
                'fecha_vencimiento' => $fechaVencimiento,
                'motivo_entrega'    => $validated['motivo_entrega'],
                'observaciones'     => $validated['observaciones'] ?? null,
                'entregado_por'     => $request->user()->id,
                'estado'            => 'entregado',
                'firma_path'        => $firmaPath,
                'firmado_en'        => $firmaPath ? now() : null,
            ]);

            // Decrementar stock de forma segura
            $inventario->decrementarStock($validated['cantidad']);

            return $entrega;
        });

        // MEJORA CRÍTICA 2: Auditoría completa
        $this->auditoria->registrar(
            modulo: 'epps',
            accion: 'entrega',
            usuario: $request->user(),
            modelo: 'EppEntrega',
            modeloId: $entrega->id,
            valorNuevo: [
                'personal_id'    => $entrega->personal_id,
                'inventario_id'  => $entrega->inventario_id,
                'cantidad'       => $entrega->cantidad,
                'motivo'         => $entrega->motivo_entrega,
                'tiene_firma'    => !empty($entrega->firma_path),
            ],
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

        $estadoAnterior = $entrega->estado;

        // MEJORA CRÍTICA 3: Bloqueo pesimista en devolución
        DB::transaction(function () use ($entrega, $validated, $request) {
            $nuevoEstado = $validated['estado'] ?? 'devuelto';

            // Bloquear inventario para evitar race conditions
            $inventario = EppInventario::lockForUpdate()->findOrFail($entrega->inventario_id);

            $entrega->update([
                'estado'           => $nuevoEstado,
                'fecha_devolucion' => $validated['fecha_devolucion'] ?? now()->toDateString(),
                'observaciones'    => $validated['observaciones'] ?? $entrega->observaciones,
            ]);

            // CORRECCIÓN: Retornar stock solo si está en buen estado
            if ($nuevoEstado === 'devuelto') {
                $inventario->incrementarStock($entrega->cantidad);
            }
            // Si está perdido, NO se retorna stock (ya implementado correctamente)
        });

        // MEJORA CRÍTICA 4: Auditoría en devoluciones
        $this->auditoria->registrar(
            modulo: 'epps',
            accion: 'devolucion',
            usuario: $request->user(),
            modelo: 'EppEntrega',
            modeloId: $entrega->id,
            valorAnterior: ['estado' => $estadoAnterior],
            valorNuevo: [
                'estado'           => $validated['estado'] ?? 'devuelto',
                'fecha_devolucion' => $validated['fecha_devolucion'] ?? now()->toDateString(),
                'stock_retornado'  => ($validated['estado'] ?? 'devuelto') === 'devuelto',
            ],
            request: $request
        );

        return response()->json([
            'message' => 'Devolución registrada correctamente',
            'entrega' => $entrega->fresh(),
        ]);
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
     * GET /api/epps/entregas/todas
     */
    public function todasEntregas(Request $request): JsonResponse
    {
        $query = EppEntrega::where('empresa_id', $request->user()->empresa_id)
            ->with([
                'inventario' => function($q) {
                    $q->select('id', 'nombre', 'codigo_interno', 'categoria_id', 'imagen_path')
                      ->with('categoria:id,nombre');
                },
                'personal' => function($q) {
                    $q->select('id', 'nombres', 'apellidos', 'dni', 'cargo_id')
                      ->with('cargo:id,nombre');
                }
            ]);

        // Filtro por búsqueda (EPP o Personal)
        if ($request->filled('buscar')) {
            $buscar = $request->buscar;
            $query->where(function($q) use ($buscar) {
                // Buscar en EPP (nombre o código)
                $q->whereHas('inventario', function($sq) use ($buscar) {
                    $sq->where(function($innerQ) use ($buscar) {
                        $innerQ->where('nombre', 'like', "%{$buscar}%")
                               ->orWhere('codigo_interno', 'like', "%{$buscar}%");
                    });
                })
                // Buscar en Personal (nombres, apellidos o DNI)
                ->orWhereHas('personal', function($sq) use ($buscar) {
                    $sq->where(function($innerQ) use ($buscar) {
                        $innerQ->where('nombres', 'like', "%{$buscar}%")
                               ->orWhere('apellidos', 'like', "%{$buscar}%")
                               ->orWhere('dni', 'like', "%{$buscar}%");
                    });
                });
            });
        }

        if ($request->filled('estado')) {
            $query->where('estado', $request->estado);
        }

        $entregas = $query->orderByDesc('fecha_entrega')
            ->paginate(min($request->integer('per_page', 9), 100));

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
            ->where('epps_inventario.activo', true)
            ->join('epps_categorias', 'epps_categorias.id', '=', 'epps_inventario.categoria_id')
            ->selectRaw('epps_categorias.nombre as name, COUNT(*) as value, SUM(stock_disponible) as stock')
            ->groupBy('epps_categorias.id', 'epps_categorias.nombre')
            ->get();

        // Breakdown por categoría y talla para la tabla
        $porCategoriaTalla = EppInventario::where('epps_inventario.empresa_id', $empresaId)
            ->where('epps_inventario.activo', true)
            ->join('epps_categorias', 'epps_categorias.id', '=', 'epps_inventario.categoria_id')
            ->selectRaw('
                epps_categorias.nombre as categoria,
                COALESCE(NULLIF(epps_inventario.talla, ""), "Sin talla") as talla,
                SUM(epps_inventario.stock_disponible) as stock_disponible
            ')
            ->groupBy('epps_categorias.nombre', 'talla')
            ->orderBy('epps_categorias.nombre')
            ->orderBy('talla')
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

        // Resumen por trabajador y categoría
        $porTrabajador = DB::select("
            SELECT
                p.id as personal_id,
                CONCAT(p.nombres, ' ', p.apellidos) as trabajador,
                SUM(CASE WHEN cat.nombre = 'Casco de seguridad' AND e.estado = 'entregado' THEN e.cantidad ELSE 0 END) as casco,
                SUM(CASE WHEN cat.nombre = 'Lentes de seguridad' AND e.estado = 'entregado' THEN e.cantidad ELSE 0 END) as lentes,
                SUM(CASE WHEN cat.nombre LIKE 'Guantes%' AND e.estado = 'entregado' THEN e.cantidad ELSE 0 END) as guantes,
                SUM(CASE WHEN cat.nombre LIKE 'Zapatos%' AND e.estado = 'entregado' THEN e.cantidad ELSE 0 END) as zapatos,
                SUM(CASE WHEN cat.nombre LIKE 'Chaleco%' AND e.estado = 'entregado' THEN e.cantidad ELSE 0 END) as chaleco,
                SUM(CASE WHEN e.estado = 'entregado' THEN e.cantidad ELSE 0 END) as total
            FROM epps_entregas e
            JOIN personal p ON e.personal_id = p.id
            JOIN epps_inventario inv ON e.inventario_id = inv.id
            JOIN epps_categorias cat ON inv.categoria_id = cat.id
            WHERE e.empresa_id = ?
            GROUP BY p.id, p.nombres, p.apellidos
            HAVING total > 0
            ORDER BY p.apellidos, p.nombres
            LIMIT 15
        ", [$empresaId]);

        return response()->json([
            'total_items'         => $totalItems,
            'stock_critico'       => $stockCritico,
            'entregas_mes'        => $entregasMes,
            'devoluciones_mes'    => $devolucionesMes,
            'por_categoria'       => $porCategoria,
            'por_categoria_talla' => $porCategoriaTalla,
            'por_mes'             => $porMes,
            'top_entregados'      => $topEntregados,
            'ultimas_entregas'    => $ultimasEntregas,
            'por_trabajador'      => $porTrabajador,
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
        $rows = DB::table('epps_proveedores')
            ->where('empresa_id', $request->user()->empresa_id)
            ->whereNull('deleted_at')
            ->select([
                'id', 'empresa_id', 'activo', 'created_at', 'updated_at',
                DB::raw('razon_social AS nombre'),
                DB::raw('ruc'),
                DB::raw('contacto_nombre AS contacto'),
                DB::raw('contacto_telefono AS telefono'),
                DB::raw('contacto_email AS email'),
            ])
            ->orderBy('razon_social')
            ->get();
        return response()->json($rows);
    }

    /**
     * POST /api/epps/proveedores
     */
    public function storeProveedor(Request $request): JsonResponse
    {
        $v = $request->validate([
            'nombre'   => 'required|string|max:200',
            'ruc'      => 'nullable|string|max:20',
            'contacto' => 'nullable|string|max:150',
            'telefono' => 'nullable|string|max:20',
            'email'    => 'nullable|email|max:100',
        ]);
        $id = DB::table('epps_proveedores')->insertGetId([
            'empresa_id'        => $request->user()->empresa_id,
            'razon_social'      => $v['nombre'],
            'ruc'               => $v['ruc'] ?? null,
            'contacto_nombre'   => $v['contacto'] ?? null,
            'contacto_telefono' => $v['telefono'] ?? null,
            'contacto_email'    => $v['email'] ?? null,
            'activo'            => 1,
            'created_at'        => now(),
            'updated_at'        => now(),
        ]);
        $row = DB::table('epps_proveedores')
            ->where('id', $id)
            ->select([
                'id', 'empresa_id', 'activo',
                DB::raw('razon_social AS nombre'),
                DB::raw('ruc'),
                DB::raw('contacto_nombre AS contacto'),
                DB::raw('contacto_telefono AS telefono'),
                DB::raw('contacto_email AS email'),
            ])
            ->first();
        return response()->json($row, 201);
    }

    /**
     * PUT /api/epps/proveedores/{id}
     */
    public function updateProveedor(Request $request, int $id): JsonResponse
    {
        $v = $request->validate([
            'nombre'   => 'sometimes|string|max:200',
            'ruc'      => 'nullable|string|max:20',
            'contacto' => 'nullable|string|max:150',
            'telefono' => 'nullable|string|max:20',
            'email'    => 'nullable|email|max:100',
            'activo'   => 'boolean',
        ]);
        $update = ['updated_at' => now()];
        if (isset($v['nombre']))   $update['razon_social']      = $v['nombre'];
        if (array_key_exists('ruc',      $v)) $update['ruc']               = $v['ruc'];
        if (array_key_exists('contacto', $v)) $update['contacto_nombre']   = $v['contacto'];
        if (array_key_exists('telefono', $v)) $update['contacto_telefono'] = $v['telefono'];
        if (array_key_exists('email',    $v)) $update['contacto_email']    = $v['email'];
        if (isset($v['activo']))   $update['activo']            = $v['activo'];

        DB::table('epps_proveedores')
            ->where('id', $id)
            ->where('empresa_id', $request->user()->empresa_id)
            ->update($update);

        $row = DB::table('epps_proveedores')
            ->where('id', $id)
            ->select([
                'id', 'empresa_id', 'activo',
                DB::raw('razon_social AS nombre'),
                DB::raw('ruc'),
                DB::raw('contacto_nombre AS contacto'),
                DB::raw('contacto_telefono AS telefono'),
                DB::raw('contacto_email AS email'),
            ])
            ->first();
        return response()->json($row);
    }

    /**
     * DELETE /api/epps/proveedores/{id}
     */
    public function destroyProveedor(Request $request, int $id): JsonResponse
    {
        DB::table('epps_proveedores')
            ->where('id', $id)
            ->where('empresa_id', $request->user()->empresa_id)
            ->delete();
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

    /**
     * POST /api/epps/importar
     * Importación masiva de EPPs desde Excel
     */
    public function importar(Request $request): JsonResponse
    {
        $request->validate([
            'registros' => 'required|array|min:1',
        ]);

        $empresaId = $request->user()->empresa_id;
        $ok = 0;
        $errores = [];
        $idsCreados = [];
        $eppsCreados = [];

        foreach ($request->registros as $idx => $reg) {
            try {
                // Validaciones
                $nombre = trim($reg['nombre'] ?? '');
                if (!$nombre) {
                    $errores[] = ['fila' => $idx + 2, 'error' => 'Nombre requerido'];
                    continue;
                }

                // Resolver categoría por nombre
                $categoriaInput = trim($reg['categoria'] ?? '');
                if (!$categoriaInput) {
                    $errores[] = ['fila' => $idx + 2, 'nombre' => $nombre, 'error' => 'Categoría requerida'];
                    continue;
                }

                $categoria = EppCategoria::where('empresa_id', $empresaId)
                    ->where('nombre', 'LIKE', '%' . $categoriaInput . '%')
                    ->first();

                if (!$categoria) {
                    $errores[] = ['fila' => $idx + 2, 'nombre' => $nombre, 'error' => 'Categoría no encontrada: ' . $categoriaInput];
                    continue;
                }

                // Validar stock_total
                $stockTotal = $reg['stock_total'] ?? '';
                if ($stockTotal === '' || !is_numeric($stockTotal)) {
                    $errores[] = ['fila' => $idx + 2, 'nombre' => $nombre, 'error' => 'Stock total requerido y debe ser numérico'];
                    continue;
                }

                // Validar combinación única: código + talla (si se proporciona código)
                $codigoInterno = trim($reg['codigo_interno'] ?? '');
                $talla = trim($reg['talla'] ?? '');

                if ($codigoInterno) {
                    $query = EppInventario::where('empresa_id', $empresaId)
                        ->where('codigo_interno', $codigoInterno);

                    // Si hay talla, validar código + talla
                    // Si no hay talla, validar solo código
                    if ($talla) {
                        $query->where('talla', $talla);
                    } else {
                        $query->where(function($q) {
                            $q->whereNull('talla')->orWhere('talla', '');
                        });
                    }

                    $existe = $query->exists();

                    if ($existe) {
                        if ($talla) {
                            $errores[] = ['fila' => $idx + 2, 'nombre' => $nombre, 'error' => 'El código "' . $codigoInterno . '" con talla "' . $talla . '" ya existe'];
                        } else {
                            $errores[] = ['fila' => $idx + 2, 'nombre' => $nombre, 'error' => 'El código interno "' . $codigoInterno . '" ya existe'];
                        }
                        continue;
                    }
                }

                // Crear EPP
                $epp = EppInventario::create([
                    'empresa_id'       => $empresaId,
                    'categoria_id'     => $categoria->id,
                    'nombre'           => $nombre,
                    'marca'            => trim($reg['marca'] ?? '') ?: null,
                    'modelo'           => trim($reg['modelo'] ?? '') ?: null,
                    'codigo_interno'   => trim($reg['codigo_interno'] ?? '') ?: null,
                    'talla'            => trim($reg['talla'] ?? '') ?: null,
                    'unidad'           => trim($reg['unidad'] ?? 'unidad'),
                    'stock_total'      => (int) $stockTotal,
                    'stock_disponible' => (int) ($reg['stock_disponible'] ?? $stockTotal),
                    'stock_minimo'     => (int) ($reg['stock_minimo'] ?? 0),
                    'costo_unitario'   => !empty($reg['costo_unitario']) ? (float) $reg['costo_unitario'] : null,
                    'proveedor'        => trim($reg['proveedor'] ?? '') ?: null,
                    'activo'           => true,
                ]);
                $idsCreados[] = $epp->id;
                $eppsCreados[] = $epp->load('categoria');
                $ok++;
            } catch (\Exception $e) {
                $errores[] = ['fila' => $idx + 2, 'nombre' => $nombre ?? '', 'error' => $e->getMessage()];
            }
        }

        return response()->json([
            'ok'          => $ok,
            'errores'     => $errores,
            'total'       => count($request->registros),
            'ids_creados' => $idsCreados,
            'epps_creados'=> $eppsCreados,
        ]);
    }

    /**
     * POST /api/epps/eliminar-multiple
     * Eliminar múltiples EPPs por IDs
     */
    public function eliminarMultiple(Request $request): JsonResponse
    {
        $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'required|integer',
        ]);

        $empresaId = $request->user()->empresa_id;
        $eliminados = EppInventario::where('empresa_id', $empresaId)
            ->whereIn('id', $request->ids)
            ->delete();

        return response()->json([
            'eliminados' => $eliminados,
            'message'    => "$eliminados EPP(s) eliminado(s) correctamente",
        ]);
    }

    /**
     * DELETE /api/epps/eliminar-todo
     * Eliminar TODO el inventario de EPPs de la empresa
     */
    public function eliminarTodo(Request $request): JsonResponse
    {
        $empresaId = $request->user()->empresa_id;

        // Contar antes de eliminar
        $total = EppInventario::where('empresa_id', $empresaId)->count();

        // Eliminar todo
        EppInventario::where('empresa_id', $empresaId)->delete();

        return response()->json([
            'eliminados' => $total,
            'message'    => "Inventario completo eliminado: $total EPP(s)",
        ]);
    }

    /**
     * GET /api/epps/alertas
     * Dashboard de alertas de EPPs
     */
    public function alertas(Request $request): JsonResponse
    {
        $empresaId = $request->user()->empresa_id;
        $hoy = \Carbon\Carbon::today();

        // 1. EPPs entregados VENCIDOS
        $vencidos = EppEntrega::where('empresa_id', $empresaId)
            ->where('estado', 'entregado')
            ->whereNotNull('fecha_vencimiento')
            ->where('fecha_vencimiento', '<', $hoy)
            ->with(['personal:id,nombres,apellidos,dni', 'inventario:id,nombre,codigo_interno'])
            ->get()
            ->map(function($entrega) use ($hoy) {
                $fechaVenc = \Carbon\Carbon::parse($entrega->fecha_vencimiento);
                return [
                    'id'                => $entrega->id,
                    'epp_nombre'        => $entrega->inventario->nombre ?? 'N/A',
                    'epp_codigo'        => $entrega->inventario->codigo_interno ?? '',
                    'personal_nombre'   => ($entrega->personal->nombres ?? '') . ' ' . ($entrega->personal->apellidos ?? ''),
                    'personal_dni'      => $entrega->personal->dni ?? '',
                    'fecha_vencimiento' => $entrega->fecha_vencimiento,
                    'dias_vencido'      => abs($hoy->diffInDays($fechaVenc)),
                    'cantidad'          => $entrega->cantidad,
                ];
            });

        // 2. EPPs entregados PRÓXIMOS A VENCER (30 días)
        $proximosVencer = EppEntrega::where('empresa_id', $empresaId)
            ->where('estado', 'entregado')
            ->whereNotNull('fecha_vencimiento')
            ->whereBetween('fecha_vencimiento', [$hoy, $hoy->copy()->addDays(30)])
            ->with(['personal:id,nombres,apellidos,dni', 'inventario:id,nombre,codigo_interno'])
            ->orderBy('fecha_vencimiento')
            ->get()
            ->map(function($entrega) use ($hoy) {
                $fechaVenc = \Carbon\Carbon::parse($entrega->fecha_vencimiento);
                return [
                    'id'                => $entrega->id,
                    'epp_nombre'        => $entrega->inventario->nombre ?? 'N/A',
                    'epp_codigo'        => $entrega->inventario->codigo_interno ?? '',
                    'personal_nombre'   => ($entrega->personal->nombres ?? '') . ' ' . ($entrega->personal->apellidos ?? ''),
                    'personal_dni'      => $entrega->personal->dni ?? '',
                    'fecha_vencimiento' => $entrega->fecha_vencimiento,
                    'dias_restantes'    => $hoy->diffInDays($fechaVenc),
                    'cantidad'          => $entrega->cantidad,
                ];
            });

        // 3. Stock BAJO (disponible <= mínimo)
        $stockBajo = EppInventario::where('empresa_id', $empresaId)
            ->where('activo', true)
            ->stockBajo()
            ->with('categoria:id,nombre')
            ->get()
            ->map(function($epp) {
                return [
                    'id'                => $epp->id,
                    'nombre'            => $epp->nombre,
                    'codigo_interno'    => $epp->codigo_interno,
                    'categoria'         => $epp->categoria->nombre ?? 'N/A',
                    'talla'             => $epp->talla,
                    'stock_disponible'  => $epp->stock_disponible,
                    'stock_minimo'      => $epp->stock_minimo,
                    'diferencia'        => $epp->stock_disponible - $epp->stock_minimo,
                ];
            });

        // 4. Stock CRÍTICO (disponible <= mínimo * 0.5)
        $stockCritico = EppInventario::where('empresa_id', $empresaId)
            ->where('activo', true)
            ->stockCritico()
            ->with('categoria:id,nombre')
            ->get()
            ->map(function($epp) {
                return [
                    'id'                => $epp->id,
                    'nombre'            => $epp->nombre,
                    'codigo_interno'    => $epp->codigo_interno,
                    'categoria'         => $epp->categoria->nombre ?? 'N/A',
                    'talla'             => $epp->talla,
                    'stock_disponible'  => $epp->stock_disponible,
                    'stock_minimo'      => $epp->stock_minimo,
                    'stock_critico'     => (int)($epp->stock_minimo * 0.5),
                ];
            });

        return response()->json([
            'vencidos'          => $vencidos,
            'proximos_vencer'   => $proximosVencer,
            'stock_bajo'        => $stockBajo,
            'stock_critico'     => $stockCritico,
            'resumen' => [
                'total_vencidos'        => $vencidos->count(),
                'total_por_vencer'      => $proximosVencer->count(),
                'total_stock_bajo'      => $stockBajo->count(),
                'total_stock_critico'   => $stockCritico->count(),
            ],
        ]);
    }

    /**
     * POST /api/epps/ingresos
     * Registrar ingreso de EPPs al inventario
     */
    public function registrarIngreso(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'inventario_id'         => 'required|exists:epps_inventario,id',
            'cantidad'              => 'required|integer|min:1',
            'tipo'                  => 'required|in:compra,donacion,devolucion_proveedor,ajuste,transferencia',
            'proveedor_id'          => 'nullable|exists:epps_proveedores,id',
            'documento_referencia'  => 'nullable|string|max:100',
            'fecha_ingreso'         => 'required|date',
            'observaciones'         => 'nullable|string|max:500',
        ]);

        $empresaId = $request->user()->empresa_id;

        DB::transaction(function () use ($empresaId, $validated, $request) {
            // Bloquear inventario
            $inventario = EppInventario::where('empresa_id', $empresaId)
                ->lockForUpdate()
                ->findOrFail($validated['inventario_id']);

            $stockAnterior = $inventario->stock_disponible;
            $stockNuevo = $stockAnterior + $validated['cantidad'];

            // Incrementar stock (incrementarStock ya actualiza stock_disponible y stock_total)
            $inventario->incrementarStock($validated['cantidad']);

            // Registrar movimiento
            EppMovimiento::registrar(
                empresaId: $empresaId,
                inventarioId: $inventario->id,
                tipo: 'ingreso',
                cantidad: $validated['cantidad'],
                stockAnterior: $stockAnterior,
                stockNuevo: $stockNuevo,
                motivo: $this->getTipoIngresoLabel($validated['tipo']),
                documentoReferencia: $validated['documento_referencia'] ?? null,
                observaciones: $validated['observaciones'] ?? null,
                usuarioId: $request->user()->id
            );

            // Auditoría
            $this->auditoria->registrar(
                modulo: 'epps',
                accion: 'ingreso_inventario',
                usuario: $request->user(),
                modelo: 'EppInventario',
                modeloId: $inventario->id,
                valorNuevo: [
                    'tipo'          => $validated['tipo'],
                    'cantidad'      => $validated['cantidad'],
                    'stock_nuevo'   => $stockNuevo,
                    'documento'     => $validated['documento_referencia'] ?? null,
                ],
                request: $request
            );
        });

        return response()->json([
            'message' => 'Ingreso registrado correctamente',
        ], 201);
    }

    /**
     * GET /api/epps/movimientos
     * Historial de movimientos de inventario
     */
    public function movimientos(Request $request): JsonResponse
    {
        $query = EppMovimiento::where('empresa_id', $request->user()->empresa_id)
            ->with(['inventario:id,nombre', 'usuario:id,nombre']);

        // Filtros
        if ($request->has('tipo')) {
            $query->where('tipo', $request->tipo);
        }

        if ($request->has('inventario_id')) {
            $query->where('inventario_id', $request->inventario_id);
        }

        if ($request->has('limit')) {
            $query->limit((int)$request->limit);
        }

        $movimientos = $query->orderByDesc('created_at')->get();

        return response()->json($movimientos);
    }

    /**
     * Helper: Traducir tipo de ingreso
     */
    private function getTipoIngresoLabel(string $tipo): string
    {
        return match($tipo) {
            'compra' => 'Compra',
            'donacion' => 'Donación',
            'devolucion_proveedor' => 'Devolución de proveedor',
            'ajuste' => 'Ajuste de inventario',
            'transferencia' => 'Transferencia',
            default => 'Ingreso',
        };
    }

    // ═══════════════════════════════════════════════════════════════════════
    // GESTIÓN DE TALLAS POR PERSONAL
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * GET /api/epps/tallas/personal/{personalId}
     * Obtener tallas de un trabajador
     */
    public function tallasPersonal(Request $request, int $personalId): JsonResponse
    {
        $tallas = PersonalTalla::where('empresa_id', $request->user()->empresa_id)
            ->where('personal_id', $personalId)
            ->with(['categoria', 'actualizadoPor:id,nombre'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($tallas);
    }

    /**
     * POST /api/epps/tallas
     * Guardar o actualizar talla de un trabajador
     */
    public function storeTalla(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'personal_id'       => 'required|exists:personal,id',
            'categoria_epp_id'  => 'required|exists:epps_categorias,id',
            'talla'             => 'required|string|max:20',
            'observaciones'     => 'nullable|string|max:500',
        ]);

        $empresaId = $request->user()->empresa_id;

        // Usar updateOrCreate para evitar duplicados
        $talla = PersonalTalla::updateOrCreate(
            [
                'empresa_id'       => $empresaId,
                'personal_id'      => $validated['personal_id'],
                'categoria_epp_id' => $validated['categoria_epp_id'],
            ],
            [
                'talla'            => $validated['talla'],
                'observaciones'    => $validated['observaciones'] ?? null,
                'actualizado_por'  => $request->user()->id,
            ]
        );

        // Cargar relaciones INMEDIATAMENTE antes de usarlas
        $talla->load(['categoria', 'actualizadoPor:id,nombre']);

        // Auditoría
        $this->auditoria->registrar(
            modulo: 'epps',
            accion: 'actualizar_talla',
            usuario: $request->user(),
            modelo: 'PersonalTalla',
            modeloId: $talla->id,
            valorNuevo: [
                'personal_id'      => $talla->personal_id,
                'categoria'        => $talla->categoria->nombre ?? null,
                'talla'            => $talla->talla,
            ],
            request: $request
        );

        return response()->json($talla, 201);
    }

    /**
     * DELETE /api/epps/tallas/{id}
     * Eliminar registro de talla
     */
    public function deleteTalla(Request $request, int $id): JsonResponse
    {
        $talla = PersonalTalla::where('empresa_id', $request->user()->empresa_id)
            ->findOrFail($id);

        $talla->delete();

        return response()->json(['message' => 'Talla eliminada correctamente']);
    }

    /**
     * GET /api/epps/tallas/sugerencia
     * Sugerir talla para una entrega (usado en el formulario de entregas)
     */
    public function sugerirTalla(Request $request): JsonResponse
    {
        $personalId = $request->input('personal_id');
        $categoriaId = $request->input('categoria_id');

        if (!$personalId || !$categoriaId) {
            return response()->json(['talla_sugerida' => null]);
        }

        $talla = PersonalTalla::where('empresa_id', $request->user()->empresa_id)
            ->where('personal_id', $personalId)
            ->where('categoria_epp_id', $categoriaId)
            ->first();

        return response()->json([
            'talla_sugerida' => $talla->talla ?? null,
            'observaciones'  => $talla->observaciones ?? null,
        ]);
    }

    /**
     * GET /api/epps/tallas/matriz
     * Obtener matriz de todos los trabajadores con sus tallas por categoría
     */
    public function matrizTallas(Request $request): JsonResponse
    {
        $empresaId = $request->user()->empresa_id;

        // Obtener todas las categorías
        $categorias = EppCategoria::where('empresa_id', $empresaId)
            ->orderBy('nombre')
            ->get(['id', 'nombre']);

        // Obtener todo el personal con sus tallas
        $personal = \App\Models\Personal::where('empresa_id', $empresaId)
            ->with(['cargo', 'area'])
            ->orderBy('apellidos')
            ->orderBy('nombres')
            ->get();

        // Obtener todas las tallas de la empresa
        $tallas = PersonalTalla::where('empresa_id', $empresaId)
            ->get(['personal_id', 'categoria_epp_id', 'talla']);

        // Organizar tallas por personal_id y categoria_id
        $tallasMap = [];
        foreach ($tallas as $talla) {
            $tallasMap[$talla->personal_id][$talla->categoria_epp_id] = $talla->talla;
        }

        // Construir resultado
        $personalConTallas = $personal->map(function ($p) use ($tallasMap) {
            return [
                'id' => $p->id,
                'nombres' => $p->nombres,
                'apellidos' => $p->apellidos,
                'dni' => $p->dni,
                'cargo' => $p->cargo->nombre ?? '—',
                'area' => $p->area->nombre ?? '—',
                'tallas' => $tallasMap[$p->id] ?? [],
            ];
        });

        return response()->json([
            'categorias' => $categorias,
            'personal' => $personalConTallas,
        ]);
    }
}
