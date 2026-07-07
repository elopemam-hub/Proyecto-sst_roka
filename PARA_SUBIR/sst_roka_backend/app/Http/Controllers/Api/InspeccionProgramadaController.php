<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InspeccionProgramada;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class InspeccionProgramadaController extends Controller
{
    // ──────────────────────────────────────────────────────────────────────────
    // GET /api/inspecciones-programadas
    // Lista paginada con filtros. Marca vencidas antes de responder.
    // ──────────────────────────────────────────────────────────────────────────
    public function index(Request $request): JsonResponse
    {
        $empresaId = $request->user()->empresa_id;

        // Marcar pendientes caducadas como vencidas
        InspeccionProgramada::marcarVencidas($empresaId);

        $query = InspeccionProgramada::where('empresa_id', $empresaId)
            ->with([
                'equipo:id,codigo,nombre,tipo,area_id',
                'equipo.area:id,nombre',
                'equipo.equipoTipo:id,nombre',
                'plantilla:id,nombre,codigo,frecuencia_inspeccion',
            ]);

        if ($request->filled('estado'))    $query->where('estado', $request->estado);
        if ($request->filled('equipo_id')) $query->where('equipo_id', $request->equipo_id);
        if ($request->filled('plantilla_id')) $query->where('plantilla_id', $request->plantilla_id);
        if ($request->filled('frecuencia')) {
            $query->whereHas('plantilla', fn($q) => $q->where('frecuencia_inspeccion', $request->frecuencia));
        }

        if ($request->filled('fecha_desde')) {
            $query->where('fecha_programada', '>=', $request->fecha_desde);
        }
        if ($request->filled('fecha_hasta')) {
            $query->where('fecha_programada', '<=', $request->fecha_hasta);
        }
        if ($request->filled('periodo')) {
            $hoy = Carbon::today();
            match ($request->periodo) {
                'hoy'       => $query->whereDate('fecha_programada', $hoy),
                'semana'    => $query->whereBetween('fecha_programada', [$hoy, $hoy->copy()->addDays(6)]),
                'mes'       => $query->whereBetween('fecha_programada', [$hoy->copy()->startOfMonth(), $hoy->copy()->endOfMonth()]),
                'vencidas'  => $query->where('estado', 'vencida'),
                default     => null,
            };
        }

        $perPage = min($request->integer('per_page', 20), 100);

        return response()->json(
            $query->orderBy('fecha_programada')->orderBy('equipo_id')->paginate($perPage)
        );
    }

    // ──────────────────────────────────────────────────────────────────────────
    // GET /api/inspecciones-programadas/dashboard
    // KPIs: pendientes hoy, vencidas, próximos 7 días, realizadas este mes
    // ──────────────────────────────────────────────────────────────────────────
    public function dashboard(Request $request): JsonResponse
    {
        $empresaId = $request->user()->empresa_id;

        InspeccionProgramada::marcarVencidas($empresaId);

        $hoy         = Carbon::today();
        $fin7        = $hoy->copy()->addDays(6);
        $inicioMes   = $hoy->copy()->startOfMonth();
        $finMes      = $hoy->copy()->endOfMonth();

        $base = fn() => InspeccionProgramada::where('empresa_id', $empresaId);

        $pendientesHoy  = $base()->where('estado', 'pendiente')->whereDate('fecha_programada', $hoy)->count();
        $vencidas       = $base()->where('estado', 'vencida')->count();
        $proximos7      = $base()->where('estado', 'pendiente')
                                 ->whereBetween('fecha_programada', [$hoy->copy()->addDay(), $fin7])->count();
        $realizadasMes  = $base()->where('estado', 'realizada')
                                 ->whereBetween('fecha_realizada', [$inicioMes, $finMes])->count();
        $totalMes       = $base()->whereBetween('fecha_programada', [$inicioMes, $finMes])->count();

        // Detalle de pendientes de hoy (máx. 10 para preview)
        $detallePendientes = InspeccionProgramada::where('empresa_id', $empresaId)
            ->where('estado', 'pendiente')
            ->whereDate('fecha_programada', $hoy)
            ->with([
                'equipo:id,codigo,nombre',
                'equipo.area:id,nombre',
                'plantilla:id,nombre',
            ])
            ->limit(10)
            ->get();

        // Porcentaje de cumplimiento del mes
        $cumplimientoMes = $totalMes > 0 ? round(($realizadasMes / $totalMes) * 100, 1) : null;

        // Tendencia por estado en el mes
        $porEstado = $base()
            ->whereBetween('fecha_programada', [$inicioMes, $finMes])
            ->selectRaw('estado, count(*) as total')
            ->groupBy('estado')
            ->pluck('total', 'estado');

        return response()->json([
            'pendientes_hoy'     => $pendientesHoy,
            'vencidas'           => $vencidas,
            'proximos_7_dias'    => $proximos7,
            'realizadas_mes'     => $realizadasMes,
            'total_mes'          => $totalMes,
            'cumplimiento_mes'   => $cumplimientoMes,
            'por_estado_mes'     => $porEstado,
            'detalle_hoy'        => $detallePendientes,
        ]);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // POST /api/inspecciones-programadas/generar
    // Genera el programa a partir de los pares equipo↔plantilla activos.
    // ──────────────────────────────────────────────────────────────────────────
    public function generar(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'fecha_inicio'  => 'required|date',
            'fecha_fin'     => 'required|date|after_or_equal:fecha_inicio',
            'equipo_ids'    => 'nullable|array',
            'equipo_ids.*'  => 'integer|exists:equipos,id',
            'solo_operativos' => 'boolean',
        ]);

        $empresaId = $request->user()->empresa_id;
        $inicio    = Carbon::parse($validated['fecha_inicio'])->startOfDay();
        $fin       = Carbon::parse($validated['fecha_fin'])->endOfDay();
        $soloOp    = $validated['solo_operativos'] ?? true;

        if ($fin->diffInDays($inicio) > 180) {
            return response()->json(['message' => 'El período no puede superar 180 días.'], 422);
        }

        // Obtener pares equipo ↔ plantilla activos de esta empresa
        // La frecuencia ahora está en el pivot (equipos_plantillas), no en el catálogo
        $query = DB::table('equipos_plantillas')
            ->join('equipos', 'equipos_plantillas.equipo_id', '=', 'equipos.id')
            ->where('equipos.empresa_id', $empresaId)
            ->where('equipos_plantillas.activo', true)
            ->whereNotNull('equipos_plantillas.frecuencia_inspeccion')
            ->select(
                'equipos_plantillas.equipo_id',
                'equipos_plantillas.plantilla_id',
                'equipos_plantillas.frecuencia_inspeccion'
            );

        if ($soloOp) {
            $query->where('equipos.estado', 'operativo');
        }
        if (!empty($validated['equipo_ids'])) {
            $query->whereIn('equipos_plantillas.equipo_id', $validated['equipo_ids']);
        }

        $pares = $query->get();

        if ($pares->isEmpty()) {
            return response()->json([
                'message'    => 'No hay equipos con plantillas de inspección activas para el período.',
                'insertadas' => 0,
            ]);
        }

        $ahora   = now();
        $filas   = [];

        foreach ($pares as $par) {
            $fechas = $this->calcularFechas($par->frecuencia_inspeccion, $inicio->copy(), $fin->copy());
            foreach ($fechas as $fecha) {
                $filas[] = [
                    'empresa_id'       => $empresaId,
                    'equipo_id'        => $par->equipo_id,
                    'plantilla_id'     => $par->plantilla_id,
                    'fecha_programada' => $fecha,
                    'estado'           => 'pendiente',
                    'created_at'       => $ahora,
                    'updated_at'       => $ahora,
                ];
            }
        }

        $insertadas = 0;
        foreach (array_chunk($filas, 200) as $chunk) {
            $insertadas += DB::table('inspeccion_programadas')->insertOrIgnore($chunk);
        }

        return response()->json([
            'message'    => "Programa generado: {$insertadas} inspecciones nuevas para {$pares->count()} par(es) equipo-plantilla.",
            'insertadas' => $insertadas,
            'omitidas'   => count($filas) - $insertadas,
            'pares'      => $pares->count(),
        ]);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // PUT /api/inspecciones-programadas/{id}/realizar
    // Marca la inspección programada como realizada y la enlaza a la inspeccion_id.
    // ──────────────────────────────────────────────────────────────────────────
    public function realizar(Request $request, int $id): JsonResponse
    {
        $programada = InspeccionProgramada::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);

        $validated = $request->validate([
            'inspeccion_id' => 'nullable|exists:inspecciones,id',
            'observaciones' => 'nullable|string|max:500',
        ]);

        $programada->update([
            'estado'         => 'realizada',
            'fecha_realizada'=> Carbon::today(),
            'inspeccion_id'  => $validated['inspeccion_id'] ?? null,
            'observaciones'  => $validated['observaciones'] ?? $programada->observaciones,
        ]);

        return response()->json($programada->load(['equipo:id,codigo,nombre', 'plantilla:id,nombre,frecuencia_inspeccion']));
    }

    // ──────────────────────────────────────────────────────────────────────────
    // PUT /api/inspecciones-programadas/{id}/omitir
    // Marca como omitida con motivo.
    // ──────────────────────────────────────────────────────────────────────────
    public function omitir(Request $request, int $id): JsonResponse
    {
        $programada = InspeccionProgramada::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);

        $validated = $request->validate([
            'observaciones' => 'required|string|max:500',
        ]);

        $programada->update([
            'estado'        => 'omitida',
            'observaciones' => $validated['observaciones'],
        ]);

        return response()->json($programada);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // DELETE /api/inspecciones-programadas/{id}
    // Elimina una programación individual.
    // ──────────────────────────────────────────────────────────────────────────
    public function destroy(Request $request, int $id): JsonResponse
    {
        $programada = InspeccionProgramada::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);
        $programada->delete();
        return response()->json(['message' => 'Programación eliminada']);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // DELETE /api/inspecciones-programadas/limpiar
    // Elimina todas las pendientes/vencidas no realizadas de un período.
    // ──────────────────────────────────────────────────────────────────────────
    public function limpiar(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'fecha_desde' => 'required|date',
            'fecha_hasta' => 'required|date|after_or_equal:fecha_desde',
        ]);

        $eliminadas = InspeccionProgramada::where('empresa_id', $request->user()->empresa_id)
            ->whereIn('estado', ['pendiente', 'vencida'])
            ->whereBetween('fecha_programada', [$validated['fecha_desde'], $validated['fecha_hasta']])
            ->delete();

        return response()->json(['message' => "{$eliminadas} programaciones eliminadas."]);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Helpers privados
    // ──────────────────────────────────────────────────────────────────────────

    private function calcularFechas(string $frecuencia, Carbon $inicio, Carbon $fin): array
    {
        $fechas  = [];
        $cursor  = $inicio->copy()->startOfDay();

        while ($cursor->lte($fin)) {
            $fechas[] = $cursor->toDateString();

            match ($frecuencia) {
                'diaria'     => $cursor->addDay(),
                'semanal'    => $cursor->addWeek(),
                'mensual'    => $cursor->addMonth(),
                'trimestral' => $cursor->addMonths(3),
                'semestral'  => $cursor->addMonths(6),
                'anual'      => $cursor->addYear(),
                default      => $cursor->addMonth(),
            };
        }

        return $fechas;
    }
}
