<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

// Simular llamada API
$equipos = DB::table('equipos')
    ->where('empresa_id', 1)
    ->where('estado', 'operativo')
    ->whereNull('deleted_at')
    ->select('id', 'codigo', 'nombre', 'equipo_catalogo_id', 'area_id', 'estado')
    ->limit(200)
    ->get();

echo "Total equipos operativos: " . $equipos->count() . "\n\n";

// Filtrar por catálogos diarios
$catalogosDiarios = [44, 45, 46, 47];
$equiposDiarios = $equipos->whereIn('equipo_catalogo_id', $catalogosDiarios);

echo "Equipos con catálogo diario:\n";
foreach ($equiposDiarios as $eq) {
    echo "  - {$eq->codigo}: {$eq->nombre} (Catálogo ID: {$eq->equipo_catalogo_id})\n";
}

echo "\nTotal: " . $equiposDiarios->count() . "\n";
