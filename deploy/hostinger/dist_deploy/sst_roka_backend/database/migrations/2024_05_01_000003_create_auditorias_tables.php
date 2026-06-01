<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ─── Auditorías ────────────────────────────────────────────────────
        Schema::create('auditorias', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->cascadeOnDelete();
            $table->foreignId('area_id')->nullable()->constrained('areas')->nullOnDelete();
            $table->enum('tipo', ['interna', 'externa'])->default('interna');
            $table->string('norma_referencia', 150)->nullable();     // Ley 29783, ISO 45001, etc.
            $table->string('auditor_lider', 150);
            $table->json('equipo_auditor')->nullable();               // Array de nombres/cargos
            $table->date('fecha_programada');
            $table->date('fecha_ejecutada')->nullable();
            $table->text('alcance')->nullable();
            $table->text('objetivo')->nullable();
            $table->enum('estado', [
                'programada', 'en_proceso', 'completada', 'cancelada',
            ])->default('programada');
            $table->text('conclusion')->nullable();
            $table->string('archivo_informe')->nullable();
            $table->timestamps();

            $table->index(['empresa_id', 'estado']);
            $table->index(['empresa_id', 'fecha_programada']);
        });

        // ─── Hallazgos de auditoría ────────────────────────────────────────
        Schema::create('auditoria_hallazgos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->cascadeOnDelete();
            $table->foreignId('auditoria_id')->constrained('auditorias')->cascadeOnDelete();
            $table->foreignId('responsable_id')->nullable()->constrained('personal')->nullOnDelete();
            $table->enum('tipo_hallazgo', [
                'no_conformidad_mayor', 'no_conformidad_menor',
                'observacion', 'oportunidad_mejora',
            ]);
            $table->string('clausula_norma', 100)->nullable();
            $table->text('descripcion');
            $table->text('evidencia')->nullable();
            $table->text('accion_correctiva')->nullable();
            $table->date('fecha_limite')->nullable();
            $table->date('fecha_cierre')->nullable();
            $table->enum('estado', [
                'abierto', 'en_proceso', 'cerrado', 'vencido',
            ])->default('abierto');
            $table->timestamps();

            $table->index(['empresa_id', 'estado']);
            $table->index(['auditoria_id', 'tipo_hallazgo']);
        });

        // ─── Seguimiento de hallazgos ──────────────────────────────────────
        Schema::create('auditoria_seguimiento', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hallazgo_id')->constrained('auditoria_hallazgos')->cascadeOnDelete();
            $table->date('fecha');
            $table->text('descripcion');
            $table->text('evidencia_cierre')->nullable();
            $table->string('verificado_por', 150)->nullable();
            $table->enum('resultado', [
                'conforme', 'no_conforme', 'parcial',
            ])->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('auditoria_seguimiento');
        Schema::dropIfExists('auditoria_hallazgos');
        Schema::dropIfExists('auditorias');
    }
};
