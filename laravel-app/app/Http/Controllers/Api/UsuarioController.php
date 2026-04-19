<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Usuario;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class UsuarioController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Usuario::with(['empresa', 'personal']);

        if ($request->filled('empresa_id')) {
            $query->where('empresa_id', $request->empresa_id);
        }

        if ($request->filled('rol')) {
            $query->where('rol', $request->rol);
        }

        if ($request->has('activo')) {
            $query->where('activo', $request->boolean('activo'));
        }

        if ($request->filled('search')) {
            $q = $request->search;
            $query->where(function ($sub) use ($q) {
                $sub->where('nombre', 'like', "%{$q}%")
                    ->orWhere('email', 'like', "%{$q}%");
            });
        }

        $usuarios = $query->orderBy('nombre')
            ->paginate($request->integer('per_page', 15));

        return response()->json($usuarios);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'personal_id' => 'nullable|exists:personal,id',
            'nombres'     => 'required|string|max:150',
            'apellidos'   => 'required|string|max:150',
            'email'       => 'required|email|unique:usuarios,email',
            'password'    => 'required|string|min:8',
            'rol'         => 'required|in:administrador,supervisor_sst,tecnico_sst,operativo,vigilante,solo_lectura',
            'area_id'     => 'nullable|exists:areas,id',
            'activo'      => 'boolean',
        ]);

        $data['empresa_id'] = $request->user()->empresa_id;
        $data['nombre']     = trim($data['nombres'] . ' ' . $data['apellidos']);
        $data['password']   = Hash::make($data['password']);

        $usuario = Usuario::create($data);
        $usuario->load(['empresa', 'personal']);

        return response()->json($usuario, 201);
    }

    public function show(int $id): JsonResponse
    {
        $usuario = Usuario::with(['empresa', 'personal.area', 'personal.cargo'])
            ->findOrFail($id);

        return response()->json($usuario);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $usuario = Usuario::findOrFail($id);

        $data = $request->validate([
            'personal_id' => 'nullable|exists:personal,id',
            'nombres'     => 'sometimes|string|max:150',
            'apellidos'   => 'sometimes|string|max:150',
            'nombre'      => 'sometimes|string|max:150',
            'email'       => "sometimes|email|unique:usuarios,email,{$id}",
            'password'    => 'sometimes|string|min:8',
            'rol'         => 'sometimes|in:administrador,supervisor_sst,tecnico_sst,operativo,vigilante,solo_lectura',
            'area_id'     => 'nullable|exists:areas,id',
            'activo'      => 'boolean',
        ]);

        if (isset($data['nombres']) || isset($data['apellidos'])) {
            $nombres   = $data['nombres']   ?? $usuario->nombres;
            $apellidos = $data['apellidos'] ?? $usuario->apellidos;
            $data['nombre'] = trim($nombres . ' ' . $apellidos);
        }

        if (isset($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        }

        $usuario->update($data);
        $usuario->load(['empresa', 'personal']);

        return response()->json($usuario);
    }

    public function destroy(int $id): JsonResponse
    {
        $usuario = Usuario::findOrFail($id);
        $usuario->tokens()->delete();
        $usuario->delete();

        return response()->json(['message' => 'Usuario eliminado correctamente.']);
    }

    public function toggleActivo(int $id): JsonResponse
    {
        $usuario = Usuario::findOrFail($id);
        $usuario->update(['activo' => !$usuario->activo]);

        return response()->json([
            'message' => $usuario->activo ? 'Usuario activado.' : 'Usuario desactivado.',
            'activo'  => $usuario->activo,
        ]);
    }

    public function resetPassword(int $id): JsonResponse
    {
        $usuario = Usuario::findOrFail($id);
        $nuevaPassword = Str::random(12);
        $usuario->update(['password' => Hash::make($nuevaPassword)]);

        // Revocar todos los tokens activos
        $usuario->tokens()->delete();

        return response()->json([
            'message'       => 'Contraseña restablecida correctamente.',
            'nueva_password' => $nuevaPassword,
        ]);
    }
}
