<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ─── Documentos SST ────────────────────────────────────────────────
        Schema::create('documentos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->cascadeOnDelete();
            $table->foreignId('area_id')->nullable()->constrained('areas')->nullOnDelete();
            $table->string('codigo', 30)->unique();
            $table->string('titulo', 200);
            $table->text('descripcion')->nullable();
            $table->enum('tipo', [
                'politica', 'procedimiento', 'instructivo',
                'registro', 'plan', 'programa', 'otro',
            ])->default('procedimiento');
            $table->string('version_actual', 10)->default('1.0');
            $table->enum('estado', [
                'borrador', 'en_revision', 'aprobado', 'obsoleto',
            ])->default('borrador');
            $table->string('archivo_path')->nullable();
            $table->string('archivo_nombre', 255)->nullable();
            $table->foreignId('creado_por')->constrained('usuarios')->restrictOnDelete();
            $table->foreignId('aprobado_por')->nullable()->constrained('usuarios')->nullOnDelete();
            $table->date('fecha_aprobacion')->nullable();
            $table->date('fecha_revision')->nullable();
            $table->text('observaciones')->nullable();
            $table->timestamps();

            $table->index(['empresa_id', 'tipo']);
            $table->index(['empresa_id', 'estado']);
        });

        // ─── Versiones de documentos ──────────────────────────────────────
        Schema::create('documentos_versiones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('documento_id')->constrained('documentos')->cascadeOnDelete();
            $table->string('version', 10);
            $table->string('archivo_path')->nullable();
            $table->text('cambios')->nullable();
            $table->foreignId('creado_por')->constrained('usuarios')->restrictOnDelete();
            $table->timestamps();

            $table->index(['documento_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('documentos_versiones');
        Schema::dropIfExists('documentos');
    }
};
