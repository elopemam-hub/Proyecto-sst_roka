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
        Schema::table('checklist_preguntas', function (Blueprint $table) {
            $table->enum('frecuencia', ['diaria', 'semanal', 'mensual', 'ambas'])
                  ->default('ambas')
                  ->after('activo')
                  ->comment('Frecuencia de la pregunta: diaria, semanal, mensual, o ambas (diaria+mensual)');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('checklist_preguntas', function (Blueprint $table) {
            $table->dropColumn('frecuencia');
        });
    }
};
