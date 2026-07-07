<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Ampliar el ENUM en las tablas que restringen el campo rol
        DB::statement("ALTER TABLE rol_modulo_permisos MODIFY rol ENUM('administrador','supervisor_sst','tecnico_sst','operativo','trabajador_tercero','vigilante','solo_lectura') NOT NULL");
        DB::statement("ALTER TABLE usuarios MODIFY rol ENUM('administrador','supervisor_sst','tecnico_sst','operativo','trabajador_tercero','vigilante','solo_lectura') NOT NULL DEFAULT 'operativo'");

        $rol = 'trabajador_tercero';

        // Obtener todos los módulos activos
        $modulos = DB::table('modulos')->where('activo', true)->pluck('clave');

        foreach ($modulos as $clave) {
            $esDashboard    = $clave === 'dashboard';
            $esInspecciones = $clave === 'inspecciones';

            DB::table('rol_modulo_permisos')->updateOrInsert(
                ['rol' => $rol, 'modulo_clave' => $clave],
                [
                    'puede_ver'      => $esDashboard || $esInspecciones,
                    'puede_crear'    => $esInspecciones,
                    'puede_editar'   => false,
                    'puede_eliminar' => false,
                    'puede_aprobar'  => false,
                    'puede_exportar' => false,
                ]
            );
        }
    }

    public function down(): void
    {
        DB::table('rol_modulo_permisos')->where('rol', 'trabajador_tercero')->delete();
        DB::statement("ALTER TABLE rol_modulo_permisos MODIFY rol ENUM('administrador','supervisor_sst','tecnico_sst','operativo','vigilante','solo_lectura') NOT NULL");
        DB::statement("ALTER TABLE usuarios MODIFY rol ENUM('administrador','supervisor_sst','tecnico_sst','operativo','vigilante','solo_lectura') NOT NULL DEFAULT 'operativo'");
    }
};
