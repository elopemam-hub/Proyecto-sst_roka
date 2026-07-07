<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // ─── OPLs (One Point Lessons) ──────────────────────────────────────
        Schema::create('opls', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->cascadeOnDelete();
            $table->foreignId('area_id')->nullable()->constrained('areas')->nullOnDelete();
            $table->foreignId('creado_por')->constrained('usuarios')->cascadeOnDelete();
            $table->foreignId('aprobado_por')->nullable()->constrained('usuarios')->nullOnDelete();

            // Identificación
            $table->string('codigo', 50)->unique();
            $table->string('titulo', 250);
            $table->enum('categoria', [
                'seguridad',           // Procedimientos y normas de seguridad
                'calidad',             // Estándares de calidad
                'mejora',              // Kaizen, mejora continua
                'conocimiento_basico', // Know-how básico
                'caso_estudio',        // Lecciones de incidentes/errores
            ]);
            $table->enum('prioridad', ['baja', 'media', 'alta', 'critica'])->default('media');

            // Contenido
            $table->text('problema')->nullable()->comment('¿Qué problema resuelve?');
            $table->text('solucion')->comment('¿Cómo se resuelve? (Paso a paso)');
            $table->text('punto_clave')->nullable()->comment('Punto clave a recordar');
            $table->string('imagen_principal')->nullable()->comment('Imagen ilustrativa principal');
            $table->json('imagenes_adicionales')->nullable()->comment('Array de rutas de imágenes');

            // Aplicabilidad
            $table->json('areas_aplicables')->nullable()->comment('IDs de áreas donde aplica');
            $table->json('tags')->nullable()->comment('Etiquetas para búsqueda');

            // Workflow
            $table->enum('estado', [
                'borrador',
                'revision',
                'aprobado',
                'publicado',
                'archivado',
            ])->default('borrador');
            $table->date('fecha_aprobacion')->nullable();
            $table->date('fecha_publicacion')->nullable();
            $table->date('fecha_revision')->nullable()->comment('Próxima fecha de revisión');

            // Métricas
            $table->unsignedInteger('visualizaciones')->default(0);
            $table->decimal('calificacion_promedio', 3, 2)->nullable();

            // Versión
            $table->unsignedSmallInteger('version')->default(1);
            $table->boolean('es_version_actual')->default(true);
            $table->foreignId('opl_original_id')->nullable()->constrained('opls')->nullOnDelete()
                ->comment('Referencia a la OPL original si es una versión');

            $table->timestamps();
            $table->softDeletes();

            $table->index(['empresa_id', 'estado', 'categoria']);
            $table->index(['empresa_id', 'es_version_actual']);
            $table->fullText(['titulo', 'problema', 'solucion']);
        });

        // ─── Visualizaciones de OPL ─────────────────────────────────────────
        Schema::create('opl_visualizaciones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('opl_id')->constrained('opls')->cascadeOnDelete();
            $table->foreignId('personal_id')->constrained('personal')->cascadeOnDelete();
            $table->dateTime('fecha_visualizacion');
            $table->unsignedSmallInteger('tiempo_lectura_segundos')->nullable();
            $table->boolean('completado')->default(false);
            $table->unsignedTinyInteger('calificacion')->nullable()->comment('1-5 estrellas');
            $table->string('comentario', 500)->nullable();
            $table->timestamps();

            $table->index(['opl_id', 'personal_id']);
            $table->index(['personal_id', 'fecha_visualizacion']);
        });

        // ─── Evidencias de aplicación ───────────────────────────────────────
        Schema::create('opl_evidencias', function (Blueprint $table) {
            $table->id();
            $table->foreignId('opl_id')->constrained('opls')->cascadeOnDelete();
            $table->foreignId('personal_id')->constrained('personal')->cascadeOnDelete();
            $table->foreignId('area_id')->nullable()->constrained('areas')->nullOnDelete();

            $table->date('fecha_aplicacion');
            $table->text('descripcion')->comment('Cómo se aplicó la OPL');
            $table->json('fotos_antes')->nullable();
            $table->json('fotos_despues')->nullable();
            $table->enum('resultado', ['exitoso', 'parcial', 'no_efectivo'])->default('exitoso');
            $table->text('observaciones')->nullable();

            $table->timestamps();
        });

        // ─── Historial de cambios (versiones) ───────────────────────────────
        Schema::create('opl_historial', function (Blueprint $table) {
            $table->id();
            $table->foreignId('opl_id')->constrained('opls')->cascadeOnDelete();
            $table->foreignId('modificado_por')->constrained('usuarios')->cascadeOnDelete();

            $table->unsignedSmallInteger('version');
            $table->enum('accion', ['creacion', 'edicion', 'aprobacion', 'publicacion', 'archivado']);
            $table->text('cambios_realizados')->nullable();
            $table->json('datos_anteriores')->nullable();

            $table->timestamp('fecha_cambio');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('opl_historial');
        Schema::dropIfExists('opl_evidencias');
        Schema::dropIfExists('opl_visualizaciones');
        Schema::dropIfExists('opls');
    }
};
