<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ─── Capacitaciones ────────────────────────────────────────────────
        Schema::create('capacitaciones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->cascadeOnDelete();
            $table->foreignId('area_id')->nullable()->constrained('areas')->nullOnDelete();
            $table->string('titulo', 200);
            $table->string('tema', 300)->nullable();
            $table->enum('tipo', [
                'induccion', 'especifica', 'general', 'sensibilizacion',
            ])->default('general');
            $table->enum('modalidad', [
                'presencial', 'virtual', 'mixto',
            ])->default('presencial');
            $table->date('fecha_programada');
            $table->date('fecha_ejecutada')->nullable();
            $table->decimal('duracion_horas', 5, 2)->default(1);
            $table->string('expositor', 150)->nullable();
            $table->string('expositor_cargo', 100)->nullable();
            $table->string('lugar', 200)->nullable();
            $table->unsignedInteger('max_participantes')->nullable();
            $table->enum('estado', [
                'programada', 'ejecutada', 'cancelada', 'reprogramada',
            ])->default('programada');
            $table->text('observaciones')->nullable();
            $table->string('archivo_material')->nullable();
            $table->timestamps();

            $table->index(['empresa_id', 'estado']);
            $table->index(['empresa_id', 'fecha_programada']);
        });

        // ─── Asistentes de capacitación ────────────────────────────────────
        Schema::create('capacitacion_asistentes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('capacitacion_id')->constrained('capacitaciones')->cascadeOnDelete();
            $table->foreignId('personal_id')->constrained('personal')->cascadeOnDelete();
            $table->boolean('asistio')->default(false);
            $table->time('hora_ingreso')->nullable();
            $table->time('hora_salida')->nullable();
            $table->decimal('nota_evaluacion', 5, 2)->nullable();
            $table->boolean('aprobado')->nullable();
            $table->string('firma_path')->nullable();
            $table->text('observaciones')->nullable();
            $table->timestamps();

            $table->unique(['capacitacion_id', 'personal_id']);
        });

        // ─── Evaluaciones de capacitación ──────────────────────────────────
        Schema::create('capacitacion_evaluaciones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->cascadeOnDelete();
            $table->foreignId('capacitacion_id')->constrained('capacitaciones')->cascadeOnDelete();
            $table->string('titulo', 200);
            $table->json('preguntas'); // Array de {pregunta, opciones[], respuesta_correcta}
            $table->decimal('nota_minima_aprobacion', 5, 2)->default(14.00);
            $table->boolean('activa')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('capacitacion_evaluaciones');
        Schema::dropIfExists('capacitacion_asistentes');
        Schema::dropIfExists('capacitaciones');
    }
};
