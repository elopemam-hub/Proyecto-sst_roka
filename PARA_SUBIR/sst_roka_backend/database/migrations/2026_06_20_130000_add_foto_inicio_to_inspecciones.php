<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inspecciones', function (Blueprint $table) {
            $table->string('foto_inicio_path', 500)->nullable()->after('turno')
                  ->comment('Foto adjunta al iniciar la inspección diaria');
        });
    }

    public function down(): void
    {
        Schema::table('inspecciones', function (Blueprint $table) {
            $table->dropColumn('foto_inicio_path');
        });
    }
};
