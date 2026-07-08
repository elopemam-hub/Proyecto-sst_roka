<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Agregar columna color a categorías de EPP
        Schema::table('epps_categorias', function (Blueprint $table) {
            $table->string('color', 20)->nullable()->after('vida_util_meses');
        });

        // Hacer ruc nullable en proveedores (campo opcional en el formulario)
        Schema::table('epps_proveedores', function (Blueprint $table) {
            $table->string('ruc', 20)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('epps_categorias', function (Blueprint $table) {
            $table->dropColumn('color');
        });

        Schema::table('epps_proveedores', function (Blueprint $table) {
            $table->string('ruc', 11)->nullable(false)->change();
        });
    }
};
