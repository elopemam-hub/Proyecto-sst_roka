<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tablas del subsistema Checklist Dinámico — Módulo Inspecciones
 * Ley 29783 / RM-050-2013-TR
 */
return new class extends Migration
{
    public function up(): void
    {
        // ── 1. Sub-módulos (A, B, C, …) ─────────────────────────
        Schema::create('inspeccion_submodulos', function (Blueprint $table) {
            $table->id();
            $table->string('codigo', 10)->unique()->comment('A, B, C …');
            $table->string('nombre', 100);
            $table->text('descripcion')->nullable();
            $table->string('color', 20)->default('#6366f1')->comment('Color hex para UI');
            $table->boolean('activo')->default(true);
            $table->unsignedTinyInteger('orden')->default(0);
            $table->timestamps();
        });

        // ── 2. Catálogo de equipos / máquinas ────────────────────
        Schema::create('equipos_catalogo', function (Blueprint $table) {
            $table->id();
            $table->foreignId('submodulo_id')->constrained('inspeccion_submodulos')->onDelete('cascade');
            $table->string('nombre', 100);
            $table->text('descripcion')->nullable();
            $table->string('codigo', 30)->nullable()->unique();
            $table->boolean('requiere_operador')->default(false);
            $table->boolean('activo')->default(true);
            $table->unsignedSmallInteger('orden')->default(0);
            $table->timestamps();

            $table->index(['submodulo_id', 'activo', 'orden']);
        });

        // ── 3. Banco de preguntas por equipo ─────────────────────
        Schema::create('checklist_preguntas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('equipo_id')->constrained('equipos_catalogo')->onDelete('cascade');
            $table->text('texto');
            $table->enum('tipo_respuesta', [
                'conf_nc_obs',  // Conforme / No conforme / Observación
                'si_no_na',     // Sí / No / No aplica
                'texto',
                'numero',
                'fecha',
            ])->default('conf_nc_obs');
            $table->boolean('es_obligatoria')->default(true);
            $table->boolean('permite_foto')->default(true);
            $table->boolean('permite_nota')->default(true);
            $table->string('ayuda', 500)->nullable()->comment('Texto de ayuda / criterio de aceptación');
            $table->string('valor_limite', 80)->nullable()->comment('Límite aceptable (ej: ≥ 80%)');
            $table->boolean('activo')->default(true);
            $table->unsignedSmallInteger('orden')->default(0);
            $table->timestamps();

            $table->index(['equipo_id', 'activo', 'orden']);
        });

        // ── 4. Respuestas registradas por inspección ──────────────
        Schema::create('inspeccion_respuestas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inspeccion_id')->constrained('inspecciones')->onDelete('cascade');
            $table->foreignId('pregunta_id')->constrained('checklist_preguntas')->onDelete('cascade');
            $table->string('resultado', 20)->nullable()
                ->comment('C=Conforme, N=NC, O=Obs, S=Sí, A=NA');
            $table->text('nota')->nullable();
            $table->string('foto_path', 500)->nullable();
            $table->timestamps();

            $table->unique(['inspeccion_id', 'pregunta_id']);
            $table->index(['inspeccion_id', 'resultado']);
        });

        // ── 5. Acciones correctivas del checklist ────────────────
        Schema::create('inspeccion_acciones_checklist', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inspeccion_id')->constrained('inspecciones')->onDelete('cascade');
            $table->foreignId('pregunta_id')->nullable()->constrained('checklist_preguntas')->onDelete('set null');
            $table->foreignId('responsable_id')->nullable()->constrained('personal')->onDelete('set null');
            $table->text('descripcion');
            $table->enum('prioridad', ['alta', 'media', 'baja'])->default('media');
            $table->enum('estado', ['pendiente', 'en_proceso', 'cerrado'])->default('pendiente');
            $table->tinyInteger('porcentaje')->default(0)->comment('0-100 avance');
            $table->date('fecha_compromiso')->nullable();
            $table->text('evidencia')->nullable();
            $table->timestamps();

            $table->index(['inspeccion_id', 'estado', 'prioridad']);
        });

        // ── 6. Firmas canvas del wizard ───────────────────────────
        Schema::create('inspeccion_firmas_canvas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inspeccion_id')->constrained('inspecciones')->onDelete('cascade');
            $table->foreignId('usuario_id')->nullable()->constrained('usuarios')->onDelete('set null');
            $table->enum('rol_firma', [
                'inspector',
                'responsable_area',
                'supervisor',
                'trabajador',
            ]);
            $table->string('nombre_firmante', 120)->nullable();
            $table->text('firma_base64');
            $table->string('ip_firma', 45)->nullable();
            $table->timestamp('firmado_at')->useCurrent();
            $table->timestamps();

            $table->index(['inspeccion_id', 'rol_firma']);
        });

        // ── Columnas extra en inspecciones (para checklist) ───────
        Schema::table('inspecciones', function (Blueprint $table) {
            $table->foreignId('submodulo_id')->nullable()->after('area_id')
                ->constrained('inspeccion_submodulos')->onDelete('set null');
            $table->foreignId('equipo_catalogo_id')->nullable()->after('submodulo_id')
                ->constrained('equipos_catalogo')->onDelete('set null');
            $table->unsignedSmallInteger('items_conformes')->default(0)->after('porcentaje_cumplimiento');
            $table->unsignedSmallInteger('items_nc')->default(0)->after('items_conformes');
            $table->unsignedSmallInteger('items_obs')->default(0)->after('items_nc');
        });
    }

    public function down(): void
    {
        Schema::table('inspecciones', function (Blueprint $table) {
            $table->dropForeignIdFor(\App\Models\InspeccionSubmodulo::class, 'submodulo_id');
            $table->dropForeignIdFor(\App\Models\EquipoCatalogo::class, 'equipo_catalogo_id');
            $table->dropColumn(['submodulo_id', 'equipo_catalogo_id', 'items_conformes', 'items_nc', 'items_obs']);
        });

        Schema::dropIfExists('inspeccion_firmas_canvas');
        Schema::dropIfExists('inspeccion_acciones_checklist');
        Schema::dropIfExists('inspeccion_respuestas');
        Schema::dropIfExists('checklist_preguntas');
        Schema::dropIfExists('equipos_catalogo');
        Schema::dropIfExists('inspeccion_submodulos');
    }
};
