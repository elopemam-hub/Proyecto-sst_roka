<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Personal;
use App\Models\Empresa;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

class DashboardController extends Controller
{
    /**
     * KPIs principales del dashboard
     * GET /api/dashboard/kpis
     */
    public function kpis(Request $request): JsonResponse
    {
        $empresaId = $request->user()->empresa_id;
        $anio      = $request->get('anio', now()->year);
        $mesActual = now()->month;

        // Cache por 5 minutos para no sobrecargar la BD
        $kpis = Cache::remember("kpis_{$empresaId}_{$anio}", 300, function () use ($empresaId, $anio, $mesActual) {

            // Total personal activo
            $totalPersonal = Personal::where('empresa_id', $empresaId)
                ->where('estado', 'activo')
                ->count();

            // Horas trabajadas (horas-hombre) — estimación por días hábiles del año
            $horasHombre = $totalPersonal * 8 * 22 * $mesActual;

            // Accidentes del año (se llena cuando exista el módulo de accidentes)
            $accidentes = DB::table('accidentes')
                ->where('empresa_id', $empresaId)
                ->whereYear('fecha_accidente', $anio)
                ->whereIn('tipo', ['leve', 'incapacitante', 'mortal'])
                ->count();

            // Días perdidos por accidentes
            $diasPerdidos = DB::table('accidentes')
                ->where('empresa_id', $empresaId)
                ->whereYear('fecha_accidente', $anio)
                ->sum('dias_perdidos') ?? 0;

            // Índice de Frecuencia (IF) = (N° accidentes × 1,000,000) / Horas-Hombre
            $indiceFrecuencia = $horasHombre > 0
                ? round(($accidentes * 1000000) / $horasHombre, 2)
                : 0;

            // Índice de Severidad (IS) = (Días perdidos × 1,000,000) / Horas-Hombre
            $indiceSeveridad = $horasHombre > 0
                ? round(($diasPerdidos * 1000000) / $horasHombre, 2)
                : 0;

            // % Cumplimiento Programa SST
            $cumplimientoPrograma = $this->calcularCumplimientoPrograma($empresaId, $anio);

            // EPPs — % entregados vs requeridos
            $eppsStats = $this->calcularEstadisticasEpps($empresaId);

            // Inspecciones pendientes y vencidas
            $inspeccionesPendientes = DB::table('inspecciones')
                ->where('empresa_id', $empresaId)
                ->where('estado', 'pendiente')
                ->count();

            $inspeccionesVencidas = DB::table('inspecciones')
                ->where('empresa_id', $empresaId)
                ->where('estado', 'pendiente')
                ->where('fecha_programada', '<', now()->toDateString())
                ->count();

            // Capacitaciones al día
            $capacitacionesStats = $this->calcularCapacitaciones($empresaId, $anio);

            // EMOs próximos a vencer (30 días)
            $emosProximos = 0; // Se completará en módulo de salud

            return [
                // Indicadores de accidentabilidad
                'accidentes_anio'       => $accidentes,
                'dias_perdidos'         => $diasPerdidos,
                'indice_frecuencia'     => $indiceFrecuencia,
                'indice_severidad'      => $indiceSeveridad,
                'horas_hombre'          => $horasHombre,

                // Personal
                'total_personal'        => $totalPersonal,

                // Programa SST
                'cumplimiento_programa' => $cumplimientoPrograma,

                // EPPs
                'epps_porcentaje'       => $eppsStats['porcentaje'],
                'epps_stock_critico'    => $eppsStats['stock_critico'],

                // Inspecciones
                'inspecciones_pendientes' => $inspeccionesPendientes,
                'inspecciones_vencidas'   => $inspeccionesVencidas,

                // Capacitaciones
                'capacitaciones_al_dia'   => $capacitacionesStats['al_dia'],
                'capacitaciones_pendientes' => $capacitacionesStats['pendientes'],

                // EMOs
                'emos_proximos_vencer'  => $emosProximos,

                // Días sin accidentes
                'dias_sin_accidentes'   => $this->calcularDiasSinAccidentes($empresaId),

                'actualizado_en'        => now()->toIso8601String(),
            ];
        });

        return response()->json($kpis);
    }

    /**
     * Gráfico de accidentabilidad por mes
     * GET /api/dashboard/accidentabilidad
     */
    public function accidentabilidad(Request $request): JsonResponse
    {
        $empresaId = $request->user()->empresa_id;
        $anio      = $request->get('anio', now()->year);

        $datos = [];
        $meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Set','Oct','Nov','Dic'];

        for ($mes = 1; $mes <= 12; $mes++) {
            $datos[] = [
                'mes'         => $meses[$mes - 1],
                'accidentes'  => 0, // Se llenará con datos reales
                'incidentes'  => 0,
                'dias_perdidos' => 0,
            ];
        }

        return response()->json(['anio' => $anio, 'datos' => $datos]);
    }

    /**
     * Resumen por área
     * GET /api/dashboard/por-area
     */
    public function porArea(Request $request): JsonResponse
    {
        $empresaId = $request->user()->empresa_id;

        $areas = DB::table('areas')
            ->join('sedes', 'areas.sede_id', '=', 'sedes.id')
            ->where('sedes.empresa_id', $empresaId)
            ->where('areas.activa', true)
            ->select('areas.id', 'areas.nombre', 'areas.tipo')
            ->get()
            ->map(function ($area) {
                return [
                    'id'                    => $area->id,
                    'nombre'                => $area->nombre,
                    'tipo'                  => $area->tipo,
                    'personal_activo'       => Personal::where('area_id', $area->id)->where('estado', 'activo')->count(),
                    'inspecciones_pendientes' => 0,
                    'accidentes_mes'        => 0,
                    'cumplimiento'          => 100,
                ];
            });

        return response()->json($areas);
    }

    // --- Métodos privados de cálculo ---

    private function calcularCumplimientoPrograma(int $empresaId, int $anio): float
    {
        $programa = DB::table('programa_sst')
            ->where('empresa_id', $empresaId)
            ->where('anio', $anio)
            ->first();

        if (!$programa) return 0;

        $total      = DB::table('programa_sst_actividades')->where('programa_id', $programa->id)->count();
        $completadas = DB::table('programa_sst_actividades')
            ->where('programa_id', $programa->id)
            ->where('estado', 'completado')
            ->count();

        return $total > 0 ? round(($completadas / $total) * 100, 1) : 0;
    }

    private function calcularEstadisticasEpps(int $empresaId): array
    {
        $stockCritico = DB::table('epps_inventario')
            ->where('empresa_id', $empresaId)
            ->whereColumn('stock_actual', '<=', 'stock_minimo')
            ->count();

        return [
            'porcentaje'   => 85, // Valor base hasta tener entregas registradas
            'stock_critico' => $stockCritico,
        ];
    }

    private function calcularCapacitaciones(int $empresaId, int $anio): array
    {
        return ['al_dia' => 0, 'pendientes' => 0];
    }

    private function calcularDiasSinAccidentes(int $empresaId): int
    {
        $ultimoAccidente = DB::table('accidentes')
            ->where('empresa_id', $empresaId)
            ->whereIn('tipo', ['leve', 'incapacitante', 'mortal'])
            ->orderByDesc('fecha_accidente')
            ->value('fecha_accidente');

        if (!$ultimoAccidente) {
            // Sin accidentes registrados — retornar días desde inicio del año
            return now()->startOfYear()->diffInDays(now());
        }

        return now()->parse($ultimoAccidente)->diffInDays(now());
    }
}
