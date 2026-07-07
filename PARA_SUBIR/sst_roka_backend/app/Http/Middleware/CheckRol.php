<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class CheckRol
{
    public function handle(Request $request, Closure $next, string ...$roles): mixed
    {
        $user = $request->user();

        if (!$user || !in_array($user->rol, $roles)) {
            return response()->json([
                'message' => 'No tienes permiso para realizar esta acción.',
                'rol_requerido' => $roles,
                'rol_actual' => $user?->rol,
            ], 403);
        }

        return $next($request);
    }
}
