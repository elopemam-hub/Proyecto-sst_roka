<?php

namespace App\Services;

use App\Models\ProgramaSst;
use App\Models\ProgramaSstActividad;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Calcula la columna CUMPLIMIENTO del Programa Anual de SST contando lo que
 * realmente se ejecutó en los módulos del sistema.
 *
 * El cumplimiento de un programa SST es lo que audita SUNAFIL; si se escribe a
 * mano no prueba nada. Aquí una actividad como "7 reuniones del Comité" se
 * cuenta contra los registros existentes, y la evidencia queda trazable.
 *
 * Cada módulo aporta su fecha de EJECUCIÓN (no la programada): una actividad
 * programada pero no realizada no cuenta como cumplida.
 */
class ProgramaCumplimientoService
{
    /**
     * modulo => [tabla, columna de fecha de ejecución, columna de tipo|null]
     */
    private const FUENTES = [
        'capacitacion' => ['capacitaciones', 'fecha_ejecutada',   'tipo'],
        'inspeccion'   => ['inspecciones',   'ejecutada_en',      'tipo'],
        'simulacro'    => ['simulacros',     'fecha_ejecutada',   'tipo'],
        'auditoria'    => ['auditorias',     'fecha_ejecutada',   'tipo'],
        'iperc'        => ['iperc',          'fecha_elaboracion', null],
        'emo'          => ['salud_emo',      'fecha_examen',      'tipo'],
        'accidente'    => ['accidentes',     'fecha_accidente',   'tipo'],
        'documento'    => ['documentos',     'fecha_aprobacion',  'tipo'],
    ];

    public static function modulosDisponibles(): array
    {
        return array_merge(['manual'], array_keys(self::FUENTES));
    }

    /**
     * Recalcula y persiste el cumplimiento de todas las actividades vinculadas
     * a un módulo. Las actividades 'manual' conservan lo que cargó el usuario.
     *
     * @return int Cantidad de actividades actualizadas
     */
    public function recalcular(ProgramaSst $programa): int
    {
        $actividades = $programa->actividades()
            ->where('modulo_vinculado', '!=', 'manual')
            ->get();

        $actualizadas = 0;

        foreach ($actividades as $actividad) {
            $ejecutado = $this->contar($actividad, $programa->empresa_id, (int) $programa->anio);
            if ($ejecutado === null) continue;

            $actividad->cantidad_ejecutada          = $ejecutado;
            $actividad->cumplimiento_actualizado_at = now();

            // El estado solo se automatiza hacia arriba: si alguien marcó la
            // actividad como "no aplica", el conteo no la resucita.
            if ($actividad->estado !== 'no_aplica') {
                $meta = (int) $actividad->meta_cantidad;
                $actividad->estado = match (true) {
                    $meta > 0 && $ejecutado >= $meta => 'completado',
                    $ejecutado > 0                   => 'en_proceso',
                    default                          => 'pendiente',
                };
            }

            $actividad->save();
            $actualizadas++;
        }

        return $actualizadas;
    }

    /**
     * Meses del año en que la actividad registra ejecución real. Alimenta la
     * matriz: permite contrastar lo programado (X) con lo ejecutado.
     *
     * @return array<int,int> Meses 1..12 con al menos un registro
     */
    public function mesesEjecutados(ProgramaSstActividad $actividad, int $empresaId, int $anio): array
    {
        $fuente = self::FUENTES[$actividad->modulo_vinculado] ?? null;
        if (!$fuente) return [];

        [$tabla, $columnaFecha] = $fuente;

        return $this->base($actividad, $empresaId, $anio)
            ->selectRaw("MONTH({$tabla}.{$columnaFecha}) as mes")
            ->distinct()
            ->pluck('mes')
            ->map(fn ($m) => (int) $m)
            ->sort()
            ->values()
            ->all();
    }

    /**
     * @return int|null null si la actividad no está vinculada a un módulo
     */
    public function contar(ProgramaSstActividad $actividad, int $empresaId, int $anio): ?int
    {
        if (!isset(self::FUENTES[$actividad->modulo_vinculado])) return null;

        return $this->base($actividad, $empresaId, $anio)->count();
    }

    private function base(ProgramaSstActividad $actividad, int $empresaId, int $anio): Builder
    {
        [$tabla, $columnaFecha, $columnaTipo] = self::FUENTES[$actividad->modulo_vinculado];

        $query = DB::table($tabla)
            ->where('empresa_id', $empresaId)
            ->whereNotNull($columnaFecha)
            ->whereYear($columnaFecha, $anio);

        // Varios módulos usan borrado lógico; contar registros eliminados
        // inflaría el cumplimiento.
        if ($this->tieneColumna($tabla, 'deleted_at')) {
            $query->whereNull('deleted_at');
        }

        $filtro = $actividad->filtro ?? [];
        if ($columnaTipo && !empty($filtro['tipo'])) {
            $query->whereIn($columnaTipo, (array) $filtro['tipo']);
        }
        if (!empty($filtro['area_id']) && $this->tieneColumna($tabla, 'area_id')) {
            $query->whereIn('area_id', (array) $filtro['area_id']);
        }

        return $query;
    }

    /** @var array<string,bool> */
    private array $columnas = [];

    private function tieneColumna(string $tabla, string $columna): bool
    {
        return $this->columnas["{$tabla}.{$columna}"] ??= Schema::hasColumn($tabla, $columna);
    }
}
