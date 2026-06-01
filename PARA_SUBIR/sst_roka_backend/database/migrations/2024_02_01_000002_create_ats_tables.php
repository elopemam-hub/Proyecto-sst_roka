<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ATS — Análisis de Trabajo Seguro
 * Permisos de trabajo (altura, espacios confinados, caliente, eléctrico)
 */
return new class extends Migration
{
    public function up(): void
    {
        // Cabecera ATS
        Schema::create('ats', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->onDelete('cascade');
            $table->foreignId('area_id')->constrained('areas')->onDelete('cascade');
            $table->foreignId('iperc_id')->nullable()->constrained('iperc')->onDelete('set null')->comment('IPERC del cual deriva');

            $table->string('codigo', 30)->unique()->comment('ATS-2024-MEC-0001');
            $table->string('titulo_trabajo');
            $table->text('descripcion');
            $table->string('ubicacion');

            $table->date('fecha_ejecucion');
            $table->time('hora_inicio');
            $table->time('hora_fin')->nullable();

            // Clasificación de riesgo
            $table->enum('nivel_riesgo', ['bajo', 'medio', 'alto', 'critico'])->default('medio');
            $table->boolean('requiere_permiso_especial')->default(false);

            // Supervisión
            $table->foreignId('supervisor_id')->constrained('personal')->onDelete('restrict');
            $table->foreignId('elaborado_por')->constrained('usuarios')->onDelete('restrict');

            // Estado del ATS
            $table->enum('estado', [
                'borrador',
                'pendiente_firma',
                'autorizado',
                'en_ejecucion',
                'cerrado',
                'cancelado'
            ])->default('borrador');

            $table->timestamp('autorizado_en')->nullable();
            $table->timestamp('cerrado_en')->nullable();
            $table->foreignId('cerrado_por')->nullable()->constrained('usuarios')->onDelete('set null');
            $table->text('observaciones_cierre')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['empresa_id', 'estado', 'fecha_ejecucion']);
            $table->index(['area_id', 'nivel_riesgo']);
        });

        // Tareas específicas del ATS
        Schema::create('ats_tareas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ats_id')->constrained('ats')->onDelete('cascade');
            $table->integer('orden')->default(0);
            $table->string('descripcion_tarea');
            $table->text('peligros_asociados')->nullable();
            $table->text('medidas_control')->nullable();
            $table->enum('estado_ejecucion', ['pendiente', 'ejecutada', 'omitida'])->default('pendiente');
            $table->text('observaciones')->nullable();
            $table->timestamps();

            $table->index('ats_id');
        });

        // Peligros identificados por tarea
        Schema::create('ats_peligros', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ats_tarea_id')->constrained('ats_tareas')->onDelete('cascade');
            $table->enum('tipo_peligro', [
                'fisico', 'quimico', 'biologico', 'ergonomico',
                'psicosocial', 'mecanico', 'electrico', 'locativo', 'otro'
            ]);
            $table->string('descripcion');
            $table->string('riesgo');
            $table->enum('severidad', ['leve', 'moderada', 'grave', 'muy_grave']);
            $table->timestamps();
        });

        // Controles aplicados por tarea
        Schema::create('ats_controles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ats_tarea_id')->constrained('ats_tareas')->onDelete('cascade');
            $table->enum('tipo_control', [
                'eliminacion', 'sustitucion', 'ingenieria', 'administrativo', 'epp'
            ]);
            $table->text('descripcion');
            $table->boolean('implementado')->default(false);
            $table->timestamps();
        });

        // Personal participante en el ATS
        Schema::create('ats_participantes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ats_id')->constrained('ats')->onDelete('cascade');
            $table->foreignId('personal_id')->constrained('personal')->onDelete('cascade');
            $table->enum('rol', ['supervisor', 'ejecutor', 'observador', 'ayudante'])->default('ejecutor');
            $table->timestamp('firmado_en')->nullable();
            $table->timestamps();

            $table->unique(['ats_id', 'personal_id']);
        });

        // Permisos de trabajo especiales
        Schema::create('permisos_trabajo', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ats_id')->constrained('ats')->onDelete('cascade');
            $table->enum('tipo_permiso', [
                'trabajo_altura',           // >1.8m
                'espacios_confinados',
                'trabajo_caliente',         // soldadura, corte
                'trabajo_electrico',
                'izaje_cargas',
                'excavacion',
                'quimicos_peligrosos',
                'radiaciones_ionizantes'
            ]);
            $table->string('codigo_permiso', 30)->unique();
            $table->date('fecha_validez');
            $table->time('hora_inicio_validez');
            $table->time('hora_fin_validez');

            // Requisitos específicos
            $table->json('requisitos_cumplidos')->nullable()->comment('Checklist de requisitos verificados');
            $table->text('equipos_requeridos')->nullable();
            $table->text('condiciones_especiales')->nullable();

            $table->enum('estado', ['solicitado', 'aprobado', 'rechazado', 'ejecutado', 'cerrado'])->default('solicitado');
            $table->foreignId('aprobado_por')->nullable()->constrained('usuarios')->onDelete('set null');
            $table->timestamp('aprobado_en')->nullable();
            $table->timestamps();

            $table->index(['tipo_permiso', 'estado']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('permisos_trabajo');
        Schema::dropIfExists('ats_participantes');
        Schema::dropIfExists('ats_controles');
        Schema::dropIfExists('ats_peligros');
        Schema::dropIfExists('ats_tareas');
        Schema::dropIfExists('ats');
    }
};
