<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use App\Models\EquipoCatalogo;
use App\Models\Equipo;

class ExtintorController extends Controller
{
    public function dashboard(Request $request): JsonResponse
    {
        $eid = $request->user()->empresa_id;
        $año = (int) $request->input('año', now()->year);

        // Localizar catálogo "Extintor" (búsqueda flexible por nombre)
        $catalogo = EquipoCatalogo::whereRaw('LOWER(nombre) LIKE ?', ['%extintor%'])->first();

        if (!$catalogo) {
            return response()->json(['error' => 'Catálogo Extintor no encontrado en el sistema'], 404);
        }
        $catId     = $catalogo->id;
        $estadosOk = ['ejecutada', 'cerrada', 'con_hallazgos'];

        // ── Unidades individuales ─────────────────────────────────────────────
        $equipos = Equipo::where('empresa_id', $eid)
            ->where('equipo_catalogo_id', $catId)
            ->with('area')
            ->orderBy('codigo')
            ->get();

        $hoy      = now()->startOfDay();
        $limite90 = now()->addDays(90)->endOfDay();

        $totalExtintores      = $equipos->count();
        $vencimientosProximos = $equipos->filter(fn($e) =>
            $e->fecha_proxima_revision &&
            $e->fecha_proxima_revision->gte($hoy) &&
            $e->fecha_proxima_revision->lte($limite90)
        )->count();
        $vencidos = $equipos->filter(fn($e) =>
            $e->fecha_proxima_revision && $e->fecha_proxima_revision->lt($hoy)
        )->count();

        // ── Cumplimiento general del año ──────────────────────────────────────
        $cumplimientoGeneral = DB::table('inspecciones')
            ->where('empresa_id', $eid)
            ->where('equipo_catalogo_id', $catId)
            ->whereYear('planificada_para', $año)
            ->whereIn('estado', $estadosOk)
            ->whereNull('deleted_at')
            ->avg('porcentaje_cumplimiento');

        // ── Por área ──────────────────────────────────────────────────────────
        $porArea = DB::table('inspecciones')
            ->join('areas', 'inspecciones.area_id', '=', 'areas.id')
            ->where('inspecciones.empresa_id', $eid)
            ->where('inspecciones.equipo_catalogo_id', $catId)
            ->whereYear('inspecciones.planificada_para', $año)
            ->whereIn('inspecciones.estado', $estadosOk)
            ->whereNull('inspecciones.deleted_at')
            ->selectRaw('areas.nombre as area,
                ROUND(AVG(inspecciones.porcentaje_cumplimiento),1) as pct,
                COUNT(inspecciones.id) as n')
            ->groupBy('areas.id', 'areas.nombre')
            ->orderByDesc('pct')
            ->get();

        // ── Por tipo de extintor ──────────────────────────────────────────────
        $porTipo = Equipo::where('empresa_id', $eid)
            ->where('equipo_catalogo_id', $catId)
            ->selectRaw("COALESCE(NULLIF(TRIM(tipo),''), 'Sin tipo') as tipo_extintor, COUNT(*) as cantidad")
            ->groupBy('tipo_extintor')
            ->orderByDesc('cantidad')
            ->get();

        // ── Evolución mensual ─────────────────────────────────────────────────
        $mensualRaw = DB::table('inspecciones')
            ->where('empresa_id', $eid)
            ->where('equipo_catalogo_id', $catId)
            ->whereYear('planificada_para', $año)
            ->whereIn('estado', $estadosOk)
            ->whereNull('deleted_at')
            ->selectRaw('MONTH(planificada_para) as mes,
                ROUND(AVG(porcentaje_cumplimiento),1) as pct,
                COUNT(*) as n')
            ->groupBy(DB::raw('MONTH(planificada_para)'))
            ->get()
            ->keyBy('mes');

        $labMeses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
        $mensual  = collect(range(1, 12))->map(fn($m) => [
            'mes'   => $m,
            'label' => $labMeses[$m - 1],
            'pct'   => isset($mensualRaw[$m]) ? (float) $mensualRaw[$m]->pct : null,
            'n'     => isset($mensualRaw[$m]) ? (int)   $mensualRaw[$m]->n   : 0,
        ]);

        // ── Matriz de anomalías (via checklist wizard) ────────────────────────
        $anomaliasRows = DB::table('inspeccion_respuestas as ir')
            ->join('checklist_preguntas as cp', 'ir.pregunta_id', '=', 'cp.id')
            ->join('inspecciones as i', 'ir.inspeccion_id', '=', 'i.id')
            ->where('i.empresa_id', $eid)
            ->where('i.equipo_catalogo_id', $catId)
            ->whereYear('i.planificada_para', $año)
            ->whereIn('i.estado', $estadosOk)
            ->whereNull('i.deleted_at')
            ->whereNotNull('i.equipo_id')
            ->selectRaw("i.equipo_id, cp.id as pregunta_id, cp.texto as descripcion, cp.orden,
                ROUND(AVG(CASE
                    WHEN ir.resultado IN ('C','S','A') THEN 100.0
                    WHEN ir.resultado = 'N'            THEN 0.0
                    ELSE NULL
                END),1) as pct,
                COUNT(*) as cnt")
            ->groupBy('i.equipo_id', 'cp.id', 'cp.texto', 'cp.orden')
            ->orderBy('cp.orden')
            ->get();

        // Fallback: inspecciones_items (formato clásico)
        if ($anomaliasRows->isEmpty()) {
            $anomaliasRows = DB::table('inspecciones_items as ii')
                ->join('inspecciones as i', 'ii.inspeccion_id', '=', 'i.id')
                ->where('i.empresa_id', $eid)
                ->where('i.equipo_catalogo_id', $catId)
                ->whereYear('i.planificada_para', $año)
                ->whereIn('i.estado', $estadosOk)
                ->whereNull('i.deleted_at')
                ->whereNotNull('i.equipo_id')
                ->whereNotNull('ii.descripcion')
                ->selectRaw("i.equipo_id, ii.descripcion,
                    ROUND(AVG(CASE WHEN ii.resultado = 'conforme' THEN 100.0 ELSE 0 END),1) as pct,
                    COUNT(*) as cnt")
                ->groupBy('i.equipo_id', 'ii.descripcion')
                ->get();
        }

        $anomaliasLista = $anomaliasRows->pluck('descripcion')->unique()->values();
        $matrixPivot    = [];
        foreach ($anomaliasRows as $row) {
            $matrixPivot[$row->descripcion][$row->equipo_id] = $row->pct;
        }

        // ── Estado mensual por unidad (para tabla ubicaciones) ────────────────
        $mensualPorEquipoRaw = DB::table('inspecciones')
            ->where('empresa_id', $eid)
            ->where('equipo_catalogo_id', $catId)
            ->whereYear('planificada_para', $año)
            ->whereIn('estado', $estadosOk)
            ->whereNull('deleted_at')
            ->whereNotNull('equipo_id')
            ->selectRaw('equipo_id, MONTH(planificada_para) as mes,
                ROUND(AVG(porcentaje_cumplimiento),1) as pct')
            ->groupBy('equipo_id', DB::raw('MONTH(planificada_para)'))
            ->get()
            ->groupBy('equipo_id');

        $ubicaciones = $equipos->map(function ($eq) use ($mensualPorEquipoRaw, $hoy, $limite90) {
            $mensualEq = $mensualPorEquipoRaw->get($eq->id, collect())->keyBy('mes');
            $venc      = $eq->fecha_proxima_revision;
            $estadoV   = !$venc                  ? 'sin_fecha'
                : ($venc->lt($hoy)               ? 'vencido'
                : ($venc->lte($limite90)          ? 'proximo' : 'ok'));

            return [
                'id'          => $eq->id,
                'codigo'      => $eq->codigo,
                'nombre'      => $eq->nombre,
                'ubicacion'   => $eq->ubicacion,
                'tipo'        => $eq->tipo,
                'area'        => $eq->area?->nombre,
                'vencimiento' => $venc?->format('d M Y'),
                'estado_venc' => $estadoV,
                'mensual'     => collect(range(1, 12))->mapWithKeys(
                    fn($m) => [$m => isset($mensualEq[$m]) ? (float) $mensualEq[$m]->pct : null]
                ),
            ];
        });

        return response()->json([
            'año'             => $año,
            'catalogo_nombre' => $catalogo->nombre,
            'kpis'            => [
                'total_extintores'      => $totalExtintores,
                'vencimientos_proximos' => $vencimientosProximos,
                'vencidos'              => $vencidos,
                'cumplimiento_general'  => $cumplimientoGeneral !== null
                    ? round((float) $cumplimientoGeneral, 1) : null,
                'tipos_distintos'       => $porTipo->count(),
            ],
            'por_area'        => $porArea,
            'por_tipo'        => $porTipo,
            'mensual'         => $mensual,
            'anomalias_matrix' => [
                'extintores' => $equipos->map(fn($e) => [
                    'id'     => $e->id,
                    'codigo' => $e->codigo,
                    'nombre' => $e->nombre,
                    'area'   => $e->area?->nombre,
                ]),
                'filas' => $anomaliasLista->map(fn($a) => [
                    'descripcion' => $a,
                    'por_equipo'  => (object) ($matrixPivot[$a] ?? []),
                ]),
            ],
            'ubicaciones'     => $ubicaciones,
        ]);
    }
}
