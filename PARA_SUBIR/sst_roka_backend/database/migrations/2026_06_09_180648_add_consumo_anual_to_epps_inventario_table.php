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
        Schema::table('epps_inventario', function (Blueprint $table) {
            $table->integer('consumo_anual')->nullable()->after('stock_minimo');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('epps_inventario', function (Blueprint $table) {
            $table->dropColumn('consumo_anual');
        });
    }
};
