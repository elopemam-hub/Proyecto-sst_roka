<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * SEGUIMIENTO — Gestión centralizada de acciones correctivas, preventivas y de mejora
 * Recibe acciones de: Inspecciones, Accidentes, IPERC, ATS, Auditorías
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('acciones_seguimiento', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->onDelete('cascade');

            // Origen polimórfico (de qué módulo viene la acción)
            $table->enum('origen_tipo', [
                'inspeccion',
                'accidente',
                'auditoria',
                'iperc',
                'ats',
                'otro',
            ])->default('otro');
            $table->unsignedBigInteger('origen_id')->nullable()->comment('ID del documento origen');

            $table->string('codigo', 30)->unique()->comment('SEG-2024-001');
            $table->enum('tipo', ['correctiva', 'preventiva', 'mejora', 'legal'])->default('correctiva');
            $table->string('titulo');
            $table->text('descripcion');

            $table->foreignId('responsable_id')->constrained('personal')->onDelete('restrict');
            $table->foreignId('area_id')->constrained('areas')->onDelete('restrict');

            $table->enum('prioridad', ['baja', 'media', 'alta', 'critica'])->default('media');
            $table->date('fecha_programada');
            $table->date('fecha_limite');
            $table->date('fecha_ejecucion')->nullable();

            $table->tinyInteger('porcentaje_avance')->default(0)->comment('0-100');

            $table->enum('estado', [
                'pendiente',
                'en_proceso',
                'completada',
                'vencida',
                'validada',
                'cancelada',
            ])->default('pendiente');

            $table->json('evidencias')->nullable()->comment('Array de rutas a archivos/fotos');
            $table->text('observaciones')->nullable();

            // Validación por supervisor
            $table->foreignId('validado_por')->nullable()->constrained('usuarios')->onDelete('set null');
            $table->dateTime('validado_en')->nullable();
            $table->text('observaciones_validacion')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['empresa_id', 'estado', 'prioridad']);
            $table->index(['empresa_id', 'fecha_limite']);
            $table->index(['origen_tipo', 'origen_id']);
            $table->index('responsable_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('acciones_seguimiento');
    }
};
