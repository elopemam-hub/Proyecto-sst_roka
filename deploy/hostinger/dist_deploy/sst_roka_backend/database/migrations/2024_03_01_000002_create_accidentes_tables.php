<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ACCIDENTES — Ley 29783 Art. 82-88, RM-050-2013-TR Registros 01-03
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('accidentes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->onDelete('cascade');
            $table->foreignId('sede_id')->constrained('sedes')->onDelete('cascade');
            $table->foreignId('area_id')->constrained('areas')->onDelete('cascade');

            $table->string('codigo', 30)->unique()->comment('ACC-2024-ALM-001');
            $table->enum('tipo', [
                'accidente_leve',
                'accidente_incapacitante',
                'accidente_mortal',
                'incidente_peligroso',
                'incidente',
            ]);

            $table->dateTime('fecha_accidente');
            $table->string('lugar_exacto', 255);
            $table->text('descripcion_evento');

            // Accidentado
            $table->foreignId('accidentado_id')->constrained('personal')->onDelete('restrict');
            $table->json('testigos')->nullable()->comment('Array de nombres/IDs de testigos');

            // Consecuencias
            $table->integer('dias_perdidos')->default(0);
            $table->string('parte_cuerpo_afectada', 150)->nullable();
            $table->string('tipo_lesion', 150)->nullable();
            $table->string('agente_causante', 255)->nullable();
            $table->text('descripcion_lesion')->nullable();

            // Atención médica
            $table->boolean('requiere_hospitalizacion')->default(false);
            $table->string('centro_medico', 255)->nullable();
            $table->text('descripcion_atencion')->nullable();

            // Estado
            $table->enum('estado', [
                'registrado',
                'en_investigacion',
                'investigado',
                'notificado_mintra',
                'cerrado',
            ])->default('registrado');

            // Notificación MINTRA (obligatoria dentro de 24/48 horas según tipo)
            $table->boolean('notificado_mintra')->default(false);
            $table->date('fecha_notificacion_mintra')->nullable();
            $table->string('numero_notificacion_mintra', 50)->nullable();

            $table->foreignId('elaborado_por')->constrained('usuarios')->onDelete('restrict');

            // Costos
            $table->decimal('costo_atencion', 10, 2)->nullable();
            $table->decimal('costo_dias_perdidos', 10, 2)->nullable();
            $table->decimal('costo_danos_materiales', 10, 2)->nullable();
            $table->decimal('costo_total', 10, 2)->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['empresa_id', 'tipo', 'estado']);
            $table->index(['empresa_id', 'fecha_accidente']);
            $table->index('accidentado_id');
        });

        Schema::create('accidentes_investigacion', function (Blueprint $table) {
            $table->id();
            $table->foreignId('accidente_id')->constrained('accidentes')->onDelete('cascade');

            $table->enum('metodologia', [
                'arbol_causas',
                'cinco_porques',
                'ishikawa',
                'combinado',
            ])->default('cinco_porques');

            $table->json('causas_inmediatas')->nullable()->comment('Actos y condiciones inseguras');
            $table->json('causas_basicas')->nullable()->comment('Factores personales y del trabajo');
            $table->text('factores_trabajo')->nullable();
            $table->text('factores_personales')->nullable();
            $table->text('descripcion_metodologia')->nullable()->comment('Desarrollo de la metodología aplicada');
            $table->text('lecciones_aprendidas')->nullable();

            $table->foreignId('investigador_id')->constrained('usuarios')->onDelete('restrict');
            $table->date('fecha_inicio_investigacion');
            $table->date('fecha_cierre_investigacion')->nullable();

            $table->timestamps();
            $table->unique('accidente_id');
        });

        Schema::create('accidentes_acciones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('accidente_id')->constrained('accidentes')->onDelete('cascade');

            $table->enum('tipo', ['correctiva', 'preventiva', 'mejora'])->default('correctiva');
            $table->text('descripcion');

            $table->foreignId('responsable_id')->constrained('personal')->onDelete('restrict');
            $table->date('fecha_limite');

            $table->enum('estado', [
                'pendiente',
                'en_proceso',
                'completada',
                'vencida',
            ])->default('pendiente');

            $table->text('evidencia_path')->nullable();
            $table->text('observaciones')->nullable();
            $table->dateTime('completada_en')->nullable();
            $table->foreignId('verificado_por')->nullable()->constrained('usuarios')->onDelete('set null');

            $table->timestamps();
            $table->index(['accidente_id', 'estado']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('accidentes_acciones');
        Schema::dropIfExists('accidentes_investigacion');
        Schema::dropIfExists('accidentes');
    }
};
