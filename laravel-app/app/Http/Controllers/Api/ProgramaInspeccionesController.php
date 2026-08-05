<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

/**
 * Programa de inspecciones — vista de SOLO LECTURA.
 *
 * No mantiene un calendario propio. Cruza la configuración de frecuencias
 * (equipos_plantillas) contra las inspecciones realmente ejecutadas
 * (tabla inspecciones) para responder "planificado vs ejecutado".
 *
 * Sustituye a InspeccionProgramadaController, que mantenía la tabla paralela
 * inspeccion_programadas: nadie la cerraba, así que todo envejecía a "vencida".
 */
class ProgramaInspeccionesController extends Controller
{
    /** Estados que cuentan como inspección efectivamente realizada. */
    private const EJECUTADA = ['ejecutada', 'cerrada', 'con_hallazgos'];

    // ──────────────────────────────────────────────────────────────────────────
    // GET /api/programa-inspecciones/resumen?anio=&mes=
    // KPIs del período y desglose por frecuencia.
    // ──────────────────────────────────────────────────────────────────────────
    public function resumen(Request $request): JsonResponse
    {
        $empresaId = $request->user()->empresa_id;
        [$mesIni, $mesFin, $hoy] = $this->periodo($request);

        $filas = $this->calcular($empresaId, $mesIni, $mesFin, $hoy, $request->boolean('solo_operativos', true));

        $esperadas  = $filas->sum('esperadas');
        $ejecutadas = $filas->sum('ejecutadas');

        // Inspecciones ejecutadas en el mes que no se pueden atribuir a un par
        // equipo↔plantilla (sin equipo_id): no se pierden, se informan aparte.
        $sinEquipo = DB::table('inspecciones')
            ->whereNull('deleted_at')
            ->where('empresa_id', $empresaId)
            ->whereIn('estado', self::EJECUTADA)
            ->whereBetween('planificada_para', [$mesIni->toDateString(), $mesFin->toDateString()])
            ->whereNull('equipo_id')
            ->count();

        $porFrecuencia = $filas
            ->groupBy('frecuencia')
            ->map(function ($grupo, $frec) {
                $esp = $grupo->sum('esperadas');
                return [
                    'frecuencia'   => $frec,
                    'pares'        => $grupo->count(),
                    'esperadas'    => $esp,
                    'ejecutadas'   => $grupo->sum('ejecutadas'),
                    'cumplimiento' => $this->pct($grupo->sum('ejecutadas_utiles'), $esp),
                ];
            })
            ->values();

        return response()->json([
            'periodo' => [
                'anio'          => (int) $mesIni->year,
                'mes'           => (int) $mesIni->month,
                'desde'         => $mesIni->toDateString(),
                'hasta'         => $mesFin->toDateString(),
                'corte'         => $hoy->lt($mesFin) ? $hoy->toDateString() : $mesFin->toDateString(),
                'es_mes_actual' => $hoy->between($mesIni, $mesFin),
                'es_futuro'     => $mesIni->gt($hoy),
            ],
            'totales' => [
                'pares'                 => $filas->count(),
                'equipos'               => $filas->pluck('equipo_id')->unique()->count(),
                'esperadas'             => $esperadas,
                'esperadas_periodo'     => $filas->sum('esperadas_periodo'),
                'ejecutadas'            => $ejecutadas,
                'cumplimiento'          => $this->pct($filas->sum('ejecutadas_utiles'), $esperadas),
                'sin_ejecutar'          => $filas->where('estado', 'sin_ejecutar')->count(),
                'completos'             => $filas->where('estado', 'completo')->count(),
                'parciales'             => $filas->where('estado', 'parcial')->count(),
                'en_plazo'              => $filas->where('estado', 'en_plazo')->count(),
                'ejecutadas_sin_equipo' => $sinEquipo,
            ],
            'por_frecuencia' => $porFrecuencia,
        ]);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // GET /api/programa-inspecciones/detalle?anio=&mes=&frecuencia=&estado=&q=
    // Una fila por par equipo↔plantilla, con esperadas vs ejecutadas.
    // ──────────────────────────────────────────────────────────────────────────
    public function detalle(Request $request): JsonResponse
    {
        $empresaId = $request->user()->empresa_id;
        [$mesIni, $mesFin, $hoy] = $this->periodo($request);

        $filas = $this->calcular($empresaId, $mesIni, $mesFin, $hoy, $request->boolean('solo_operativos', true));

        if ($request->filled('frecuencia')) {
            $filas = $filas->where('frecuencia', $request->input('frecuencia'));
        }
        if ($request->filled('estado')) {
            $filas = $filas->where('estado', $request->input('estado'));
        }
        if ($request->filled('q')) {
            $q = mb_strtolower(trim($request->input('q')));
            $filas = $filas->filter(fn($f) => str_contains(mb_strtolower(
                $f['equipo_nombre'] . ' ' . $f['equipo_codigo'] . ' ' . $f['plantilla_nombre']
            ), $q));
        }

        // Peor cumplimiento primero: es la lista de trabajo del responsable SST.
        $filas = $filas->sortBy([
            fn($a, $b) => $a['cumplimiento'] <=> $b['cumplimiento'],
            fn($a, $b) => strcmp($a['equipo_nombre'], $b['equipo_nombre']),
        ])->values();

        $perPage = min(max($request->integer('per_page', 25), 5), 100);
        $pagina  = max($request->integer('page', 1), 1);
        $total   = $filas->count();

        return response()->json([
            'data'         => $filas->forPage($pagina, $perPage)->values(),
            'current_page' => $pagina,
            'last_page'    => max((int) ceil($total / $perPage), 1),
            'per_page'     => $perPage,
            'total'        => $total,
            'from'         => $total ? ($pagina - 1) * $perPage + 1 : null,
            'to'           => min($pagina * $perPage, $total) ?: null,
        ]);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Núcleo del cálculo
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Devuelve una fila por par equipo↔plantilla con lo esperado según su
     * frecuencia y lo realmente ejecutado en la ventana correspondiente.
     */
    private function calcular(int $empresaId, Carbon $mesIni, Carbon $mesFin, Carbon $hoy, bool $soloOperativos)
    {
        $pares = DB::table('equipos_plantillas as ep')
            ->join('equipos as e', 'e.id', '=', 'ep.equipo_id')
            ->leftJoin('areas as a', 'a.id', '=', 'e.area_id')
            ->leftJoin('equipos_catalogo as c', 'c.id', '=', 'ep.plantilla_id')
            ->where('e.empresa_id', $empresaId)
            ->where('ep.activo', true)
            ->whereNotNull('ep.frecuencia_inspeccion')
            ->when($soloOperativos, fn($q) => $q->where('e.estado', 'operativo'))
            ->select(
                'ep.equipo_id', 'ep.plantilla_id', 'ep.frecuencia_inspeccion as frecuencia',
                'e.codigo as equipo_codigo', 'e.nombre as equipo_nombre', 'e.estado as equipo_estado',
                'a.nombre as area_nombre',
                'c.nombre as plantilla_nombre', 'c.codigo as plantilla_codigo'
            )
            ->get();

        if ($pares->isEmpty()) {
            return collect();
        }

        // Las ejecuciones se cuentan por ventana, y la ventana depende de la
        // frecuencia (una anual no se juzga contra un solo mes). Una consulta
        // por frecuencia distinta: como mucho seis.
        $ejecuciones = [];
        foreach ($pares->groupBy('frecuencia') as $frec => $grupo) {
            [$vIni, $vFin] = $this->ventana((string) $frec, $mesIni, $mesFin);
            $corte = $hoy->lt($vFin) ? $hoy->copy() : $vFin->copy();
            if ($corte->lt($vIni)) {
                continue; // ventana enteramente futura: nada que contar
            }

            $rows = DB::table('inspecciones')
                ->whereNull('deleted_at')
                ->where('empresa_id', $empresaId)
                ->whereIn('estado', self::EJECUTADA)
                ->whereBetween('planificada_para', [$vIni->toDateString(), $corte->toDateString()])
                ->whereIn('equipo_id', $grupo->pluck('equipo_id')->unique()->all())
                ->whereIn('equipo_catalogo_id', $grupo->pluck('plantilla_id')->unique()->all())
                // Una inspección nacida de una asignación diaria cumple un par
                // DIARIO, nunca uno mensual o superior. Hasta el 05/08/2026 se
                // creaban contra la plantilla mensual por error, y así inflaban
                // el cumplimiento del mes. Los registros no se alteran: solo
                // dejan de computar donde no corresponde.
                ->when($frec !== 'diaria', fn($q) => $q
                    ->whereNotExists(fn($s) => $s->from('equipo_asignaciones as ea')
                        ->whereColumn('ea.inspeccion_id', 'inspecciones.id')))
                ->selectRaw('equipo_id, equipo_catalogo_id, COUNT(*) as total, MAX(planificada_para) as ultima')
                ->groupBy('equipo_id', 'equipo_catalogo_id')
                ->get();

            foreach ($rows as $r) {
                $ejecuciones["{$r->equipo_id}-{$r->equipo_catalogo_id}"] = $r;
            }
        }

        return $pares->map(function ($p) use ($mesIni, $mesFin, $hoy, $ejecuciones) {
            $frec  = (string) $p->frecuencia;
            [$vIni, $vFin] = $this->ventana($frec, $mesIni, $mesFin);
            $corte = $hoy->lt($vFin) ? $hoy->copy() : $vFin->copy();

            $hit        = $ejecuciones["{$p->equipo_id}-{$p->plantilla_id}"] ?? null;
            $ejecutadas = $hit ? (int) $hit->total : 0;

            // Una frecuencia mensual o mayor se cumple en cualquier momento de su
            // ventana: mientras la ventana siga abierta no es exigible todavía, así
            // que no cuenta como incumplimiento ni penaliza el % del período.
            $unaPorVentana  = !in_array($frec, ['diaria', 'semanal'], true);
            $ventanaAbierta = $corte->lt($vFin);

            if ($unaPorVentana) {
                $periodo   = 1;
                $esperadas = ($ventanaAbierta && $ejecutadas === 0) ? 0 : 1;
            } else {
                // Esperadas hasta la fecha de corte: en el mes en curso no se puede
                // exigir lo que todavía no ha llegado.
                $esperadas = $corte->gte($vIni) ? $this->esperadas($frec, $vIni, $corte) : 0;
                $periodo   = $this->esperadas($frec, $vIni, $vFin);
            }

            $estado = ($unaPorVentana && $ejecutadas === 0 && $ventanaAbierta)
                ? 'en_plazo'
                : $this->estadoFila($ejecutadas, $esperadas);

            return [
                'equipo_id'         => (int) $p->equipo_id,
                'equipo_codigo'     => $p->equipo_codigo,
                'equipo_nombre'     => $p->equipo_nombre,
                'equipo_estado'     => $p->equipo_estado,
                'area_nombre'       => $p->area_nombre,
                'plantilla_id'      => (int) $p->plantilla_id,
                'plantilla_nombre'  => $p->plantilla_nombre,
                'plantilla_codigo'  => $p->plantilla_codigo,
                'frecuencia'        => $frec,
                'ventana_desde'     => $vIni->toDateString(),
                'ventana_hasta'     => $vFin->toDateString(),
                'esperadas'         => $esperadas,
                'esperadas_periodo' => $periodo,
                'ejecutadas'        => $ejecutadas,
                // Para el % agregado: un equipo inspeccionado de más no puede
                // compensar el incumplimiento de otro.
                'ejecutadas_utiles' => min($ejecutadas, $esperadas),
                'ultima_ejecucion'  => $hit->ultima ?? null,
                'cumplimiento'      => $this->pct($ejecutadas, $esperadas),
                'estado'            => $estado,
            ];
        });
    }

    /**
     * Ventana de evaluación. Las frecuencias mayores al mes no se juzgan contra
     * un solo mes, sino contra su trimestre / semestre / año natural.
     */
    private function ventana(string $frecuencia, Carbon $mesIni, Carbon $mesFin): array
    {
        return match ($frecuencia) {
            'trimestral' => [$mesIni->copy()->firstOfQuarter(), $mesIni->copy()->lastOfQuarter()],
            'semestral'  => $mesIni->month <= 6
                ? [$mesIni->copy()->startOfYear(), $mesIni->copy()->startOfYear()->addMonths(5)->endOfMonth()]
                : [$mesIni->copy()->startOfYear()->addMonths(6), $mesIni->copy()->endOfYear()],
            'anual'      => [$mesIni->copy()->startOfYear(), $mesIni->copy()->endOfYear()],
            default      => [$mesIni->copy(), $mesFin->copy()],
        };
    }

    /** Cuántas inspecciones toca hacer entre dos fechas según la frecuencia. */
    private function esperadas(string $frecuencia, Carbon $ini, Carbon $fin): int
    {
        if ($fin->lt($ini)) return 0;

        // Sobre el inicio del día en ambos extremos: si no, endOfMonth() deja
        // un 23:59:59 que devuelve un float (30.9999) y trunca mal al castear.
        $dias = (int) round($ini->copy()->startOfDay()->diffInDays($fin->copy()->startOfDay())) + 1;

        return match ($frecuencia) {
            'diaria'  => $dias,
            'semanal' => (int) ceil($dias / 7),
            default   => 1, // mensual, trimestral, semestral, anual: una por ventana
        };
    }

    private function estadoFila(int $ejecutadas, int $esperadas): string
    {
        if ($esperadas === 0)          return 'sin_periodo';
        if ($ejecutadas === 0)         return 'sin_ejecutar';
        if ($ejecutadas >= $esperadas) return 'completo';
        return 'parcial';
    }

    private function pct(int $hechas, int $esperadas): ?float
    {
        if ($esperadas <= 0) return null;
        return round(min($hechas / $esperadas, 1) * 100, 1);
    }

    /** Período solicitado (por defecto, el mes en curso). */
    private function periodo(Request $request): array
    {
        $hoy  = Carbon::today();
        $anio = $request->integer('anio') ?: (int) $hoy->year;
        $mes  = $request->integer('mes')  ?: (int) $hoy->month;
        $mes  = max(1, min(12, $mes));

        $ini = Carbon::create($anio, $mes, 1)->startOfDay();

        return [$ini, $ini->copy()->endOfMonth(), $hoy];
    }
}
