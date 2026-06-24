<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('qr_scans', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('equipo_id');
            $table->unsignedInteger('usuario_id')->nullable();
            $table->string('ip', 45)->nullable();
            $table->string('user_agent', 500)->nullable();
            $table->decimal('latitud', 10, 8)->nullable();
            $table->decimal('longitud', 11, 8)->nullable();
            $table->integer('precision_metros')->nullable();
            $table->string('accion', 50)->default('visualizar'); // visualizar, inspeccionar, ver_ficha, ver_historial
            $table->timestamp('escaneado_en');

            $table->index('equipo_id');
            $table->index('usuario_id');
            $table->index('escaneado_en');

            $table->foreign('equipo_id')->references('id')->on('equipos')->onDelete('cascade');
            $table->foreign('usuario_id')->references('id')->on('usuarios')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('qr_scans');
    }
};
