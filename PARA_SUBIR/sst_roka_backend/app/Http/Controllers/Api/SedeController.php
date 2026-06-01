<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Sede;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class SedeController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Sede::where('empresa_id', $request->user()->empresa_id);

        if ($request->has('activa')) {
            $query->where('activa', $request->boolean('activa'));
        }

        $sedes = $query->orderBy('nombre')->get()->map(function ($s) {
            $s->ciudad = $s->distrito;
            return $s;
        });

        return response()->json($sedes);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'nombre'          => 'required|string|max:150',
            'direccion'       => 'nullable|string|max:255',
            'ciudad'          => 'nullable|string|max:100',
            'departamento'    => 'nullable|string|max:100',
            'provincia'       => 'nullable|string|max:100',
            'distrito'        => 'nullable|string|max:100',
            'responsable_sst' => 'nullable|string|max:150',
            'activa'          => 'boolean',
        ]);

        // ciudad es alias de distrito
        if (!empty($data['ciudad']) && empty($data['distrito'])) {
            $data['distrito'] = $data['ciudad'];
        }
        unset($data['ciudad']);

        $sede = Sede::create(array_merge($data, [
            'empresa_id' => $request->user()->empresa_id,
            'activa'     => $data['activa'] ?? true,
        ]));

        // Retornar con ciudad mapeada
        $sede->ciudad = $sede->distrito;
        return response()->json($sede, 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $sede = Sede::where('empresa_id', $request->user()->empresa_id)
            ->withCount('areas')
            ->findOrFail($id);

        return response()->json($sede);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $sede = Sede::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);

        $data = $request->validate([
            'nombre'          => 'sometimes|string|max:150',
            'direccion'       => 'nullable|string|max:255',
            'ciudad'          => 'nullable|string|max:100',
            'departamento'    => 'nullable|string|max:100',
            'provincia'       => 'nullable|string|max:100',
            'distrito'        => 'nullable|string|max:100',
            'responsable_sst' => 'nullable|string|max:150',
            'activa'          => 'boolean',
        ]);

        if (!empty($data['ciudad']) && empty($data['distrito'])) {
            $data['distrito'] = $data['ciudad'];
        }
        unset($data['ciudad']);

        $sede->update($data);
        $sede->ciudad = $sede->distrito;
        return response()->json($sede);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $sede = Sede::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);
        $sede->delete();

        return response()->json(['message' => 'Sede eliminada correctamente.']);
    }
}
