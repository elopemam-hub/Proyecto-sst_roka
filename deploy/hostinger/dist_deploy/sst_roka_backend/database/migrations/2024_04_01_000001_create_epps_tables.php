<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * EPPs — Equipos de Protección Personal
 * Ley 29783 Art. 61, DS-005-2012-TR Art. 97-100
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('epps_categorias', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->onDelete('cascade');

            $table->string('nombre', 100);
            $table->text('descripcion')->nullable();
            $table->boolean('requiere_talla')->default(false);
            $table->integer('vida_util_meses')->nullable()->comment('Vida útil estimada en meses');
            $table->boolean('activa')->default(true);

            $table->timestamps();

            $table->index(['empresa_id', 'activa']);
        });

        Schema::create('epps_inventario', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->onDelete('cascade');
            $table->foreignId('categoria_id')->constrained('epps_categorias')->onDelete('restrict');

            $table->string('nombre', 150);
            $table->string('marca', 100)->nullable();
            $table->string('modelo', 100)->nullable();
            $table->string('codigo_interno', 50)->nullable();
            $table->string('talla', 20)->nullable();

            $table->integer('stock_total')->default(0);
            $table->integer('stock_disponible')->default(0);
            $table->integer('stock_minimo')->default(5)->comment('Nivel mínimo para alerta');
            $table->string('unidad', 20)->default('unidad');
            $table->decimal('costo_unitario', 10, 2)->nullable();
            $table->string('proveedor', 150)->nullable();
            $table->string('ficha_tecnica_path')->nullable();
            $table->boolean('activo')->default(true);

            $table->timestamps();
            $table->softDeletes();

            $table->index(['empresa_id', 'categoria_id', 'activo']);
            $table->index(['empresa_id', 'stock_disponible', 'stock_minimo']);
        });

        Schema::create('epps_entregas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->onDelete('cascade');
            $table->foreignId('personal_id')->constrained('personal')->onDelete('restrict');
            $table->foreignId('inventario_id')->constrained('epps_inventario')->onDelete('restrict');

            $table->integer('cantidad')->default(1);
            $table->date('fecha_entrega');
            $table->date('fecha_devolucion')->nullable();
            $table->date('fecha_vencimiento')->nullable();

            $table->enum('motivo_entrega', [
                'ingreso',
                'reposicion',
                'deterioro',
                'talla',
                'perdida',
            ])->default('ingreso');

            $table->enum('estado', [
                'entregado',
                'devuelto',
                'perdido',
            ])->default('entregado');

            $table->timestamp('firmado_en')->nullable();
            $table->string('firma_path')->nullable();
            $table->text('observaciones')->nullable();
            $table->foreignId('entregado_por')->nullable()->constrained('usuarios')->onDelete('set null');

            $table->timestamps();

            $table->index(['empresa_id', 'personal_id', 'estado']);
            $table->index(['empresa_id', 'inventario_id']);
            $table->index(['fecha_vencimiento', 'estado']);
        });

        // EPPs requeridos por peligro (pivote IPERC ↔ EPPs)
        // Se define aquí porque depende de epps_categorias, creada arriba,
        // y de iperc_peligros, creada en 2024_02_01_000001_create_iperc_tables.
        Schema::create('iperc_epps_requeridos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('iperc_peligro_id')->constrained('iperc_peligros')->onDelete('cascade');
            $table->foreignId('categoria_id')->constrained('epps_categorias')->onDelete('cascade');
            $table->boolean('es_obligatorio')->default(true);
            $table->text('observacion')->nullable();
            $table->timestamps();

            $table->unique(['iperc_peligro_id', 'categoria_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('iperc_epps_requeridos');
        Schema::dropIfExists('epps_entregas');
        Schema::dropIfExists('epps_inventario');
        Schema::dropIfExists('epps_categorias');
    }
};
