<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('equipos_catalogo', function (Blueprint $table) {
            $table->enum('frecuencia_inspeccion', ['diaria', 'semanal', 'mensual', 'trimestral', 'semestral', 'anual'])
                  ->nullable()
                  ->after('activo')
                  ->comment('Frecuencia de inspección del equipo');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('equipos_catalogo', function (Blueprint $table) {
            $table->dropColumn('frecuencia_inspeccion');
        });
    }
};
