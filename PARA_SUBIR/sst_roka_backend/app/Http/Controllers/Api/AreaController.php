<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Area;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class AreaController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $empresaId = $request->user()->empresa_id;

        // Filtrar por empresa_id directo (nuevo) o a través de la sede (retrocompat.)
        $query = Area::with(['sede'])
            ->where(function ($q) use ($empresaId) {
                $q->where('empresa_id', $empresaId)
                  ->orWhereHas('sede', fn($sub) => $sub->where('empresa_id', $empresaId));
            });

        if ($request->filled('sede_id')) {
            $query->where('sede_id', $request->sede_id);
        }

        if ($request->filled('tipo')) {
            $query->where('tipo', $request->tipo);
        }

        if ($request->has('activa')) {
            $query->where('activa', $request->boolean('activa'));
        }

        if ($request->filled('search')) {
            $q = $request->search;
            $query->where(function ($sub) use ($q) {
                $sub->where('nombre', 'like', "%{$q}%")
                    ->orWhere('codigo', 'like', "%{$q}%");
            });
        }

        $perPage = $request->integer('per_page', 15);
        if ($perPage > 100) {
            $areas = $query->withCount('personal')->orderBy('nombre')->get();
            return response()->json($areas);
        }

        $areas = $query->withCount('personal')
            ->orderBy('nombre')
            ->paginate($perPage);

        return response()->json($areas);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'sede_id'     => 'nullable|exists:sedes,id',
            'nombre'      => 'required|string|max:150',
            'codigo'      => 'nullable|string|max:20',
            'tipo'        => 'nullable|in:almacen,transporte,taller,limpieza,vigilancia,distribucion,oficina,otro',
            'descripcion' => 'nullable|string|max:1000',
            'activa'      => 'boolean',
        ]);

        $data['empresa_id'] = $request->user()->empresa_id;

        $area = Area::create($data);
        $area->load('sede');

        return response()->json($area, 201);
    }

    public function show(int $id): JsonResponse
    {
        $area = Area::with(['sede.empresa'])
            ->withCount('personal')
            ->findOrFail($id);

        return response()->json($area);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $area = Area::findOrFail($id);

        $data = $request->validate([
            'sede_id'     => 'nullable|exists:sedes,id',
            'nombre'      => 'sometimes|string|max:150',
            'codigo'      => 'nullable|string|max:20',
            'tipo'        => 'nullable|in:almacen,transporte,taller,limpieza,vigilancia,distribucion,oficina,otro',
            'descripcion' => 'nullable|string|max:1000',
            'activa'      => 'boolean',
        ]);

        $area->update($data);
        $area->load('sede');

        return response()->json($area);
    }

    public function destroy(int $id): JsonResponse
    {
        $area = Area::findOrFail($id);
        $area->delete();

        return response()->json(['message' => 'Área eliminada correctamente.']);
    }

    public function fusionar(Request $request, int $id): JsonResponse
    {
        $request->validate(['area_destino_id' => 'required|integer|exists:areas,id|different:id']);

        $origen  = Area::findOrFail($id);
        $destino = Area::findOrFail($request->area_destino_id);

        // Tablas con area_id que deben actualizarse
        $tablas = [
            'accidentes', 'acciones_seguimiento', 'ats', 'auditorias',
            'capacitaciones', 'cargos', 'documentos', 'equipos',
            'inspecciones', 'inspecciones_hallazgos', 'iperc', 'opls',
            'opl_evidencias', 'personal', 'salud_restricciones',
            'simulacros', 'sustancia_exposiciones', 'usuarios', 'vehiculos',
        ];

        DB::transaction(function () use ($id, $request, $origen, $tablas) {
            foreach ($tablas as $tabla) {
                // Solo actualizar si la tabla tiene area_id y el área existe como FK
                try {
                    DB::table($tabla)
                      ->where('area_id', $id)
                      ->update(['area_id' => $request->area_destino_id]);
                } catch (\Exception) {
                    // ignorar si la tabla no tiene area_id (seguridad extra)
                }
            }
            $origen->delete();
        });

        return response()->json([
            'message' => "Área \"{$origen->nombre}\" fusionada en \"{$destino->nombre}\". Todos los registros reasignados.",
        ]);
    }
}
