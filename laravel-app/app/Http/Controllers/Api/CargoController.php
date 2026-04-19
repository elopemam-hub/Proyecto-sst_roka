<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cargo;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class CargoController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $cargos = Cargo::where('empresa_id', $request->user()->empresa_id)
            ->orderBy('nombre')
            ->get();

        return response()->json($cargos);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'nombre'      => 'required|string|max:150',
            'codigo'      => 'nullable|string|max:20',
            'es_critico'  => 'boolean',
            'requiere_emo'=> 'boolean',
            'funciones'   => 'nullable|string',
            'descripcion' => 'nullable|string',
        ]);

        // descripcion es alias de funciones en el frontend
        if (empty($data['funciones']) && !empty($data['descripcion'])) {
            $data['funciones'] = $data['descripcion'];
        }
        unset($data['descripcion']);

        $cargo = Cargo::create(array_merge($data, [
            'empresa_id' => $request->user()->empresa_id,
        ]));

        return response()->json($cargo, 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $cargo = Cargo::where('empresa_id', $request->user()->empresa_id)
            ->withCount('personal')
            ->findOrFail($id);

        return response()->json($cargo);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $cargo = Cargo::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);

        $data = $request->validate([
            'nombre'      => 'sometimes|string|max:150',
            'codigo'      => 'nullable|string|max:20',
            'es_critico'  => 'boolean',
            'requiere_emo'=> 'boolean',
            'funciones'   => 'nullable|string',
            'descripcion' => 'nullable|string',
        ]);

        if (empty($data['funciones']) && !empty($data['descripcion'])) {
            $data['funciones'] = $data['descripcion'];
        }
        unset($data['descripcion']);

        $cargo->update($data);

        return response()->json($cargo);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $cargo = Cargo::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);
        $cargo->delete();

        return response()->json(['message' => 'Cargo eliminado correctamente.']);
    }
}
