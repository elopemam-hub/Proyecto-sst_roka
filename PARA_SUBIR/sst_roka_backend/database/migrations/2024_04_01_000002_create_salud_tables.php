<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Salud Ocupacional — EMO, Restricciones y Atenciones
 * Ley 29783 Arts. 49, 71-72, DS-005-2012-TR Arts. 101-102
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('salud_emo', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->onDelete('cascade');
            $table->foreignId('personal_id')->constrained('personal')->onDelete('restrict');

            $table->enum('tipo', [
                'pre_ocupacional',
                'periodico',
                'retiro',
                'por_cambio_ocupacional',
            ]);
            $table->date('fecha_examen');
            $table->date('fecha_vencimiento')->nullable();
            $table->string('clinica', 150)->nullable();
            $table->string('medico', 150)->nullable();

            $table->enum('resultado', [
                'apto',
                'apto_con_restricciones',
                'no_apto',
            ])->default('apto');

            $table->text('restricciones')->nullable();
            $table->text('observaciones')->nullable();
            $table->string('archivo_path')->nullable();
            $table->boolean('notificado')->default(false);

            $table->timestamps();

            $table->index(['empresa_id', 'personal_id']);
            $table->index(['empresa_id', 'resultado']);
            $table->index(['empresa_id', 'fecha_vencimiento']);
        });

        Schema::create('salud_restricciones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->onDelete('cascade');
            $table->foreignId('personal_id')->constrained('personal')->onDelete('restrict');
            $table->foreignId('emo_id')->nullable()->constrained('salud_emo')->onDelete('set null');
            $table->foreignId('area_id')->nullable()->constrained('areas')->onDelete('set null');

            $table->text('descripcion');
            $table->string('tipo_restriccion', 100);
            $table->date('fecha_inicio');
            $table->date('fecha_fin')->nullable();
            $table->boolean('activa')->default(true);
            $table->text('observaciones')->nullable();

            $table->timestamps();

            $table->index(['empresa_id', 'personal_id', 'activa']);
        });

        Schema::create('salud_atenciones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->onDelete('cascade');
            $table->foreignId('personal_id')->constrained('personal')->onDelete('restrict');

            $table->dateTime('fecha');
            $table->enum('tipo', [
                'primeros_auxilios',
                'consulta',
                'emergencia',
                'seguimiento',
            ]);
            $table->text('descripcion');
            $table->text('tratamiento')->nullable();
            $table->string('derivado_a', 150)->nullable();
            $table->boolean('baja_laboral')->default(false);
            $table->integer('dias_descanso')->default(0);
            $table->text('observaciones')->nullable();
            $table->string('atendido_por', 100)->nullable();

            $table->timestamps();

            $table->index(['empresa_id', 'personal_id']);
            $table->index(['empresa_id', 'fecha']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('salud_atenciones');
        Schema::dropIfExists('salud_restricciones');
        Schema::dropIfExists('salud_emo');
    }
};
