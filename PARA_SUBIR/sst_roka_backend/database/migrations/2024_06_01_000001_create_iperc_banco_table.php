<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Banco de datos IPERC — Catálogo de referencia reutilizable
 * Permite preconfiguar actividades, tareas, puestos, peligros, riesgos,
 * consecuencias, capacitaciones y controles para agilizar la elaboración del IPERC.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('iperc_banco', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->onDelete('cascade');

            $table->enum('tipo', [
                'actividad',
                'tarea',
                'puesto',
                'situacion',
                'peligro',
                'riesgo',
                'consecuencia',
                'capacitacion',
                'control',
            ]);

            $table->string('codigo', 50)->nullable()->comment('Código interno de referencia');
            $table->string('nombre')->comment('Texto del ítem');
            $table->text('descripcion')->nullable()->comment('Detalle ampliado');

            // Campos específicos según tipo
            $table->string('categoria', 100)->nullable()->comment('Ej: para peligro → fisico, quimico; para control → eliminacion');
            $table->string('subcategoria', 100)->nullable()->comment('Clasificación secundaria');
            $table->string('area_aplicacion', 255)->nullable()->comment('Áreas donde aplica');
            $table->string('norma_referencia', 255)->nullable()->comment('Ej: DS 005-2012-TR Art. 56');

            // Para tipo=control
            $table->enum('tipo_control', ['eliminacion','sustitucion','ingenieria','administrativo','epp'])->nullable();
            $table->decimal('costo_referencial', 10, 2)->nullable();

            // Para tipo=capacitacion
            $table->integer('duracion_horas')->nullable();
            $table->string('modalidad', 50)->nullable()->comment('presencial, virtual, mixta');

            // Para tipo=puesto
            $table->string('nivel_cargo', 50)->nullable()->comment('operativo, tecnico, supervisor');

            $table->boolean('activo')->default(true);
            $table->timestamps();

            $table->index(['empresa_id', 'tipo']);
            $table->index(['empresa_id', 'tipo', 'activo']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('iperc_banco');
    }
};
