<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ─── Simulacros ────────────────────────────────────────────────────
        Schema::create('simulacros', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->cascadeOnDelete();
            $table->foreignId('area_id')->nullable()->constrained('areas')->nullOnDelete();
            $table->foreignId('coordinador_id')->nullable()->constrained('personal')->nullOnDelete();
            $table->enum('tipo', [
                'sismo', 'incendio', 'derrame', 'evacuacion',
                'primeros_auxilios', 'otro',
            ]);
            $table->string('nombre', 200);
            $table->text('descripcion')->nullable();
            $table->date('fecha_programada');
            $table->date('fecha_ejecutada')->nullable();
            $table->time('hora_inicio')->nullable();
            $table->time('hora_fin')->nullable();
            $table->string('lugar', 200)->nullable();
            $table->enum('estado', [
                'programado', 'ejecutado', 'cancelado',
            ])->default('programado');
            $table->unsignedInteger('tiempo_respuesta_min')->nullable();
            $table->unsignedInteger('personas_evacuadas')->nullable();
            $table->text('observaciones')->nullable();
            $table->text('lecciones_aprendidas')->nullable();
            $table->string('archivo_informe')->nullable();
            $table->timestamps();

            $table->index(['empresa_id', 'estado']);
            $table->index(['empresa_id', 'fecha_programada']);
        });

        // ─── Participantes de simulacro ────────────────────────────────────
        Schema::create('simulacro_participantes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('simulacro_id')->constrained('simulacros')->cascadeOnDelete();
            $table->foreignId('personal_id')->constrained('personal')->cascadeOnDelete();
            $table->enum('rol', [
                'participante', 'observador', 'brigadista', 'coordinador',
            ])->default('participante');
            $table->boolean('asistio')->default(false);
            $table->text('observaciones')->nullable();
            $table->timestamps();

            $table->unique(['simulacro_id', 'personal_id']);
        });

        // ─── Evaluación de simulacro ───────────────────────────────────────
        Schema::create('simulacro_evaluacion', function (Blueprint $table) {
            $table->id();
            $table->foreignId('simulacro_id')->constrained('simulacros')->cascadeOnDelete();
            $table->string('criterio', 200);
            $table->unsignedTinyInteger('calificacion')->default(3); // 1-5
            $table->text('observacion')->nullable();
            $table->string('evaluado_por', 150)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('simulacro_evaluacion');
        Schema::dropIfExists('simulacro_participantes');
        Schema::dropIfExists('simulacros');
    }
};
