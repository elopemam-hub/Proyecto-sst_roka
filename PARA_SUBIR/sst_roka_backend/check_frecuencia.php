<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$equipos = DB::table('equipos_catalogo')
    ->select('id', 'nombre', 'frecuencia_inspeccion', 'activo')
    ->get();

echo "Total equipos catálogo: " . $equipos->count() . "\n\n";
echo str_pad('ID', 5) . str_pad('NOMBRE', 50) . str_pad('FRECUENCIA', 20) . "ACTIVO\n";
echo str_repeat('-', 85) . "\n";

foreach ($equipos as $eq) {
    echo str_pad($eq->id, 5)
        . str_pad(substr($eq->nombre, 0, 48), 50)
        . str_pad($eq->frecuencia_inspeccion ?? 'NULL', 20)
        . ($eq->activo ? 'Sí' : 'No')
        . "\n";
}

echo "\n\nCon frecuencia 'diaria': "
    . $equipos->where('frecuencia_inspeccion', 'diaria')->count() . "\n";
