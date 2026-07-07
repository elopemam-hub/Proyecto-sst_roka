<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Tabla de trazabilidad de movimientos de stock de EPPs
     * Registra todos los ingresos, egresos, ajustes y devoluciones
     */
    public function up(): void
    {
        Schema::create('epps_movimientos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->onDelete('cascade');
            $table->foreignId('inventario_id')->constrained('epps_inventario')->onDelete('restrict');

            $table->enum('tipo', [
                'ingreso',      // Compra, donación
                'egreso',       // Entrega a trabajador
                'ajuste',       // Corrección de inventario
                'devolucion',   // Devolución de trabajador
                'merma',        // Pérdida, robo, deterioro
            ]);

            $table->integer('cantidad');
            $table->integer('stock_anterior');
            $table->integer('stock_nuevo');

            $table->string('motivo', 200);
            $table->string('documento_referencia', 100)->nullable()->comment('Nº orden compra, guía, etc.');
            $table->text('observaciones')->nullable();

            $table->foreignId('entrega_id')->nullable()->constrained('epps_entregas')->onDelete('set null');
            $table->foreignId('usuario_id')->nullable()->constrained('usuarios')->onDelete('set null');

            $table->timestamps();

            $table->index(['empresa_id', 'inventario_id']);
            $table->index(['empresa_id', 'tipo', 'created_at']);
            $table->index(['usuario_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('epps_movimientos');
    }
};
