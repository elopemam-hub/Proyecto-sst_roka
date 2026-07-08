<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inspecciones', function (Blueprint $table) {
            $table->unsignedBigInteger('inspector_usuario_id')->nullable()->after('inspector_id');
            $table->foreign('inspector_usuario_id')->references('id')->on('usuarios')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('inspecciones', function (Blueprint $table) {
            $table->dropForeign(['inspector_usuario_id']);
            $table->dropColumn('inspector_usuario_id');
        });
    }
};
