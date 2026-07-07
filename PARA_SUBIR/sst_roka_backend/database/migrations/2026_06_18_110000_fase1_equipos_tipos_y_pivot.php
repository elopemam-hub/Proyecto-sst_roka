<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

/**
 * Fase 1 — Refactor módulo Equipos
 *
 * Separa "tipo de equipo físico" de "plantilla de inspección".
 * Un equipo físico puede tener múltiples plantillas de inspección
 * (p.ej. checklist diario + revisión mensual).
 *
 * Cambios:
 *  1. equipos_tipos  — catálogo de tipos de activo por empresa
 *  2. equipos.tipo_id — FK al tipo
 *  3. equipos_plantillas — pivot equipo ↔ checklist_plantilla (muchos a muchos)
 *  4. Migrar equipo_catalogo_id existente al pivot
 */
return new class extends Migration
{
    public function up(): void
    {
        // ── 1. Catálogo de tipos de equipo físico (por empresa) ───────────────
        Schema::create('equipos_tipos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->onDelete('cascade');
            $table->string('nombre', 100);
            $table->string('descripcion', 255)->nullable();
            $table->string('icono', 50)->nullable()->comment('Nombre de icono Lucide');
            $table->boolean('activo')->default(true);
            $table->unsignedSmallInteger('orden')->default(0);
            $table->timestamps();

            $table->index(['empresa_id', 'activo', 'orden']);
        });

        // ── 2. FK tipo_id en equipos ──────────────────────────────────────────
        Schema::table('equipos', function (Blueprint $table) {
            $table->unsignedBigInteger('tipo_id')->nullable()->after('empresa_id');
            $table->foreign('tipo_id')->references('id')->on('equipos_tipos')->onDelete('set null');
        });

        // ── 3. Pivot equipos ↔ plantillas de inspección ───────────────────────
        // Nota: equipos_catalogo.id es int(10) unsigned, no bigint — se usa unsignedInteger
        Schema::create('equipos_plantillas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('equipo_id')->constrained('equipos')->onDelete('cascade');
            $table->unsignedInteger('plantilla_id');
            $table->foreign('plantilla_id')->references('id')->on('equipos_catalogo')->onDelete('cascade');
            $table->boolean('activo')->default(true);
            $table->timestamps();

            $table->unique(['equipo_id', 'plantilla_id']);
            $table->index(['equipo_id', 'activo']);
        });

        // ── 4. Migrar equipo_catalogo_id existente al pivot ───────────────────
        $equiposConCatalogo = DB::table('equipos')
            ->whereNotNull('equipo_catalogo_id')
            ->select('id', 'equipo_catalogo_id')
            ->get();

        $ahora = now();
        foreach ($equiposConCatalogo as $eq) {
            DB::table('equipos_plantillas')->insertOrIgnore([
                'equipo_id'   => $eq->id,
                'plantilla_id'=> $eq->equipo_catalogo_id,
                'activo'      => true,
                'created_at'  => $ahora,
                'updated_at'  => $ahora,
            ]);
        }
    }

    public function down(): void
    {
        Schema::table('equipos', function (Blueprint $table) {
            $table->dropForeign(['tipo_id']);
            $table->dropColumn('tipo_id');
        });
        Schema::dropIfExists('equipos_plantillas');
        Schema::dropIfExists('equipos_tipos');
    }
};
