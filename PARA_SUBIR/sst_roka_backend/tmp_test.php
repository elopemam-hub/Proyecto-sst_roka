$rows = DB::select("SELECT DISTINCT e.id, e.codigo FROM equipos e INNER JOIN equipos_plantillas ep ON ep.equipo_id = e.id INNER JOIN equipos_catalogo ec ON ec.id = ep.plantilla_id WHERE e.deleted_at IS NULL AND COALESCE(ep.frecuencia_inspeccion, ec.frecuencia_inspeccion) = 'diaria' ORDER BY e.codigo");
echo "Count: " . count($rows) . "\n";
foreach ($rows as $r) { echo $r->codigo . "\n"; }
