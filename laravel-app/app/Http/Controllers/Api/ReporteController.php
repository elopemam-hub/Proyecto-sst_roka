<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

/**
 * Reportes MINTRA — indicadores legales de SST (Ley 29783 / RM 050-2013-TR).
 *
 * Notas de criterio:
 * - Las horas-hombre trabajadas (HHT) se calculan mes a mes con el personal
 *   realmente vigente en ese mes (fecha_ingreso / fecha_cese) y no se proyectan
 *   meses futuros, porque son el denominador de IF, IG e ISAL.
 * - El período de cada módulo se ancla a su fecha real de gestión, no a created_at.
 * - Se excluyen registros con borrado lógico: DB::table() no aplica el scope de
 *   SoftDeletes, así que el filtro va explícito.
 */
class ReporteController extends Controller
{
    /** Jornada estándar usada para estimar HHT */
    private const HORAS_JORNADA = 8;
    private const DIAS_MES      = 22;

    /** Valores reales del enum accidentes.tipo */
    private const TIPOS_ACCIDENTE = ['accidente_leve', 'accidente_incapacitante', 'accidente_mortal'];
    private const TIPOS_INCIDENTE = ['incidente', 'incidente_peligroso'];

    /** Estados de inspección que suponen trabajo realizado */
    private const INSPECCIONES_REALIZADAS = ['ejecutada', 'con_hallazgos', 'cerrada'];

    private const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Set','Oct','Nov','Dic'];

    // ─── Helpers de cálculo ─────────────────────────────────────────────────

    /**
     * HHT de un mes concreto: personal vigente ese mes × jornada.
     * Devuelve 0 para meses que todavía no han empezado.
     */
    private function hhtMes(int $empresaId, int $anio, int $mes): int
    {
        $inicioMes = Carbon::create($anio, $mes, 1)->startOfMonth();
        $finMes    = $inicioMes->copy()->endOfMonth();

        if ($inicioMes->isFuture()) {
            return 0;
        }

        $trabajadores = DB::table('personal')
            ->where('empresa_id', $empresaId)
            ->whereNull('deleted_at')
            ->where(fn($q) => $q->whereNull('fecha_ingreso')->orWhereDate('fecha_ingreso', '<=', $finMes))
            ->where(fn($q) => $q->whereNull('fecha_cese')->orWhereDate('fecha_cese', '>=', $inicioMes))
            ->count();

        return $trabajadores * self::HORAS_JORNADA * self::DIAS_MES;
    }

    /** HHT acumuladas del año (sin proyectar meses futuros) */
    private function hhtAnual(int $empresaId, int $anio): int
    {
        $total = 0;
        for ($m = 1; $m <= 12; $m++) {
            $total += $this->hhtMes($empresaId, $anio, $m);
        }
        return $total;
    }

    /** Índices legales. IF y IG por millón de HHT; ISAL = (IF × IG) / 1000 */
    private function indices(int $accidentes, int $diasPerdidos, int $hht): array
    {
        $if = $hht > 0 ? round(($accidentes * 1_000_000) / $hht, 2) : 0;
        $ig = $hht > 0 ? round(($diasPerdidos * 1_000_000) / $hht, 2) : 0;

        return ['IF' => $if, 'IG' => $ig, 'ISAL' => round(($if * $ig) / 1000, 2)];
    }

    /** Base de accidentes del año, ya sin borrados lógicos */
    private function accidentesDelAnio(int $empresaId, int $anio)
    {
        return DB::table('accidentes')
            ->where('empresa_id', $empresaId)
            ->whereNull('deleted_at')
            ->whereYear('fecha_accidente', $anio);
    }

    /**
     * Inspecciones del año. Se ancla a la fecha real de gestión:
     * ejecución si existe, si no la planificada, y como último recurso el alta.
     */
    private function inspeccionesDelAnio(int $empresaId, int $anio)
    {
        return DB::table('inspecciones')
            ->where('empresa_id', $empresaId)
            ->whereNull('deleted_at')
            ->whereRaw('YEAR(COALESCE(ejecutada_en, planificada_para, created_at)) = ?', [$anio]);
    }

    private function mesInspeccion(): string
    {
        return 'MONTH(COALESCE(ejecutada_en, planificada_para, created_at))';
    }

    // ─── Consolidado ejecutivo ──────────────────────────────────────────────

    /**
     * GET /api/reportes/consolidado
     * Dashboard estratégico: KPIs de todos los módulos para el año dado.
     */
    public function consolidado(Request $request): JsonResponse
    {
        $empresaId = $request->user()->empresa_id;
        $anio      = (int) $request->get('anio', now()->year);

        $totalPersonal = DB::table('personal')
            ->where('empresa_id', $empresaId)
            ->whereNull('deleted_at')
            ->where('estado', 'activo')
            ->count();

        $hht = $this->hhtAnual($empresaId, $anio);

        // Accidentabilidad
        $acc = $this->accidentesDelAnio($empresaId, $anio)
            ->selectRaw('
                SUM(CASE WHEN tipo IN (?, ?, ?) THEN 1 ELSE 0 END) as accidentes,
                SUM(CASE WHEN tipo = ? THEN 1 ELSE 0 END) as mortales,
                COALESCE(SUM(dias_perdidos), 0) as dias_perdidos
            ', [...self::TIPOS_ACCIDENTE, 'accidente_mortal'])
            ->first();

        $accidentes   = (int) ($acc->accidentes ?? 0);
        $mortales     = (int) ($acc->mortales ?? 0);
        $diasPerdidos = (int) ($acc->dias_perdidos ?? 0);

        $idx = $this->indices($accidentes, $diasPerdidos, $hht);

        $ultimoAccidente = DB::table('accidentes')
            ->where('empresa_id', $empresaId)
            ->whereNull('deleted_at')
            ->whereIn('tipo', self::TIPOS_ACCIDENTE)
            ->max('fecha_accidente');

        $diasSinAccidentes = $ultimoAccidente
            ? (int) Carbon::parse($ultimoAccidente)->startOfDay()->diffInDays(now()->startOfDay())
            : null;

        // Inspecciones
        $inspTotal      = (clone $this->inspeccionesDelAnio($empresaId, $anio))->count();
        $inspRealizadas = (clone $this->inspeccionesDelAnio($empresaId, $anio))
            ->whereIn('estado', self::INSPECCIONES_REALIZADAS)->count();
        $inspCerradas   = (clone $this->inspeccionesDelAnio($empresaId, $anio))
            ->where('estado', 'cerrada')->count();
        $inspHallazgos  = DB::table('inspecciones_hallazgos')
            ->join('inspecciones', 'inspecciones.id', '=', 'inspecciones_hallazgos.inspeccion_id')
            ->where('inspecciones.empresa_id', $empresaId)
            ->whereNull('inspecciones.deleted_at')
            ->whereYear('inspecciones_hallazgos.created_at', $anio)
            ->count();

        // Capacitaciones (el período se ancla a la fecha programada)
        $cap = DB::table('capacitaciones')
            ->where('empresa_id', $empresaId)
            ->whereYear('fecha_programada', $anio)
            ->selectRaw("
                COUNT(*) as total,
                SUM(CASE WHEN estado = 'ejecutada' THEN 1 ELSE 0 END) as ejecutadas,
                COALESCE(SUM(CASE WHEN estado = 'ejecutada' THEN duracion_horas ELSE 0 END), 0) as horas
            ")->first();

        $capTotal      = (int) ($cap->total ?? 0);
        $capEjecutadas = (int) ($cap->ejecutadas ?? 0);
        $horasCap      = (int) ($cap->horas ?? 0);

        // EMO / Salud
        $emosVencidos = DB::table('salud_emo')
            ->where('empresa_id', $empresaId)
            ->whereNotNull('fecha_vencimiento')
            ->whereDate('fecha_vencimiento', '<', now())
            ->count();
        $emosProximos = DB::table('salud_emo')
            ->where('empresa_id', $empresaId)
            ->whereNotNull('fecha_vencimiento')
            ->whereBetween('fecha_vencimiento', [now(), now()->addDays(30)])
            ->count();

        // EPPs
        $stockCritico = DB::table('epps_inventario')
            ->where('empresa_id', $empresaId)
            ->where('activo', true)
            ->whereColumn('stock_disponible', '<=', 'stock_minimo')
            ->count();
        $entregasMes = DB::table('epps_entregas')
            ->where('empresa_id', $empresaId)
            ->whereMonth('fecha_entrega', now()->month)
            ->whereYear('fecha_entrega', now()->year)
            ->count();

        // Auditorías
        $auditTotal = DB::table('auditorias')
            ->where('empresa_id', $empresaId)
            ->whereYear('fecha_programada', $anio)
            ->count();
        $hallazgosAbiertos = DB::table('auditoria_hallazgos')
            ->where('empresa_id', $empresaId)
            ->whereIn('estado', ['abierto', 'en_proceso', 'vencido'])
            ->count();

        return response()->json([
            'anio'               => $anio,
            'total_personal'     => $totalPersonal,
            'horas_hombre_total' => $hht,
            'accidentabilidad'   => [
                'accidentes'              => $accidentes,
                'mortales'                => $mortales,
                'dias_perdidos'           => $diasPerdidos,
                'indice_frecuencia'       => $idx['IF'],
                'indice_gravedad'         => $idx['IG'],
                'indice_accidentabilidad' => $idx['ISAL'],
                'dias_sin_accidentes'     => $diasSinAccidentes,
            ],
            'inspecciones'       => [
                'total'            => $inspTotal,
                'realizadas'       => $inspRealizadas,
                'cerradas'         => $inspCerradas,
                'hallazgos'        => $inspHallazgos,
                'cumplimiento_pct' => $inspTotal > 0 ? round(($inspRealizadas / $inspTotal) * 100, 1) : 0,
            ],
            'capacitaciones'     => [
                'total'            => $capTotal,
                'ejecutadas'       => $capEjecutadas,
                'horas'            => $horasCap,
                'cumplimiento_pct' => $capTotal > 0 ? round(($capEjecutadas / $capTotal) * 100, 1) : 0,
            ],
            'salud'              => [
                'emos_vencidos' => $emosVencidos,
                'emos_proximos' => $emosProximos,
            ],
            'epps'               => [
                'stock_critico' => $stockCritico,
                'entregas_mes'  => $entregasMes,
            ],
            'auditorias'         => [
                'total'              => $auditTotal,
                'hallazgos_abiertos' => $hallazgosAbiertos,
            ],
        ]);
    }

    // ─── Accidentabilidad mensual ───────────────────────────────────────────

    /**
     * GET /api/reportes/accidentabilidad
     * Serie mensual de IF, IG, ISAL — base del reporte MINTRA.
     */
    public function accidentabilidad(Request $request): JsonResponse
    {
        $empresaId = $request->user()->empresa_id;
        $anio      = (int) $request->get('anio', now()->year);

        // Una sola consulta agrupada por mes en vez de 36 sueltas
        $porMes = $this->accidentesDelAnio($empresaId, $anio)
            ->selectRaw('
                MONTH(fecha_accidente) as mes,
                SUM(CASE WHEN tipo IN (?, ?, ?) THEN 1 ELSE 0 END) as accidentes,
                SUM(CASE WHEN tipo IN (?, ?) THEN 1 ELSE 0 END) as incidentes,
                SUM(CASE WHEN tipo = ? THEN 1 ELSE 0 END) as mortales,
                COALESCE(SUM(dias_perdidos), 0) as dias_perdidos
            ', [...self::TIPOS_ACCIDENTE, ...self::TIPOS_INCIDENTE, 'accidente_mortal'])
            ->groupBy(DB::raw('MONTH(fecha_accidente)'))
            ->get()
            ->keyBy('mes');

        $serie = [];
        for ($mes = 1; $mes <= 12; $mes++) {
            $fila = $porMes->get($mes);
            $acc  = (int) ($fila->accidentes ?? 0);
            $inc  = (int) ($fila->incidentes ?? 0);
            $dias = (int) ($fila->dias_perdidos ?? 0);
            $hht  = $this->hhtMes($empresaId, $anio, $mes);
            $idx  = $this->indices($acc, $dias, $hht);

            $serie[] = [
                'mes'           => self::MESES[$mes - 1],
                'num_mes'       => $mes,
                'accidentes'    => $acc,
                'incidentes'    => $inc,
                'mortales'      => (int) ($fila->mortales ?? 0),
                'dias_perdidos' => $dias,
                'IF'            => $idx['IF'],
                'IG'            => $idx['IG'],
                'ISAL'          => $idx['ISAL'],
                'hht'           => $hht,
            ];
        }

        $acumulado = $this->accidentesDelAnio($empresaId, $anio)
            ->selectRaw('
                SUM(CASE WHEN tipo IN (?, ?, ?) THEN 1 ELSE 0 END) as total_accidentes,
                SUM(CASE WHEN tipo = ? THEN 1 ELSE 0 END) as mortales,
                SUM(CASE WHEN tipo IN (?, ?) THEN 1 ELSE 0 END) as incidentes,
                COALESCE(SUM(dias_perdidos), 0) as dias_perdidos
            ', [...self::TIPOS_ACCIDENTE, 'accidente_mortal', ...self::TIPOS_INCIDENTE])
            ->first();

        $hhtAnual   = $this->hhtAnual($empresaId, $anio);
        $totalAcc   = (int) ($acumulado->total_accidentes ?? 0);
        $diasTotal  = (int) ($acumulado->dias_perdidos ?? 0);
        $idxAnual   = $this->indices($totalAcc, $diasTotal, $hhtAnual);

        $totalPersonal = DB::table('personal')
            ->where('empresa_id', $empresaId)->whereNull('deleted_at')
            ->where('estado', 'activo')->count();

        return response()->json([
            'anio'    => $anio,
            'serie'   => $serie,
            'resumen' => [
                'total_accidentes' => $totalAcc,
                'mortales'         => (int) ($acumulado->mortales ?? 0),
                'incidentes'       => (int) ($acumulado->incidentes ?? 0),
                'dias_perdidos'    => $diasTotal,
                'IF_anual'         => $idxAnual['IF'],
                'IG_anual'         => $idxAnual['IG'],
                'ISAL_anual'       => $idxAnual['ISAL'],
                'hht_anual'        => $hhtAnual,
                'total_personal'   => $totalPersonal,
            ],
        ]);
    }

    // ─── Inspecciones ───────────────────────────────────────────────────────

    /**
     * GET /api/reportes/inspecciones
     */
    public function inspecciones(Request $request): JsonResponse
    {
        $empresaId = $request->user()->empresa_id;
        $anio      = (int) $request->get('anio', now()->year);

        $agrupado = $this->inspeccionesDelAnio($empresaId, $anio)
            ->selectRaw($this->mesInspeccion() . ' as mes, COUNT(*) as total,
                SUM(CASE WHEN estado IN (\'ejecutada\',\'con_hallazgos\',\'cerrada\') THEN 1 ELSE 0 END) as realizadas,
                SUM(CASE WHEN estado = \'cerrada\' THEN 1 ELSE 0 END) as cerradas')
            ->groupBy(DB::raw($this->mesInspeccion()))
            ->get()
            ->keyBy('mes');

        $porMes = [];
        for ($m = 1; $m <= 12; $m++) {
            $f          = $agrupado->get($m);
            $total      = (int) ($f->total ?? 0);
            $realizadas = (int) ($f->realizadas ?? 0);
            $porMes[] = [
                'mes'          => self::MESES[$m - 1],
                'total'        => $total,
                'realizadas'   => $realizadas,
                'cerradas'     => (int) ($f->cerradas ?? 0),
                'cumplimiento' => $total > 0 ? round(($realizadas / $total) * 100, 1) : 0,
            ];
        }

        $porTipo = $this->inspeccionesDelAnio($empresaId, $anio)
            ->selectRaw('tipo, COUNT(*) as total')
            ->groupBy('tipo')
            ->get();

        $hallazgosPorEstado = DB::table('inspecciones_hallazgos')
            ->join('inspecciones', 'inspecciones.id', '=', 'inspecciones_hallazgos.inspeccion_id')
            ->where('inspecciones.empresa_id', $empresaId)
            ->whereNull('inspecciones.deleted_at')
            ->whereYear('inspecciones_hallazgos.created_at', $anio)
            ->selectRaw('inspecciones_hallazgos.estado, COUNT(*) as total')
            ->groupBy('inspecciones_hallazgos.estado')
            ->get();

        return response()->json([
            'anio'                 => $anio,
            'por_mes'              => $porMes,
            'por_tipo'             => $porTipo,
            'hallazgos_por_estado' => $hallazgosPorEstado,
        ]);
    }

    // ─── Capacitaciones ─────────────────────────────────────────────────────

    /**
     * GET /api/reportes/capacitaciones
     */
    public function capacitaciones(Request $request): JsonResponse
    {
        $empresaId = $request->user()->empresa_id;
        $anio      = (int) $request->get('anio', now()->year);

        $base = fn() => DB::table('capacitaciones')
            ->where('empresa_id', $empresaId)
            ->whereYear('fecha_programada', $anio);

        $agrupado = $base()
            ->selectRaw("
                MONTH(fecha_programada) as mes,
                COUNT(*) as total,
                SUM(CASE WHEN estado = 'ejecutada' THEN 1 ELSE 0 END) as ejecutadas,
                COALESCE(SUM(CASE WHEN estado = 'ejecutada' THEN duracion_horas ELSE 0 END), 0) as horas
            ")
            ->groupBy(DB::raw('MONTH(fecha_programada)'))
            ->get()
            ->keyBy('mes');

        $porMes = [];
        for ($m = 1; $m <= 12; $m++) {
            $f = $agrupado->get($m);
            $porMes[] = [
                'mes'        => self::MESES[$m - 1],
                'total'      => (int) ($f->total ?? 0),
                'ejecutadas' => (int) ($f->ejecutadas ?? 0),
                'horas'      => (int) ($f->horas ?? 0),
            ];
        }

        $porTipo      = $base()->selectRaw('tipo, COUNT(*) as total')->groupBy('tipo')->get();
        $porModalidad = $base()->selectRaw('modalidad, COUNT(*) as total')->groupBy('modalidad')->get();

        $asistenciaPromedio = DB::table('capacitaciones')
            ->join('capacitacion_asistentes', 'capacitaciones.id', '=', 'capacitacion_asistentes.capacitacion_id')
            ->where('capacitaciones.empresa_id', $empresaId)
            ->whereYear('capacitaciones.fecha_programada', $anio)
            ->where('capacitaciones.estado', 'ejecutada')
            ->selectRaw('AVG(CASE WHEN capacitacion_asistentes.asistio THEN 1 ELSE 0 END) * 100 as pct')
            ->value('pct');

        // Horas-hombre de capacitación: horas del curso × asistentes que asistieron
        $hhCapacitacion = (int) DB::table('capacitaciones')
            ->join('capacitacion_asistentes', 'capacitaciones.id', '=', 'capacitacion_asistentes.capacitacion_id')
            ->where('capacitaciones.empresa_id', $empresaId)
            ->whereYear('capacitaciones.fecha_programada', $anio)
            ->where('capacitaciones.estado', 'ejecutada')
            ->where('capacitacion_asistentes.asistio', true)
            ->sum('capacitaciones.duracion_horas');

        return response()->json([
            'anio'                => $anio,
            'por_mes'             => $porMes,
            'por_tipo'            => $porTipo,
            'por_modalidad'       => $porModalidad,
            'asistencia_promedio' => round($asistenciaPromedio ?? 0, 1),
            'horas_hombre_capacitacion' => $hhCapacitacion,
        ]);
    }

    // ─── Salud / EMO ────────────────────────────────────────────────────────

    /**
     * GET /api/reportes/salud
     */
    public function salud(Request $request): JsonResponse
    {
        $empresaId = $request->user()->empresa_id;
        $anio      = (int) $request->get('anio', now()->year);

        $emosMes = DB::table('salud_emo')
            ->where('empresa_id', $empresaId)
            ->whereYear('fecha_examen', $anio)
            ->selectRaw('MONTH(fecha_examen) as mes, COUNT(*) as total')
            ->groupBy(DB::raw('MONTH(fecha_examen)'))
            ->get()->keyBy('mes');

        $atencionesMes = DB::table('salud_atenciones')
            ->where('empresa_id', $empresaId)
            ->whereYear('fecha', $anio)
            ->selectRaw('MONTH(fecha) as mes, COUNT(*) as total,
                SUM(CASE WHEN baja_laboral THEN 1 ELSE 0 END) as bajas')
            ->groupBy(DB::raw('MONTH(fecha)'))
            ->get()->keyBy('mes');

        $porMes = [];
        for ($m = 1; $m <= 12; $m++) {
            $porMes[] = [
                'mes'        => self::MESES[$m - 1],
                'emos'       => (int) ($emosMes->get($m)->total ?? 0),
                'atenciones' => (int) ($atencionesMes->get($m)->total ?? 0),
                'bajas'      => (int) ($atencionesMes->get($m)->bajas ?? 0),
            ];
        }

        // El resto del tab es del año: el desglose por resultado también lo es
        $porResultado = DB::table('salud_emo')
            ->where('empresa_id', $empresaId)
            ->whereYear('fecha_examen', $anio)
            ->selectRaw('resultado, COUNT(*) as total')->groupBy('resultado')->get();

        $porTipo = DB::table('salud_emo')
            ->where('empresa_id', $empresaId)
            ->whereYear('fecha_examen', $anio)
            ->selectRaw('tipo, COUNT(*) as total')->groupBy('tipo')->get();

        $restriccionesActivas = DB::table('salud_restricciones')
            ->where('empresa_id', $empresaId)->where('activa', true)->count();

        return response()->json([
            'anio'                  => $anio,
            'por_mes'               => $porMes,
            'por_resultado'         => $porResultado,
            'por_tipo'              => $porTipo,
            'restricciones_activas' => $restriccionesActivas,
        ]);
    }

    // ─── EPPs ───────────────────────────────────────────────────────────────

    /**
     * GET /api/reportes/epps
     */
    public function epps(Request $request): JsonResponse
    {
        $empresaId = $request->user()->empresa_id;
        $anio      = (int) $request->get('anio', now()->year);

        $entregasMes = DB::table('epps_entregas')
            ->where('empresa_id', $empresaId)
            ->whereYear('fecha_entrega', $anio)
            ->selectRaw('MONTH(fecha_entrega) as mes, COUNT(*) as total')
            ->groupBy(DB::raw('MONTH(fecha_entrega)'))
            ->get()->keyBy('mes');

        $porMes = [];
        for ($m = 1; $m <= 12; $m++) {
            $porMes[] = [
                'mes'      => self::MESES[$m - 1],
                'entregas' => (int) ($entregasMes->get($m)->total ?? 0),
            ];
        }

        $porCategoria = DB::table('epps_inventario')
            ->join('epps_categorias', 'epps_categorias.id', '=', 'epps_inventario.categoria_id')
            ->where('epps_inventario.empresa_id', $empresaId)
            ->where('epps_inventario.activo', true)
            ->selectRaw('epps_categorias.nombre as categoria, COUNT(*) as items, SUM(epps_inventario.stock_disponible) as stock')
            ->groupBy('epps_categorias.id', 'epps_categorias.nombre')
            ->get();

        $stockCritico = DB::table('epps_inventario')
            ->where('empresa_id', $empresaId)->where('activo', true)
            ->whereColumn('stock_disponible', '<=', 'stock_minimo')
            ->count();

        return response()->json([
            'anio'          => $anio,
            'por_mes'       => $porMes,
            'por_categoria' => $porCategoria,
            'stock_critico' => $stockCritico,
        ]);
    }

    // ─── Resumen SUNAFIL ────────────────────────────────────────────────────

    /**
     * GET /api/reportes/sunafil
     * Resumen ejecutivo para inspección SUNAFIL.
     */
    public function sunafil(Request $request): JsonResponse
    {
        $empresaId = $request->user()->empresa_id;
        $anio      = (int) $request->get('anio', now()->year);

        $empresa = DB::table('empresas')->where('id', $empresaId)->first();

        $totalPersonal = DB::table('personal')
            ->where('empresa_id', $empresaId)->whereNull('deleted_at')
            ->where('estado', 'activo')->count();

        $hhtAnual = $this->hhtAnual($empresaId, $anio);

        $acc = $this->accidentesDelAnio($empresaId, $anio)
            ->selectRaw('
                SUM(CASE WHEN tipo IN (?, ?, ?) THEN 1 ELSE 0 END) as accidentes,
                SUM(CASE WHEN tipo = ? THEN 1 ELSE 0 END) as mortales,
                SUM(CASE WHEN tipo = ? THEN 1 ELSE 0 END) as incapacitantes,
                SUM(CASE WHEN tipo = ? THEN 1 ELSE 0 END) as leves,
                SUM(CASE WHEN tipo = ? THEN 1 ELSE 0 END) as incidentes_peligrosos,
                SUM(CASE WHEN tipo = ? THEN 1 ELSE 0 END) as incidentes,
                COALESCE(SUM(dias_perdidos), 0) as dias_perdidos
            ', [
                ...self::TIPOS_ACCIDENTE,
                'accidente_mortal', 'accidente_incapacitante', 'accidente_leve',
                'incidente_peligroso', 'incidente',
            ])
            ->first();

        $accidentes   = (int) ($acc->accidentes ?? 0);
        $diasPerdidos = (int) ($acc->dias_perdidos ?? 0);
        $idx          = $this->indices($accidentes, $diasPerdidos, $hhtAnual);

        $inspTotal = (clone $this->inspeccionesDelAnio($empresaId, $anio))->count();
        $inspReal  = (clone $this->inspeccionesDelAnio($empresaId, $anio))
            ->whereIn('estado', self::INSPECCIONES_REALIZADAS)->count();

        $cap = DB::table('capacitaciones')
            ->where('empresa_id', $empresaId)
            ->whereYear('fecha_programada', $anio)
            ->selectRaw("COUNT(*) as total, SUM(CASE WHEN estado = 'ejecutada' THEN 1 ELSE 0 END) as ejecutadas")
            ->first();

        $sim = DB::table('simulacros')
            ->where('empresa_id', $empresaId)
            ->whereYear('fecha_programada', $anio)
            ->selectRaw("COUNT(*) as total, SUM(CASE WHEN estado = 'ejecutado' THEN 1 ELSE 0 END) as ejecutados")
            ->first();

        $audit = DB::table('auditorias')
            ->where('empresa_id', $empresaId)
            ->whereYear('fecha_programada', $anio)
            ->selectRaw("COUNT(*) as total, SUM(CASE WHEN estado = 'completada' THEN 1 ELSE 0 END) as completadas")
            ->first();

        $hallazgosAbiertos = DB::table('auditoria_hallazgos')
            ->where('empresa_id', $empresaId)
            ->whereIn('estado', ['abierto', 'en_proceso', 'vencido'])
            ->count();

        $emosVenc = DB::table('salud_emo')
            ->where('empresa_id', $empresaId)
            ->whereNotNull('fecha_vencimiento')
            ->whereDate('fecha_vencimiento', '<', now())
            ->count();

        $docVigentes = DB::table('documentos')
            ->where('empresa_id', $empresaId)->where('estado', 'aprobado')->count();

        $formatosVig = DB::table('formatos_registros')
            ->where('empresa_id', $empresaId)
            ->where('periodo_anio', $anio)
            ->where('estado', 'vigente')
            ->count();

        return response()->json([
            'empresa'     => [
                'razon_social'       => $empresa->razon_social ?? '',
                'ruc'                => $empresa->ruc ?? '',
                'direccion'          => $empresa->direccion ?? '',
                'representante_legal' => $empresa->representante_legal ?? '',
                'ciiu'               => $empresa->ciiu ?? '',
            ],
            'anio'        => $anio,
            'generado_en' => now()->toIso8601String(),
            'personal'    => ['total_activo' => $totalPersonal, 'hht_anual' => $hhtAnual],
            'accidentabilidad' => [
                'accidentes_totales'    => $accidentes,
                'mortales'              => (int) ($acc->mortales ?? 0),
                'incapacitantes'        => (int) ($acc->incapacitantes ?? 0),
                'leves'                 => (int) ($acc->leves ?? 0),
                'incidentes_peligrosos' => (int) ($acc->incidentes_peligrosos ?? 0),
                'incidentes'            => (int) ($acc->incidentes ?? 0),
                'dias_perdidos'         => $diasPerdidos,
                'IF'                    => $idx['IF'],
                'IG'                    => $idx['IG'],
                'ISAL'                  => $idx['ISAL'],
            ],
            'gestion' => [
                'inspecciones'          => $inspTotal,
                'inspecciones_ejec'     => $inspReal,
                'capacitaciones_total'  => (int) ($cap->total ?? 0),
                'capacitaciones_ejec'   => (int) ($cap->ejecutadas ?? 0),
                'simulacros'            => (int) ($sim->total ?? 0),
                'simulacros_ejec'       => (int) ($sim->ejecutados ?? 0),
                'auditorias'            => (int) ($audit->total ?? 0),
                'auditorias_completadas' => (int) ($audit->completadas ?? 0),
                'hallazgos_abiertos'    => $hallazgosAbiertos,
                'emos_vencidos'         => $emosVenc,
                'documentos_vigentes'   => $docVigentes,
                'formatos_vigentes'     => $formatosVig,
            ],
        ]);
    }

    // ─── Registro 08 · Auditorías ───────────────────────────────────────────

    /**
     * GET /api/reportes/auditorias
     * RM 050-2013-TR, Registro 08.
     */
    public function auditorias(Request $request): JsonResponse
    {
        $empresaId = $request->user()->empresa_id;
        $anio      = (int) $request->get('anio', now()->year);

        $base = fn() => DB::table('auditorias')
            ->where('empresa_id', $empresaId)
            ->whereYear('fecha_programada', $anio);

        $agrupado = $base()
            ->selectRaw("
                MONTH(fecha_programada) as mes,
                COUNT(*) as total,
                SUM(CASE WHEN estado = 'completada' THEN 1 ELSE 0 END) as completadas
            ")
            ->groupBy(DB::raw('MONTH(fecha_programada)'))
            ->get()->keyBy('mes');

        $porMes = [];
        for ($m = 1; $m <= 12; $m++) {
            $f = $agrupado->get($m);
            $porMes[] = [
                'mes'         => self::MESES[$m - 1],
                'total'       => (int) ($f->total ?? 0),
                'completadas' => (int) ($f->completadas ?? 0),
            ];
        }

        $porTipo   = $base()->selectRaw('tipo, COUNT(*) as total')->groupBy('tipo')->get();
        $porEstado = $base()->selectRaw('estado, COUNT(*) as total')->groupBy('estado')->get();

        // Los hallazgos se acotan a las auditorías del año
        $hallazgos = fn() => DB::table('auditoria_hallazgos')
            ->join('auditorias', 'auditorias.id', '=', 'auditoria_hallazgos.auditoria_id')
            ->where('auditoria_hallazgos.empresa_id', $empresaId)
            ->whereYear('auditorias.fecha_programada', $anio);

        $hallazgosPorTipo = $hallazgos()
            ->selectRaw('auditoria_hallazgos.tipo_hallazgo as tipo, COUNT(*) as total')
            ->groupBy('auditoria_hallazgos.tipo_hallazgo')->get();

        $hallazgosPorEstado = $hallazgos()
            ->selectRaw('auditoria_hallazgos.estado, COUNT(*) as total')
            ->groupBy('auditoria_hallazgos.estado')->get();

        $hallazgosVencidos = $hallazgos()
            ->whereNotIn('auditoria_hallazgos.estado', ['cerrado'])
            ->whereNotNull('auditoria_hallazgos.fecha_limite')
            ->whereDate('auditoria_hallazgos.fecha_limite', '<', now())
            ->count();

        $totalHallazgos = $hallazgos()->count();
        $cerrados       = $hallazgos()->where('auditoria_hallazgos.estado', 'cerrado')->count();

        return response()->json([
            'anio'                 => $anio,
            'por_mes'              => $porMes,
            'por_tipo'             => $porTipo,
            'por_estado'           => $porEstado,
            'hallazgos_por_tipo'   => $hallazgosPorTipo,
            'hallazgos_por_estado' => $hallazgosPorEstado,
            'resumen'              => [
                'total'              => $base()->count(),
                'completadas'        => $base()->where('estado', 'completada')->count(),
                'hallazgos_total'    => $totalHallazgos,
                'hallazgos_cerrados' => $cerrados,
                'hallazgos_vencidos' => $hallazgosVencidos,
                'cierre_pct'         => $totalHallazgos > 0 ? round(($cerrados / $totalHallazgos) * 100, 1) : 0,
            ],
        ]);
    }

    // ─── Registro 09 · Simulacros de emergencia ─────────────────────────────

    /**
     * GET /api/reportes/simulacros
     * RM 050-2013-TR, Registro 09 (parte de simulacros).
     */
    public function simulacros(Request $request): JsonResponse
    {
        $empresaId = $request->user()->empresa_id;
        $anio      = (int) $request->get('anio', now()->year);

        $base = fn() => DB::table('simulacros')
            ->where('empresa_id', $empresaId)
            ->whereYear('fecha_programada', $anio);

        $agrupado = $base()
            ->selectRaw("
                MONTH(fecha_programada) as mes,
                COUNT(*) as total,
                SUM(CASE WHEN estado = 'ejecutado' THEN 1 ELSE 0 END) as ejecutados,
                COALESCE(SUM(CASE WHEN estado = 'ejecutado' THEN personas_evacuadas ELSE 0 END), 0) as evacuadas
            ")
            ->groupBy(DB::raw('MONTH(fecha_programada)'))
            ->get()->keyBy('mes');

        $porMes = [];
        for ($m = 1; $m <= 12; $m++) {
            $f = $agrupado->get($m);
            $porMes[] = [
                'mes'        => self::MESES[$m - 1],
                'total'      => (int) ($f->total ?? 0),
                'ejecutados' => (int) ($f->ejecutados ?? 0),
                'evacuadas'  => (int) ($f->evacuadas ?? 0),
            ];
        }

        $porTipo = $base()->selectRaw('tipo, COUNT(*) as total')->groupBy('tipo')->get();

        $ejecutados = $base()->where('estado', 'ejecutado');
        $resumenEjec = $base()->where('estado', 'ejecutado')
            ->selectRaw('
                COUNT(*) as total,
                AVG(tiempo_respuesta_min) as tiempo_promedio,
                COALESCE(SUM(personas_evacuadas), 0) as evacuadas
            ')->first();

        // Asistencia de participantes en los simulacros ejecutados del año
        $participantes = DB::table('simulacro_participantes')
            ->join('simulacros', 'simulacros.id', '=', 'simulacro_participantes.simulacro_id')
            ->where('simulacros.empresa_id', $empresaId)
            ->whereYear('simulacros.fecha_programada', $anio)
            ->where('simulacros.estado', 'ejecutado')
            ->selectRaw('COUNT(*) as convocados, SUM(CASE WHEN simulacro_participantes.asistio THEN 1 ELSE 0 END) as asistentes')
            ->first();

        $convocados = (int) ($participantes->convocados ?? 0);
        $asistentes = (int) ($participantes->asistentes ?? 0);

        return response()->json([
            'anio'     => $anio,
            'por_mes'  => $porMes,
            'por_tipo' => $porTipo,
            'resumen'  => [
                'total'               => $base()->count(),
                'ejecutados'          => (int) ($resumenEjec->total ?? 0),
                'personas_evacuadas'  => (int) ($resumenEjec->evacuadas ?? 0),
                'tiempo_respuesta_min' => round((float) ($resumenEjec->tiempo_promedio ?? 0), 1),
                'convocados'          => $convocados,
                'asistentes'          => $asistentes,
                'asistencia_pct'      => $convocados > 0 ? round(($asistentes / $convocados) * 100, 1) : 0,
            ],
        ]);
    }

    // ─── Registro 07 · Equipos de atención de emergencias ───────────────────

    /**
     * GET /api/reportes/equipos-emergencia
     * RM 050-2013-TR, Registro 07. Sale del catálogo marcado con
     * categoria_emergencia (contra incendio, primeros auxilios, evacuación,
     * comunicaciones); el resto del inventario de equipos no aplica.
     */
    public function equiposEmergencia(Request $request): JsonResponse
    {
        $empresaId = $request->user()->empresa_id;

        $base = fn() => DB::table('equipos')
            ->join('equipos_catalogo', 'equipos_catalogo.id', '=', 'equipos.equipo_catalogo_id')
            ->where('equipos.empresa_id', $empresaId)
            ->whereNull('equipos.deleted_at')
            ->whereNotNull('equipos_catalogo.categoria_emergencia');

        $porCategoria = $base()
            ->selectRaw("
                equipos_catalogo.categoria_emergencia as categoria,
                COUNT(*) as total,
                SUM(CASE WHEN equipos.estado = 'operativo' THEN 1 ELSE 0 END) as operativos,
                SUM(CASE WHEN equipos.estado = 'mantenimiento' THEN 1 ELSE 0 END) as en_mantenimiento,
                SUM(CASE WHEN equipos.estado IN ('baja','inactivo') THEN 1 ELSE 0 END) as fuera_servicio
            ")
            ->groupBy('equipos_catalogo.categoria_emergencia')
            ->get();

        $porEstado = $base()
            ->selectRaw('equipos.estado, COUNT(*) as total')
            ->groupBy('equipos.estado')
            ->get();

        $revisionVencida = $base()
            ->whereNotNull('equipos.fecha_proxima_revision')
            ->whereDate('equipos.fecha_proxima_revision', '<', now())
            ->count();

        $revisionProxima = $base()
            ->whereNotNull('equipos.fecha_proxima_revision')
            ->whereBetween('equipos.fecha_proxima_revision', [now(), now()->addDays(30)])
            ->count();

        $total      = $base()->count();
        $operativos = $base()->where('equipos.estado', 'operativo')->count();

        // Detalle para el registro: es lo que se entrega en una inspección
        $detalle = $base()
            ->leftJoin('areas', 'areas.id', '=', 'equipos.area_id')
            ->selectRaw('
                equipos.codigo, equipos.nombre, equipos.ubicacion, equipos.estado,
                equipos_catalogo.categoria_emergencia as categoria,
                equipos.fecha_proxima_revision, areas.nombre as area
            ')
            ->orderBy('equipos_catalogo.categoria_emergencia')
            ->orderBy('equipos.codigo')
            ->limit(500)
            ->get();

        return response()->json([
            'por_categoria' => $porCategoria,
            'por_estado'    => $porEstado,
            'detalle'       => $detalle,
            'resumen'       => [
                'total'              => $total,
                'operativos'         => $operativos,
                'operatividad_pct'   => $total > 0 ? round(($operativos / $total) * 100, 1) : 0,
                'revision_vencida'   => $revisionVencida,
                'revision_proxima'   => $revisionProxima,
            ],
        ]);
    }
}
