<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EquipoTipo;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class EquipoTipoController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tipos = EquipoTipo::where('empresa_id', $request->user()->empresa_id)
            ->orderBy('orden')
            ->orderBy('nombre')
            ->get();

        return response()->json($tipos);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'nombre'      => 'required|string|max:100',
            'descripcion' => 'nullable|string|max:255',
            'icono'       => 'nullable|string|max:50',
            'activo'      => 'boolean',
            'orden'       => 'nullable|integer|min:0',
        ]);

        $tipo = EquipoTipo::create([...$data, 'empresa_id' => $request->user()->empresa_id]);

        return response()->json($tipo, 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $tipo = EquipoTipo::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);

        $data = $request->validate([
            'nombre'      => 'sometimes|string|max:100',
            'descripcion' => 'nullable|string|max:255',
            'icono'       => 'nullable|string|max:50',
            'activo'      => 'boolean',
            'orden'       => 'nullable|integer|min:0',
        ]);

        $tipo->update($data);

        return response()->json($tipo);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $tipo = EquipoTipo::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);

        $enUso = $tipo->equipos()->count();
        if ($enUso > 0) {
            return response()->json(
                ['message' => "No se puede eliminar: {$enUso} equipo(s) usan este tipo."],
                422
            );
        }

        $tipo->delete();

        return response()->json(['message' => 'Tipo eliminado']);
    }
}
