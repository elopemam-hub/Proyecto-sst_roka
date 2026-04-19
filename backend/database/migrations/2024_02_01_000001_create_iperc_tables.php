<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * IPERC — Identificación de Peligros, Evaluación y Control de Riesgos
 * Alineado a Ley 29783, RM 050-2013-TR (Registro 05) e ISO 45001:2018
 */
return new class extends Migration
{
    public function up(): void
    {
        // Matriz IPERC principal — cabecera
        Schema::create('iperc', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->onDelete('cascade');
            $table->foreignId('sede_id')->constrained('sedes')->onDelete('cascade');
            $table->foreignId('area_id')->constrained('areas')->onDelete('cascade');

            $table->string('codigo', 30)->unique()->comment('IPERC-2024-ALM-001');
            $table->string('titulo');
            $table->text('alcance')->nullable()->comment('Alcance de la evaluación');
            $table->enum('metodologia', ['IPERC_CONTINUO', 'IPERC_LINEA_BASE', 'IPERC_ESPECIFICO'])->default('IPERC_LINEA_BASE');
            $table->date('fecha_elaboracion');
            $table->date('fecha_vigencia')->nullable()->comment('Fecha de próxima revisión');
            $table->integer('version')->default(1);

            // Equipo evaluador
            $table->foreignId('elaborado_por')->constrained('usuarios')->onDelete('restrict');
            $table->foreignId('revisado_por')->nullable()->constrained('usuarios')->onDelete('set null');
            $table->foreignId('aprobado_por')->nullable()->constrained('usuarios')->onDelete('set null');
            $table->date('fecha_revision')->nullable();
            $table->date('fecha_aprobacion')->nullable();

            $table->enum('estado', ['borrador', 'en_revision', 'aprobado', 'vencido', 'archivado'])->default('borrador');
            $table->text('observaciones')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['empresa_id', 'estado']);
            $table->index(['area_id', 'fecha_vigencia']);
        });

        // Procesos/actividades dentro del IPERC
        Schema::create('iperc_procesos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('iperc_id')->constrained('iperc')->onDelete('cascade');
            $table->string('proceso')->comment('Ej: Carga y descarga manual de productos');
            $table->string('actividad');
            $table->string('tarea')->nullable();
            $table->enum('tipo_actividad', ['rutinaria', 'no_rutinaria', 'emergencia'])->default('rutinaria');
            $table->integer('orden')->default(0);
            $table->timestamps();

            $table->index('iperc_id');
        });

        // Peligros identificados por proceso
        Schema::create('iperc_peligros', function (Blueprint $table) {
            $table->id();
            $table->foreignId('iperc_proceso_id')->constrained('iperc_procesos')->onDelete('cascade');

            // Clasificación del peligro
            $table->enum('tipo_peligro', [
                'fisico',       // ruido, vibración, temperatura
                'quimico',      // gases, vapores, polvos
                'biologico',    // virus, bacterias, hongos
                'ergonomico',   // posturas, cargas, movimientos
                'psicosocial',  // estrés, fatiga, acoso
                'mecanico',     // atrapamiento, corte, golpe
                'electrico',    // contacto directo/indirecto
                'locativo',     // caída, tropiezo, desorden
                'fenomeno_natural', // sismo, inundación
                'otro'
            ]);
            $table->string('descripcion_peligro')->comment('Ej: Ruido por operación de montacarga');
            $table->string('riesgo')->comment('Ej: Pérdida auditiva progresiva');
            $table->text('consecuencia')->nullable()->comment('Posible daño');

            // Evaluación inicial del riesgo (antes de controles)
            // Metodología IPERC peruana: P × S = IP (Índice de Probabilidad por Severidad)
            $table->tinyInteger('prob_personas_expuestas')->default(1)->comment('1-4: cantidad de personas expuestas');
            $table->tinyInteger('prob_procedimientos')->default(1)->comment('1-4: existencia de procedimientos');
            $table->tinyInteger('prob_capacitacion')->default(1)->comment('1-4: capacitación del personal');
            $table->tinyInteger('prob_exposicion')->default(1)->comment('1-4: frecuencia de exposición');
            $table->tinyInteger('indice_probabilidad')->comment('Suma de los 4 anteriores (4-16)');

            $table->tinyInteger('indice_severidad')->comment('1=Lesión sin incapacidad, 2=Incapacidad temporal, 3=Incapacidad permanente, 4=Fatalidad');
            $table->integer('nivel_riesgo_inicial')->comment('IP × IS');
            $table->enum('clasificacion_inicial', ['trivial', 'tolerable', 'moderado', 'importante', 'intolerable']);

            // Evaluación residual (después de controles)
            $table->tinyInteger('ip_residual')->nullable();
            $table->tinyInteger('is_residual')->nullable();
            $table->integer('nivel_riesgo_residual')->nullable();
            $table->enum('clasificacion_residual', ['trivial', 'tolerable', 'moderado', 'importante', 'intolerable'])->nullable();

            $table->boolean('es_riesgo_significativo')->default(false)->comment('Requiere tratamiento prioritario');
            $table->timestamps();

            $table->index('iperc_proceso_id');
            $table->index(['tipo_peligro', 'clasificacion_inicial']);
        });

        // Controles aplicados — jerarquía de controles
        Schema::create('iperc_controles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('iperc_peligro_id')->constrained('iperc_peligros')->onDelete('cascade');

            // Jerarquía de controles (ISO 45001 - orden de prioridad)
            $table->enum('tipo_control', [
                'eliminacion',       // Eliminar el peligro
                'sustitucion',        // Sustituir por algo menos peligroso
                'ingenieria',         // Control de ingeniería (barreras, ventilación)
                'administrativo',     // Procedimientos, señalización, capacitación
                'epp'                 // Equipo de protección personal (último recurso)
            ]);
            $table->text('descripcion')->comment('Ej: Instalación de barandas en plataforma');
            $table->foreignId('responsable_id')->nullable()->constrained('personal')->onDelete('set null');
            $table->date('fecha_implementacion')->nullable();
            $table->enum('estado_implementacion', ['pendiente', 'en_proceso', 'implementado', 'verificado'])->default('pendiente');
            $table->decimal('costo_estimado', 10, 2)->nullable();
            $table->text('evidencia_path')->nullable()->comment('Ruta a fotos/documentos de evidencia');
            $table->timestamps();

            $table->index('iperc_peligro_id');
        });

        // EPPs requeridos por peligro
        Schema::create('iperc_epps_requeridos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('iperc_peligro_id')->constrained('iperc_peligros')->onDelete('cascade');
            $table->foreignId('epp_tipo_id')->constrained('epps_tipos')->onDelete('cascade');
            $table->boolean('es_obligatorio')->default(true);
            $table->text('observacion')->nullable();
            $table->timestamps();

            $table->unique(['iperc_peligro_id', 'epp_tipo_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('iperc_epps_requeridos');
        Schema::dropIfExists('iperc_controles');
        Schema::dropIfExists('iperc_peligros');
        Schema::dropIfExists('iperc_procesos');
        Schema::dropIfExists('iperc');
    }
};
