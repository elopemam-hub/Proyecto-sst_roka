<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SustanciaPeligrosa;
use App\Models\SustanciaMovimiento;
use App\Models\SustanciaExposicion;
use App\Models\SustanciaIncompatibilidad;
use App\Models\SustanciaCapacitacion;
use App\Services\EvaluacionExposicionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class SustanciaController extends Controller
{
    // ── CRUD Principal ───────────────────────────────────────────────────────

    public function index(Request $request): JsonResponse
    {
        $q = SustanciaPeligrosa::where('empresa_id', $request->user()->empresa_id);
        if ($request->filled('search')) {
            $s = $request->search;
            $q->where(fn($x) => $x->where('nombre','like',"%{$s}%")
                ->orWhere('nombre_quimico','like',"%{$s}%")
                ->orWhere('cas_number','like',"%{$s}%"));
        }
        if ($request->filled('nivel_riesgo'))  $q->where('nivel_riesgo',  $request->nivel_riesgo);
        if ($request->filled('estado_fisico')) $q->where('estado_fisico', $request->estado_fisico);
        if ($request->boolean('solo_activos')) $q->where('activo', true);
        return response()->json($q->orderByRaw("FIELD(nivel_riesgo,'muy_alto','alto','medio','bajo')")->orderBy('nombre')
            ->paginate(min($request->integer('per_page',20),200)));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validar($request);
        $s = SustanciaPeligrosa::create([...$data, 'empresa_id' => $request->user()->empresa_id]);
        return response()->json($s, 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $s = SustanciaPeligrosa::where('empresa_id', $request->user()->empresa_id)
            ->with(['movimientos','exposiciones','capacitaciones'])
            ->findOrFail($id);
        return response()->json($s);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $s = SustanciaPeligrosa::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);
        $s->update($this->validar($request, true));
        return response()->json($s);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $s = SustanciaPeligrosa::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);
        if ($s->hds_path) Storage::disk('public')->delete($s->hds_path);
        $s->delete();
        return response()->json(['message' => 'Eliminado']);
    }

    // ── HDS Upload ──────────────────────────────────────────────────────────

    public function uploadHds(Request $request, int $id): JsonResponse
    {
        $s = SustanciaPeligrosa::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);
        $request->validate(['hds' => 'required|file|mimes:pdf|max:10240']);

        if ($s->hds_path) Storage::disk('public')->delete($s->hds_path);

        $path = $request->file('hds')->store("hds/{$request->user()->empresa_id}", 'public');
        $s->update([
            'hds_path'        => $path,
            'hds_disponible'  => true,
        ]);
        return response()->json(['hds_path' => $path, 'url' => Storage::disk('public')->url($path)]);
    }

    public function downloadHds(Request $request, int $id): mixed
    {
        $s = SustanciaPeligrosa::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);
        if (!$s->hds_path || !Storage::disk('public')->exists($s->hds_path)) {
            return response()->json(['message' => 'HDS no encontrada'], 404);
        }
        return Storage::disk('public')->download($s->hds_path, "HDS_{$s->nombre}.pdf");
    }

    // ── Estadísticas / Dashboard ────────────────────────────────────────────

    public function estadisticas(Request $request): JsonResponse
    {
        $eid   = $request->user()->empresa_id;
        $b     = SustanciaPeligrosa::where('empresa_id', $eid);
        $total = (clone $b)->count();

        $hdsVencidas = (clone $b)->where('hds_disponible', true)
            ->whereNotNull('hds_fecha_vencimiento')
            ->where('hds_fecha_vencimiento', '<', now()->toDateString())->count();

        $hdsPorVencer = (clone $b)->where('hds_disponible', true)
            ->whereNotNull('hds_fecha_vencimiento')
            ->whereBetween('hds_fecha_vencimiento', [now()->toDateString(), now()->addDays(90)->toDateString()])->count();

        $porRiesgo = (clone $b)->selectRaw('nivel_riesgo, COUNT(*) as total')->groupBy('nivel_riesgo')->pluck('total','nivel_riesgo');
        $porEstado = (clone $b)->selectRaw('estado_fisico, COUNT(*) as total')->groupBy('estado_fisico')->pluck('total','estado_fisico');

        // Sustancias bajo stock mínimo
        $bajoStock = (clone $b)->whereNotNull('stock_minimo')
            ->whereNotNull('cantidad_stock')
            ->whereRaw('cantidad_stock <= stock_minimo')
            ->get(['id','nombre','cantidad_stock','stock_minimo','unidad_medida','nivel_riesgo']);

        // Sin stock (agotadas)
        $sinStock = (clone $b)->where(fn($q) => $q->whereNull('cantidad_stock')->orWhere('cantidad_stock', 0))->count();

        $capacVenc = SustanciaCapacitacion::whereHas('sustancia', fn($q) => $q->where('empresa_id',$eid))
            ->whereNotNull('fecha_vencimiento')
            ->where('fecha_vencimiento','<', now()->toDateString())->count();

        // ── Exposiciones evaluadas contra los límites ocupacionales ──
        $expo = SustanciaExposicion::where('empresa_id', $eid)
            ->selectRaw("
                SUM(CASE WHEN evaluacion_automatica = 'peligro_inmediato' THEN 1 ELSE 0 END) as peligro,
                SUM(CASE WHEN evaluacion_automatica = 'sobre_limite'      THEN 1 ELSE 0 END) as sobre_limite,
                SUM(CASE WHEN evaluacion_automatica = 'vigilancia'        THEN 1 ELSE 0 END) as vigilancia,
                SUM(CASE WHEN evaluacion_automatica = 'no_comparable'     THEN 1 ELSE 0 END) as no_comparable,
                COUNT(*) as total
            ")->first();

        // Sustancias sin límite numérico: sus mediciones no se pueden evaluar
        $sinLimiteNumerico = (clone $b)
            ->whereNull('limite_tlv_twa_valor')
            ->whereNull('limite_stel_valor')
            ->count();

        // ── % HDS vigente ──────────────────────────────────────────
        $conHdsVigente = (clone $b)
            ->where('hds_disponible', true)
            ->where('hds_actualizado', true)
            ->where(fn($q) => $q->whereNull('hds_fecha_vencimiento')
                ->orWhere('hds_fecha_vencimiento','>=', now()->toDateString()))
            ->count();
        $pctHds = $total > 0 ? round(($conHdsVigente / $total) * 100, 1) : 0;

        // ── Sustancias por área × nivel de riesgo ─────────────────
        $porArea = (clone $b)->whereNotNull('area_uso')
            ->selectRaw('area_uso, nivel_riesgo, COUNT(*) as total')
            ->groupBy('area_uso','nivel_riesgo')
            ->orderBy('area_uso')
            ->get();

        // ── Stock por clase de peligro (pictograma GHS) ────────────
        // Descomponemos el JSON para agregar stocks
        $todas = (clone $b)->whereNotNull('cantidad_stock')
            ->whereNotNull('pictogramas_ghs')
            ->get(['pictogramas_ghs','cantidad_stock','unidad_medida']);

        $stockPorClase = [];
        foreach ($todas as $s) {
            $pics = $s->pictogramas_ghs ?? [];
            foreach ($pics as $pic) {
                if (!isset($stockPorClase[$pic])) $stockPorClase[$pic] = 0;
                $stockPorClase[$pic] += (float)$s->cantidad_stock;
            }
        }
        arsort($stockPorClase);

        // ── Sustancias por área (resumen sin riesgo) ──────────────
        $porAreaResumen = (clone $b)->whereNotNull('area_uso')
            ->selectRaw('area_uso, COUNT(*) as total')
            ->groupBy('area_uso')->orderByDesc('total')
            ->limit(10)->pluck('total','area_uso');

        return response()->json([
            'total'             => $total,
            'activas'           => (clone $b)->where('activo',true)->count(),
            'sin_hds'           => (clone $b)->where('hds_disponible',false)->count(),
            'hds_vencidas'      => $hdsVencidas,
            'hds_por_vencer'    => $hdsPorVencer,
            'con_hds_vigente'   => $conHdsVigente,
            'pct_hds_vigente'   => $pctHds,
            'muy_alto'          => $porRiesgo['muy_alto'] ?? 0,
            'alto'              => $porRiesgo['alto']     ?? 0,
            'medio'             => $porRiesgo['medio']    ?? 0,
            'bajo'              => $porRiesgo['bajo']     ?? 0,
            'por_riesgo'        => $porRiesgo,
            'por_estado_fisico' => $porEstado,
            'por_area'          => $porArea,
            'por_area_resumen'  => $porAreaResumen,
            'stock_por_clase'   => $stockPorClase,
            'bajo_stock'        => $bajoStock,
            'bajo_stock_count'  => $bajoStock->count(),
            'sin_stock'         => $sinStock,
            'capacitaciones_vencidas' => $capacVenc,
            'exposiciones' => [
                'total'              => (int) ($expo->total ?? 0),
                'peligro_inmediato'  => (int) ($expo->peligro ?? 0),
                'sobre_limite'       => (int) ($expo->sobre_limite ?? 0),
                'vigilancia'         => (int) ($expo->vigilancia ?? 0),
                'no_comparable'      => (int) ($expo->no_comparable ?? 0),
            ],
            'sustancias_sin_limite_numerico' => $sinLimiteNumerico,
            'recientes' => (clone $b)->orderByDesc('created_at')->limit(5)
                ->get(['id','nombre','nivel_riesgo','estado_fisico','hds_disponible','created_at']),
        ]);
    }

    // ── Evolución mensual del inventario ───────────────────────────────────

    public function evolucion(Request $request): JsonResponse
    {
        $eid    = $request->user()->empresa_id;
        $meses  = max(3, min(12, $request->integer('meses', 6)));
        $desde  = now()->startOfMonth()->subMonths($meses - 1);

        // Entradas y salidas agrupadas por mes
        $movs = DB::table('sustancia_movimientos as m')
            ->join('sustancias_peligrosas as s', 's.id', '=', 'm.sustancia_id')
            ->where('s.empresa_id', $eid)
            ->whereIn('m.tipo', ['entrada','salida'])
            ->where('m.fecha', '>=', $desde->toDateString())
            ->selectRaw("DATE_FORMAT(m.fecha,'%Y-%m') as mes, m.tipo, SUM(m.cantidad) as total")
            ->groupByRaw("DATE_FORMAT(m.fecha,'%Y-%m'), m.tipo")
            ->orderBy('mes')
            ->get();

        // Nuevas sustancias registradas por mes
        $nuevas = DB::table('sustancias_peligrosas')
            ->where('empresa_id', $eid)
            ->whereNull('deleted_at')
            ->where('created_at', '>=', $desde)
            ->selectRaw("DATE_FORMAT(created_at,'%Y-%m') as mes, COUNT(*) as total")
            ->groupByRaw("DATE_FORMAT(created_at,'%Y-%m')")
            ->pluck('total','mes');

        // Construir series por mes
        $series = [];
        for ($i = $meses - 1; $i >= 0; $i--) {
            $mes    = now()->subMonths($i)->format('Y-m');
            $mesesEs = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
            $dt      = now()->startOfMonth()->subMonths($i);
            $label   = $mesesEs[(int)$dt->format('n') - 1] . ' ' . $dt->format('Y');
            $series[$mes] = [
                'mes'     => $mes,
                'label'   => $label,
                'entradas'=> 0,
                'salidas' => 0,
                'nuevas'  => (int)($nuevas[$mes] ?? 0),
            ];
        }
        foreach ($movs as $m) {
            if (isset($series[$m->mes])) {
                $series[$m->mes][$m->tipo === 'entrada' ? 'entradas' : 'salidas'] = (float)$m->total;
            }
        }

        return response()->json(array_values($series));
    }

    // ── Alertas de stock ────────────────────────────────────────────────────

    public function alertasStock(Request $request): JsonResponse
    {
        $eid = $request->user()->empresa_id;
        $bajoStock = SustanciaPeligrosa::where('empresa_id', $eid)
            ->whereNotNull('stock_minimo')
            ->whereNotNull('cantidad_stock')
            ->whereRaw('cantidad_stock <= stock_minimo')
            ->orderByRaw("FIELD(nivel_riesgo,'muy_alto','alto','medio','bajo')")
            ->get(['id','nombre','nivel_riesgo','cantidad_stock','stock_minimo','stock_maximo','unidad_medida','area_uso']);

        $sinStock = SustanciaPeligrosa::where('empresa_id', $eid)
            ->where(fn($q) => $q->whereNull('cantidad_stock')->orWhere('cantidad_stock', 0))
            ->where('activo', true)
            ->get(['id','nombre','nivel_riesgo','unidad_medida','area_uso']);

        return response()->json([
            'bajo_stock' => $bajoStock,
            'sin_stock'  => $sinStock,
            'total_alertas' => $bajoStock->count() + $sinStock->count(),
        ]);
    }

    // ── Movimientos de Stock ────────────────────────────────────────────────

    public function movimientos(Request $request, int $id): JsonResponse
    {
        $eid = $request->user()->empresa_id;
        $s   = SustanciaPeligrosa::where('empresa_id', $eid)->findOrFail($id);
        $movs = SustanciaMovimiento::where('sustancia_id', $id)
            ->orderByDesc('fecha')->orderByDesc('id')
            ->paginate(min($request->integer('per_page', 30), 200));

        // Estadísticas del historial
        $totalEntradas = SustanciaMovimiento::where('sustancia_id', $id)->where('tipo','entrada')->sum('cantidad');
        $totalSalidas  = SustanciaMovimiento::where('sustancia_id', $id)->where('tipo','salida')->sum('cantidad');

        return response()->json([
            'movimientos'    => $movs,
            'stock_actual'   => $s->cantidad_stock,
            'stock_minimo'   => $s->stock_minimo,
            'stock_maximo'   => $s->stock_maximo,
            'unidad_medida'  => $s->unidad_medida,
            'alerta_stock'   => $s->stock_minimo && $s->cantidad_stock <= $s->stock_minimo,
            'total_entradas' => $totalEntradas,
            'total_salidas'  => $totalSalidas,
        ]);
    }

    public function registrarMovimiento(Request $request, int $id): JsonResponse
    {
        $eid = $request->user()->empresa_id;

        $data = $request->validate([
            'tipo'          => 'required|in:entrada,salida,ajuste',
            'cantidad'      => 'required|numeric|min:0.01',
            'unidad_medida' => 'required|string|max:20',
            'motivo'        => 'nullable|string|max:200',
            'referencia'    => 'nullable|string|max:100',
            'fecha'         => 'required|date',
            'observaciones' => 'nullable|string',
        ]);

        // Todo el cálculo va en transacción con bloqueo de fila: dos salidas
        // simultáneas leerían el mismo stock y dejarían el kardex descuadrado.
        $resultado = DB::transaction(function () use ($eid, $id, $data, $request) {
            $s = SustanciaPeligrosa::where('empresa_id', $eid)
                ->lockForUpdate()
                ->findOrFail($id);

            // La aritmética de stock solo tiene sentido en la misma unidad:
            // descontar litros de un stock en kilos es un dato inventado.
            if ($data['unidad_medida'] !== $s->unidad_medida) {
                abort(422, "El movimiento está en «{$data['unidad_medida']}» pero la sustancia se controla en «{$s->unidad_medida}». Convierte la cantidad antes de registrarla.");
            }

            $stockActual = (float) ($s->cantidad_stock ?? 0);
            $cantidad    = (float) $data['cantidad'];

            if ($data['tipo'] === 'ajuste') {
                $nuevoStock = $cantidad;
            } elseif ($data['tipo'] === 'entrada') {
                $nuevoStock = $stockActual + $cantidad;
            } else {
                // Antes se truncaba a 0 en silencio: el movimiento quedaba
                // registrado con una salida que el stock no respaldaba.
                if ($cantidad > $stockActual) {
                    abort(422, "No puedes retirar {$cantidad} {$s->unidad_medida}: solo hay {$stockActual} {$s->unidad_medida} en stock.");
                }
                $nuevoStock = $stockActual - $cantidad;
            }

            $mov = SustanciaMovimiento::create([
                ...$data,
                'sustancia_id'     => $id,
                'empresa_id'       => $eid,
                'usuario_id'       => $request->user()->id,
                'stock_resultante' => $nuevoStock,
            ]);

            $s->update(['cantidad_stock' => $nuevoStock]);

            return [$s, $mov, $nuevoStock];
        });

        [$s, $mov, $nuevoStock] = $resultado;

        $avisos = [];
        if ($s->stock_minimo !== null && $nuevoStock <= (float) $s->stock_minimo) {
            $avisos[] = "Stock bajo: {$nuevoStock} {$s->unidad_medida} — el mínimo es {$s->stock_minimo} {$s->unidad_medida}.";
        }
        // Superar la capacidad declarada del almacén es un riesgo, no un detalle
        if ($s->stock_maximo !== null && $nuevoStock > (float) $s->stock_maximo) {
            $avisos[] = "Stock por encima del máximo autorizado: {$nuevoStock} {$s->unidad_medida} — el máximo es {$s->stock_maximo} {$s->unidad_medida}.";
        }

        return response()->json([
            'movimiento'     => $mov,
            'stock_actual'   => $nuevoStock,
            'stock_minimo'   => $s->stock_minimo,
            'stock_maximo'   => $s->stock_maximo,
            'alerta_stock'   => $s->stock_minimo !== null && $nuevoStock <= (float) $s->stock_minimo,
            'excede_maximo'  => $s->stock_maximo !== null && $nuevoStock > (float) $s->stock_maximo,
            'avisos'         => $avisos,
            'mensaje_alerta' => $avisos ? implode(' ', $avisos) : null,
        ], 201);
    }

    // ── Exposición del Personal ─────────────────────────────────────────────

    public function exposiciones(Request $request, int $id): JsonResponse
    {
        SustanciaPeligrosa::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);

        $evaluador = app(EvaluacionExposicionService::class);

        $exps = SustanciaExposicion::where('sustancia_id', $id)
            ->with('personal:id,nombres,apellidos')
            ->orderByDesc('fecha_evaluacion')
            ->get()
            ->map(function ($e) use ($evaluador) {
                // La discrepancia se calcula al leer: depende de dos campos que
                // pueden editarse por separado.
                $e->discrepancia = $evaluador->hayDiscrepancia(
                    $e->evaluacion_automatica, $e->resultado_evaluacion
                );
                return $e;
            });

        return response()->json($exps);
    }

    public function registrarExposicion(Request $request, int $id): JsonResponse
    {
        $eid = $request->user()->empresa_id;
        $sustancia = SustanciaPeligrosa::where('empresa_id', $eid)->findOrFail($id);

        $data = $request->validate([
            'personal_id'           => 'nullable|integer',
            'nombre_trabajador'     => 'required|string|max:200',
            'cargo'                 => 'nullable|string|max:150',
            'area_id'               => 'nullable|integer',
            'frecuencia'            => 'required|in:ocasional,diaria,semanal,mensual',
            'duracion_horas'        => 'nullable|numeric|min:0',
            'via_exposicion'        => 'nullable|string|max:100',
            'nivel_medido'          => 'nullable|string|max:50',
            'nivel_medido_valor'    => 'nullable|numeric|min:0',
            'nivel_medido_unidad'   => 'nullable|in:' . implode(',', EvaluacionExposicionService::UNIDADES),
            'resultado_evaluacion'  => 'required|in:normal,sobre_limite,sin_medicion',
            'fecha_evaluacion'      => 'nullable|date',
            'medidas_control'       => 'nullable|string|max:300',
            'observaciones'         => 'nullable|string',
        ]);

        // Un valor sin unidad no es medible; se rechaza en vez de guardarlo a medias
        if (isset($data['nivel_medido_valor']) && empty($data['nivel_medido_unidad'])) {
            abort(422, 'Indica la unidad del nivel medido para poder compararlo con el límite.');
        }

        $evaluacion = app(EvaluacionExposicionService::class)->evaluar(
            $sustancia,
            isset($data['nivel_medido_valor']) ? (float) $data['nivel_medido_valor'] : null,
            $data['nivel_medido_unidad'] ?? null,
            isset($data['duracion_horas']) ? (float) $data['duracion_horas'] : null
        );

        $exp = SustanciaExposicion::create([
            ...$data,
            'sustancia_id'          => $id,
            'empresa_id'            => $eid,
            'evaluacion_automatica' => $evaluacion['evaluacion'],
            'pct_limite'            => $evaluacion['pct_limite'],
            'limite_aplicado'       => $evaluacion['limite_aplicado'],
            'motivo_evaluacion'     => $evaluacion['motivo'],
        ]);

        return response()->json([
            'exposicion'   => $exp,
            'evaluacion'   => $evaluacion,
            'discrepancia' => app(EvaluacionExposicionService::class)
                ->hayDiscrepancia($evaluacion['evaluacion'], $data['resultado_evaluacion']),
        ], 201);
    }

    public function eliminarExposicion(Request $request, int $sustId, int $expId): JsonResponse
    {
        SustanciaPeligrosa::where('empresa_id', $request->user()->empresa_id)->findOrFail($sustId);
        SustanciaExposicion::where('sustancia_id', $sustId)->findOrFail($expId)->delete();
        return response()->json(['message' => 'Eliminado']);
    }

    // ── Incompatibilidades ──────────────────────────────────────────────────

    public function incompatibilidades(Request $request): JsonResponse
    {
        $eid = $request->user()->empresa_id;
        $rows = SustanciaIncompatibilidad::where('empresa_id', $eid)
            ->with(['sustanciaA:id,nombre','sustanciaB:id,nombre'])->get();
        return response()->json($rows);
    }

    public function registrarIncompatibilidad(Request $request): JsonResponse
    {
        $eid  = $request->user()->empresa_id;
        $data = $request->validate([
            'sustancia_a_id' => 'required|integer|exists:sustancias_peligrosas,id',
            'sustancia_b_id' => 'required|integer|exists:sustancias_peligrosas,id|different:sustancia_a_id',
            'nivel'          => 'required|in:incompatible,precaucion,compatible',
            'descripcion'    => 'nullable|string|max:300',
        ]);
        $inc = SustanciaIncompatibilidad::updateOrCreate(
            ['empresa_id' => $eid, 'sustancia_a_id' => $data['sustancia_a_id'], 'sustancia_b_id' => $data['sustancia_b_id']],
            ['nivel' => $data['nivel'], 'descripcion' => $data['descripcion'] ?? null, 'created_at' => now()]
        );
        return response()->json($inc->load(['sustanciaA:id,nombre','sustanciaB:id,nombre']), 201);
    }

    public function eliminarIncompatibilidad(Request $request, int $id): JsonResponse
    {
        SustanciaIncompatibilidad::where('empresa_id', $request->user()->empresa_id)->findOrFail($id)->delete();
        return response()->json(['message' => 'Eliminado']);
    }

    /**
     * Reglas de segregación por clase de peligro GHS.
     *
     * Sirven cuando la matriz de incompatibilidades está vacía o incompleta,
     * que es lo habitual: nadie la llena par a par. Son criterios estándar de
     * almacenamiento de químicos, NO sustituyen a la HDS de cada producto.
     */
    private const REGLAS_GHS = [
        ['GHS03', 'GHS02', 'incompatible', 'Comburente junto a inflamable: el comburente aporta oxígeno y puede iniciar o acelerar un incendio.'],
        ['GHS03', 'GHS01', 'incompatible', 'Comburente junto a explosivo: riesgo de iniciación.'],
        ['GHS01', 'GHS02', 'incompatible', 'Explosivo junto a inflamable: un conato de incendio puede propagarse a la carga explosiva.'],
        ['GHS05', 'GHS02', 'precaucion',   'Corrosivo junto a inflamable: una fuga de ácido puede generar calor e ignición.'],
        ['GHS05', 'GHS06', 'precaucion',   'Corrosivo junto a tóxico: un derrame conjunto puede liberar gases tóxicos.'],
        ['GHS05', 'GHS03', 'precaucion',   'Corrosivo junto a comburente: reacción violenta ante derrame.'],
        ['GHS04', 'GHS02', 'precaucion',   'Gas a presión junto a inflamable: riesgo de BLEVE ante incendio.'],
    ];

    /** Clave simétrica: la incompatibilidad A-B es la misma que B-A */
    private function clavePar(int $a, int $b): string
    {
        return min($a, $b) . '-' . max($a, $b);
    }

    /** Primera regla GHS que aplique entre dos juegos de pictogramas */
    private function reglaGhs(array $picsA, array $picsB): ?array
    {
        foreach (self::REGLAS_GHS as [$c1, $c2, $nivel, $motivo]) {
            $cruza = (in_array($c1, $picsA, true) && in_array($c2, $picsB, true))
                  || (in_array($c2, $picsA, true) && in_array($c1, $picsB, true));

            if ($cruza) {
                return ['nivel' => $nivel, 'motivo' => $motivo, 'clases' => [$c1, $c2]];
            }
        }
        return null;
    }

    /**
     * GET /api/sustancias/incompatibilidades/almacenamiento
     *
     * Cruza qué sustancias comparten ubicación física contra la matriz de
     * incompatibilidades y contra las reglas de segregación GHS. Es el control
     * que convierte la matriz en algo accionable: no basta con declarar que dos
     * productos son incompatibles si nadie comprueba que están en el mismo
     * estante.
     */
    public function verificarAlmacenamiento(Request $request): JsonResponse
    {
        $eid = $request->user()->empresa_id;

        $sustancias = SustanciaPeligrosa::where('empresa_id', $eid)
            ->where('activo', true)
            ->whereNotNull('ubicacion_almacenamiento')
            ->where('ubicacion_almacenamiento', '<>', '')
            ->get(['id', 'nombre', 'ubicacion_almacenamiento', 'pictogramas_ghs',
                   'nivel_riesgo', 'cantidad_stock', 'unidad_medida']);

        // Matriz declarada por el usuario, indexada de forma simétrica
        $declaradas = [];
        foreach (SustanciaIncompatibilidad::where('empresa_id', $eid)
                    ->whereIn('nivel', ['incompatible', 'precaucion'])->get() as $d) {
            $declaradas[$this->clavePar($d->sustancia_a_id, $d->sustancia_b_id)] = $d;
        }

        $grupos = $sustancias->groupBy(
            fn($s) => mb_strtolower(trim($s->ubicacion_almacenamiento))
        );

        $conflictos = [];

        foreach ($grupos as $items) {
            if ($items->count() < 2) continue;

            $lista = $items->values();
            for ($i = 0; $i < $lista->count(); $i++) {
                for ($j = $i + 1; $j < $lista->count(); $j++) {
                    $a = $lista[$i];
                    $b = $lista[$j];

                    $declarada = $declaradas[$this->clavePar($a->id, $b->id)] ?? null;

                    if ($declarada) {
                        $nivel  = $declarada->nivel;
                        $motivo = $declarada->descripcion ?: 'Declarada en la matriz de incompatibilidades.';
                        $origen = 'matriz';
                        $clases = null;
                    } else {
                        $regla = $this->reglaGhs($a->pictogramas_ghs ?? [], $b->pictogramas_ghs ?? []);
                        if (!$regla) continue;
                        $nivel  = $regla['nivel'];
                        $motivo = $regla['motivo'];
                        $origen = 'clase_ghs';
                        $clases = $regla['clases'];
                    }

                    $conflictos[] = [
                        'ubicacion' => $a->ubicacion_almacenamiento,
                        'nivel'     => $nivel,
                        'origen'    => $origen,
                        'motivo'    => $motivo,
                        'clases'    => $clases,
                        'sustancia_a' => [
                            'id' => $a->id, 'nombre' => $a->nombre,
                            'nivel_riesgo' => $a->nivel_riesgo,
                            'stock' => $a->cantidad_stock, 'unidad' => $a->unidad_medida,
                            'pictogramas' => $a->pictogramas_ghs ?? [],
                        ],
                        'sustancia_b' => [
                            'id' => $b->id, 'nombre' => $b->nombre,
                            'nivel_riesgo' => $b->nivel_riesgo,
                            'stock' => $b->cantidad_stock, 'unidad' => $b->unidad_medida,
                            'pictogramas' => $b->pictogramas_ghs ?? [],
                        ],
                    ];
                }
            }
        }

        // Lo incompatible primero: es lo que hay que separar hoy
        usort($conflictos, fn($x, $y) =>
            ($x['nivel'] === 'incompatible' ? 0 : 1) <=> ($y['nivel'] === 'incompatible' ? 0 : 1)
        );

        $ubicacionesAfectadas = collect($conflictos)->pluck('ubicacion')->unique()->values();

        return response()->json([
            'conflictos' => $conflictos,
            'resumen'    => [
                'sustancias_ubicadas'   => $sustancias->count(),
                'sin_ubicacion'         => SustanciaPeligrosa::where('empresa_id', $eid)
                                            ->where('activo', true)
                                            ->where(fn($q) => $q->whereNull('ubicacion_almacenamiento')
                                                                ->orWhere('ubicacion_almacenamiento', ''))
                                            ->count(),
                'ubicaciones'           => $grupos->count(),
                'ubicaciones_afectadas' => $ubicacionesAfectadas->count(),
                'incompatibles'         => collect($conflictos)->where('nivel', 'incompatible')->count(),
                'precaucion'            => collect($conflictos)->where('nivel', 'precaucion')->count(),
                'por_matriz'            => collect($conflictos)->where('origen', 'matriz')->count(),
                'por_clase_ghs'         => collect($conflictos)->where('origen', 'clase_ghs')->count(),
            ],
        ]);
    }

    // ── Capacitaciones ──────────────────────────────────────────────────────

    public function capacitaciones(Request $request, int $id): JsonResponse
    {
        SustanciaPeligrosa::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);
        return response()->json(SustanciaCapacitacion::where('sustancia_id', $id)
            ->with('personal:id,nombres,apellidos')->orderByDesc('fecha_capacitacion')->get());
    }

    public function registrarCapacitacion(Request $request, int $id): JsonResponse
    {
        $eid  = $request->user()->empresa_id;
        SustanciaPeligrosa::where('empresa_id', $eid)->findOrFail($id);
        $data = $request->validate([
            'personal_id'       => 'nullable|integer',
            'nombre_trabajador' => 'required|string|max:200',
            'fecha_capacitacion'=> 'required|date',
            'fecha_vencimiento' => 'nullable|date|after:fecha_capacitacion',
            'tipo_capacitacion' => 'nullable|string|max:100',
            'autorizado'        => 'boolean',
            'observaciones'     => 'nullable|string',
        ]);
        $cap = SustanciaCapacitacion::create([...$data, 'sustancia_id' => $id, 'empresa_id' => $eid]);
        return response()->json($cap, 201);
    }

    public function eliminarCapacitacion(Request $request, int $sustId, int $capId): JsonResponse
    {
        SustanciaPeligrosa::where('empresa_id', $request->user()->empresa_id)->findOrFail($sustId);
        SustanciaCapacitacion::where('sustancia_id', $sustId)->findOrFail($capId)->delete();
        return response()->json(['message' => 'Eliminado']);
    }

    // ── Etiqueta GHS (datos para imprimir) ─────────────────────────────────

    public function etiqueta(Request $request, int $id): JsonResponse
    {
        $s = SustanciaPeligrosa::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);
        return response()->json([
            'nombre'              => $s->nombre,
            'nombre_quimico'      => $s->nombre_quimico,
            'formula'             => $s->formula_quimica,
            'cas'                 => $s->cas_number,
            'onu'                 => $s->numero_onu,
            'pictogramas'         => $s->pictogramas_ghs ?? [],
            'nivel_riesgo'        => $s->nivel_riesgo,
            'estado_fisico'       => $s->estado_fisico,
            'requiere_epp'        => $s->requiere_epp ?? [],
            'medidas_control'     => $s->medidas_control,
            'proveedor'           => $s->proveedor,
            'nfpa_salud'          => $s->nfpa_salud ?? 0,
            'nfpa_inflamabilidad' => $s->nfpa_inflamabilidad ?? 0,
            'nfpa_inestabilidad'  => $s->nfpa_inestabilidad ?? 0,
            'nfpa_especial'       => $s->nfpa_especial,
        ]);
    }

    // ── Exportar Excel ──────────────────────────────────────────────────────

    public function exportar(Request $request): JsonResponse
    {
        $eid  = $request->user()->empresa_id;
        $rows = SustanciaPeligrosa::where('empresa_id', $eid)
            ->orderByRaw("FIELD(nivel_riesgo,'muy_alto','alto','medio','bajo')")
            ->orderBy('nombre')->get();

        $data = $rows->map(fn($s) => [
            'Nombre'             => $s->nombre,
            'Nombre Químico'     => $s->nombre_quimico,
            'Fórmula'            => $s->formula_quimica,
            'N° CAS'             => $s->cas_number,
            'N° ONU'             => $s->numero_onu,
            'Estado Físico'      => $s->estado_fisico,
            'Pictogramas GHS'    => implode(', ', $s->pictogramas_ghs ?? []),
            'Nivel Riesgo'       => $s->nivel_riesgo,
            'Stock'              => $s->cantidad_stock,
            'Unidad'             => $s->unidad_medida,
            'Área de uso'        => $s->area_uso,
            'Almacenamiento'     => $s->ubicacion_almacenamiento,
            'Proveedor'          => $s->proveedor,
            'EPP Requerido'      => implode(', ', $s->requiere_epp ?? []),
            'HDS Disponible'     => $s->hds_disponible ? 'Sí' : 'No',
            'HDS Actualizada'    => $s->hds_actualizado ? 'Sí' : 'No',
            'HDS Vencimiento'    => $s->hds_fecha_vencimiento?->format('d/m/Y'),
            'TLV-TWA'            => $s->limite_tlv_twa,
            'STEL'               => $s->limite_stel,
            'IDLH'               => $s->limite_idlh,
            'Incompatibilidades' => $s->incompatibilidades,
            'Medidas Control'    => $s->medidas_control,
            'Activo'             => $s->activo ? 'Sí' : 'No',
        ]);
        return response()->json($data);
    }

    // ── Inventario Stock por Área ───────────────────────────────────────────

    public function inventarioStock(Request $request): JsonResponse
    {
        $eid   = $request->user()->empresa_id;
        $area  = $request->filled('area') ? trim($request->area) : null;
        $riesgo = $request->filled('nivel_riesgo') ? $request->nivel_riesgo : null;

        $query = SustanciaPeligrosa::where('empresa_id', $eid)
            ->where('activo', true);

        if ($area)   $query->where('area_uso', 'like', "%{$area}%");
        if ($riesgo) $query->where('nivel_riesgo', $riesgo);

        $sustancias = $query->orderBy('area_uso')->orderBy('nombre')
            ->get(['id','nombre','nombre_quimico','area_uso','nivel_riesgo',
                   'cantidad_stock','stock_minimo','stock_maximo','unidad_medida',
                   'pictogramas_ghs']);

        // Para cada sustancia, traer totales de movimientos
        $ids = $sustancias->pluck('id');

        $totales = SustanciaMovimiento::whereIn('sustancia_id', $ids)
            ->selectRaw('sustancia_id, tipo, SUM(cantidad) as total')
            ->groupBy('sustancia_id','tipo')
            ->get()
            ->groupBy('sustancia_id');

        // Último movimiento de cada sustancia
        $ultimosMovs = SustanciaMovimiento::whereIn('sustancia_id', $ids)
            ->selectRaw('sustancia_id, MAX(fecha) as ultima_fecha')
            ->groupBy('sustancia_id')
            ->pluck('ultima_fecha','sustancia_id');

        $resultado = $sustancias->map(function ($s) use ($totales, $ultimosMovs) {
            $movsSust  = $totales->get($s->id, collect());
            $entradas  = (float)($movsSust->firstWhere('tipo','entrada')?->total ?? 0);
            $salidas   = (float)($movsSust->firstWhere('tipo','salida')?->total ?? 0);
            $ajustes   = (float)($movsSust->firstWhere('tipo','ajuste')?->total ?? 0);
            $saldo     = (float)($s->cantidad_stock ?? 0);
            $bajo      = $s->stock_minimo && $saldo <= (float)$s->stock_minimo;

            return [
                'id'            => $s->id,
                'nombre'        => $s->nombre,
                'nombre_quimico'=> $s->nombre_quimico,
                'area_uso'      => $s->area_uso ?? 'Sin área',
                'nivel_riesgo'  => $s->nivel_riesgo,
                'pictogramas'   => $s->pictogramas_ghs ?? [],
                'total_entradas'=> $entradas,
                'total_salidas' => $salidas,
                'total_ajustes' => $ajustes,
                'saldo'         => $saldo,
                'stock_minimo'  => $s->stock_minimo,
                'stock_maximo'  => $s->stock_maximo,
                'unidad_medida' => $s->unidad_medida,
                'alerta_stock'  => $bajo,
                'ultima_fecha'  => $ultimosMovs[$s->id] ?? null,
            ];
        });

        // Agrupar por área y calcular totales
        $porArea = $resultado->groupBy('area_uso')->map(function ($items, $area) {
            return [
                'area'       => $area,
                'sustancias' => $items->values(),
                'total_items'=> $items->count(),
                'bajo_stock' => $items->where('alerta_stock', true)->count(),
                'sin_stock'  => $items->where('saldo', 0)->count(),
            ];
        })->values();

        // Áreas únicas disponibles
        $areas = SustanciaPeligrosa::where('empresa_id', $eid)
            ->whereNotNull('area_uso')
            ->distinct()->pluck('area_uso')->sort()->values();

        return response()->json([
            'por_area'        => $porArea,
            'areas_disponibles' => $areas,
            'total_sustancias'=> $resultado->count(),
            'total_bajo_stock'=> $resultado->where('alerta_stock', true)->count(),
        ]);
    }

    // ── Importar Sustancias desde Excel ────────────────────────────────────

    public function importarSustancias(Request $request): JsonResponse
    {
        $request->validate(['filas' => 'required|array|min:1', 'filas.*.nombre' => 'required|string']);
        $eid     = $request->user()->empresa_id;
        $ok      = 0;
        $errores = [];

        $ESTADO_MAP  = ['sólido'=>'solido','solido'=>'solido','líquido'=>'liquido','liquido'=>'liquido','gas'=>'gas','aerosol'=>'aerosol','polvo'=>'polvo'];
        $RIESGO_MAP  = ['bajo'=>'bajo','medio'=>'medio','alto'=>'alto','muy alto'=>'muy_alto','muy_alto'=>'muy_alto'];
        $UNIDAD_MAP  = ['kg'=>'kg','g'=>'g','l'=>'L','L'=>'L','ml'=>'mL','mL'=>'mL','m3'=>'m3','unidad'=>'unidad','und'=>'unidad'];
        $BOOL_MAP    = ['si'=>true,'sí'=>true,'yes'=>true,'1'=>true,'true'=>true,'no'=>false,'0'=>false,'false'=>false];

        foreach ($request->filas as $i => $fila) {
            $fila = array_map('trim', $fila);
            try {
                $estadoFisico = $ESTADO_MAP[strtolower($fila['estado_fisico'] ?? 'liquido')] ?? 'liquido';
                $nivelRiesgo  = $RIESGO_MAP[strtolower($fila['nivel_riesgo']  ?? 'medio')]   ?? 'medio';
                $unidad       = $UNIDAD_MAP[$fila['unidad_medida'] ?? 'L'] ?? 'L';

                // Pictogramas: "GHS01, GHS02" → ['GHS01','GHS02']
                $pics = [];
                if (!empty($fila['pictogramas_ghs'])) {
                    $pics = array_filter(array_map('trim', explode(',', $fila['pictogramas_ghs'])),
                        fn($p) => preg_match('/^GHS0[1-9]$/', $p));
                    $pics = array_values($pics);
                }

                // EPP: "Guantes de nitrilo, Lentes" → array
                $epp = [];
                if (!empty($fila['requiere_epp'])) {
                    $epp = array_filter(array_map('trim', explode(',', $fila['requiere_epp'])));
                    $epp = array_values($epp);
                }

                SustanciaPeligrosa::create([
                    'empresa_id'               => $eid,
                    'nombre'                   => $fila['nombre'],
                    'nombre_quimico'           => $fila['nombre_quimico']   ?? null,
                    'cas_number'               => $fila['cas_number']        ?? null,
                    'numero_onu'               => $fila['numero_onu']        ?? null,
                    'formula_quimica'          => $fila['formula_quimica']   ?? null,
                    'estado_fisico'            => $estadoFisico,
                    'pictogramas_ghs'          => $pics ?: null,
                    'nivel_riesgo'             => $nivelRiesgo,
                    'area_uso'                 => $fila['area_uso']          ?? null,
                    'cantidad_stock'           => is_numeric($fila['cantidad_stock'] ?? '') ? $fila['cantidad_stock'] : null,
                    'stock_minimo'             => is_numeric($fila['stock_minimo']   ?? '') ? $fila['stock_minimo']   : null,
                    'stock_maximo'             => is_numeric($fila['stock_maximo']   ?? '') ? $fila['stock_maximo']   : null,
                    'unidad_medida'            => $unidad,
                    'ubicacion_almacenamiento' => $fila['ubicacion_almacenamiento'] ?? null,
                    'proveedor'                => $fila['proveedor']          ?? null,
                    'requiere_epp'             => $epp ?: null,
                    'incompatibilidades'       => $fila['incompatibilidades'] ?? null,
                    'medidas_control'          => $fila['medidas_control']    ?? null,
                    'procedimiento_derrame'    => $fila['procedimiento_derrame'] ?? null,
                    'hds_disponible'           => $BOOL_MAP[strtolower($fila['hds_disponible'] ?? 'no')] ?? false,
                    'hds_actualizado'          => $BOOL_MAP[strtolower($fila['hds_actualizado'] ?? 'no')] ?? false,
                    'nfpa_salud'               => is_numeric($fila['nfpa_salud']         ?? '') ? (int)$fila['nfpa_salud']         : 0,
                    'nfpa_inflamabilidad'      => is_numeric($fila['nfpa_inflamabilidad'] ?? '') ? (int)$fila['nfpa_inflamabilidad'] : 0,
                    'nfpa_inestabilidad'       => is_numeric($fila['nfpa_inestabilidad']  ?? '') ? (int)$fila['nfpa_inestabilidad']  : 0,
                    'nfpa_especial'            => $fila['nfpa_especial']     ?? null,
                    'observaciones'            => $fila['observaciones']     ?? null,
                    'activo'                   => true,
                ]);
                $ok++;
            } catch (\Exception $e) {
                $errores[] = ['fila' => $i + 2, 'nombre' => $fila['nombre'] ?? '—', 'error' => $e->getMessage()];
            }
        }

        return response()->json(['importados' => $ok, 'errores' => $errores, 'total' => count($request->filas)]);
    }

    // ── Importar Trabajadores (Capacitaciones / Exposiciones) ───────────────

    public function importarTrabajadores(Request $request): JsonResponse
    {
        $request->validate([
            'tipo'        => 'required|in:capacitacion,exposicion',
            'filas'       => 'required|array|min:1',
            'filas.*.nombre_trabajador' => 'required|string',
            'filas.*.sustancia'         => 'required|string',
        ]);

        $eid    = $request->user()->empresa_id;
        $tipo   = $request->tipo;
        $ok     = 0;
        $errores= [];

        $BOOL_MAP = ['si'=>true,'sí'=>true,'yes'=>true,'1'=>true,'true'=>true,'no'=>false,'0'=>false,'false'=>false];
        $FREC_MAP = ['ocasional'=>'ocasional','diaria'=>'diaria','semanal'=>'semanal','mensual'=>'mensual'];
        $RES_MAP  = ['normal'=>'normal','sobre limite'=>'sobre_limite','sobre_limite'=>'sobre_limite','sin medicion'=>'sin_medicion','sin_medicion'=>'sin_medicion'];

        // Pre-cargar sustancias para lookup por nombre
        $sustancias = SustanciaPeligrosa::where('empresa_id', $eid)->get(['id','nombre'])->keyBy(fn($s) => strtolower(trim($s->nombre)));

        foreach ($request->filas as $i => $fila) {
            $fila = array_map('trim', $fila);
            $sustNombre = strtolower($fila['sustancia'] ?? '');
            $sustancia  = $sustancias[$sustNombre] ?? null;

            if (!$sustancia) {
                $errores[] = ['fila' => $i+2, 'nombre' => $fila['nombre_trabajador'], 'error' => "Sustancia '{$fila['sustancia']}' no encontrada"];
                continue;
            }

            try {
                if ($tipo === 'capacitacion') {
                    SustanciaCapacitacion::create([
                        'sustancia_id'       => $sustancia->id,
                        'empresa_id'         => $eid,
                        'nombre_trabajador'  => $fila['nombre_trabajador'],
                        'fecha_capacitacion' => $fila['fecha_capacitacion'] ?? now()->toDateString(),
                        'fecha_vencimiento'  => $fila['fecha_vencimiento']  ?? null,
                        'tipo_capacitacion'  => $fila['tipo_capacitacion']  ?? 'Manejo seguro de sustancias peligrosas',
                        'autorizado'         => $BOOL_MAP[strtolower($fila['autorizado'] ?? 'si')] ?? true,
                        'observaciones'      => $fila['observaciones']      ?? null,
                    ]);
                } else {
                    SustanciaExposicion::create([
                        'sustancia_id'        => $sustancia->id,
                        'empresa_id'          => $eid,
                        'nombre_trabajador'   => $fila['nombre_trabajador'],
                        'cargo'               => $fila['cargo']              ?? null,
                        'frecuencia'          => $FREC_MAP[strtolower($fila['frecuencia'] ?? 'ocasional')] ?? 'ocasional',
                        'duracion_horas'      => is_numeric($fila['duracion_horas'] ?? '') ? $fila['duracion_horas'] : null,
                        'via_exposicion'      => $fila['via_exposicion']     ?? null,
                        'nivel_medido'        => $fila['nivel_medido']       ?? null,
                        'resultado_evaluacion'=> $RES_MAP[strtolower($fila['resultado_evaluacion'] ?? 'sin_medicion')] ?? 'sin_medicion',
                        'fecha_evaluacion'    => $fila['fecha_evaluacion']   ?? null,
                        'medidas_control'     => $fila['medidas_control']    ?? null,
                    ]);
                }
                $ok++;
            } catch (\Exception $e) {
                $errores[] = ['fila' => $i+2, 'nombre' => $fila['nombre_trabajador'], 'error' => $e->getMessage()];
            }
        }

        return response()->json(['importados' => $ok, 'errores' => $errores, 'total' => count($request->filas)]);
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private function validar(Request $request, bool $partial = false): array
    {
        $r = $partial ? 'sometimes' : 'required';
        return $request->validate([
            'nombre'                   => "{$r}|string|max:200",
            'nombre_quimico'           => 'nullable|string|max:200',
            'cas_number'               => 'nullable|string|max:50',
            'numero_onu'               => 'nullable|string|max:20',
            'formula_quimica'          => 'nullable|string|max:100',
            'estado_fisico'            => "{$r}|in:solido,liquido,gas,aerosol,polvo",
            'pictogramas_ghs'          => 'nullable|array',
            'pictogramas_ghs.*'        => 'string|in:GHS01,GHS02,GHS03,GHS04,GHS05,GHS06,GHS07,GHS08,GHS09',
            'nivel_riesgo'             => "{$r}|in:bajo,medio,alto,muy_alto",
            'area_uso'                 => 'nullable|string|max:300',
            'cantidad_stock'           => 'nullable|numeric|min:0',
            'stock_minimo'             => 'nullable|numeric|min:0',
            'stock_maximo'             => 'nullable|numeric|min:0',
            'unidad_medida'            => "{$r}|in:kg,g,L,mL,m3,unidad",
            'ubicacion_almacenamiento' => 'nullable|string|max:200',
            'proveedor'                => 'nullable|string|max:200',
            'requiere_epp'             => 'nullable|array',
            'incompatibilidades'       => 'nullable|string',
            'medidas_control'          => 'nullable|string',
            'procedimiento_derrame'    => 'nullable|string',
            'hds_disponible'           => 'boolean',
            'hds_actualizado'          => 'boolean',
            'hds_fecha_emision'        => 'nullable|date',
            'hds_fecha_vencimiento'    => 'nullable|date',
            'nfpa_salud'               => 'nullable|integer|min:0|max:4',
            'nfpa_inflamabilidad'      => 'nullable|integer|min:0|max:4',
            'nfpa_inestabilidad'       => 'nullable|integer|min:0|max:4',
            'nfpa_especial'            => 'nullable|string|max:20',
            // Texto libre: se conserva para notas de la ficha ("techo", "piel")
            'limite_tlv_twa'           => 'nullable|string|max:50',
            'limite_stel'              => 'nullable|string|max:50',
            'limite_idlh'              => 'nullable|string|max:50',
            // Valor y unidad separados: es lo único comparable con una medición
            'limite_tlv_twa_valor'     => 'nullable|numeric|min:0',
            'limite_tlv_twa_unidad'    => 'nullable|in:' . implode(',', EvaluacionExposicionService::UNIDADES),
            'limite_stel_valor'        => 'nullable|numeric|min:0',
            'limite_stel_unidad'       => 'nullable|in:' . implode(',', EvaluacionExposicionService::UNIDADES),
            'limite_idlh_valor'        => 'nullable|numeric|min:0',
            'limite_idlh_unidad'       => 'nullable|in:' . implode(',', EvaluacionExposicionService::UNIDADES),
            'observaciones'            => 'nullable|string',
            'activo'                   => 'boolean',
        ]);
    }
}
