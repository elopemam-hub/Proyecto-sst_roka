<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Catálogos cuyo nombre indica inspección diaria → frecuencia = 'diaria'
        DB::table('equipos_catalogo')
            ->where(fn($q) => $q
                ->where('nombre', 'like', '%diaria%')
                ->orWhere('nombre', 'like', '%Insp. diaria%')
                ->orWhere('nombre', 'like', '%Inspección diaria%')
            )
            ->update(['frecuencia_inspeccion' => 'diaria']);

        // 2. Catálogos cuyo nombre indica inspección mensual → frecuencia = 'mensual'
        DB::table('equipos_catalogo')
            ->whereNull('frecuencia_inspeccion')
            ->where(fn($q) => $q
                ->where('nombre', 'like', '%mensual%')
                ->orWhere('nombre', 'like', '%Insp. Mensual%')
                ->orWhere('nombre', 'like', '%Inspección mensual%')
            )
            ->update(['frecuencia_inspeccion' => 'mensual']);
    }

    public function down(): void
    {
        // No hay rollback seguro de datos
    }
};
