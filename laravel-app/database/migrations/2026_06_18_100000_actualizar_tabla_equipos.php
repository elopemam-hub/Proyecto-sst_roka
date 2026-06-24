<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Renombrar columnas si tienen el nombre original de la migración v1
        Schema::table('equipos', function (Blueprint $table) {
            if (Schema::hasColumn('equipos', 'ultimo_mantenimiento') && !Schema::hasColumn('equipos', 'fecha_ultimo_mantenimiento')) {
                $table->renameColumn('ultimo_mantenimiento', 'fecha_ultimo_mantenimiento');
            }
            if (Schema::hasColumn('equipos', 'proximo_mantenimiento') && !Schema::hasColumn('equipos', 'fecha_proxima_calibracion')) {
                $table->renameColumn('proximo_mantenimiento', 'fecha_proxima_calibracion');
            }
            if (Schema::hasColumn('equipos', 'certificacion_vencimiento') && !Schema::hasColumn('equipos', 'fecha_proxima_revision')) {
                $table->renameColumn('certificacion_vencimiento', 'fecha_proxima_revision');
            }
        });

        // 2. Ampliar longitud de codigo si sigue con max 30
        if (Schema::hasColumn('equipos', 'codigo')) {
            DB::statement("ALTER TABLE equipos MODIFY COLUMN codigo VARCHAR(50) NULL");
        }

        // 3. Agregar columnas faltantes
        Schema::table('equipos', function (Blueprint $table) {
            if (!Schema::hasColumn('equipos', 'responsable_id')) {
                $table->unsignedBigInteger('responsable_id')->nullable()->after('area_id');
                $table->foreign('responsable_id')->references('id')->on('personal')->onDelete('set null');
            }
            if (!Schema::hasColumn('equipos', 'equipo_catalogo_id')) {
                $table->unsignedBigInteger('equipo_catalogo_id')->nullable()->after('responsable_id');
                $table->foreign('equipo_catalogo_id')->references('id')->on('equipos_catalogo')->onDelete('set null');
            }
            if (!Schema::hasColumn('equipos', 'anio_fabricacion')) {
                $table->year('anio_fabricacion')->nullable()->after('serie');
            }
            if (!Schema::hasColumn('equipos', 'fecha_adquisicion')) {
                $table->date('fecha_adquisicion')->nullable()->after('anio_fabricacion');
            }
            if (!Schema::hasColumn('equipos', 'fecha_proxima_revision')) {
                $table->date('fecha_proxima_revision')->nullable();
            }
            if (!Schema::hasColumn('equipos', 'ubicacion')) {
                $table->string('ubicacion', 200)->nullable()->after('observaciones');
            }
            // Hacer area_id nullable (era NOT NULL en la migración original)
            $table->unsignedBigInteger('area_id')->nullable()->change();
        });

        // 4. Ampliar ENUM tipo para incluir todos los valores del sistema
        DB::statement("ALTER TABLE equipos MODIFY COLUMN tipo ENUM(
            'maquinaria','herramienta','instrumento','equipo_medicion',
            'electrico','vehiculo','extintor','emergencias','otro'
        ) NOT NULL DEFAULT 'otro'");

        // 5. Añadir 'inactivo' al ENUM estado
        DB::statement("ALTER TABLE equipos MODIFY COLUMN estado ENUM(
            'operativo','mantenimiento','baja','inactivo'
        ) NOT NULL DEFAULT 'operativo'");
    }

    public function down(): void
    {
        // Revertir solo lo que sea seguro sin pérdida de datos
        Schema::table('equipos', function (Blueprint $table) {
            if (Schema::hasColumn('equipos', 'ubicacion'))          $table->dropColumn('ubicacion');
            if (Schema::hasColumn('equipos', 'fecha_adquisicion'))  $table->dropColumn('fecha_adquisicion');
            if (Schema::hasColumn('equipos', 'anio_fabricacion'))   $table->dropColumn('anio_fabricacion');
        });
    }
};
