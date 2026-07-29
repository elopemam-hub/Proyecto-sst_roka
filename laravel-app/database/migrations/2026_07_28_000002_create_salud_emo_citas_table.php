<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Agenda de citas de EMO: exámenes programados que todavía no se han realizado
 * y por tanto no tienen resultado. Se mantiene aparte de salud_emo, que
 * representa exámenes ya practicados y alimenta el cronograma, las alertas de
 * vencimiento y los certificados de aptitud. Cuando una cita se realiza se crea
 * el EMO y se guarda aquí su id.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('salud_emo_citas')) {
            return;
        }

        Schema::create('salud_emo_citas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->onDelete('cascade');
            $table->foreignId('personal_id')->constrained('personal')->onDelete('cascade');

            $table->enum('tipo', [
                'pre_ocupacional',
                'periodico',
                'retiro',
                'por_cambio_ocupacional',
            ])->default('periodico');

            $table->date('fecha_cita');
            $table->time('hora')->nullable();
            $table->string('clinica', 150)->nullable();
            $table->string('medico', 150)->nullable();

            $table->enum('estado', [
                'programada',
                'confirmada',
                'realizada',
                'cancelada',
                'no_asistio',
            ])->default('programada');

            // EMO generado cuando la cita se marca como realizada
            $table->foreignId('emo_id')->nullable()->constrained('salud_emo')->nullOnDelete();

            $table->text('observaciones')->nullable();
            $table->timestamps();

            $table->index(['empresa_id', 'fecha_cita']);
            $table->index(['empresa_id', 'estado']);
            $table->index(['empresa_id', 'personal_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('salud_emo_citas');
    }
};
