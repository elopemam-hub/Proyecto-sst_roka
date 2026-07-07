<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InspeccionSubmodulo;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class InspeccionSubmoduloController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(
            InspeccionSubmodulo::orderBy('orden')->orderBy('codigo')->get()
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'codigo'           => 'required|string|max:10|unique:inspeccion_submodulos,codigo',
            'nombre'           => 'required|string|max:100',
            'descripcion'      => 'nullable|string|max:255',
            'color'            => 'nullable|string|max:20',
            'tipo_inspeccion'  => 'required|in:equipos,infraestructura,emergencias',
            'activo'           => 'boolean',
            'orden'            => 'nullable|integer|min:0',
        ]);

        $submodulo = InspeccionSubmodulo::create($data);

        return response()->json($submodulo, 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $submodulo = InspeccionSubmodulo::findOrFail($id);

        $data = $request->validate([
            'codigo'           => 'sometimes|string|max:10|unique:inspeccion_submodulos,codigo,' . $id,
            'nombre'           => 'sometimes|string|max:100',
            'descripcion'      => 'nullable|string|max:255',
            'color'            => 'nullable|string|max:20',
            'tipo_inspeccion'  => 'sometimes|in:equipos,infraestructura,emergencias',
            'activo'           => 'boolean',
            'orden'            => 'nullable|integer|min:0',
        ]);

        $submodulo->update($data);

        return response()->json($submodulo);
    }

    public function destroy(int $id): JsonResponse
    {
        $submodulo = InspeccionSubmodulo::findOrFail($id);

        $enUso = $submodulo->equipos()->count();
        if ($enUso > 0) {
            return response()->json(
                ['message' => "No se puede eliminar: {$enUso} plantilla(s) de checklist pertenecen a este sub-módulo."],
                422
            );
        }

        $submodulo->delete();

        return response()->json(['message' => 'Sub-módulo eliminado']);
    }
}
