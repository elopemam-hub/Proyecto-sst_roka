<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Fase 2 — Scheduler de inspecciones programadas
 *
 * Registra qué inspecciones deben hacerse, cuándo, y si se realizaron.
 * Se genera con el endpoint POST /api/inspecciones-programadas/generar
 * a partir de los pares equipo ↔ plantilla del pivot equipos_plantillas.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inspeccion_programadas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->onDelete('cascade');
            $table->foreignId('equipo_id')->constrained('equipos')->onDelete('cascade');
            // plantilla_id referencia equipos_catalogo.id que es int(10) unsigned
            $table->unsignedInteger('plantilla_id');
            $table->foreign('plantilla_id')->references('id')->on('equipos_catalogo')->onDelete('cascade');
            $table->date('fecha_programada');
            $table->date('fecha_realizada')->nullable();
            // Enlace opcional a la inspección real una vez ejecutada
            $table->foreignId('inspeccion_id')->nullable()->constrained('inspecciones')->onDelete('set null');
            $table->enum('estado', ['pendiente', 'realizada', 'omitida', 'vencida'])->default('pendiente');
            $table->text('observaciones')->nullable();
            $table->timestamps();

            // Evitar duplicados: un equipo no puede tener dos programaciones de
            // la misma plantilla el mismo día
            $table->unique(['equipo_id', 'plantilla_id', 'fecha_programada'], 'uq_prog_equipo_plantilla_fecha');

            $table->index(['empresa_id', 'fecha_programada', 'estado'], 'idx_prog_empresa_fecha_estado');
            $table->index(['equipo_id', 'plantilla_id'], 'idx_prog_equipo_plantilla');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inspeccion_programadas');
    }
};
