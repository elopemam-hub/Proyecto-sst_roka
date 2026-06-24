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
        Schema::table('personal', function (Blueprint $table) {
            // Foto/evidencia del DNI
            $table->string('dni_foto_path', 500)
                  ->nullable()
                  ->after('dni_vencimiento')
                  ->comment('Ruta de imagen del DNI (evidencia)');

            // Foto/evidencia de la licencia de conducir
            $table->string('licencia_foto_path', 500)
                  ->nullable()
                  ->after('licencia_vencimiento')
                  ->comment('Ruta de imagen de la licencia de conducir (evidencia)');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('personal', function (Blueprint $table) {
            $table->dropColumn(['dni_foto_path', 'licencia_foto_path']);
        });
    }
};
