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
        Schema::table('inspecciones', function (Blueprint $table) {
            // Agregar campo equipo_id para identificar el equipo físico específico
            $table->foreignId('equipo_id')
                ->nullable()
                ->after('equipo_catalogo_id')
                ->constrained('equipos')
                ->onDelete('set null')
                ->comment('Equipo físico específico inspeccionado (ej: Carretilla 01)');

            // Índice para búsquedas rápidas por equipo
            $table->index('equipo_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('inspecciones', function (Blueprint $table) {
            $table->dropForeign(['equipo_id']);
            $table->dropIndex(['equipo_id']);
            $table->dropColumn('equipo_id');
        });
    }
};
