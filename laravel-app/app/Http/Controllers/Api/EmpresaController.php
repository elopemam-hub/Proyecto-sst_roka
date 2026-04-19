<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Empresa;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class EmpresaController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Empresa::query();

        if ($request->boolean('activa') !== null && $request->has('activa')) {
            $query->where('activa', $request->boolean('activa'));
        }

        if ($request->filled('search')) {
            $q = $request->search;
            $query->where(function ($sub) use ($q) {
                $sub->where('razon_social', 'like', "%{$q}%")
                    ->orWhere('ruc', 'like', "%{$q}%");
            });
        }

        $empresas = $query->withCount(['personal', 'usuarios'])
            ->orderBy('razon_social')
            ->paginate($request->integer('per_page', 15));

        return response()->json($empresas);
    }

    /**
     * GET /api/empresa/mia — retorna la empresa del usuario autenticado
     */
    public function mia(Request $request): JsonResponse
    {
        $empresa = Empresa::findOrFail($request->user()->empresa_id);
        return response()->json($empresa);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'razon_social'        => 'required|string|max:255',
            'ruc'                 => 'required|string|size:11|unique:empresas,ruc',
            'ciiu'                => 'nullable|string|max:150',
            'representante_legal' => 'required|string|max:255',
            'dni_representante'   => 'required|string|size:8',
            'direccion'           => 'required|string|max:500',
            'telefono'            => 'nullable|string|max:20',
            'email'               => 'nullable|email|max:255',
            'activa'              => 'boolean',
        ]);

        $empresa = Empresa::create($data);

        return response()->json($empresa, 201);
    }

    public function show(int $id): JsonResponse
    {
        $empresa = Empresa::with(['sedes.areas', 'cargos'])
            ->withCount(['personal', 'usuarios'])
            ->findOrFail($id);

        return response()->json($empresa);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $empresa = Empresa::findOrFail($id);

        $data = $request->validate([
            'razon_social'        => 'sometimes|string|max:255',
            'ruc'                 => "sometimes|string|max:11|unique:empresas,ruc,{$id}",
            'ciiu'                => 'nullable|string|max:150',
            'representante_legal' => 'sometimes|string|max:255',
            'dni_representante'   => 'nullable|string|max:8',
            'direccion'           => 'nullable|string|max:500',
            'telefono'            => 'nullable|string|max:20',
            'email'               => 'nullable|email|max:255',
            'activa'              => 'boolean',
        ]);

        $empresa->update($data);

        return response()->json($empresa);
    }

    public function destroy(int $id): JsonResponse
    {
        $empresa = Empresa::findOrFail($id);
        $empresa->delete();

        return response()->json(['message' => 'Empresa eliminada correctamente.']);
    }
}
