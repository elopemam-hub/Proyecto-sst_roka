<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * INSPECCIONES — Ley 29783 Art. 32, RM-050-2013-TR Registro 06
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inspecciones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->onDelete('cascade');
            $table->foreignId('sede_id')->constrained('sedes')->onDelete('cascade');
            $table->foreignId('area_id')->constrained('areas')->onDelete('cascade');

            $table->string('codigo', 30)->unique()->comment('INS-2024-ALM-001');
            $table->enum('tipo', [
                'equipos',
                'infraestructura',
                'emergencias',
                'epps',
                'orden_limpieza',
                'higiene',
                'general',
            ])->default('general');
            $table->string('titulo');
            $table->text('descripcion')->nullable();

            $table->date('planificada_para')->nullable();
            $table->dateTime('ejecutada_en')->nullable();

            $table->foreignId('inspector_id')->constrained('personal')->onDelete('restrict');
            $table->foreignId('supervisor_id')->nullable()->constrained('personal')->onDelete('set null');
            $table->foreignId('elaborado_por')->constrained('usuarios')->onDelete('restrict');

            $table->enum('estado', [
                'programada',
                'en_ejecucion',
                'ejecutada',
                'con_hallazgos',
                'cerrada',
                'anulada',
            ])->default('programada');

            $table->decimal('puntaje_total',    6, 2)->default(0);
            $table->decimal('puntaje_obtenido', 6, 2)->default(0);
            $table->decimal('porcentaje_cumplimiento', 5, 2)->default(0);

            $table->text('observaciones_generales')->nullable();
            $table->boolean('requiere_firma')->default(false);

            $table->timestamps();
            $table->softDeletes();

            $table->index(['empresa_id', 'estado', 'tipo']);
            $table->index(['area_id', 'planificada_para']);
        });

        Schema::create('inspecciones_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inspeccion_id')->constrained('inspecciones')->onDelete('cascade');

            $table->integer('numero_item')->default(0);
            $table->string('categoria')->comment('Ej: Condiciones generales, EPPs, Equipos');
            $table->text('descripcion')->comment('La pregunta o ítem a verificar');
            $table->boolean('es_critico')->default(false)->comment('Si falla, la inspección falla automáticamente');
            $table->boolean('aplica')->default(true)->comment('Si aplica en este contexto específico');

            $table->enum('resultado', ['conforme', 'no_conforme', 'no_aplica', 'observacion'])->nullable();
            $table->tinyInteger('puntaje_maximo')->default(1);
            $table->tinyInteger('puntaje_obtenido')->nullable();

            $table->text('evidencia_path')->nullable()->comment('Ruta a foto de evidencia');
            $table->text('observaciones')->nullable();

            $table->timestamps();
            $table->index(['inspeccion_id', 'resultado']);
        });

        Schema::create('inspecciones_hallazgos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inspeccion_id')->constrained('inspecciones')->onDelete('cascade');
            $table->foreignId('inspeccion_item_id')->nullable()->constrained('inspecciones_items')->onDelete('set null');

            $table->string('numero_hallazgo', 20)->nullable()->comment('Ej: H-001');
            $table->text('descripcion');
            $table->enum('tipo', ['no_conformidad', 'observacion', 'oportunidad_mejora'])->default('no_conformidad');
            $table->enum('criticidad', ['leve', 'moderado', 'critico'])->default('moderado');

            $table->foreignId('area_id')->nullable()->constrained('areas')->onDelete('set null');
            $table->foreignId('responsable_id')->nullable()->constrained('personal')->onDelete('set null');
            $table->date('fecha_limite_correccion')->nullable();

            $table->enum('estado', [
                'pendiente',
                'en_proceso',
                'subsanado',
                'verificado',
                'vencido',
            ])->default('pendiente');

            $table->text('evidencia_antes_path')->nullable();
            $table->text('evidencia_despues_path')->nullable();
            $table->text('observaciones')->nullable();

            $table->unsignedBigInteger('accion_seguimiento_id')->nullable()
                ->comment('ID en acciones_seguimiento si se generó acción');

            $table->timestamps();
            $table->index(['inspeccion_id', 'criticidad', 'estado']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inspecciones_hallazgos');
        Schema::dropIfExists('inspecciones_items');
        Schema::dropIfExists('inspecciones');
    }
};
