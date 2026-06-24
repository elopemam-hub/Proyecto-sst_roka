<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

/**
 * Fase 3 — Sub-módulos dinámicos
 *
 * Agrega tipo_inspeccion a inspeccion_submodulos para que el sistema
 * determine el tipo de inspección desde los datos, no desde códigos
 * hardcodeados (A/B/C).
 *
 * tipo_inspeccion mapea a inspecciones.tipo (enum existente).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inspeccion_submodulos', function (Blueprint $table) {
            $table->enum('tipo_inspeccion', ['equipos', 'infraestructura', 'emergencias'])
                  ->default('equipos')
                  ->after('color')
                  ->comment('Tipo de inspección que genera este sub-módulo');
        });

        // Poblar tipo_inspeccion en los sub-módulos existentes según su código
        DB::table('inspeccion_submodulos')->where('codigo', 'A')->update(['tipo_inspeccion' => 'equipos']);
        DB::table('inspeccion_submodulos')->where('codigo', 'B')->update(['tipo_inspeccion' => 'infraestructura']);
        DB::table('inspeccion_submodulos')->where('codigo', 'C')->update(['tipo_inspeccion' => 'emergencias']);
    }

    public function down(): void
    {
        Schema::table('inspeccion_submodulos', function (Blueprint $table) {
            $table->dropColumn('tipo_inspeccion');
        });
    }
};
