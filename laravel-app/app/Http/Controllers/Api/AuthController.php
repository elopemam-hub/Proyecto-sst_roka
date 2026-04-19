<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Usuario;
use App\Services\AuditoriaService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function __construct(
        private AuditoriaService $auditoria
    ) {}

    /**
     * Inicio de sesión
     * POST /api/auth/login
     */
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        $usuario = Usuario::where('email', $request->email)
            ->where('activo', true)
            ->first();

        // Verificar si está bloqueado
        if ($usuario && $usuario->bloqueado_hasta && $usuario->bloqueado_hasta->isFuture()) {
            return response()->json([
                'message' => 'Cuenta bloqueada temporalmente. Intente en ' . $usuario->bloqueado_hasta->diffForHumans(),
            ], 423);
        }

        // Verificar credenciales
        if (!$usuario || !Hash::check($request->password, $usuario->password)) {
            // Incrementar intentos fallidos
            if ($usuario) {
                $intentos = $usuario->intentos_fallidos + 1;
                $bloqueo  = $intentos >= 5 ? now()->addMinutes(15) : null;
                $usuario->update([
                    'intentos_fallidos' => $intentos,
                    'bloqueado_hasta'   => $bloqueo,
                ]);
            }

            $this->auditoria->registrar(
                modulo: 'auth',
                accion: 'login_fallido',
                modelo: 'Usuario',
                valorNuevo: ['email' => $request->email],
                request: $request
            );

            throw ValidationException::withMessages([
                'email' => ['Las credenciales no son correctas.'],
            ]);
        }

        // 2FA para administradores
        if ($usuario->dos_factores && $usuario->rol === 'administrador') {
            return response()->json([
                'requires_2fa' => true,
                'user_id'      => $usuario->id,
            ]);
        }

        // Generar token
        $token = $usuario->createToken('sst_roka_token', ['*'], now()->addHours(8))->plainTextToken;

        // Registrar acceso
        $usuario->registrarAcceso($request->ip());

        $this->auditoria->registrar(
            modulo: 'auth',
            accion: 'login',
            usuario: $usuario,
            request: $request
        );

        return response()->json([
            'token' => $token,
            'user'  => [
                'id'       => $usuario->id,
                'nombre'   => $usuario->nombre,
                'email'    => $usuario->email,
                'rol'      => $usuario->rol,
                'empresa'  => $usuario->empresa->razon_social,
                'permisos' => Usuario::PERMISOS_ROL[$usuario->rol] ?? [],
            ],
        ]);
    }

    /**
     * Cerrar sesión
     * POST /api/auth/logout
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        $this->auditoria->registrar(
            modulo: 'auth',
            accion: 'logout',
            usuario: $request->user(),
            request: $request
        );

        return response()->json(['message' => 'Sesión cerrada correctamente.']);
    }

    /**
     * Obtener usuario autenticado
     * GET /api/auth/me
     */
    public function me(Request $request): JsonResponse
    {
        $usuario = $request->user()->load(['empresa', 'personal.area', 'personal.cargo']);

        return response()->json([
            'id'                      => $usuario->id,
            'nombre'                  => $usuario->nombre,
            'email'                   => $usuario->email,
            'rol'                     => $usuario->rol,
            'empresa_id'              => $usuario->empresa_id,
            'empresa'                 => $usuario->empresa->razon_social,
            'permisos'                => Usuario::PERMISOS_ROL[$usuario->rol] ?? [],
            'notificaciones_no_leidas' => $usuario->notificaciones_no_leidas,
            'ultimo_acceso'           => $usuario->ultimo_acceso?->toIso8601String(),
            'personal'                => $usuario->personal ? [
                'nombre_completo' => $usuario->personal->nombre_completo,
                'area'            => $usuario->personal->area?->nombre,
                'cargo'           => $usuario->personal->cargo?->nombre,
            ] : null,
        ]);
    }

    /**
     * Refrescar token
     * POST /api/auth/refresh
     */
    public function refresh(Request $request): JsonResponse
    {
        $usuario = $request->user();
        $request->user()->currentAccessToken()->delete();
        $token = $usuario->createToken('sst_roka_token', ['*'], now()->addHours(8))->plainTextToken;

        return response()->json(['token' => $token]);
    }
}
