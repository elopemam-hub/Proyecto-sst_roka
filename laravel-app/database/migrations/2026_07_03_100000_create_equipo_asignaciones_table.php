<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('equipo_asignaciones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas');
            $table->foreignId('equipo_id')->constrained('equipos');
            $table->foreignId('usuario_id')->constrained('usuarios');
            $table->date('fecha');
            $table->enum('turno', ['mañana', 'tarde', 'noche', 'dia_completo'])->default('dia_completo');
            $table->enum('estado', ['pendiente', 'en_proceso', 'completado', 'omitido'])->default('pendiente');
            $table->foreignId('inspeccion_id')->nullable()->constrained('inspecciones')->nullOnDelete();
            $table->string('observaciones', 500)->nullable();
            $table->foreignId('creado_por')->constrained('usuarios');
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['equipo_id', 'usuario_id', 'fecha', 'turno'], 'asig_equipo_usuario_fecha_turno_unique');
            $table->index(['empresa_id', 'fecha']);
            $table->index(['usuario_id', 'fecha']);
            $table->index('estado');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('equipo_asignaciones');
    }
};
