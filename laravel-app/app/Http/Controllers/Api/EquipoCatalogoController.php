<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use App\Models\EquipoCatalogo;
use App\Models\Equipo;

class EquipoCatalogoController extends Controller
{
    /**
     * GET /api/inspecciones/catalogo/lista?año=2025
     * Todos los tipos de equipo con actividad (unidades o inspecciones) en la empresa.
     */
    public function lista(Request $request): JsonResponse
    {
        $eid        = $request->user()->empresa_id;
        $año        = (int) $request->input('año', now()->year);
        $areaId     = $request->input('area_id');
        $submoduloId= $request->input('submodulo_id');
        $estadosOk  = ['ejecutada', 'cerrada', 'con_hallazgos'];

        // Si filtran por área: IDs de catálogos que tienen equipos en esa área
        $idsConArea = null;
        if ($areaId) {
            $idsConArea = DB::table('equipos')
                ->where('empresa_id', $eid)
                ->where('area_id', $areaId)
                ->whereNull('deleted_at')
                ->distinct()
                ->pluck('equipo_catalogo_id');
        }

        $query = DB::table('equipos_catalogo as ec')
            ->leftJoin('inspeccion_submodulos as sm', 'sm.id', '=', 'ec.submodulo_id')
            ->leftJoin('equipos as e', function ($j) use ($eid) {
                $j->on('e.equipo_catalogo_id', '=', 'ec.id')
                  ->where('e.empresa_id', $eid)
                  ->whereNull('e.deleted_at');
            })
            ->leftJoin('inspecciones as i', function ($j) use ($eid, $año, $estadosOk) {
                $j->on('i.equipo_catalogo_id', '=', 'ec.id')
                  ->where('i.empresa_id', $eid)
                  ->whereYear('i.planificada_para', $año)
                  ->whereIn('i.estado', $estadosOk)
                  ->whereNull('i.deleted_at');
            })
            ->selectRaw("ec.id, ec.nombre, ec.submodulo_id, ec.categoria_emergencia, ec.frecuencia_inspeccion,
                sm.codigo as submodulo_codigo, sm.nombre as submodulo_nombre, sm.color as submodulo_color,
                COUNT(DISTINCT e.id)   as total_unidades,
                COUNT(DISTINCT i.id)   as inspecciones_año,
                ROUND(AVG(CASE WHEN i.id IS NOT NULL THEN i.porcentaje_cumplimiento END), 1) as cumplimiento,
                MAX(i.planificada_para) as ultima_inspeccion")
            ->groupBy('ec.id', 'ec.nombre', 'ec.submodulo_id', 'ec.categoria_emergencia', 'ec.frecuencia_inspeccion',
                      'sm.codigo', 'sm.nombre', 'sm.color')
            ->havingRaw('total_unidades > 0 OR inspecciones_año > 0')
            ->orderBy('sm.orden')
            ->orderBy('ec.nombre');

        if ($idsConArea !== null) {
            $query->whereIn('ec.id', $idsConArea);
        }
        if ($submoduloId) {
            $query->where('ec.submodulo_id', $submoduloId);
        }

        $rows = $query->get();

        // ── Unificar variantes del mismo equipo (Insp. diaria / mensual / pre-turno) ──
        // Se agrupan por "hermandad" (mismo nombre base, alias o prefijo diario) y
        // cada grupo se muestra como UNA sola tarjeta con los totales sumados.
        $arr = $rows->values()->all();
        $n   = count($arr);
        $parent = range(0, $n - 1);
        $find = function ($x) use (&$parent) {
            while ($parent[$x] !== $x) { $parent[$x] = $parent[$parent[$x]]; $x = $parent[$x]; }
            return $x;
        };
        for ($i = 0; $i < $n; $i++) {
            for ($j = $i + 1; $j < $n; $j++) {
                if ($this->sonHermanosCatalogo($arr[$i], $arr[$j])) {
                    $parent[$find($i)] = $find($j);
                }
            }
        }

        // Miembros por componente
        $comp = [];
        for ($i = 0; $i < $n; $i++) { $comp[$find($i)][] = $arr[$i]; }

        // Fusiona cada componente en un "primario" (prefiere el que NO es diaria)
        $primaryOf = [];
        foreach ($comp as $root => $grupo) {
            $col = collect($grupo);
            $primario = $col->sortBy(fn($r) => mb_stripos($r->nombre, 'diari') !== false ? 1 : 0)
                            ->sortByDesc(fn($r) => (int) $r->inspecciones_año)
                            ->first();
            foreach ($grupo as $r) {
                if ($r->id === $primario->id) continue;
                $nP = (int) $primario->inspecciones_año;
                $nH = (int) $r->inspecciones_año;
                $nT = $nP + $nH;
                if ($nT > 0) {
                    $primario->cumplimiento = round(
                        (((float) ($primario->cumplimiento ?? 0)) * $nP
                       + ((float) ($r->cumplimiento ?? 0)) * $nH) / $nT, 1);
                }
                $primario->inspecciones_año = $nT;
                $primario->total_unidades   = (int) $primario->total_unidades + (int) $r->total_unidades;
                if ($r->ultima_inspeccion && $r->ultima_inspeccion > (string) $primario->ultima_inspeccion) {
                    $primario->ultima_inspeccion = $r->ultima_inspeccion;
                }
            }
            if (count($grupo) > 1) {
                $primario->nombre = $this->baseNombreCatalogo($primario->nombre);
            }
            $primaryOf[$root] = $primario;
        }

        // Reconstruye conservando el orden original (submódulo, nombre)
        $seen = [];
        $out  = [];
        for ($i = 0; $i < $n; $i++) {
            $r = $find($i);
            if (!isset($seen[$r])) { $seen[$r] = true; $out[] = $primaryOf[$r]; }
        }
        $rows = collect($out);

        // Submodulos disponibles para el filtro (con actividad en la empresa)
        $submodulos = DB::table('inspeccion_submodulos as sm')
            ->join('equipos_catalogo as ec', 'ec.submodulo_id', '=', 'sm.id')
            ->leftJoin('equipos as e', function ($j) use ($eid) {
                $j->on('e.equipo_catalogo_id', '=', 'ec.id')
                  ->where('e.empresa_id', $eid)
                  ->whereNull('e.deleted_at');
            })
            ->leftJoin('inspecciones as i', function ($j) use ($eid, $año, $estadosOk) {
                $j->on('i.equipo_catalogo_id', '=', 'ec.id')
                  ->where('i.empresa_id', $eid)
                  ->whereYear('i.planificada_para', $año)
                  ->whereIn('i.estado', $estadosOk)
                  ->whereNull('i.deleted_at');
            })
            ->selectRaw('sm.id, sm.codigo, sm.nombre, sm.color, COUNT(DISTINCT ec.id) as total_tipos')
            ->groupBy('sm.id', 'sm.codigo', 'sm.nombre', 'sm.color', 'sm.orden')
            ->havingRaw('total_tipos > 0')
            ->orderBy('sm.orden')
            ->get();

        // Áreas con equipos de esta empresa
        $areas = DB::table('areas')
            ->join('equipos', 'equipos.area_id', '=', 'areas.id')
            ->where('equipos.empresa_id', $eid)
            ->whereNull('equipos.deleted_at')
            ->selectRaw('areas.id, areas.nombre')
            ->distinct()
            ->orderBy('areas.nombre')
            ->get();

        return response()->json([
            'año'        => $año,
            'catalogo'   => $rows,
            'submodulos' => $submodulos,
            'areas'      => $areas,
        ]);
    }

    /**
     * GET /api/inspecciones/catalogo/{id}/dashboard?año=2025
     * Dashboard completo para cualquier tipo de equipo del catálogo.
     */
    public function dashboard(Request $request, int $id): JsonResponse
    {
        $eid = $request->user()->empresa_id;
        $año = (int) $request->input('año', now()->year);
        $mesDiarioParam = $request->input('mes_diario'); // 1-12 opcional (filtro gráfico diario)

        $catalogo = EquipoCatalogo::find($id);
        if (!$catalogo) {
            return response()->json(['error' => 'Tipo de equipo no encontrado'], 404);
        }

        $estadosOk = ['ejecutada', 'cerrada', 'con_hallazgos'];

        // ── Unidades individuales ─────────────────────────────────────────────
        $equipos = Equipo::where('empresa_id', $eid)
            ->where('equipo_catalogo_id', $id)
            ->with('area')
            ->orderBy('codigo')
            ->get();

        $hoy      = now()->startOfDay();
        $limite90 = now()->addDays(90)->endOfDay();

        $totalUnidades = $equipos->count();

        $proximosRevision = $equipos->filter(fn($e) =>
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
            ->where('equipo_catalogo_id', $id)
            ->whereYear('planificada_para', $año)
            ->whereIn('estado', $estadosOk)
            ->whereNull('deleted_at')
            ->avg('porcentaje_cumplimiento');

        $totalInspecciones = DB::table('inspecciones')
            ->where('empresa_id', $eid)
            ->where('equipo_catalogo_id', $id)
            ->whereYear('planificada_para', $año)
            ->whereIn('estado', $estadosOk)
            ->whereNull('deleted_at')
            ->count();

        // ── Por área ──────────────────────────────────────────────────────────
        $porArea = DB::table('inspecciones')
            ->join('areas', 'inspecciones.area_id', '=', 'areas.id')
            ->where('inspecciones.empresa_id', $eid)
            ->where('inspecciones.equipo_catalogo_id', $id)
            ->whereYear('inspecciones.planificada_para', $año)
            ->whereIn('inspecciones.estado', $estadosOk)
            ->whereNull('inspecciones.deleted_at')
            ->selectRaw('areas.nombre as area,
                ROUND(AVG(inspecciones.porcentaje_cumplimiento),1) as pct,
                COUNT(inspecciones.id) as n')
            ->groupBy('areas.id', 'areas.nombre')
            ->orderByDesc('pct')
            ->get();

        // ── Por tipo de equipo (campo tipo) ───────────────────────────────────
        $porTipo = Equipo::where('empresa_id', $eid)
            ->where('equipo_catalogo_id', $id)
            ->selectRaw("COALESCE(NULLIF(TRIM(tipo),''), 'Sin tipo') as tipo_equipo, COUNT(*) as cantidad")
            ->groupBy('tipo_equipo')
            ->orderByDesc('cantidad')
            ->get();

        // ── Evolución mensual ─────────────────────────────────────────────────
        // Inspecciones a nivel catálogo (sin unidad específica) tienen prioridad;
        // se usa el promedio de unidades como fallback en meses sin inspección de catálogo.
        $mensualCatalogoChart = DB::table('inspecciones')
            ->where('empresa_id', $eid)
            ->where('equipo_catalogo_id', $id)
            ->whereYear('planificada_para', $año)
            ->whereIn('estado', $estadosOk)
            ->whereNull('deleted_at')
            ->whereNull('equipo_id')
            ->selectRaw('MONTH(planificada_para) as mes,
                ROUND(AVG(porcentaje_cumplimiento),1) as pct,
                COUNT(*) as n')
            ->groupBy(DB::raw('MONTH(planificada_para)'))
            ->get()
            ->keyBy('mes');

        $mensualUnidadChart = DB::table('inspecciones')
            ->where('empresa_id', $eid)
            ->where('equipo_catalogo_id', $id)
            ->whereYear('planificada_para', $año)
            ->whereIn('estado', $estadosOk)
            ->whereNull('deleted_at')
            ->whereNotNull('equipo_id')
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
            'pct'   => isset($mensualCatalogoChart[$m])
                       ? (float) $mensualCatalogoChart[$m]->pct
                       : (isset($mensualUnidadChart[$m]) ? (float) $mensualUnidadChart[$m]->pct : null),
            'n'     => isset($mensualCatalogoChart[$m])
                       ? (int) $mensualCatalogoChart[$m]->n
                       : (isset($mensualUnidadChart[$m]) ? (int) $mensualUnidadChart[$m]->n : 0),
        ]);

        // ── Evolución semanal y diaria ────────────────────────────────────────
        // Los gráficos por semana / por día se alimentan de TODAS las variantes
        // del mismo equipo (catálogos hermanos: Insp. diaria + mensual + pre-turno),
        // para mostrar todo en el mismo dashboard sin cambiar de tipo de equipo.
        // Fuentes del gráfico: el catálogo actual + sus hermanos (para que cualquier
        // inspección del equipo aparezca por día).
        $hermanos = $this->catalogosHermanos($id);
        $dailyIds = $hermanos;

        // Un equipo "tiene inspección diaria" si en algún mes registró inspecciones
        // en 2+ días distintos (actividad más frecuente que mensual). Señal por datos,
        // no por nombre/frecuencia del catálogo, para que aplique a todos los equipos.
        $maxDiasMes = (int) DB::table('inspecciones')
            ->where('empresa_id', $eid)
            ->whereIn('equipo_catalogo_id', $dailyIds)
            ->whereYear('planificada_para', $año)
            ->whereIn('estado', $estadosOk)
            ->whereNull('deleted_at')
            ->selectRaw('COUNT(DISTINCT DATE(planificada_para)) as dias')
            ->groupBy(DB::raw('MONTH(planificada_para)'))
            ->orderByDesc('dias')
            ->limit(1)
            ->value('dias');

        $esDiaria = $maxDiasMes >= 2;
        $semanal  = [];
        $diario   = [];
        $diarioPeriodo = null;
        $diarioMeses   = [];
        $diarioMes     = null;

        if ($esDiaria) {
            // Semanal: promedio por semana ISO del año, con rango de fechas
            $semanalRaw = DB::table('inspecciones')
                ->where('empresa_id', $eid)
                ->whereIn('equipo_catalogo_id', $dailyIds)
                ->whereYear('planificada_para', $año)
                ->whereIn('estado', $estadosOk)
                ->whereNull('deleted_at')
                ->selectRaw('WEEK(planificada_para, 3) as semana,
                    MIN(DATE(planificada_para)) as desde,
                    MAX(DATE(planificada_para)) as hasta,
                    ROUND(AVG(porcentaje_cumplimiento),1) as pct,
                    COUNT(*) as n')
                ->groupBy(DB::raw('WEEK(planificada_para, 3)'))
                ->orderBy('semana')
                ->get();

            $semanal = $semanalRaw->map(fn($w) => [
                'semana' => (int) $w->semana,
                'label'  => 'S' . $w->semana,
                'rango'  => \Carbon\Carbon::parse($w->desde)->format('d/m') . '–' . \Carbon\Carbon::parse($w->hasta)->format('d/m'),
                'pct'    => (float) $w->pct,
                'n'      => (int) $w->n,
            ])->values();

            // Diario: se muestran todos los días del mes con más inspecciones del
            // año. Cada día del mes aparece (aunque no tenga inspección) para leer
            // el gráfico como un calendario mensual.
            $diarioRaw = DB::table('inspecciones')
                ->where('empresa_id', $eid)
                ->whereIn('equipo_catalogo_id', $dailyIds)
                ->whereYear('planificada_para', $año)
                ->whereIn('estado', $estadosOk)
                ->whereNull('deleted_at')
                ->selectRaw('DATE(planificada_para) as dia,
                    MONTH(planificada_para) as mes,
                    ROUND(AVG(porcentaje_cumplimiento),1) as pct,
                    COUNT(*) as n')
                ->groupBy(DB::raw('DATE(planificada_para)'), DB::raw('MONTH(planificada_para)'))
                ->get();

            if ($diarioRaw->isNotEmpty()) {
                // Filtro: los 12 meses del año, marcando cuáles tienen inspecciones
                $mesesConDatos = $diarioRaw->pluck('mes')->map(fn($m) => (int) $m)->unique()->flip();
                $diarioMeses = collect(range(1, 12))->map(fn($m) => [
                    'mes'         => $m,
                    'label'       => ucfirst(\Carbon\Carbon::create($año, $m, 1)->locale('es')->isoFormat('MMMM')),
                    'tiene_datos' => $mesesConDatos->has($m),
                ]);

                // Mes objetivo: el del filtro (aunque esté vacío) o el de más inspecciones
                $mesTarget = null;
                if ($mesDiarioParam !== null && (int) $mesDiarioParam >= 1 && (int) $mesDiarioParam <= 12) {
                    $mesTarget = (int) $mesDiarioParam;
                } else {
                    $mesTarget = (int) $diarioRaw
                        ->groupBy('mes')
                        ->map(fn($rows) => $rows->sum('n'))
                        ->sortDesc()
                        ->keys()
                        ->first();
                }

                $porDia    = $diarioRaw->where('mes', $mesTarget)->keyBy('dia');
                $inicioMes = \Carbon\Carbon::create($año, $mesTarget, 1)->startOfDay();
                $diasEnMes = $inicioMes->daysInMonth;
                $diarioPeriodo = ucfirst($inicioMes->locale('es')->isoFormat('MMMM YYYY'));
                $diarioMes = $mesTarget;

                $diario = collect(range(1, $diasEnMes))->map(function ($d) use ($año, $mesTarget, $porDia) {
                    $fecha = \Carbon\Carbon::create($año, $mesTarget, $d)->startOfDay();
                    $key   = $fecha->format('Y-m-d');
                    $row   = $porDia->get($key);
                    return [
                        'dia'   => $key,
                        'label' => (string) $d,          // enumeración 1..31
                        'fecha' => $fecha->format('d/m/Y'),
                        'pct'   => $row ? (float) $row->pct : null,
                        'n'     => $row ? (int) $row->n : 0,
                    ];
                })->values();
            }

            // Si no hay ninguna inspección diaria registrada, no mostramos los gráficos
            if ($semanal->isEmpty() && (is_array($diario) ? empty($diario) : $diario->isEmpty())) {
                $esDiaria = false;
            }
        }

        // ── Matriz de verificación — resultado real de la inspección más reciente ─
        $allRespRaw = DB::table('inspeccion_respuestas as ir')
            ->join('checklist_preguntas as cp', 'ir.pregunta_id', '=', 'cp.id')
            ->join('inspecciones as i', 'ir.inspeccion_id', '=', 'i.id')
            ->where('i.empresa_id', $eid)
            ->where('i.equipo_catalogo_id', $id)
            ->whereYear('i.planificada_para', $año)
            ->whereIn('i.estado', $estadosOk)
            ->whereNull('i.deleted_at')
            ->whereNotNull('i.equipo_id')
            ->selectRaw("i.equipo_id, i.id as inspeccion_id, i.planificada_para,
                         cp.id as pregunta_id, cp.texto as descripcion, cp.orden, ir.resultado")
            ->orderByDesc('i.planificada_para')
            ->orderBy('cp.orden')
            ->get();

        // Retener solo respuestas de la inspección más reciente por unidad
        $latestInspPerUnit = $allRespRaw
            ->groupBy('equipo_id')
            ->map(fn($rows) => $rows->first()?->inspeccion_id);

        $anomaliasRows = $allRespRaw->filter(fn($row) =>
            $latestInspPerUnit->get($row->equipo_id) === $row->inspeccion_id
        );

        // Fallback A: inspeccion_respuestas a nivel catálogo (equipo_id IS NULL)
        // → la inspección cubre el área completa; se replica para cada unidad del catálogo
        if ($anomaliasRows->isEmpty()) {
            $catalogRespRaw = DB::table('inspeccion_respuestas as ir')
                ->join('checklist_preguntas as cp', 'ir.pregunta_id', '=', 'cp.id')
                ->join('inspecciones as i', 'ir.inspeccion_id', '=', 'i.id')
                ->where('i.empresa_id', $eid)
                ->where('i.equipo_catalogo_id', $id)
                ->whereYear('i.planificada_para', $año)
                ->whereIn('i.estado', $estadosOk)
                ->whereNull('i.deleted_at')
                ->whereNull('i.equipo_id')
                ->selectRaw("i.id as inspeccion_id, i.planificada_para,
                             cp.id as pregunta_id, cp.texto as descripcion, cp.orden, ir.resultado")
                ->orderByDesc('i.planificada_para')
                ->orderBy('cp.orden')
                ->get();

            if ($catalogRespRaw->isNotEmpty()) {
                $latestCatalogId   = $catalogRespRaw->first()?->inspeccion_id;
                $latestCatalogResp = $catalogRespRaw->filter(fn($r) => $r->inspeccion_id === $latestCatalogId);

                $expanded   = collect();
                $unitIds    = $equipos->isEmpty() ? [0] : $equipos->pluck('id')->toArray();
                foreach ($unitIds as $uid) {
                    foreach ($latestCatalogResp as $resp) {
                        $expanded->push((object) [
                            'equipo_id'     => $uid,
                            'inspeccion_id' => $resp->inspeccion_id,
                            'pregunta_id'   => $resp->pregunta_id,
                            'descripcion'   => $resp->descripcion,
                            'orden'         => $resp->orden,
                            'resultado'     => $resp->resultado,
                        ]);
                    }
                }
                $anomaliasRows = $expanded;
            }
        }

        // Fallback B: inspecciones_items (formato clásico) a nivel de unidad
        if ($anomaliasRows->isEmpty()) {
            $allItemsRaw = DB::table('inspecciones_items as ii')
                ->join('inspecciones as i', 'ii.inspeccion_id', '=', 'i.id')
                ->where('i.empresa_id', $eid)
                ->where('i.equipo_catalogo_id', $id)
                ->whereYear('i.planificada_para', $año)
                ->whereIn('i.estado', $estadosOk)
                ->whereNull('i.deleted_at')
                ->whereNotNull('i.equipo_id')
                ->whereNotNull('ii.descripcion')
                ->selectRaw("i.equipo_id, i.id as inspeccion_id, i.planificada_para,
                             ii.descripcion, ii.resultado")
                ->orderByDesc('i.planificada_para')
                ->get();

            $latestInspPerUnit = $allItemsRaw
                ->groupBy('equipo_id')
                ->map(fn($rows) => $rows->first()?->inspeccion_id);

            $anomaliasRows = $allItemsRaw->filter(fn($row) =>
                $latestInspPerUnit->get($row->equipo_id) === $row->inspeccion_id
            )->map(function ($row) {
                // Normalizar resultado numérico (formato antiguo) → código categórico
                if (is_numeric($row->resultado)) {
                    $pct = (float) $row->resultado;
                    $row->resultado = $pct >= 100 ? 'C' : ($pct <= 0 ? 'N' : 'A');
                } elseif ($row->resultado === 'conforme') {
                    $row->resultado = 'C';
                } elseif ($row->resultado === 'no_conforme') {
                    $row->resultado = 'N';
                } elseif ($row->resultado === 'observacion') {
                    $row->resultado = 'A';
                }
                return $row;
            });
        }

        $anomaliasLista = $anomaliasRows->pluck('descripcion')->unique()->values();
        $matrixPivot    = [];
        foreach ($anomaliasRows as $row) {
            $matrixPivot[$row->descripcion][$row->equipo_id] = $row->resultado;
        }

        // ── Matriz de verificación por MES (Ene…Dic), agregada para todas las unidades ─
        // Cada celda = peor resultado del ítem en ese mes (N > A > C; NA neutro).
        $matrizRespRaw = DB::table('inspeccion_respuestas as ir')
            ->join('checklist_preguntas as cp', 'ir.pregunta_id', '=', 'cp.id')
            ->join('inspecciones as i', 'ir.inspeccion_id', '=', 'i.id')
            ->where('i.empresa_id', $eid)
            ->where('i.equipo_catalogo_id', $id)
            ->whereYear('i.planificada_para', $año)
            ->whereIn('i.estado', $estadosOk)
            ->whereNull('i.deleted_at')
            ->selectRaw("cp.texto as descripcion, cp.orden,
                         MONTH(i.planificada_para) as mes, ir.resultado")
            ->orderBy('cp.orden')
            ->get();

        // Fallback: inspecciones_items (formato clásico) si no hay respuestas de checklist
        if ($matrizRespRaw->isEmpty()) {
            $matrizRespRaw = DB::table('inspecciones_items as ii')
                ->join('inspecciones as i', 'ii.inspeccion_id', '=', 'i.id')
                ->where('i.empresa_id', $eid)
                ->where('i.equipo_catalogo_id', $id)
                ->whereYear('i.planificada_para', $año)
                ->whereIn('i.estado', $estadosOk)
                ->whereNull('i.deleted_at')
                ->whereNotNull('ii.descripcion')
                ->selectRaw("ii.descripcion, 0 as orden,
                             MONTH(i.planificada_para) as mes, ii.resultado")
                ->get()
                ->map(function ($row) {
                    if (is_numeric($row->resultado)) {
                        $pct = (float) $row->resultado;
                        $row->resultado = $pct >= 100 ? 'C' : ($pct <= 0 ? 'N' : 'A');
                    } elseif ($row->resultado === 'conforme')    { $row->resultado = 'C'; }
                    elseif ($row->resultado === 'no_conforme')   { $row->resultado = 'N'; }
                    elseif ($row->resultado === 'observacion')   { $row->resultado = 'A'; }
                    return $row;
                });
        }

        // Peor resultado de un conjunto (prioridad: menor = peor)
        $peorResultado = function ($resultados) {
            $prio = ['N' => 0, 'no_conforme' => 0, 'A' => 1, 'observacion' => 1,
                     'C' => 2, 'S' => 2, 'conforme' => 2];
            $best = null; $bestP = 99;
            foreach ($resultados as $r) {
                if ($r === null || $r === '') continue;
                $p = $prio[$r] ?? (($r === 'NA' || $r === 'na') ? 3 : 2);
                if ($p < $bestP) { $bestP = $p; $best = $r; }
            }
            return $best;
        };

        $matrizMensual = $matrizRespRaw
            ->groupBy('descripcion')
            ->map(function ($rows) use ($peorResultado) {
                $byMonth = $rows->groupBy('mes');
                $porMes  = [];
                for ($m = 1; $m <= 12; $m++) {
                    $porMes[$m] = isset($byMonth[$m])
                        ? $peorResultado($byMonth[$m]->pluck('resultado'))
                        : null;
                }
                return [
                    'orden'       => (int) $rows->min('orden'),
                    'descripcion' => $rows->first()->descripcion,
                    'por_mes'     => (object) $porMes,
                ];
            })
            ->sortBy('orden')
            ->values()
            ->map(fn($f) => ['descripcion' => $f['descripcion'], 'por_mes' => $f['por_mes']]);

        // ── Estado mensual por unidad ─────────────────────────────────────────
        $mensualPorEquipoRaw = DB::table('inspecciones')
            ->where('empresa_id', $eid)
            ->where('equipo_catalogo_id', $id)
            ->whereYear('planificada_para', $año)
            ->whereIn('estado', $estadosOk)
            ->whereNull('deleted_at')
            ->whereNotNull('equipo_id')
            ->selectRaw('equipo_id, MONTH(planificada_para) as mes,
                ROUND(AVG(porcentaje_cumplimiento),1) as pct')
            ->groupBy('equipo_id', DB::raw('MONTH(planificada_para)'))
            ->get()
            ->groupBy('equipo_id');

        // Inspecciones a nivel catálogo (sin equipo específico) — se usan como
        // fallback por mes cuando un equipo no tiene inspección propia ese mes.
        $mensualCatalogoRaw = DB::table('inspecciones')
            ->where('empresa_id', $eid)
            ->where('equipo_catalogo_id', $id)
            ->whereYear('planificada_para', $año)
            ->whereIn('estado', $estadosOk)
            ->whereNull('deleted_at')
            ->whereNull('equipo_id')
            ->selectRaw('MONTH(planificada_para) as mes,
                ROUND(AVG(porcentaje_cumplimiento),1) as pct')
            ->groupBy(DB::raw('MONTH(planificada_para)'))
            ->get()
            ->keyBy('mes');

        $ubicaciones = $equipos->map(function ($eq) use ($mensualPorEquipoRaw, $mensualCatalogoRaw, $hoy, $limite90) {
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
                'mensual'     => collect(range(1, 12))->mapWithKeys(function ($m) use ($mensualEq, $mensualCatalogoRaw) {
                    if (isset($mensualEq[$m])) {
                        return [$m => (float) $mensualEq[$m]->pct];
                    }
                    if (isset($mensualCatalogoRaw[$m])) {
                        return [$m => (float) $mensualCatalogoRaw[$m]->pct];
                    }
                    return [$m => null];
                }),
            ];
        });

        return response()->json([
            '_v'              => 'v2-fallbackA',
            'año'             => $año,
            'catalogo_id'     => $id,
            'catalogo_nombre' => $catalogo->nombre,
            'kpis'            => [
                'total_unidades'      => $totalUnidades,
                'inspecciones_año'    => $totalInspecciones,
                'proximos_revision'   => $proximosRevision,
                'vencidos'            => $vencidos,
                'cumplimiento_general'=> $cumplimientoGeneral !== null
                    ? round((float) $cumplimientoGeneral, 1) : null,
                'tipos_distintos'     => $porTipo->count(),
            ],
            'por_area'        => $porArea,
            'por_tipo'        => $porTipo,
            'mensual'         => $mensual,
            'es_diaria'       => $esDiaria,
            'semanal'         => $semanal,
            'diario'          => $diario,
            'diario_periodo'  => $diarioPeriodo,
            'diario_mes'      => $diarioMes,
            'diario_meses'    => $diarioMeses,
            'anomalias_matrix' => [
                'unidades' => $totalUnidades,
                'filas'    => $matrizMensual,
            ],
            'ubicaciones'     => $ubicaciones,
        ]);
    }

    /**
     * Nombre base de un catálogo, sin el sufijo de variante de inspección
     * (p. ej. "… - Insp. diaria", "… — Inspección mensual", "… — Insp. pre-turno").
     */
    private function baseNombreCatalogo(string $nombre): string
    {
        $b = preg_replace('/\s*[-–—]\s*insp.*$/iu', '', $nombre);
        return trim(($b === null || $b === '') ? $nombre : $b);
    }

    /**
     * ¿Dos catálogos representan el mismo equipo (variantes de inspección)?
     * Reglas: mismo nombre base; alias equivalentes; o un nombre base es prefijo
     * de palabra del otro cuando al menos uno es de frecuencia diaria.
     */
    private function sonHermanosCatalogo($a, $b): bool
    {
        $ba = mb_strtolower($this->baseNombreCatalogo($a->nombre));
        $bb = mb_strtolower($this->baseNombreCatalogo($b->nombre));
        if ($ba === $bb) return true;

        $aliasGrupos = [['stoka', 'transpaleta manual']];
        foreach ($aliasGrupos as $g) {
            if (in_array($ba, $g, true) && in_array($bb, $g, true)) return true;
        }

        $algunoDiaria = ($a->frecuencia_inspeccion === 'diaria') || ($b->frecuencia_inspeccion === 'diaria');
        if ($algunoDiaria) {
            $short = mb_strlen($ba) <= mb_strlen($bb) ? $ba : $bb;
            $long  = $short === $ba ? $bb : $ba;
            if ($short !== $long && \Illuminate\Support\Str::startsWith($long, $short . ' ')) return true;
        }
        return false;
    }

    /** IDs de catálogos que representan el mismo equipo que $id (incluye $id). */
    private function catalogosHermanos(int $id): array
    {
        $todos  = DB::table('equipos_catalogo')->select('id', 'nombre', 'frecuencia_inspeccion')->get();
        $target = $todos->firstWhere('id', $id);
        if (!$target) return [$id];

        $ids = [$id];
        foreach ($todos as $c) {
            if ((int) $c->id === $id) continue;
            if ($this->sonHermanosCatalogo($target, $c)) $ids[] = (int) $c->id;
        }
        return array_values(array_unique($ids));
    }
}
