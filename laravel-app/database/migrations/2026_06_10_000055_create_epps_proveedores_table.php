<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Tabla de proveedores de EPPs
     * Permite gestión centralizada, evaluación y trazabilidad de compras
     */
    public function up(): void
    {
        Schema::create('epps_proveedores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->onDelete('cascade');

            $table->string('ruc', 11)->unique();
            $table->string('razon_social', 200);
            $table->string('nombre_comercial', 200)->nullable();

            $table->string('contacto_nombre', 150)->nullable();
            $table->string('contacto_telefono', 20)->nullable();
            $table->string('contacto_email', 100)->nullable();

            $table->text('direccion')->nullable();
            $table->string('ciudad', 100)->nullable();

            $table->enum('calificacion', ['excelente', 'bueno', 'regular', 'malo'])->default('bueno');
            $table->integer('tiempo_entrega_dias')->default(7)->comment('Tiempo promedio de entrega en días');
            $table->text('observaciones')->nullable();

            $table->boolean('activo')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['empresa_id', 'activo']);
            $table->index('ruc');
        });

        // Agregar columna proveedor_id a epps_inventario
        Schema::table('epps_inventario', function (Blueprint $table) {
            $table->foreignId('proveedor_id')->nullable()
                ->after('proveedor')
                ->constrained('epps_proveedores')
                ->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('epps_inventario', function (Blueprint $table) {
            $table->dropForeign(['proveedor_id']);
            $table->dropColumn('proveedor_id');
        });

        Schema::dropIfExists('epps_proveedores');
    }
};
