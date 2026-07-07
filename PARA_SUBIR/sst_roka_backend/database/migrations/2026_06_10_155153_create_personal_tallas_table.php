<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Tabla para registrar tallas de EPPs por trabajador
     * Facilita entregas correctas y planificación de compras
     */
    public function up(): void
    {
        Schema::create('personal_tallas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->onDelete('cascade');
            $table->foreignId('personal_id')->constrained('personal')->onDelete('cascade');
            $table->foreignId('categoria_epp_id')->constrained('epps_categorias')->onDelete('cascade');

            $table->string('talla', 20); // S, M, L, XL, 38, 40, 42, etc.
            $table->text('observaciones')->nullable();

            $table->foreignId('actualizado_por')->nullable()->constrained('usuarios')->onDelete('set null');
            $table->timestamps();

            // Índices
            $table->index(['empresa_id', 'personal_id']);
            $table->index(['categoria_epp_id']);

            // Constraint: Un trabajador solo puede tener UNA talla por categoría
            $table->unique(['personal_id', 'categoria_epp_id'], 'personal_categoria_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('personal_tallas');
    }
};
