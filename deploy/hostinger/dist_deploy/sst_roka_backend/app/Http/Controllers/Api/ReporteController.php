<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class ReporteController extends Controller
{
    // ─── Consolidado ejecutivo ──────────────────────────────────────────────

    /**
     * GET /api/reportes/consolidado
     * Dashboard estratégico: KPIs de todos los módulos para el año dado.
     */
    public function consolidado(Request $request): JsonResponse
    {
        $empresaId = $request->user()->empresa_id;
        $anio      = (int) $request->get('anio', now()->year);

        // Personal
        $totalPersonal = DB::table('personal')
            ->where('empresa_id', $empresaId)
            ->where('estado', 'activo')
            ->count();

        $hht = $totalPersonal * 8 * 22 * 12; // horas-hombre año completo

        // Accidentabilidad
        $accidentes = DB::table('accidentes')
            ->where('empresa_id', $empresaId)
            ->whereYear('fecha_accidente', $anio)
            ->whereIn('tipo', ['leve', 'incapacitante', 'mortal'])
            ->count();

        $mortales = DB::table('accidentes')
            ->where('empresa_id', $empresaId)
            ->whereYear('fecha_accidente', $anio)
            ->where('tipo', 'mortal')
            ->count();

        $diasPerdidos = (int) DB::table('accidentes')
            ->where('empresa_id', $empresaId)
            ->whereYear('fecha_accidente', $anio)
            ->sum('dias_perdidos');

        $if_   = $hht > 0 ? round(($accidentes * 1000000) / $hht, 2) : 0;
        $ig_   = $hht > 0 ? round(($diasPerdidos * 1000000) / $hht, 2) : 0;
        $isal  = $if_ > 0 ? round($ig_ / $if_, 2) : 0;

        $ultimoAccidente = DB::table('accidentes')
            ->where('empresa_id', $empresaId)
            ->whereIn('tipo', ['leve', 'incapacitante', 'mortal'])
            ->orderByDesc('fecha_accidente')
            ->value('fecha_accidente');
        $diasSinAccidentes = $ultimoAccidente
            ? now()->parse($ultimoAccidente)->diffInDays(now())
            : now()->startOfYear()->diffInDays(now());

        // Inspecciones
        $inspTotal    = DB::table('inspecciones')->where('empresa_id', $empresaId)->whereYear('created_at', $anio)->count();
        $inspCerradas = DB::table('inspecciones')->where('empresa_id', $empresaId)->whereYear('created_at', $anio)->where('estado', 'cerrada')->count();
        $inspHallazgos = DB::table('inspecciones_hallazgos')
            ->join('inspecciones', 'inspecciones.id', '=', 'inspecciones_hallazgos.inspeccion_id')
            ->where('inspecciones.empresa_id', $empresaId)
            ->whereYear('inspecciones_hallazgos.created_at', $anio)
            ->count();

        // Capacitaciones
        $capTotal = DB::table('capacitaciones')
            ->where('empresa_id', $empresaId)
            ->whereYear('fecha_inicio', $anio)
            ->count();
        $capEjecutadas = DB::table('capacitaciones')
            ->where('empresa_id', $empresaId)
            ->whereYear('fecha_inicio', $anio)
            ->where('estado', 'ejecutada')
            ->count();
        $horasCap = (int) DB::table('capacitaciones')
            ->where('empresa_id', $empresaId)
            ->whereYear('fecha_inicio', $anio)
            ->where('estado', 'ejecutada')
            ->sum('duracion_horas');

        // EMO / Salud
        $emosVencidos = DB::table('salud_emo')
            ->where('empresa_id', $empresaId)
            ->whereNotNull('fecha_vencimiento')
            ->where('fecha_vencimiento', '<', now())
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
        $auditTotal = DB::table('auditorias_internas')
            ->where('empresa_id', $empresaId)
            ->whereYear('fecha_inicio', $anio)
            ->count();
        $hallazgosAbiertos = DB::table('auditoria_hallazgos')
            ->join('auditorias_internas', 'auditorias_internas.id', '=', 'auditoria_hallazgos.auditoria_id')
            ->where('auditorias_internas.empresa_id', $empresaId)
            ->whereIn('auditoria_hallazgos.estado', ['abierto', 'en_proceso'])
            ->count();

        return response()->json([
            'anio'               => $anio,
            'total_personal'     => $totalPersonal,
            'horas_hombre_total' => $hht,
            'accidentabilidad'   => [
                'accidentes'        => $accidentes,
                'mortales'          => $mortales,
                'dias_perdidos'     => $diasPerdidos,
                'indice_frecuencia' => $if_,
                'indice_gravedad'   => $ig_,
                'indice_accidentabilidad' => $isal,
                'dias_sin_accidentes' => $diasSinAccidentes,
            ],
            'inspecciones'       => [
                'total'      => $inspTotal,
                'cerradas'   => $inspCerradas,
                'hallazgos'  => $inspHallazgos,
                'cumplimiento_pct' => $inspTotal > 0 ? round(($inspCerradas / $inspTotal) * 100, 1) : 0,
            ],
            'capacitaciones'     => [
                'total'      => $capTotal,
                'ejecutadas' => $capEjecutadas,
                'horas'      => $horasCap,
                'cumplimiento_pct' => $capTotal > 0 ? round(($capEjecutadas / $capTotal) * 100, 1) : 0,
            ],
            'salud'              => [
                'emos_vencidos' => $emosVencidos,
                'emos_proximos' => $emosProximos,
            ],
            'epps'               => [
                'stock_critico'  => $stockCritico,
                'entregas_mes'   => $entregasMes,
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
     * Serie mensual de IF, IG, ISAL — base para gráficos y reporte MINTRA.
     */
    public function accidentabilidad(Request $request): JsonResponse
    {
        $empresaId = $request->user()->empresa_id;
        $anio      = (int) $request->get('anio', now()->year);

        $totalPersonal = DB::table('personal')
            ->where('empresa_id', $empresaId)
            ->where('estado', 'activo')
            ->count();

        $meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Set','Oct','Nov','Dic'];
        $serie = [];

        for ($mes = 1; $mes <= 12; $mes++) {
            $hht = $totalPersonal * 8 * 22; // mensual

            $acc = DB::table('accidentes')
                ->where('empresa_id', $empresaId)
                ->whereYear('fecha_accidente', $anio)
                ->whereMonth('fecha_accidente', $mes)
                ->whereIn('tipo', ['leve', 'incapacitante', 'mortal'])
                ->count();

            $inc = DB::table('accidentes')
                ->where('empresa_id', $empresaId)
                ->whereYear('fecha_accidente', $anio)
                ->whereMonth('fecha_accidente', $mes)
                ->whereIn('tipo', ['incidente', 'incidente_peligroso'])
                ->count();

            $dias = (int) DB::table('accidentes')
                ->where('empresa_id', $empresaId)
                ->whereYear('fecha_accidente', $anio)
                ->whereMonth('fecha_accidente', $mes)
                ->sum('dias_perdidos');

            $if_ = $hht > 0 ? round(($acc * 1000000) / $hht, 2) : 0;
            $ig_ = $hht > 0 ? round(($dias * 1000000) / $hht, 2) : 0;
            $isal = $if_ > 0 ? round($ig_ / $if_, 2) : 0;

            $serie[] = [
                'mes'          => $meses[$mes - 1],
                'num_mes'      => $mes,
                'accidentes'   => $acc,
                'incidentes'   => $inc,
                'dias_perdidos' => $dias,
                'IF'           => $if_,
                'IG'           => $ig_,
                'ISAL'         => $isal,
                'hht'          => $hht,
            ];
        }

        // Acumulados anuales
        $acumulado = DB::table('accidentes')
            ->where('empresa_id', $empresaId)
            ->whereYear('fecha_accidente', $anio)
            ->selectRaw("
                SUM(CASE WHEN tipo IN ('leve','incapacitante','mortal') THEN 1 ELSE 0 END) as total_accidentes,
                SUM(CASE WHEN tipo = 'mortal' THEN 1 ELSE 0 END) as mortales,
                SUM(CASE WHEN tipo IN ('incidente','incidente_peligroso') THEN 1 ELSE 0 END) as incidentes,
                COALESCE(SUM(dias_perdidos), 0) as dias_perdidos
            ")->first();

        $hhtAnual = $totalPersonal * 8 * 22 * 12;
        $ifAnual  = $hhtAnual > 0 ? round(($acumulado->total_accidentes * 1000000) / $hhtAnual, 2) : 0;
        $igAnual  = $hhtAnual > 0 ? round(($acumulado->dias_perdidos * 1000000) / $hhtAnual, 2) : 0;

        return response()->json([
            'anio'    => $anio,
            'serie'   => $serie,
            'resumen' => [
                'total_accidentes'  => $acumulado->total_accidentes ?? 0,
                'mortales'          => $acumulado->mortales ?? 0,
                'incidentes'        => $acumulado->incidentes ?? 0,
                'dias_perdidos'     => $acumulado->dias_perdidos ?? 0,
                'IF_anual'          => $ifAnual,
                'IG_anual'          => $igAnual,
                'ISAL_anual'        => $ifAnual > 0 ? round($igAnual / $ifAnual, 2) : 0,
                'hht_anual'         => $hhtAnual,
                'total_personal'    => $totalPersonal,
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
        $meses     = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Set','Oct','Nov','Dic'];

        $porMes = [];
        for ($m = 1; $m <= 12; $m++) {
            $total    = DB::table('inspecciones')->where('empresa_id', $empresaId)->whereYear('created_at', $anio)->whereMonth('created_at', $m)->count();
            $cerradas = DB::table('inspecciones')->where('empresa_id', $empresaId)->whereYear('created_at', $anio)->whereMonth('created_at', $m)->where('estado', 'cerrada')->count();
            $porMes[] = ['mes' => $meses[$m-1], 'total' => $total, 'cerradas' => $cerradas, 'cumplimiento' => $total > 0 ? round(($cerradas/$total)*100,1) : 0];
        }

        $porTipo = DB::table('inspecciones')
            ->where('empresa_id', $empresaId)
            ->whereYear('created_at', $anio)
            ->selectRaw('tipo, COUNT(*) as total')
            ->groupBy('tipo')
            ->get();

        $hallazgosPorEstado = DB::table('inspecciones_hallazgos')
            ->join('inspecciones', 'inspecciones.id', '=', 'inspecciones_hallazgos.inspeccion_id')
            ->where('inspecciones.empresa_id', $empresaId)
            ->selectRaw('inspecciones_hallazgos.estado, COUNT(*) as total')
            ->groupBy('inspecciones_hallazgos.estado')
            ->get();

        return response()->json([
            'anio'                => $anio,
            'por_mes'             => $porMes,
            'por_tipo'            => $porTipo,
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
        $meses     = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Set','Oct','Nov','Dic'];

        $porMes = [];
        for ($m = 1; $m <= 12; $m++) {
            $total = DB::table('capacitaciones')->where('empresa_id', $empresaId)->whereYear('fecha_inicio', $anio)->whereMonth('fecha_inicio', $m)->count();
            $exec  = DB::table('capacitaciones')->where('empresa_id', $empresaId)->whereYear('fecha_inicio', $anio)->whereMonth('fecha_inicio', $m)->where('estado', 'ejecutada')->count();
            $horas = (int) DB::table('capacitaciones')->where('empresa_id', $empresaId)->whereYear('fecha_inicio', $anio)->whereMonth('fecha_inicio', $m)->where('estado', 'ejecutada')->sum('duracion_horas');
            $porMes[] = ['mes' => $meses[$m-1], 'total' => $total, 'ejecutadas' => $exec, 'horas' => $horas];
        }

        $porTipo = DB::table('capacitaciones')
            ->where('empresa_id', $empresaId)->whereYear('fecha_inicio', $anio)
            ->selectRaw('tipo, COUNT(*) as total')->groupBy('tipo')->get();

        $porModalidad = DB::table('capacitaciones')
            ->where('empresa_id', $empresaId)->whereYear('fecha_inicio', $anio)
            ->selectRaw('modalidad, COUNT(*) as total')->groupBy('modalidad')->get();

        $asistenciaPromedio = DB::table('capacitaciones')
            ->join('capacitaciones_asistentes', 'capacitaciones.id', '=', 'capacitaciones_asistentes.capacitacion_id')
            ->where('capacitaciones.empresa_id', $empresaId)
            ->whereYear('capacitaciones.fecha_inicio', $anio)
            ->where('capacitaciones.estado', 'ejecutada')
            ->selectRaw('AVG(CASE WHEN capacitaciones_asistentes.asistio THEN 1 ELSE 0 END) * 100 as pct')
            ->value('pct');

        return response()->json([
            'anio'               => $anio,
            'por_mes'            => $porMes,
            'por_tipo'           => $porTipo,
            'por_modalidad'      => $porModalidad,
            'asistencia_promedio' => round($asistenciaPromedio ?? 0, 1),
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
        $meses     = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Set','Oct','Nov','Dic'];

        $porMes = [];
        for ($m = 1; $m <= 12; $m++) {
            $emos      = DB::table('salud_emo')->where('empresa_id', $empresaId)->whereYear('fecha_examen', $anio)->whereMonth('fecha_examen', $m)->count();
            $atenciones = DB::table('salud_atenciones')->where('empresa_id', $empresaId)->whereYear('fecha', $anio)->whereMonth('fecha', $m)->count();
            $bajas      = DB::table('salud_atenciones')->where('empresa_id', $empresaId)->whereYear('fecha', $anio)->whereMonth('fecha', $m)->where('baja_laboral', true)->count();
            $porMes[] = ['mes' => $meses[$m-1], 'emos' => $emos, 'atenciones' => $atenciones, 'bajas' => $bajas];
        }

        $porResultado = DB::table('salud_emo')
            ->where('empresa_id', $empresaId)
            ->selectRaw('resultado, COUNT(*) as total')->groupBy('resultado')->get();

        $porTipo = DB::table('salud_emo')
            ->where('empresa_id', $empresaId)->whereYear('fecha_examen', $anio)
            ->selectRaw('tipo, COUNT(*) as total')->groupBy('tipo')->get();

        $restriccionesActivas = DB::table('salud_restricciones')
            ->where('empresa_id', $empresaId)->where('activa', true)->count();

        return response()->json([
            'anio'                 => $anio,
            'por_mes'              => $porMes,
            'por_resultado'        => $porResultado,
            'por_tipo'             => $porTipo,
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
        $meses     = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Set','Oct','Nov','Dic'];

        $porMes = [];
        for ($m = 1; $m <= 12; $m++) {
            $entregas = DB::table('epps_entregas')->where('empresa_id', $empresaId)->whereYear('fecha_entrega', $anio)->whereMonth('fecha_entrega', $m)->count();
            $porMes[] = ['mes' => $meses[$m-1], 'entregas' => $entregas];
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

        $totalPersonal = DB::table('personal')->where('empresa_id', $empresaId)->where('estado', 'activo')->count();
        $hhtAnual = $totalPersonal * 8 * 22 * 12;

        $accidentes  = DB::table('accidentes')->where('empresa_id', $empresaId)->whereYear('fecha_accidente', $anio)->whereIn('tipo', ['leve','incapacitante','mortal'])->count();
        $mortales    = DB::table('accidentes')->where('empresa_id', $empresaId)->whereYear('fecha_accidente', $anio)->where('tipo', 'mortal')->count();
        $incapac     = DB::table('accidentes')->where('empresa_id', $empresaId)->whereYear('fecha_accidente', $anio)->where('tipo', 'incapacitante')->count();
        $leves       = DB::table('accidentes')->where('empresa_id', $empresaId)->whereYear('fecha_accidente', $anio)->where('tipo', 'leve')->count();
        $incidentes  = DB::table('accidentes')->where('empresa_id', $empresaId)->whereYear('fecha_accidente', $anio)->whereIn('tipo', ['incidente','incidente_peligroso'])->count();
        $diasPerdidos = (int) DB::table('accidentes')->where('empresa_id', $empresaId)->whereYear('fecha_accidente', $anio)->sum('dias_perdidos');

        $if_  = $hhtAnual > 0 ? round(($accidentes * 1000000) / $hhtAnual, 2) : 0;
        $ig_  = $hhtAnual > 0 ? round(($diasPerdidos * 1000000) / $hhtAnual, 2) : 0;
        $isal = $if_ > 0 ? round($ig_ / $if_, 2) : 0;

        $inspTotal   = DB::table('inspecciones')->where('empresa_id', $empresaId)->whereYear('created_at', $anio)->count();
        $capTotal    = DB::table('capacitaciones')->where('empresa_id', $empresaId)->whereYear('fecha_inicio', $anio)->count();
        $capEjec     = DB::table('capacitaciones')->where('empresa_id', $empresaId)->whereYear('fecha_inicio', $anio)->where('estado', 'ejecutada')->count();
        $simTotal    = DB::table('simulacros')->where('empresa_id', $empresaId)->whereYear('fecha_programada', $anio)->count();
        $auditTotal  = DB::table('auditorias_internas')->where('empresa_id', $empresaId)->whereYear('fecha_inicio', $anio)->count();
        $emosVenc    = DB::table('salud_emo')->where('empresa_id', $empresaId)->whereNotNull('fecha_vencimiento')->where('fecha_vencimiento', '<', now())->count();
        $docVigentes = DB::table('documentos')->where('empresa_id', $empresaId)->where('estado', 'aprobado')->count();
        $formatosVig = DB::table('formatos_registros')->where('empresa_id', $empresaId)->whereYear('created_at', $anio)->where('estado', 'vigente')->count();

        return response()->json([
            'empresa'    => ['razon_social' => $empresa->razon_social ?? '', 'ruc' => $empresa->ruc ?? ''],
            'anio'       => $anio,
            'generado_en' => now()->toIso8601String(),
            'personal'   => ['total_activo' => $totalPersonal, 'hht_anual' => $hhtAnual],
            'accidentabilidad' => [
                'accidentes_totales' => $accidentes,
                'mortales'    => $mortales,
                'incapacitantes' => $incapac,
                'leves'       => $leves,
                'incidentes'  => $incidentes,
                'dias_perdidos' => $diasPerdidos,
                'IF'  => $if_,
                'IG'  => $ig_,
                'ISAL' => $isal,
            ],
            'gestion' => [
                'inspecciones'         => $inspTotal,
                'capacitaciones_total' => $capTotal,
                'capacitaciones_ejec'  => $capEjec,
                'simulacros'           => $simTotal,
                'auditorias'           => $auditTotal,
                'emos_vencidos'        => $emosVenc,
                'documentos_vigentes'  => $docVigentes,
                'formatos_vigentes'    => $formatosVig,
            ],
        ]);
    }
}
