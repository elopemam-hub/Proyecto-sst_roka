<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Matriz P×S dinámica en los peligros del ATS.
 * Añade probabilidad y el nivel/clasificación calculados (severidad ya existe como enum).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ats_peligros', function (Blueprint $table) {
            $table->tinyInteger('probabilidad')->default(1)->after('severidad')->comment('1-4: probabilidad de ocurrencia');
            $table->integer('nivel_riesgo')->nullable()->after('probabilidad')->comment('probabilidad × severidad (1-16)');
            $table->string('clasificacion', 20)->nullable()->after('nivel_riesgo')->comment('trivial|tolerable|moderado|importante|intolerable');
        });
    }

    public function down(): void
    {
        Schema::table('ats_peligros', function (Blueprint $table) {
            $table->dropColumn(['probabilidad', 'nivel_riesgo', 'clasificacion']);
        });
    }
};
