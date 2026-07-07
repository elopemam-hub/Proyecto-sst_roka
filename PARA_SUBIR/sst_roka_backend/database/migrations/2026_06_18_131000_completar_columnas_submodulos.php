<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inspeccion_submodulos', function (Blueprint $table) {
            if (!Schema::hasColumn('inspeccion_submodulos', 'orden')) {
                $table->unsignedTinyInteger('orden')->default(0)->after('activo');
            }
            if (!Schema::hasColumn('inspeccion_submodulos', 'descripcion')) {
                $table->text('descripcion')->nullable()->after('nombre');
            }
        });

        // Asignar orden a los sub-módulos existentes según código
        DB::table('inspeccion_submodulos')->where('codigo', 'A')->update(['orden' => 1]);
        DB::table('inspeccion_submodulos')->where('codigo', 'B')->update(['orden' => 2]);
        DB::table('inspeccion_submodulos')->where('codigo', 'C')->update(['orden' => 3]);
    }

    public function down(): void
    {
        Schema::table('inspeccion_submodulos', function (Blueprint $table) {
            if (Schema::hasColumn('inspeccion_submodulos', 'orden'))      $table->dropColumn('orden');
            if (Schema::hasColumn('inspeccion_submodulos', 'descripcion')) $table->dropColumn('descripcion');
        });
    }
};
