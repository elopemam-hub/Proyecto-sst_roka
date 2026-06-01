<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ats', function (Blueprint $table) {
            $table->json('epps_requeridos')->nullable()->after('requiere_permiso_especial')
                  ->comment('IDs de EPPs requeridos para todo el trabajo');
        });
    }

    public function down(): void
    {
        Schema::table('ats', function (Blueprint $table) {
            $table->dropColumn('epps_requeridos');
        });
    }
};
