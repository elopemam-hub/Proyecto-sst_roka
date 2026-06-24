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
        Schema::create('equipos_certificados_operatividad', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->cascadeOnDelete();
            $table->unsignedInteger('equipo_catalogo_id')->nullable();
            $table->foreign('equipo_catalogo_id')->references('id')->on('equipos_catalogo')->nullOnDelete();

            $table->string('codigo', 50)->index();
            $table->string('nombre', 255);
            $table->enum('frecuencia', ['mensual', 'trimestral', 'semestral', 'anual', 'bienal', 'quinquenal'])->default('anual');
            $table->date('fecha_informe')->nullable();
            $table->date('fecha_vencimiento')->nullable();
            $table->string('documento_path')->nullable();
            $table->enum('estado', ['activo', 'vencido', 'por_vencer', 'inactivo'])->default('activo');
            $table->text('observaciones')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->unique(['empresa_id', 'codigo']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('equipos_certificados_operatividad');
    }
};
