<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Elimina el calendario paralelo de inspecciones programadas.
 *
 * Era un scheduler que generaba fechas por frecuencia en su propia tabla, pero
 * nadie lo cerraba: 1066 filas, 0 enlazadas a una inspección real, y todo
 * envejecía a "vencida". El Programa de Inspecciones ahora se calcula en vivo
 * cruzando equipos_plantillas contra inspecciones (ProgramaInspeccionesController),
 * así que esta tabla ya no la lee ni la escribe nadie.
 *
 * El down() recrea la estructura, pero NO los datos: se respaldaron aparte con
 * mysqldump antes de ejecutar esta migración.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('inspeccion_programadas');
    }

    public function down(): void
    {
        Schema::create('inspeccion_programadas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->cascadeOnDelete();
            $table->foreignId('equipo_id')->constrained('equipos')->cascadeOnDelete();
            $table->unsignedInteger('plantilla_id');
            $table->date('fecha_programada');
            $table->date('fecha_realizada')->nullable();
            $table->foreignId('inspeccion_id')->nullable()->constrained('inspecciones')->nullOnDelete();
            $table->enum('estado', ['pendiente', 'realizada', 'omitida', 'vencida'])->default('pendiente');
            $table->text('observaciones')->nullable();
            $table->timestamps();

            $table->unique(['equipo_id', 'plantilla_id', 'fecha_programada'], 'uq_prog_equipo_plantilla_fecha');
            $table->index(['empresa_id', 'fecha_programada', 'estado'], 'idx_prog_empresa_fecha_estado');
            $table->index(['equipo_id', 'plantilla_id'], 'idx_prog_equipo_plantilla');

            $table->foreign('plantilla_id')->references('id')->on('equipos_catalogo')->cascadeOnDelete();
        });
    }
};
