<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Rediseño del Programa Anual de SST para que responda al formato PASST
 * (RM 050-2013-TR): elementos numerados del SGSST, actividades con
 * programación por meses, meta cuantificada, evidencia y responsables.
 *
 * El esquema anterior había derivado: el modelo usaba columnas (nombre,
 * objetivo_general, monto_total, fecha_inicio, fecha_fin, avance) que la
 * migración original nunca creó y que en producción se habían agregado a mano
 * por ALTER TABLE, quedando duplicadas con las originales. Aquí se recrea
 * limpio, porque ambas tablas están vacías en local y producción.
 */
return new class extends Migration
{
    public function up(): void
    {
        // Recrear pierde datos: solo es válido porque las tablas están vacías.
        // Si algún entorno tuviera filas, se aborta en vez de borrarlas.
        foreach (['programa_sst_actividades', 'programa_sst'] as $tabla) {
            if (Schema::hasTable($tabla) && DB::table($tabla)->exists()) {
                throw new RuntimeException(
                    "La tabla {$tabla} tiene registros. Migrar esos datos antes de rediseñar el Programa SST."
                );
            }
        }

        Schema::dropIfExists('programa_sst_actividades');
        Schema::dropIfExists('programa_sst_elementos');
        Schema::dropIfExists('programa_sst');

        Schema::create('programa_sst', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->onDelete('cascade');
            $table->year('anio');
            $table->string('nombre', 200);
            // Encabezado del formato impreso
            $table->string('codigo', 30)->nullable();
            $table->string('version', 20)->nullable();
            // Un programa puede arrancar a mitad de año (el formato de referencia
            // va de junio a diciembre): la matriz se dibuja desde este mes.
            $table->unsignedTinyInteger('mes_inicio')->default(1);
            $table->text('objetivo_general')->nullable();
            $table->enum('estado', ['borrador', 'aprobado', 'en_ejecucion', 'cerrado'])->default('borrador');
            $table->decimal('presupuesto', 12, 2)->nullable();
            $table->date('fecha_aprobacion')->nullable();
            $table->foreignId('aprobado_por')->nullable()->constrained('usuarios')->onDelete('set null');
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['empresa_id', 'anio']);
        });

        // Secciones numeradas del programa (1 Línea base, 2 Liderazgo, 3 Capacitación…)
        Schema::create('programa_sst_elementos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('programa_id')->constrained('programa_sst')->onDelete('cascade');
            $table->unsignedSmallInteger('numero');
            $table->string('nombre', 250);
            $table->unsignedSmallInteger('orden')->default(0);
            $table->timestamps();

            $table->index(['programa_id', 'orden']);
        });

        Schema::create('programa_sst_actividades', function (Blueprint $table) {
            $table->id();
            $table->foreignId('programa_id')->constrained('programa_sst')->onDelete('cascade');
            $table->foreignId('elemento_id')->nullable()->constrained('programa_sst_elementos')->onDelete('cascade');
            $table->string('numero', 10)->nullable()->comment('Numeración jerárquica: 1.1, 3.2…');
            $table->string('actividad', 300);

            // Programación: meses marcados con X. Un array [6,8,11] no se puede
            // representar con fecha_inicio/fecha_fin, que era el modelo anterior.
            $table->json('meses')->nullable();
            $table->boolean('segun_corresponda')->default(false)
                ->comment('Fila sin X: la actividad se ejecuta cuando se presente el caso');

            // Meta
            $table->unsignedSmallInteger('meta_cantidad')->nullable();
            $table->string('meta_texto', 300)->nullable();

            // Evidencia
            $table->string('evidencia_texto', 300)->nullable();
            $table->string('evidencia_path', 255)->nullable();

            // Responsable: en el formato es un área o el Comité, no siempre una
            // persona; el vínculo con personal queda opcional.
            $table->string('responsable_texto', 200)->nullable();
            $table->foreignId('responsable_id')->nullable()->constrained('personal')->onDelete('set null');

            // Cumplimiento tomado de los módulos que ya registran la ejecución
            $table->string('modulo_vinculado', 20)->default('manual');
            $table->json('filtro')->nullable()->comment('Acota el conteo, ej: {"tipo":"induccion"}');
            $table->unsignedSmallInteger('cantidad_ejecutada')->default(0);
            $table->timestamp('cumplimiento_actualizado_at')->nullable();

            $table->enum('estado', ['pendiente', 'en_proceso', 'completado', 'no_aplica'])->default('pendiente');
            $table->text('observaciones')->nullable();
            $table->unsignedSmallInteger('orden')->default(0);
            $table->timestamps();

            $table->index(['programa_id', 'orden']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('programa_sst_actividades');
        Schema::dropIfExists('programa_sst_elementos');
        Schema::dropIfExists('programa_sst');
    }
};
