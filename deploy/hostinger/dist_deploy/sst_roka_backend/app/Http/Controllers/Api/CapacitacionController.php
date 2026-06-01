<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Capacitacion;
use App\Models\CapacitacionAsistente;
use App\Models\CapacitacionEvaluacion;
use App\Models\CapacitacionEvaluacionRespuesta;
use App\Services\AuditoriaService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class CapacitacionController extends Controller
{
    public function __construct(
        private AuditoriaService $auditoria
    ) {}

    /** GET /api/capacitaciones */
    public function index(Request $request): JsonResponse
    {
        $query = Capacitacion::where('empresa_id', $request->user()->empresa_id)
            ->with(['area:id,nombre']);

        if ($request->filled('estado'))      $query->where('estado', $request->estado);
        if ($request->filled('tipo'))        $query->where('tipo', $request->tipo);
        if ($request->filled('area_id'))     $query->where('area_id', $request->area_id);
        if ($request->filled('modalidad'))   $query->where('modalidad', $request->modalidad);
        if ($request->filled('anio'))        $query->whereYear('fecha_programada', $request->anio);
        if ($request->filled('mes'))         $query->whereMonth('fecha_programada', $request->mes);
        if ($request->filled('fecha_desde')) $query->where('fecha_programada', '>=', $request->fecha_desde);
        if ($request->filled('fecha_hasta')) $query->where('fecha_programada', '<=', $request->fecha_hasta);
        if ($request->filled('search')) {
            $q = $request->search;
            $query->where(fn($s) =>
                $s->where('titulo', 'like', "%{$q}%")
                  ->orWhere('tema', 'like', "%{$q}%")
                  ->orWhere('expositor', 'like', "%{$q}%")
            );
        }

        $capacitaciones = $query->orderBy('fecha_programada')
            ->paginate(min($request->integer('per_page', 15), 100));

        return response()->json($capacitaciones);
    }

    /** POST /api/capacitaciones */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'titulo'            => 'required|string|max:200',
            'tema'              => 'nullable|string|max:300',
            'bloque'            => 'nullable|string|max:150',
            'tipo'              => 'required|in:induccion,especifica,general,sensibilizacion',
            'modalidad'         => 'required|in:presencial,virtual,mixto',
            'fecha_programada'  => 'required|date',
            'duracion_horas'    => 'required|numeric|min:0.5|max:99',
            'expositor'         => 'nullable|string|max:150',
            'expositor_cargo'   => 'nullable|string|max:100',
            'lugar'             => 'nullable|string|max:200',
            'area_id'           => 'nullable|exists:areas,id',
            'max_participantes' => 'nullable|integer|min:1',
            'observaciones'     => 'nullable|string',
        ]);

        $capacitacion = Capacitacion::create([
            ...$validated,
            'empresa_id' => $request->user()->empresa_id,
            'estado'     => 'programada',
        ]);

        $this->auditoria->registrar(
            modulo: 'capacitaciones', accion: 'crear_capacitacion',
            usuario: $request->user(), modelo: 'Capacitacion',
            modeloId: $capacitacion->id,
            valorNuevo: ['titulo' => $capacitacion->titulo, 'tipo' => $capacitacion->tipo],
            request: $request
        );

        return response()->json($capacitacion->load('area:id,nombre'), 201);
    }

    /** GET /api/capacitaciones/{id} */
    public function show(Request $request, int $id): JsonResponse
    {
        $capacitacion = Capacitacion::where('empresa_id', $request->user()->empresa_id)
            ->with([
                'area:id,nombre',
                'asistentes.personal:id,nombres,apellidos,dni,cargo_id',
                'asistentes.personal.cargo:id,nombre',
                'evaluacion.respuestas.personal:id,nombres,apellidos',
            ])
            ->findOrFail($id);

        return response()->json($capacitacion);
    }

    /** PUT /api/capacitaciones/{id} */
    public function update(Request $request, int $id): JsonResponse
    {
        $capacitacion = Capacitacion::where('empresa_id', $request->user()->empresa_id)
            ->findOrFail($id);

        $validated = $request->validate([
            'titulo'            => 'sometimes|string|max:200',
            'tema'              => 'nullable|string|max:300',
            'tipo'              => 'sometimes|in:induccion,especifica,general,sensibilizacion',
            'modalidad'         => 'sometimes|in:presencial,virtual,mixto',
            'fecha_programada'  => 'sometimes|date',
            'duracion_horas'    => 'sometimes|numeric|min:0.5|max:99',
            'expositor'         => 'nullable|string|max:150',
            'expositor_cargo'   => 'nullable|string|max:100',
            'lugar'             => 'nullable|string|max:200',
            'area_id'           => 'nullable|exists:areas,id',
            'max_participantes' => 'nullable|integer|min:1',
            'estado'            => 'sometimes|in:programada,ejecutada,cancelada,reprogramada',
            'observaciones'     => 'nullable|string',
        ]);

        $capacitacion->update($validated);
        return response()->json($capacitacion->load('area:id,nombre'));
    }

    /** DELETE /api/capacitaciones/{id} */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $capacitacion = Capacitacion::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);
        $capacitacion->delete();
        return response()->json(['message' => 'Capacitación eliminada correctamente']);
    }

    /** GET /api/capacitaciones/estadisticas */
    public function estadisticas(Request $request): JsonResponse
    {
        $empresaId = $request->user()->empresa_id;
        $anio = $request->integer('anio', now()->year);

        $base = fn() => Capacitacion::where('empresa_id', $empresaId)->whereYear('fecha_programada', $anio);

        $total      = $base()->count();
        $ejecutadas = $base()->where('estado', 'ejecutada')->count();
        $programadas= $base()->where('estado', 'programada')->count();
        $horas      = $base()->where('estado', 'ejecutada')->sum('duracion_horas');

        $totalAsist = CapacitacionAsistente::whereHas('capacitacion', fn($q) =>
            $q->where('empresa_id', $empresaId)->whereYear('fecha_programada', $anio)->where('estado', 'ejecutada')
        )->where('asistio', true)->count();

        $totalConv = CapacitacionAsistente::whereHas('capacitacion', fn($q) =>
            $q->where('empresa_id', $empresaId)->whereYear('fecha_programada', $anio)->where('estado', 'ejecutada')
        )->count();

        // Por mes
        $porMes = $base()->selectRaw('MONTH(fecha_programada) as mes, estado, COUNT(*) as total')
            ->groupByRaw('MONTH(fecha_programada), estado')
            ->get()
            ->groupBy('mes')
            ->map(fn($items) => [
                'programadas' => $items->where('estado', 'programada')->sum('total'),
                'ejecutadas'  => $items->where('estado', 'ejecutada')->sum('total'),
                'canceladas'  => $items->where('estado', 'cancelada')->sum('total'),
                'total'       => $items->sum('total'),
            ]);

        $porTipo = $base()->selectRaw('tipo, COUNT(*) as total')->groupBy('tipo')->get();

        $porBloque = $base()
            ->whereNotNull('bloque')
            ->where('bloque', '!=', '')
            ->selectRaw('bloque, COUNT(*) as total, SUM(CASE WHEN estado="ejecutada" THEN 1 ELSE 0 END) as ejecutadas')
            ->groupBy('bloque')
            ->orderByDesc('total')
            ->get();

        $porTema = $base()
            ->whereNotNull('tema')
            ->where('tema', '!=', '')
            ->selectRaw('tema, COUNT(*) as total')
            ->groupBy('tema')
            ->orderByDesc('total')
            ->limit(10)
            ->get();

        return response()->json([
            'total'                 => $total,
            'ejecutadas'            => $ejecutadas,
            'programadas'           => $programadas,
            'canceladas'            => $base()->where('estado', 'cancelada')->count(),
            'horas_acumuladas'      => $horas,
            'porcentaje_asistencia' => $totalConv > 0 ? round($totalAsist / $totalConv * 100, 1) : null,
            'total_asistentes'      => $totalAsist,
            'por_tipo'              => $porTipo,
            'por_bloque'            => $porBloque,
            'por_tema'              => $porTema,
            'por_mes'               => $porMes,
            'cumplimiento'          => $total > 0 ? round($ejecutadas / $total * 100, 1) : 0,
            'anio'                  => $anio,
        ]);
    }

    /**
     * GET /api/capacitaciones/cronograma
     * Retorna todas las capacitaciones del año agrupadas por mes con estado de cumplimiento.
     */
    public function cronograma(Request $request): JsonResponse
    {
        $empresaId = $request->user()->empresa_id;
        $anio = $request->integer('anio', now()->year);

        $capacitaciones = Capacitacion::where('empresa_id', $empresaId)
            ->whereYear('fecha_programada', $anio)
            ->with(['area:id,nombre'])
            ->orderBy('fecha_programada')
            ->get();

        $meses = [];
        for ($m = 1; $m <= 12; $m++) {
            $del_mes = $capacitaciones->filter(fn($c) => $c->fecha_programada->month === $m);
            $meses[$m] = [
                'mes'         => $m,
                'total'       => $del_mes->count(),
                'ejecutadas'  => $del_mes->where('estado', 'ejecutada')->count(),
                'programadas' => $del_mes->where('estado', 'programada')->count(),
                'canceladas'  => $del_mes->where('estado', 'cancelada')->count(),
                'horas'       => $del_mes->where('estado', 'ejecutada')->sum('duracion_horas'),
                'items'       => $del_mes->values(),
            ];
        }

        return response()->json([
            'anio'  => $anio,
            'meses' => array_values($meses),
            'total' => $capacitaciones->count(),
            'ejecutadas' => $capacitaciones->where('estado', 'ejecutada')->count(),
        ]);
    }

    /**
     * GET /api/capacitaciones/mis-capacitaciones
     * Vista del trabajador: sus capacitaciones asignadas, pendientes y completadas.
     */
    public function misCapacitaciones(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user->personal_id) {
            return response()->json(['proximas' => [], 'historial' => [], 'evaluaciones_pendientes' => []]);
        }

        $asistencias = CapacitacionAsistente::where('personal_id', $user->personal_id)
            ->with([
                'capacitacion' => fn($q) => $q->with('area:id,nombre')->with('evaluacion'),
            ])
            ->orderByDesc('created_at')
            ->get();

        $proximas = $asistencias
            ->filter(fn($a) => $a->capacitacion?->estado === 'programada')
            ->map(fn($a) => [
                'id'              => $a->capacitacion->id,
                'titulo'          => $a->capacitacion->titulo,
                'tema'            => $a->capacitacion->tema,
                'tipo'            => $a->capacitacion->tipo,
                'modalidad'       => $a->capacitacion->modalidad,
                'fecha_programada'=> $a->capacitacion->fecha_programada,
                'duracion_horas'  => $a->capacitacion->duracion_horas,
                'expositor'       => $a->capacitacion->expositor,
                'lugar'           => $a->capacitacion->lugar,
                'area'            => $a->capacitacion->area,
            ])->values();

        $historial = $asistencias
            ->filter(fn($a) => $a->capacitacion?->estado === 'ejecutada')
            ->map(fn($a) => [
                'id'             => $a->capacitacion->id,
                'titulo'         => $a->capacitacion->titulo,
                'tipo'           => $a->capacitacion->tipo,
                'fecha_ejecutada'=> $a->capacitacion->fecha_ejecutada,
                'duracion_horas' => $a->capacitacion->duracion_horas,
                'asistio'        => $a->asistio,
                'nota'           => $a->nota_evaluacion,
                'aprobado'       => $a->aprobado,
                'area'           => $a->capacitacion->area,
            ])->values();

        // Evaluaciones pendientes de responder
        $evalPendientes = $asistencias
            ->filter(fn($a) =>
                $a->asistio &&
                $a->capacitacion?->evaluacion &&
                $a->capacitacion->evaluacion->activa &&
                !CapacitacionEvaluacionRespuesta::where('evaluacion_id', $a->capacitacion->evaluacion->id)
                    ->where('personal_id', $user->personal_id)->exists()
            )
            ->map(fn($a) => [
                'capacitacion_id' => $a->capacitacion->id,
                'titulo'          => $a->capacitacion->titulo,
                'evaluacion_id'   => $a->capacitacion->evaluacion->id,
                'eval_titulo'     => $a->capacitacion->evaluacion->titulo,
                'total_preguntas' => count($a->capacitacion->evaluacion->preguntas ?? []),
            ])->values();

        $stats = [
            'total_asignadas'  => $asistencias->count(),
            'asistidas'        => $asistencias->where('asistio', true)->count(),
            'aprobadas'        => $asistencias->where('aprobado', true)->count(),
            'horas_acumuladas' => $asistencias->where('asistio', true)
                ->sum(fn($a) => $a->capacitacion?->duracion_horas ?? 0),
        ];

        return response()->json([
            'proximas'               => $proximas,
            'historial'              => $historial,
            'evaluaciones_pendientes'=> $evalPendientes,
            'stats'                  => $stats,
        ]);
    }

    /** POST /api/capacitaciones/{id}/asistencia */
    public function registrarAsistencia(Request $request, int $id): JsonResponse
    {
        $capacitacion = Capacitacion::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);

        $validated = $request->validate([
            'asistentes'                   => 'required|array|min:1',
            'asistentes.*.personal_id'     => 'required|exists:personal,id',
            'asistentes.*.asistio'         => 'required|boolean',
            'asistentes.*.hora_ingreso'    => 'nullable|date_format:H:i',
            'asistentes.*.hora_salida'     => 'nullable|date_format:H:i',
            'asistentes.*.nota_evaluacion' => 'nullable|numeric|min:0|max:20',
            'asistentes.*.aprobado'        => 'nullable|boolean',
            'asistentes.*.observaciones'   => 'nullable|string',
        ]);

        foreach ($validated['asistentes'] as $asist) {
            CapacitacionAsistente::updateOrCreate(
                ['capacitacion_id' => $capacitacion->id, 'personal_id' => $asist['personal_id']],
                $asist
            );
        }

        $this->auditoria->registrar(
            modulo: 'capacitaciones', accion: 'registrar_asistencia',
            usuario: $request->user(), modelo: 'Capacitacion', modeloId: $capacitacion->id,
            valorNuevo: ['total_registros' => count($validated['asistentes'])],
            request: $request
        );

        return response()->json([
            'message'    => 'Asistencia registrada',
            'registros'  => count($validated['asistentes']),
            'asistentes' => $capacitacion->load('asistentes.personal:id,nombres,apellidos,dni')->asistentes,
        ]);
    }

    /** POST /api/capacitaciones/{id}/ejecutar */
    public function ejecutar(Request $request, int $id): JsonResponse
    {
        $capacitacion = Capacitacion::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);

        $validated = $request->validate([
            'fecha_ejecutada' => 'nullable|date',
            'observaciones'   => 'nullable|string',
        ]);

        $capacitacion->update([
            'estado'          => 'ejecutada',
            'fecha_ejecutada' => $validated['fecha_ejecutada'] ?? now()->toDateString(),
            'observaciones'   => $validated['observaciones'] ?? $capacitacion->observaciones,
        ]);

        return response()->json($capacitacion->load(['area:id,nombre', 'asistentes.personal:id,nombres,apellidos']));
    }

    /** POST /api/capacitaciones/{id}/evaluacion — Crear o actualizar evaluación */
    public function guardarEvaluacion(Request $request, int $id): JsonResponse
    {
        $capacitacion = Capacitacion::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);

        $validated = $request->validate([
            'titulo'                  => 'required|string|max:200',
            'nota_minima_aprobacion'  => 'required|numeric|min:0|max:20',
            'activa'                  => 'boolean',
            'preguntas'               => 'required|array|min:1',
            'preguntas.*.pregunta'    => 'required|string',
            'preguntas.*.opciones'    => 'required|array|min:2',
            'preguntas.*.respuesta_correcta' => 'required|integer|min:0',
        ]);

        $evaluacion = CapacitacionEvaluacion::updateOrCreate(
            ['capacitacion_id' => $capacitacion->id],
            [
                'empresa_id'             => $request->user()->empresa_id,
                'titulo'                 => $validated['titulo'],
                'preguntas'              => $validated['preguntas'],
                'nota_minima_aprobacion' => $validated['nota_minima_aprobacion'],
                'activa'                 => $validated['activa'] ?? true,
            ]
        );

        return response()->json($evaluacion, 201);
    }

    /** POST /api/capacitaciones/{id}/evaluacion/responder — Trabajador responde el quiz */
    public function responderEvaluacion(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        $capacitacion = Capacitacion::where('empresa_id', $user->empresa_id)
            ->with('evaluacion')
            ->findOrFail($id);

        if (!$capacitacion->evaluacion || !$capacitacion->evaluacion->activa) {
            return response()->json(['message' => 'Esta capacitación no tiene evaluación activa.'], 422);
        }

        if (!$user->personal_id) {
            return response()->json(['message' => 'Tu usuario no está vinculado a un trabajador.'], 422);
        }

        $validated = $request->validate([
            'respuestas' => 'required|array',
        ]);

        $evaluacion = $capacitacion->evaluacion;
        $preguntas  = $evaluacion->preguntas;
        $correctas  = 0;

        foreach ($preguntas as $i => $pregunta) {
            if (isset($validated['respuestas'][$i]) &&
                (int)$validated['respuestas'][$i] === (int)$pregunta['respuesta_correcta']) {
                $correctas++;
            }
        }

        $puntaje  = count($preguntas) > 0 ? round(($correctas / count($preguntas)) * 20, 2) : 0;
        $aprobado = $puntaje >= $evaluacion->nota_minima_aprobacion;

        $respuesta = CapacitacionEvaluacionRespuesta::updateOrCreate(
            ['evaluacion_id' => $evaluacion->id, 'personal_id' => $user->personal_id],
            [
                'respuestas'    => $validated['respuestas'],
                'puntaje'       => $puntaje,
                'aprobado'      => $aprobado,
                'completado_en' => now(),
            ]
        );

        // Actualizar nota en asistente si existe
        CapacitacionAsistente::where('capacitacion_id', $capacitacion->id)
            ->where('personal_id', $user->personal_id)
            ->update(['nota_evaluacion' => $puntaje, 'aprobado' => $aprobado]);

        return response()->json([
            'puntaje'    => $puntaje,
            'aprobado'   => $aprobado,
            'correctas'  => $correctas,
            'total'      => count($preguntas),
            'nota_minima'=> $evaluacion->nota_minima_aprobacion,
        ]);
    }
}
