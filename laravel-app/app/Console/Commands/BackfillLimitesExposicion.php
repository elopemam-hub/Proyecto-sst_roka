<?php

namespace App\Console\Commands;

use App\Models\SustanciaExposicion;
use App\Models\SustanciaPeligrosa;
use App\Services\EvaluacionExposicionService;
use Illuminate\Console\Command;

/**
 * Pasa los límites y niveles medidos de texto libre a valor + unidad.
 *
 * Es deliberadamente cobarde: solo acepta el patrón limpio "número unidad".
 * Cualquier otra cosa ("<1 ppm", "0.5 ppm piel", "ver HDS") se deja sin tocar
 * y se lista para captura manual. Un backfill que adivina sobre límites de
 * exposición ocupacional produce evaluaciones falsas, que es peor que no tener
 * evaluación.
 */
class BackfillLimitesExposicion extends Command
{
    protected $signature = 'sustancias:backfill-limites {--aplicar : Guarda los cambios; sin esta opción solo simula}';

    protected $description = 'Convierte los límites de exposición y niveles medidos de texto a valor + unidad';

    /** Equivalencias de escritura que sí son inequívocas */
    private const ALIAS_UNIDAD = [
        'mg/m³' => 'mg/m3', 'mg/m3' => 'mg/m3', 'mgm3' => 'mg/m3',
        'ppm'   => 'ppm',
        'fibras/cm³' => 'fibras/cm3', 'fibras/cm3' => 'fibras/cm3', 'f/cm3' => 'fibras/cm3',
        '%' => '%',
    ];

    public function handle(EvaluacionExposicionService $evaluador): int
    {
        $aplicar = $this->option('aplicar');

        if (!$aplicar) {
            $this->warn('Modo simulación. Añade --aplicar para guardar.');
        }

        $convertidos = 0;
        $pendientes  = [];

        // ── Límites de las sustancias ──────────────────────────────
        foreach (SustanciaPeligrosa::withTrashed()->get() as $s) {
            $cambios = [];

            foreach (['tlv_twa', 'stel', 'idlh'] as $cual) {
                $texto = $s->{"limite_{$cual}"};
                if (blank($texto) || $s->{"limite_{$cual}_valor"} !== null) continue;

                $parsed = $this->parsear($texto);
                if ($parsed === null) {
                    $pendientes[] = ['tipo' => 'sustancia', 'id' => $s->id, 'campo' => "limite_{$cual}",
                                     'nombre' => $s->nombre, 'texto' => $texto];
                    continue;
                }

                $cambios["limite_{$cual}_valor"]  = $parsed['valor'];
                $cambios["limite_{$cual}_unidad"] = $parsed['unidad'];
            }

            if ($cambios) {
                $this->line("  {$s->nombre}: " . json_encode($cambios, JSON_UNESCAPED_UNICODE));
                if ($aplicar) $s->update($cambios);
                $convertidos++;
            }
        }

        // ── Niveles medidos de las exposiciones ────────────────────
        foreach (SustanciaExposicion::with('sustancia')->get() as $e) {
            if (blank($e->nivel_medido) || $e->nivel_medido_valor !== null) continue;

            $parsed = $this->parsear($e->nivel_medido);
            if ($parsed === null) {
                $pendientes[] = ['tipo' => 'exposicion', 'id' => $e->id, 'campo' => 'nivel_medido',
                                 'nombre' => $e->nombre_trabajador, 'texto' => $e->nivel_medido];
                continue;
            }

            $datos = [
                'nivel_medido_valor'  => $parsed['valor'],
                'nivel_medido_unidad' => $parsed['unidad'],
            ];

            if ($e->sustancia) {
                $ev = $evaluador->evaluar($e->sustancia, $parsed['valor'], $parsed['unidad'],
                                          $e->duracion_horas ? (float) $e->duracion_horas : null);
                $datos += [
                    'evaluacion_automatica' => $ev['evaluacion'],
                    'pct_limite'            => $ev['pct_limite'],
                    'limite_aplicado'       => $ev['limite_aplicado'],
                    'motivo_evaluacion'     => $ev['motivo'],
                ];
            }

            $this->line("  exposición #{$e->id} ({$e->nombre_trabajador}): {$parsed['valor']} {$parsed['unidad']}");
            if ($aplicar) $e->update($datos);
            $convertidos++;
        }

        $this->newLine();
        $this->info("Convertidos: {$convertidos}");

        if ($pendientes) {
            $this->newLine();
            $this->warn('Requieren captura manual (formato no inequívoco):');
            $this->table(
                ['Tipo', 'ID', 'Campo', 'Nombre', 'Texto original'],
                array_map(fn($p) => array_values($p), $pendientes)
            );
        } else {
            $this->info('Sin pendientes de captura manual.');
        }

        return self::SUCCESS;
    }

    /**
     * Solo "número unidad", con coma o punto decimal. Nada de rangos,
     * comparadores ni notas al margen.
     */
    private function parsear(string $texto): ?array
    {
        $limpio = trim(mb_strtolower($texto));

        if (!preg_match('/^(\d+(?:[.,]\d+)?)\s*(.+)$/u', $limpio, $m)) {
            return null;
        }

        $valor  = (float) str_replace(',', '.', $m[1]);
        $unidad = self::ALIAS_UNIDAD[trim($m[2])] ?? null;

        if ($unidad === null || !in_array($unidad, EvaluacionExposicionService::UNIDADES, true)) {
            return null;
        }

        return ['valor' => $valor, 'unidad' => $unidad];
    }
}
