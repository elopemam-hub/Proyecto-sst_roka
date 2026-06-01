<?php
namespace App\Http\Middleware;

use App\Models\RolModuloPermiso;
use App\Models\UsuarioModuloPermiso;
use Closure;
use Illuminate\Http\Request;

class CheckPermiso
{
    public function handle(Request $request, Closure $next, string $modulo, string $accion = 'ver')
    {
        $user  = $request->user();
        $campo = "puede_{$accion}";

        if (!$user) return response()->json(['message' => 'No autenticado'], 401);

        // Administrador tiene acceso total siempre
        if ($user->rol === 'administrador') return $next($request);

        // 1. Verificar override por usuario
        $permiso = UsuarioModuloPermiso::where('usuario_id', $user->id)
            ->where('modulo_clave', $modulo)->first();

        // 2. Fallback al permiso del rol
        if (!$permiso) {
            $permiso = RolModuloPermiso::where('rol', $user->rol)
                ->where('modulo_clave', $modulo)->first();
        }

        if (!$permiso || !$permiso->$campo) {
            return response()->json([
                'message' => "Sin permiso para {$accion} en módulo {$modulo}",
                'modulo'  => $modulo,
                'accion'  => $accion,
            ], 403);
        }

        return $next($request);
    }
}
