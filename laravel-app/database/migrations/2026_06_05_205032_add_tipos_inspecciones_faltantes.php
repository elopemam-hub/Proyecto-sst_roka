<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Agregar tipos faltantes: taller, almacen, oficinas
     */
    public function up(): void
    {
        // MySQL requiere ALTER COLUMN para modificar ENUM
        DB::statement("ALTER TABLE `inspecciones` MODIFY COLUMN `tipo` ENUM(
            'equipos',
            'infraestructura',
            'emergencias',
            'epps',
            'orden_limpieza',
            'higiene',
            'general',
            'taller',
            'almacen',
            'oficinas'
        ) DEFAULT 'general' NOT NULL");
    }

    /**
     * Revertir a los tipos originales
     */
    public function down(): void
    {
        DB::statement("ALTER TABLE `inspecciones` MODIFY COLUMN `tipo` ENUM(
            'equipos',
            'infraestructura',
            'emergencias',
            'epps',
            'orden_limpieza',
            'higiene',
            'general'
        ) DEFAULT 'general' NOT NULL");
    }
};
