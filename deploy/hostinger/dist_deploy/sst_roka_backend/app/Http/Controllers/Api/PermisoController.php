<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RolModuloPermiso;
use App\Models\UsuarioModuloPermiso;
use App\Models\Usuario;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PermisoController extends Controller
{
    // ── Módulos ──────────────────────────────────────────────────────────────

    public function modulos(): JsonResponse
    {
        $modulos = DB::table('modulos')->where('activo', true)->orderBy('grupo')->orderBy('orden')->get();
        return response()->json($modulos);
    }

    // ── Permisos por rol ─────────────────────────────────────────────────────

    public function permisosPorRol(string $rol): JsonResponse
    {
        $permisos = RolModuloPermiso::where('rol', $rol)->get()->keyBy('modulo_clave');
        return response()->json($permisos);
    }

    public function actualizarRol(Request $request, string $rol): JsonResponse
    {
        $roles = ['administrador','supervisor_sst','tecnico_sst','operativo','vigilante','solo_lectura'];
        if (!in_array($rol, $roles)) return response()->json(['message' => 'Rol inválido'], 422);

        $request->validate([
            'permisos'              => 'required|array',
            'permisos.*.modulo_clave' => 'required|string',
            'permisos.*.puede_ver'    => 'boolean',
            'permisos.*.puede_crear'  => 'boolean',
            'permisos.*.puede_editar' => 'boolean',
            'permisos.*.puede_eliminar' => 'boolean',
            'permisos.*.puede_aprobar'  => 'boolean',
            'permisos.*.puede_exportar' => 'boolean',
        ]);

        foreach ($request->permisos as $p) {
            RolModuloPermiso::updateOrCreate(
                ['rol' => $rol, 'modulo_clave' => $p['modulo_clave']],
                [
                    'puede_ver'      => $p['puede_ver']      ?? false,
                    'puede_crear'    => $p['puede_crear']    ?? false,
                    'puede_editar'   => $p['puede_editar']   ?? false,
                    'puede_eliminar' => $p['puede_eliminar'] ?? false,
                    'puede_aprobar'  => $p['puede_aprobar']  ?? false,
                    'puede_exportar' => $p['puede_exportar'] ?? false,
                ]
            );
        }

        return response()->json(['message' => "Permisos del rol {$rol} actualizados"]);
    }

    public function restaurarRolDefecto(string $rol): JsonResponse
    {
        // Solo elimina los overrides — vuelve a los defaults de la DB (que ya están)
        UsuarioModuloPermiso::whereHas('usuario', fn($q) => $q->where('rol', $rol))->delete();
        return response()->json(['message' => "Overrides de usuarios con rol {$rol} eliminados"]);
    }

    // ── Permisos por usuario ─────────────────────────────────────────────────

    public function permisosUsuario(int $userId): JsonResponse
    {
        $usuario = Usuario::findOrFail($userId);
        // Permisos base del rol
        $rolPermisos = RolModuloPermiso::where('rol', $usuario->rol)
            ->get()->keyBy('modulo_clave');
        // Overrides del usuario
        $userPermisos = UsuarioModuloPermiso::where('usuario_id', $userId)
            ->get()->keyBy('modulo_clave');

        // Merge: user override gana sobre rol
        $merged = $rolPermisos->map(function ($p, $clave) use ($userPermisos) {
            return $userPermisos->has($clave) ? $userPermisos[$clave] : $p;
        });

        return response()->json([
            'usuario'    => $usuario->only(['id','nombre','apellido','email','rol']),
            'rol'        => $usuario->rol,
            'permisos'   => $merged,
            'overrides'  => $userPermisos,
        ]);
    }

    public function actualizarUsuario(Request $request, int $userId): JsonResponse
    {
        $request->validate([
            'permisos'                => 'required|array',
            'permisos.*.modulo_clave' => 'required|string',
        ]);

        foreach ($request->permisos as $p) {
            // Si todos son false, eliminar el override (usar el del rol)
            $todoCero = !($p['puede_ver'] ?? false) && !($p['puede_crear'] ?? false)
                && !($p['puede_editar'] ?? false) && !($p['puede_eliminar'] ?? false)
                && !($p['puede_aprobar'] ?? false) && !($p['puede_exportar'] ?? false);

            if ($todoCero && isset($p['es_override']) && !$p['es_override']) {
                UsuarioModuloPermiso::where('usuario_id', $userId)
                    ->where('modulo_clave', $p['modulo_clave'])->delete();
            } else {
                UsuarioModuloPermiso::updateOrCreate(
                    ['usuario_id' => $userId, 'modulo_clave' => $p['modulo_clave']],
                    [
                        'puede_ver'      => $p['puede_ver']      ?? false,
                        'puede_crear'    => $p['puede_crear']    ?? false,
                        'puede_editar'   => $p['puede_editar']   ?? false,
                        'puede_eliminar' => $p['puede_eliminar'] ?? false,
                        'puede_aprobar'  => $p['puede_aprobar']  ?? false,
                        'puede_exportar' => $p['puede_exportar'] ?? false,
                        'updated_at'     => now(),
                    ]
                );
            }
        }

        return response()->json(['message' => "Permisos del usuario #{$userId} actualizados"]);
    }

    public function limpiarOverridesUsuario(int $userId): JsonResponse
    {
        UsuarioModuloPermiso::where('usuario_id', $userId)->delete();
        return response()->json(['message' => 'Overrides eliminados — se usa el perfil del rol']);
    }

    // ── Permisos del usuario actual (para el frontend) ───────────────────────

    public function misPermisos(Request $request): JsonResponse
    {
        $user = $request->user();

        // Admin = acceso total
        if ($user->rol === 'administrador') {
            $modulos = DB::table('modulos')->where('activo', true)->pluck('clave');
            $todos   = [];
            foreach ($modulos as $clave) {
                $todos[$clave] = [
                    'puede_ver'      => true, 'puede_crear'    => true,
                    'puede_editar'   => true, 'puede_eliminar' => true,
                    'puede_aprobar'  => true, 'puede_exportar' => true,
                ];
            }
            return response()->json($todos);
        }

        // Permisos base del rol
        $rolPermisos  = RolModuloPermiso::where('rol', $user->rol)->get()->keyBy('modulo_clave');
        $userOverrides = UsuarioModuloPermiso::where('usuario_id', $user->id)->get()->keyBy('modulo_clave');

        $resultado = [];
        foreach ($rolPermisos as $clave => $p) {
            $efectivo = $userOverrides->has($clave) ? $userOverrides[$clave] : $p;
            $resultado[$clave] = [
                'puede_ver'      => (bool)$efectivo->puede_ver,
                'puede_crear'    => (bool)$efectivo->puede_crear,
                'puede_editar'   => (bool)$efectivo->puede_editar,
                'puede_eliminar' => (bool)$efectivo->puede_eliminar,
                'puede_aprobar'  => (bool)$efectivo->puede_aprobar,
                'puede_exportar' => (bool)$efectivo->puede_exportar,
            ];
        }

        return response()->json($resultado);
    }
}
