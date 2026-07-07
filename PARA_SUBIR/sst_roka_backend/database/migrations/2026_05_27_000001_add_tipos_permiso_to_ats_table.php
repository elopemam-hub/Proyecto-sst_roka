<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ats', function (Blueprint $table) {
            $table->json('tipos_permiso')->nullable()->after('requiere_permiso_especial');
        });
    }

    public function down(): void
    {
        Schema::table('ats', function (Blueprint $table) {
            $table->dropColumn('tipos_permiso');
        });
    }
};
