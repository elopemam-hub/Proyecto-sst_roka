<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('epps_inventario', 'imagen_path')) {
            return;
        }

        Schema::table('epps_inventario', function (Blueprint $table) {
            $table->string('imagen_path')->nullable()->after('ficha_tecnica_path');
        });
    }

    public function down(): void
    {
        if (!Schema::hasColumn('epps_inventario', 'imagen_path')) {
            return;
        }

        Schema::table('epps_inventario', function (Blueprint $table) {
            $table->dropColumn('imagen_path');
        });
    }
};
