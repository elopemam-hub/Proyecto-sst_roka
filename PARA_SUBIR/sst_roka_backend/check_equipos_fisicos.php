<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

// Catálogos con frecuencia diaria
$catalogosDiarios = DB::table('equipos_catalogo')
    ->where('frecuencia_inspeccion', 'diaria')
    ->select('id', 'nombre')
    ->get();

echo "=== CATÁLOGOS CON FRECUENCIA DIARIA ===\n\n";
foreach ($catalogosDiarios as $cat) {
    echo "ID {$cat->id}: {$cat->nombre}\n";

    // Buscar equipos físicos vinculados
    $equiposFisicos = DB::table('equipos')
        ->where('equipo_catalogo_id', $cat->id)
        ->select('id', 'codigo', 'nombre', 'area_id', 'estado')
        ->get();

    if ($equiposFisicos->count() > 0) {
        echo "  Equipos físicos ({$equiposFisicos->count()}):\n";
        foreach ($equiposFisicos as $eq) {
            echo "    - {$eq->codigo}: {$eq->nombre} (Estado: {$eq->estado})\n";
        }
    } else {
        echo "  ❌ NO HAY EQUIPOS FÍSICOS REGISTRADOS\n";
    }
    echo "\n";
}

echo "\n=== RESUMEN ===\n";
echo "Total catálogos diarios: " . $catalogosDiarios->count() . "\n";
echo "Total equipos físicos diarios: " . DB::table('equipos')
    ->whereIn('equipo_catalogo_id', $catalogosDiarios->pluck('id'))
    ->count() . "\n";
