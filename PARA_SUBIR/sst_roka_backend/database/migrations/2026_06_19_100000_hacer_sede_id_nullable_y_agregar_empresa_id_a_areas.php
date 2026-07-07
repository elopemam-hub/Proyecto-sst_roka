<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Hacer sede_id nullable en areas
        Schema::table('areas', function (Blueprint $table) {
            $table->dropForeign(['sede_id']);
            $table->foreignId('sede_id')->nullable()->change()->constrained('sedes')->onDelete('set null');
            $table->foreignId('empresa_id')->nullable()->after('id')->constrained('empresas')->onDelete('cascade');
        });

        // 2. Rellenar empresa_id desde la sede existente
        DB::statement('
            UPDATE areas a
            INNER JOIN sedes s ON s.id = a.sede_id
            SET a.empresa_id = s.empresa_id
            WHERE a.empresa_id IS NULL
        ');
    }

    public function down(): void
    {
        Schema::table('areas', function (Blueprint $table) {
            $table->dropForeign(['empresa_id']);
            $table->dropColumn('empresa_id');
            $table->dropForeign(['sede_id']);
            $table->foreignId('sede_id')->nullable(false)->change()->constrained('sedes')->onDelete('cascade');
        });
    }
};
