<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EquipoAsignacion;
use App\Models\EquipoAsignacionRegla;
use App\Models\Equipo;
use App\Models\Usuario;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class EquipoAsignacionController extends Controller
{
    // ──────────────────────────────────────────────────────────────────────────
    // GET /api/equipo-asignaciones
    // Lista filtrada por fecha, turno, usuario, equipo, estado
    // ──────────────────────────────────────────────────────────────────────────
    public function index(Request $request): JsonResponse
    {
        $empresaId = $request->user()->empresa_id;

        EquipoAsignacion::marcarVencidas($empresaId);

        $query = EquipoAsignacion::where('empresa_id', $empresaId)
            ->with([
                'equipo:id,codigo,nombre,tipo,area_id,estado',
                'equipo.area:id,nombre',
                'equipo.equipoTipo:id,nombre,icono',
                'usuario:id,nombre,email,rol',
                'usuario.personal:id,nombres,apellidos,foto_path',
                'inspeccion:id,codigo,estado,porcentaje_cumplimiento',
            ]);

        if ($request->filled('fecha'))       $query->whereDate('fecha', $request->fecha);
        if ($request->filled('fecha_desde')) $query->where('fecha', '>=', $request->fecha_desde);
        if ($request->filled('fecha_hasta')) $query->where('fecha', '<=', $request->fecha_hasta);
        if ($request->filled('turno'))       $query->where('turno', $request->turno);
        if ($request->filled('estado'))      $query->where('estado', $request->estado);
        if ($request->filled('usuario_id'))  $query->where('usuario_id', $request->usuario_id);
        if ($request->filled('equipo_id'))   $query->where('equipo_id', $request->equipo_id);
        if ($request->filled('area_id')) {
            $query->whereHas('equipo', fn($q) => $q->where('area_id', $request->area_id));
        }
        if ($request->filled('periodo')) {
            $hoy = Carbon::today();
            match ($request->periodo) {
                'hoy'    => $query->whereDate('fecha', $hoy),
                'semana' => $query->whereBetween('fecha', [$hoy->startOfWeek(), $hoy->copy()->endOfWeek()]),
                'mes'    => $query->whereMonth('fecha', $hoy->month)->whereYear('fecha', $hoy->year),
                default  => null,
            };
        }

        $perPage = min($request->integer('per_page', 20), 100);

        return response()->json(
            $query->orderBy('fecha')->orderBy('turno')->orderBy('equipo_id')->paginate($perPage)
        );
    }

    // ──────────────────────────────────────────────────────────────────────────
    // GET /api/equipo-asignaciones/mis-equipos
    // Vista del operador: sus asignaciones de hoy
    // ──────────────────────────────────────────────────────────────────────────
    public function misEquipos(Request $request): JsonResponse
    {
        $usuario   = $request->user();
        $empresaId = $usuario->empresa_id;

        EquipoAsignacion::marcarVencidas($empresaId);

        $fecha = $request->filled('fecha') ? Carbon::parse($request->fecha) : Carbon::today();

        $asignaciones = EquipoAsignacion::where('empresa_id', $empresaId)
            ->where('usuario_id', $usuario->id)
            ->whereDate('fecha', $fecha)
            ->with([
                'equipo:id,codigo,nombre,tipo,marca,modelo,ubicacion,area_id,estado',
                'equipo.area:id,nombre',
                'equipo.equipoTipo:id,nombre,icono',
                'equipo.plantillas:id,nombre,codigo,submodulo_id',
                'inspeccion:id,codigo,estado,porcentaje_cumplimiento,ejecutada_en',
            ])
            ->orderBy('turno')
            ->orderBy('equipo_id')
            ->get();

        $resumen = [
            'total'      => $asignaciones->count(),
            'pendiente'  => $asignaciones->where('estado', 'pendiente')->count(),
            'en_proceso' => $asignaciones->where('estado', 'en_proceso')->count(),
            'completado' => $asignaciones->where('estado', 'completado')->count(),
            'omitido'    => $asignaciones->where('estado', 'omitido')->count(),
            'vencido'    => $asignaciones->filter(fn ($a) => $a->vencida)->count(),
        ];

        return response()->json([
            'fecha'       => $fecha->toDateString(),
            'resumen'     => $resumen,
            'asignaciones'=> $asignaciones,
        ]);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // GET /api/equipo-asignaciones/dashboard
    // KPIs globales para supervisor/administrador
    // ──────────────────────────────────────────────────────────────────────────
    public function dashboard(Request $request): JsonResponse
    {
        $empresaId = $request->user()->empresa_id;

        EquipoAsignacion::marcarVencidas($empresaId);

        $hoy     = Carbon::today();
        $periodo = $request->get('periodo', 'hoy');

        switch ($periodo) {
            case 'ayer':
                $inicio = $hoy->copy()->subDay();
                $fin    = $inicio->copy();
                break;
            case 'semana':
                $inicio = $hoy->copy()->startOfWeek();
                $fin    = $hoy->copy()->endOfWeek();
                break;
            case 'semana_pasada':
                $inicio = $hoy->copy()->subWeek()->startOfWeek();
                $fin    = $hoy->copy()->subWeek()->endOfWeek();
                break;
            case 'mes':
                $inicio = $hoy->copy()->startOfMonth();
                $fin    = $hoy->copy()->endOfMonth();
                break;
            case 'personalizado':
                $request->validate([
                    'fecha_inicio' => 'required|date',
                    'fecha_fin'    => 'required|date|after_or_equal:fecha_inicio',
                ]);
                $inicio = Carbon::parse($request->fecha_inicio)->startOfDay();
                $fin    = Carbon::parse($request->fecha_fin)->startOfDay();
                break;
            default:
                $inicio = $hoy->copy();
                $fin    = $hoy->copy();
        }

        $base  = fn() => EquipoAsignacion::where('empresa_id', $empresaId);
        $baseP = fn() => $base()->whereBetween('fecha', [$inicio->toDateString(), $fin->toDateString()]);

        $total      = $baseP()->count();
        $completado = $baseP()->where('estado', 'completado')->count();
        $pendiente  = $baseP()->where('estado', 'pendiente')->count();
        $omitido    = $baseP()->where('estado', 'omitido')->count();
        $vencido    = $baseP()->where('estado', 'pendiente')->whereDate('fecha', '<', $hoy)->count();
        $porcentaje = $total > 0 ? round(($completado / $total) * 100, 1) : null;

        // Cumplimiento por área
        $porArea = DB::table('equipo_asignaciones as ea')
            ->join('equipos as e', 'ea.equipo_id', '=', 'e.id')
            ->join('areas as a', 'e.area_id', '=', 'a.id')
            ->where('ea.empresa_id', $empresaId)
            ->whereBetween('ea.fecha', [$inicio->toDateString(), $fin->toDateString()])
            ->whereNull('ea.deleted_at')
            ->selectRaw(
                "a.nombre as area, ea.estado, count(*) as total, "
                . "sum(case when ea.estado = 'pendiente' and ea.fecha < ? then 1 else 0 end) as vencido",
                [$hoy->toDateString()]
            )
            ->groupBy('a.nombre', 'ea.estado')
            ->get()
            ->groupBy('area')
            ->map(fn($rows) => [
                'total'      => $rows->sum('total'),
                'completado' => $rows->where('estado', 'completado')->sum('total'),
                'pendiente'  => $rows->where('estado', 'pendiente')->sum('total'),
                'omitido'    => $rows->where('estado', 'omitido')->sum('total'),
                'vencido'    => $rows->sum('vencido'),
            ]);

        // Cumplimiento por usuario (solo trabajadores con asignaciones regulares en el período)
        $minTotal = match($periodo) { 'mes' => 5, 'semana', 'semana_pasada' => 2, default => 1 };

        $porUsuario = EquipoAsignacion::where('empresa_id', $empresaId)
            ->whereBetween('fecha', [$inicio->toDateString(), $fin->toDateString()])
            ->with('usuario:id,nombre,email')
            ->selectRaw('usuario_id, estado, count(*) as total')
            ->groupBy('usuario_id', 'estado')
            ->get()
            ->groupBy('usuario_id')
            ->map(fn($rows) => [
                'usuario'    => $rows->first()->usuario?->only('id', 'nombre', 'email'),
                'total'      => $rows->sum('total'),
                'completado' => $rows->where('estado', 'completado')->sum('total'),
                'pendiente'  => $rows->where('estado', 'pendiente')->sum('total'),
            ])
            ->filter(fn($u) => $u['total'] >= $minTotal);

        // Tendencia semanal — la semana del período seleccionado (actual o pasada)
        $inicioSemana = $periodo === 'semana_pasada'
            ? $hoy->copy()->subWeek()->startOfWeek()
            : $hoy->copy()->startOfWeek();
        $tendenciaSemana = [];
        for ($i = 0; $i < 7; $i++) {
            $dia   = $inicioSemana->copy()->addDays($i);
            $tot   = $base()->whereDate('fecha', $dia)->count();
            $comp  = $base()->whereDate('fecha', $dia)->where('estado', 'completado')->count();
            $tendenciaSemana[] = [
                'fecha'      => $dia->toDateString(),
                'dia'        => $dia->locale('es')->isoFormat('ddd'),
                'total'      => $tot,
                'completado' => $comp,
                'porcentaje' => $tot > 0 ? round(($comp / $tot) * 100) : null,
            ];
        }

        // Quién no cumplió: todo lo que en el período no quedó completado
        $incumplidas = EquipoAsignacion::where('empresa_id', $empresaId)
            ->whereBetween('fecha', [$inicio->toDateString(), $fin->toDateString()])
            ->where('estado', '!=', 'completado')
            ->with([
                'usuario:id,nombre,email',
                'equipo:id,nombre,codigo,area_id',
                'equipo.area:id,nombre',
            ])
            ->orderBy('fecha')
            ->orderBy('usuario_id')
            ->limit(500)
            ->get();

        $incumplimientos = $incumplidas->map(fn($a) => [
            'id'      => $a->id,
            'fecha'   => $a->fecha?->toDateString(),
            'turno'   => $a->turno,
            'estado'  => $a->estado,
            'vencida' => $a->vencida,
            'usuario' => $a->usuario?->only('id', 'nombre'),
            'equipo'  => $a->equipo?->only('id', 'nombre', 'codigo'),
            'area'    => $a->equipo?->area?->nombre,
        ]);

        return response()->json([
            'periodo'         => $periodo,
            'rango'           => ['inicio' => $inicio->toDateString(), 'fin' => $fin->toDateString()],
            'kpis'            => compact('total', 'completado', 'pendiente', 'omitido', 'vencido', 'porcentaje'),
            'por_area'        => $porArea,
            'por_usuario'     => $porUsuario->values(),
            'tendencia_semana'=> $tendenciaSemana,
            'incumplimientos' => $incumplimientos->values(),
        ]);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // POST /api/equipo-asignaciones
    // Crear asignación individual
    // ──────────────────────────────────────────────────────────────────────────
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'equipo_id'     => 'required|exists:equipos,id',
            'usuario_id'    => 'required|exists:usuarios,id',
            'fecha'         => 'required|date',
            'turno'         => 'required|in:mañana,tarde,noche,dia_completo',
            'observaciones' => 'nullable|string|max:500',
        ]);

        $empresaId = $request->user()->empresa_id;

        $existe = EquipoAsignacion::where('empresa_id', $empresaId)
            ->where('equipo_id', $validated['equipo_id'])
            ->where('usuario_id', $validated['usuario_id'])
            ->whereDate('fecha', $validated['fecha'])
            ->where('turno', $validated['turno'])
            ->exists();

        if ($existe) {
            return response()->json(['message' => 'Ya existe una asignación para este equipo, usuario, fecha y turno.'], 422);
        }

        $asignacion = EquipoAsignacion::create(array_merge($validated, [
            'empresa_id' => $empresaId,
            'creado_por' => $request->user()->id,
            'estado'     => 'pendiente',
        ]));

        return response()->json(
            $asignacion->load([
                'equipo:id,codigo,nombre,tipo,area_id',
                'equipo.area:id,nombre',
                'usuario:id,nombre,email',
            ]),
            201
        );
    }

    // ──────────────────────────────────────────────────────────────────────────
    // POST /api/equipo-asignaciones/batch
    // Asignar múltiples equipos a un usuario (o múltiples usuarios)
    // ──────────────────────────────────────────────────────────────────────────
    public function storeBatch(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'usuario_id'     => 'required|exists:usuarios,id',
            'equipo_ids'     => 'required|array|min:1',
            'equipo_ids.*'   => 'integer|exists:equipos,id',
            'fecha'          => 'required|date',
            'turno'          => 'required|in:mañana,tarde,noche,dia_completo',
            'observaciones'  => 'nullable|string|max:500',
        ]);

        $empresaId = $request->user()->empresa_id;
        $ahora     = now();
        $insertadas = 0;

        foreach ($validated['equipo_ids'] as $equipoId) {
            $existe = EquipoAsignacion::where('empresa_id', $empresaId)
                ->where('equipo_id', $equipoId)
                ->where('usuario_id', $validated['usuario_id'])
                ->whereDate('fecha', $validated['fecha'])
                ->where('turno', $validated['turno'])
                ->exists();

            if (!$existe) {
                EquipoAsignacion::create([
                    'empresa_id'    => $empresaId,
                    'equipo_id'     => $equipoId,
                    'usuario_id'    => $validated['usuario_id'],
                    'fecha'         => $validated['fecha'],
                    'turno'         => $validated['turno'],
                    'estado'        => 'pendiente',
                    'observaciones' => $validated['observaciones'] ?? null,
                    'creado_por'    => $request->user()->id,
                ]);
                $insertadas++;
            }
        }

        return response()->json([
            'message'    => "{$insertadas} asignación(es) creadas.",
            'insertadas' => $insertadas,
            'omitidas'   => count($validated['equipo_ids']) - $insertadas,
        ], 201);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // PUT /api/equipo-asignaciones/{id}
    // Editar asignación (reasignar usuario, cambiar turno/fecha)
    // ──────────────────────────────────────────────────────────────────────────
    public function update(Request $request, int $id): JsonResponse
    {
        $asignacion = EquipoAsignacion::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);

        $validated = $request->validate([
            'usuario_id'    => 'sometimes|exists:usuarios,id',
            'fecha'         => 'sometimes|date',
            'turno'         => 'sometimes|in:mañana,tarde,noche,dia_completo',
            'estado'        => 'sometimes|in:pendiente,en_proceso,completado,omitido',
            'observaciones' => 'nullable|string|max:500',
        ]);

        $asignacion->update($validated);

        return response()->json($asignacion->load([
            'equipo:id,codigo,nombre',
            'usuario:id,nombre,email',
        ]));
    }

    // ──────────────────────────────────────────────────────────────────────────
    // POST /api/equipo-asignaciones/{id}/iniciar
    // Marca en_proceso y devuelve (o crea) la inspección del día para el equipo
    // ──────────────────────────────────────────────────────────────────────────
    public function iniciar(Request $request, int $id): JsonResponse
    {
        $asignacion = EquipoAsignacion::where('empresa_id', $request->user()->empresa_id)
            ->where('usuario_id', $request->user()->id)
            ->with(['equipo.plantillas:id,nombre,codigo,submodulo_id', 'equipo.area:id,nombre'])
            ->findOrFail($id);

        // Marcar en_proceso si aún está pendiente
        if ($asignacion->estado === 'pendiente') {
            $asignacion->update(['estado' => 'en_proceso']);
        }

        $inspeccionId = $asignacion->inspeccion_id;

        // Buscar o crear la inspección del día
        if (!$inspeccionId) {
            // Una asignación diaria debe usar la plantilla DIARIA del equipo: hay
            // equipos con checklist diario y mensual a la vez, y coger la primera
            // creaba la inspección contra el checklist equivocado.
            $plantillas = $asignacion->equipo?->plantillas
                ?->filter(fn($p) => (int) ($p->pivot->activo ?? 1) === 1);

            $plantilla = $plantillas?->first(fn($p) => $p->pivot->frecuencia_inspeccion === 'diaria')
                ?? $plantillas?->first();

            if ($plantilla) {
                $hoy = Carbon::today();

                $findExistente = fn () => \App\Models\Inspeccion::where('empresa_id', $asignacion->empresa_id)
                    ->where('equipo_catalogo_id', $plantilla->id)
                    ->whereDate('planificada_para', $hoy)
                    ->whereNotIn('estado', ['completada', 'cancelada', 'cerrada'])
                    ->first();

                $inspeccion = $findExistente();

                if (!$inspeccion) {
                    $turno = in_array($asignacion->turno, ['mañana', 'tarde', 'noche'])
                        ? $asignacion->turno : null;

                    try {
                        $inspeccion = \App\Models\Inspeccion::create([
                            'empresa_id'         => $asignacion->empresa_id,
                            'sede_id'            => 1,
                            'area_id'            => $asignacion->equipo->area_id ?? null,
                            'tipo'               => 'equipos',
                            'titulo'             => $asignacion->equipo->nombre,
                            'planificada_para'   => $hoy,
                            'equipo_catalogo_id' => $plantilla->id,
                            'equipo_id'          => $asignacion->equipo_id,
                            'submodulo_id'       => $plantilla->submodulo_id,
                            'turno'              => $turno,
                            'codigo'             => \App\Models\Inspeccion::generarCodigo($asignacion->empresa_id, 'equipos'),
                            'elaborado_por'      => $request->user()->id,
                            'inspector_id'       => $request->user()->personal_id ?? null,
                            'estado'             => 'programada',
                        ]);
                    } catch (\Illuminate\Database\UniqueConstraintViolationException $e) {
                        // Carrera: otra petición simultánea creó la inspección primero
                        $inspeccion = $findExistente();
                    }
                }

                if ($inspeccion) {
                    $inspeccionId = $inspeccion->id;
                    // Vincular a la asignación para evitar recrear en el futuro
                    $asignacion->update(['inspeccion_id' => $inspeccionId]);
                }
            }
        }

        return response()->json([
            'asignacion'    => $asignacion->fresh()->load('equipo:id,codigo,nombre,tipo'),
            'inspeccion_id' => $inspeccionId,
        ]);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // POST /api/equipo-asignaciones/{id}/completar
    // Vincula la inspección realizada y marca la asignación como completada
    // ──────────────────────────────────────────────────────────────────────────
    public function completar(Request $request, int $id): JsonResponse
    {
        $asignacion = EquipoAsignacion::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);

        $validated = $request->validate([
            'inspeccion_id' => 'required|exists:inspecciones,id',
            'observaciones' => 'nullable|string|max:500',
        ]);

        $asignacion->update([
            'estado'        => 'completado',
            'inspeccion_id' => $validated['inspeccion_id'],
            'observaciones' => $validated['observaciones'] ?? $asignacion->observaciones,
        ]);

        return response()->json($asignacion->load([
            'equipo:id,codigo,nombre',
            'inspeccion:id,codigo,estado,porcentaje_cumplimiento',
        ]));
    }

    // ──────────────────────────────────────────────────────────────────────────
    // POST /api/equipo-asignaciones/{id}/omitir
    // ──────────────────────────────────────────────────────────────────────────
    public function omitir(Request $request, int $id): JsonResponse
    {
        $asignacion = EquipoAsignacion::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);

        $validated = $request->validate([
            'observaciones' => 'required|string|max:500',
        ]);

        $asignacion->update([
            'estado'        => 'omitido',
            'observaciones' => $validated['observaciones'],
        ]);

        return response()->json($asignacion);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // DELETE /api/equipo-asignaciones/{id}
    // ──────────────────────────────────────────────────────────────────────────
    public function destroy(Request $request, int $id): JsonResponse
    {
        $asignacion = EquipoAsignacion::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);
        $asignacion->delete();

        return response()->json(['message' => 'Asignación eliminada.']);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // REGLAS (Administrador)
    // ══════════════════════════════════════════════════════════════════════════

    public function reglas(Request $request): JsonResponse
    {
        $empresaId = $request->user()->empresa_id;

        $reglas = EquipoAsignacionRegla::where('empresa_id', $empresaId)
            ->with([
                'area:id,nombre',
                'equipo:id,codigo,nombre',
                'usuario:id,nombre',
                'tipo:id,nombre',
            ])
            ->orderBy('area_id')
            ->orderBy('equipo_id')
            ->get();

        return response()->json($reglas);
    }

    public function storeRegla(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'area_id'       => 'nullable|exists:areas,id',
            'equipo_id'     => 'nullable|exists:equipos,id',
            'usuario_id'    => 'nullable|exists:usuarios,id',
            'tipo_id'       => 'nullable|exists:equipos_tipos,id',
            'turno'         => 'required|in:mañana,tarde,noche,dia_completo',
            'dias_semana'   => 'required|array|min:1',
            'dias_semana.*' => 'integer|between:1,7',
            'activo'        => 'boolean',
            'observaciones' => 'nullable|string|max:300',
        ]);

        $regla = EquipoAsignacionRegla::create(array_merge($validated, [
            'empresa_id' => $request->user()->empresa_id,
            'creado_por' => $request->user()->id,
        ]));

        return response()->json($regla->load(['area:id,nombre', 'equipo:id,codigo,nombre', 'usuario:id,nombre', 'tipo:id,nombre']), 201);
    }

    public function updateRegla(Request $request, int $id): JsonResponse
    {
        $regla = EquipoAsignacionRegla::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);

        $validated = $request->validate([
            'area_id'       => 'nullable|exists:areas,id',
            'equipo_id'     => 'nullable|exists:equipos,id',
            'usuario_id'    => 'nullable|exists:usuarios,id',
            'tipo_id'       => 'nullable|exists:equipos_tipos,id',
            'turno'         => 'sometimes|in:mañana,tarde,noche,dia_completo',
            'dias_semana'   => 'sometimes|array|min:1',
            'dias_semana.*' => 'integer|between:1,7',
            'activo'        => 'boolean',
            'observaciones' => 'nullable|string|max:300',
        ]);

        $regla->update($validated);

        return response()->json($regla->load(['area:id,nombre', 'equipo:id,codigo,nombre', 'usuario:id,nombre', 'tipo:id,nombre']));
    }

    public function destroyRegla(Request $request, int $id): JsonResponse
    {
        $regla = EquipoAsignacionRegla::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);
        $regla->delete();

        return response()->json(['message' => 'Regla eliminada.']);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // POST /api/equipo-asignaciones/limpiar-periodo
    // Administrador: elimina asignaciones PENDIENTES de un período (revertir)
    // ──────────────────────────────────────────────────────────────────────────
    public function limpiarPeriodo(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'fecha_inicio' => 'required|date',
            'fecha_fin'    => 'required|date|after_or_equal:fecha_inicio',
        ]);

        $empresaId = $request->user()->empresa_id;
        $inicio    = Carbon::parse($validated['fecha_inicio']);
        $fin       = Carbon::parse($validated['fecha_fin']);

        if ($fin->diffInDays($inicio) > 366) {
            return response()->json(['message' => 'El período no puede superar 1 año.'], 422);
        }

        $rango = [$inicio->toDateString(), $fin->toDateString()];

        // Contar pendientes activas
        $eliminadas = EquipoAsignacion::where('empresa_id', $empresaId)
            ->where('estado', 'pendiente')
            ->whereBetween('fecha', $rango)
            ->count();

        // Borrado físico de pendientes (forceDelete evita conflictos en índice único al regenerar)
        EquipoAsignacion::where('empresa_id', $empresaId)
            ->where('estado', 'pendiente')
            ->whereBetween('fecha', $rango)
            ->forceDelete();

        // Limpiar también cualquier registro ya soft-deleted del período (liberan el índice único)
        EquipoAsignacion::withTrashed()
            ->where('empresa_id', $empresaId)
            ->whereBetween('fecha', $rango)
            ->whereNotNull('deleted_at')
            ->forceDelete();

        return response()->json([
            'message'    => "{$eliminadas} asignación(es) pendientes eliminadas del período.",
            'eliminadas' => $eliminadas,
        ]);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // POST /api/equipo-asignaciones/generar-desde-reglas
    // Administrador: genera asignaciones automáticas para un período
    // basándose en las reglas activas + usuarios disponibles
    // ──────────────────────────────────────────────────────────────────────────
    public function generarDesdeReglas(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'fecha_inicio'   => 'required|date',
            'fecha_fin'      => 'required|date|after_or_equal:fecha_inicio',
            'usuario_ids'    => 'required|array|min:1',
            'usuario_ids.*'  => 'integer|exists:usuarios,id',
        ]);

        $empresaId = $request->user()->empresa_id;
        $inicio    = Carbon::parse($validated['fecha_inicio']);
        $fin       = Carbon::parse($validated['fecha_fin']);

        if ($fin->diffInDays($inicio) > 31) {
            return response()->json(['message' => 'El período no puede superar 31 días.'], 422);
        }

        $reglas = EquipoAsignacionRegla::where('empresa_id', $empresaId)
            ->where('activo', true)
            ->with('equipo:id,nombre,area_id,estado')
            ->get();

        if ($reglas->isEmpty()) {
            return response()->json(['message' => 'No hay reglas activas configuradas.', 'insertadas' => 0]);
        }

        $usuarioIds = $validated['usuario_ids'];
        $insertadas = 0;
        $cursor     = $inicio->copy();
        $usuarioIdx = 0;

        while ($cursor->lte($fin)) {
            $diaSemana = (int) $cursor->isoFormat('E'); // 1=lun … 7=dom

            foreach ($reglas as $regla) {
                $dias = is_array($regla->dias_semana) ? $regla->dias_semana : [];
                if (!in_array($diaSemana, $dias)) continue;
                if (!$regla->equipo || $regla->equipo->estado !== 'operativo') continue;

                if ($regla->usuario_id) {
                    $usuarioId = $regla->usuario_id;
                } else {
                    $usuarioId = $usuarioIds[$usuarioIdx % count($usuarioIds)];
                    $usuarioIdx++;
                }

                $existe = EquipoAsignacion::where('empresa_id', $empresaId)
                    ->where('equipo_id', $regla->equipo_id)
                    ->whereDate('fecha', $cursor)
                    ->where('turno', $regla->turno)
                    ->exists();

                if (!$existe) {
                    EquipoAsignacion::create([
                        'empresa_id' => $empresaId,
                        'equipo_id'  => $regla->equipo_id,
                        'usuario_id' => $usuarioId,
                        'fecha'      => $cursor->toDateString(),
                        'turno'      => $regla->turno,
                        'estado'     => 'pendiente',
                        'creado_por' => $request->user()->id,
                    ]);
                    $insertadas++;
                }
            }

            $cursor->addDay();
        }

        return response()->json([
            'message'    => "{$insertadas} asignación(es) generadas para el período.",
            'insertadas' => $insertadas,
        ]);
    }
}

