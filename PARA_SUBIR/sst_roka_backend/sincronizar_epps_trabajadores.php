<?php
/**
 * Script para sincronizar equipos EPP con trabajadores activos
 * Ejecutar cada vez que se agreguen nuevos trabajadores
 *
 * Uso: php sincronizar_epps_trabajadores.php
 */

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "🔄 Sincronizando EPPs con trabajadores activos\n";
echo "==============================================\n\n";

$eid = 1; // empresa_id
$catId = DB::table('equipos_catalogo')->where('codigo', 'EQ-013-TRAB')->value('id');

if (!$catId) {
    echo "❌ Error: No existe el catálogo EQ-013-TRAB\n";
    exit(1);
}

// Obtener trabajadores activos (excluyendo admins)
$trabajadores = DB::table('personal')
    ->where('estado', 'activo')
    ->whereNull('deleted_at')
    // Excluir usuarios administrativos del sistema
    ->where(function($q) {
        $q->where('nombres', 'NOT LIKE', '%Admin%')
          ->where('apellidos', 'NOT LIKE', '%Admin%')
          ->where('nombres', 'NOT LIKE', '%SST ROKA%')
          ->where('apellidos', 'NOT LIKE', '%SST ROKA%');
    })
    ->get(['id', 'nombres', 'apellidos', 'area_id']);

echo "📋 Trabajadores activos encontrados: " . $trabajadores->count() . "\n\n";

$creados = 0;
$existentes = 0;

foreach ($trabajadores as $trab) {
    $iniciales = strtoupper(substr($trab->nombres, 0, 1) . substr($trab->apellidos, 0, 1));
    $numero = str_pad($trab->id, 2, '0', STR_PAD_LEFT);
    $codigo = "EPP-{$iniciales}-{$numero}";

    $existe = DB::table('equipos')->where('codigo', $codigo)->exists();

    if (!$existe) {
        DB::table('equipos')->insert([
            'empresa_id' => $eid,
            'equipo_catalogo_id' => $catId,
            'codigo' => $codigo,
            'nombre' => "EPPs - {$trab->nombres} {$trab->apellidos}",
            'area_id' => $trab->area_id ?? 1,
            'estado' => 'operativo',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        echo "✓ Creado: {$codigo} - {$trab->nombres} {$trab->apellidos}\n";
        $creados++;
    } else {
        $existentes++;
    }
}

echo "\n";
echo "==============================================\n";
echo "✅ Sincronización completada\n";
echo "   • Equipos creados: {$creados}\n";
echo "   • Equipos existentes: {$existentes}\n";
echo "   • Total trabajadores: " . $trabajadores->count() . "\n";
