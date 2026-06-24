<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

/**
 * Mueve frecuencia_inspeccion de equipos_catalogo (plantilla) a equipos_plantillas (asignación).
 *
 * Antes: la frecuencia era propiedad de la plantilla → todos los equipos que usaban
 *        la misma plantilla compartían la misma frecuencia.
 * Después: la frecuencia es propiedad de la asignación (pivot) → cada equipo puede
 *          usar la misma plantilla con frecuencias distintas.
 */
return new class extends Migration
{
    public function up(): void
    {
        // 1. Añadir frecuencia_inspeccion al pivot
        Schema::table('equipos_plantillas', function (Blueprint $table) {
            $table->enum('frecuencia_inspeccion', ['diaria','semanal','mensual','trimestral','semestral','anual'])
                  ->nullable()
                  ->after('activo')
                  ->comment('Frecuencia de esta asignación específica; la plantilla ya no la define');
        });

        // 2. Migrar frecuencias existentes: copiar de equipos_catalogo al pivot
        DB::statement("
            UPDATE equipos_plantillas ep
            JOIN equipos_catalogo ec ON ep.plantilla_id = ec.id
            SET ep.frecuencia_inspeccion = ec.frecuencia_inspeccion
            WHERE ec.frecuencia_inspeccion IS NOT NULL
        ");
    }

    public function down(): void
    {
        Schema::table('equipos_plantillas', function (Blueprint $table) {
            $table->dropColumn('frecuencia_inspeccion');
        });
    }
};
