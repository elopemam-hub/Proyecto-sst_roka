<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Area;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class AreaController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Area::with(['sede.empresa']);

        if ($request->filled('sede_id')) {
            $query->where('sede_id', $request->sede_id);
        }

        if ($request->filled('empresa_id')) {
            $query->whereHas('sede', fn($q) => $q->where('empresa_id', $request->empresa_id));
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

        $areas = $query->withCount('personal')
            ->orderBy('nombre')
            ->paginate($request->integer('per_page', 15));

        return response()->json($areas);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'sede_id'     => 'required|exists:sedes,id',
            'nombre'      => 'required|string|max:150',
            'codigo'      => 'nullable|string|max:20',
            'tipo'        => 'nullable|in:almacen,transporte,taller,limpieza,vigilancia,distribucion,oficina,otro',
            'descripcion' => 'nullable|string|max:1000',
            'activa'      => 'boolean',
        ]);

        $area = Area::create($data);
        $area->load('sede.empresa');

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
            'sede_id'     => 'sometimes|exists:sedes,id',
            'nombre'      => 'sometimes|string|max:150',
            'codigo'      => 'nullable|string|max:20',
            'tipo'        => 'nullable|in:almacen,transporte,taller,limpieza,vigilancia,distribucion,oficina,otro',
            'descripcion' => 'nullable|string|max:1000',
            'activa'      => 'boolean',
        ]);

        $area->update($data);
        $area->load('sede.empresa');

        return response()->json($area);
    }

    public function destroy(int $id): JsonResponse
    {
        $area = Area::findOrFail($id);
        $area->delete();

        return response()->json(['message' => 'Área eliminada correctamente.']);
    }
}
