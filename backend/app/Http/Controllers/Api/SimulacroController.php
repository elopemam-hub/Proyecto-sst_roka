<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Simulacro;
use App\Models\SimulacroParticipante;
use App\Models\SimulacroEvaluacion;
use App\Services\AuditoriaService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class SimulacroController extends Controller
{
    public function __construct(
        private AuditoriaService $auditoria
    ) {}

    /**
     * GET /api/simulacros
     */
    public function index(Request $request): JsonResponse
    {
        $query = Simulacro::where('empresa_id', $request->user()->empresa_id)
            ->with(['area:id,nombre', 'coordinador:id,nombres,apellidos']);

        if ($request->filled('estado')) {
            $query->where('estado', $request->estado);
        }
        if ($request->filled('tipo')) {
            $query->where('tipo', $request->tipo);
        }
        if ($request->filled('area_id')) {
            $query->where('area_id', $request->area_id);
        }
        if ($request->filled('fecha_desde')) {
            $query->where('fecha_programada', '>=', $request->fecha_desde);
        }
        if ($request->filled('fecha_hasta')) {
            $query->where('fecha_programada', '<=', $request->fecha_hasta);
        }
        if ($request->filled('search')) {
            $q = $request->search;
            $query->where(fn($sub) =>
                $sub->where('nombre', 'like', "%{$q}%")
                    ->orWhere('descripcion', 'like', "%{$q}%")
            );
        }

        $simulacros = $query->orderByDesc('fecha_programada')
            ->paginate(min($request->integer('per_page', 15), 100));

        return response()->json($simulacros);
    }

    /**
     * POST /api/simulacros
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'tipo'              => 'required|in:sismo,incendio,derrame,evacuacion,primeros_auxilios,otro',
            'nombre'            => 'required|string|max:200',
            'descripcion'       => 'nullable|string',
            'fecha_programada'  => 'required|date',
            'hora_inicio'       => 'nullable|date_format:H:i',
            'hora_fin'          => 'nullable|date_format:H:i',
            'lugar'             => 'nullable|string|max:200',
            'area_id'           => 'nullable|exists:areas,id',
            'coordinador_id'    => 'nullable|exists:personal,id',
            'observaciones'     => 'nullable|string',
        ]);

        $simulacro = Simulacro::create([
            ...$validated,
            'empresa_id' => $request->user()->empresa_id,
            'estado'     => 'programado',
        ]);

        $this->auditoria->registrar(
            modulo: 'simulacros',
            accion: 'crear_simulacro',
            usuario: $request->user(),
            modelo: 'Simulacro',
            modeloId: $simulacro->id,
            valorNuevo: ['nombre' => $simulacro->nombre, 'tipo' => $simulacro->tipo],
            request: $request
        );

        return response()->json(
            $simulacro->load(['area:id,nombre', 'coordinador:id,nombres,apellidos']),
            201
        );
    }

    /**
     * GET /api/simulacros/{id}
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $simulacro = Simulacro::where('empresa_id', $request->user()->empresa_id)
            ->with([
                'area:id,nombre',
                'coordinador:id,nombres,apellidos',
                'participantes.personal:id,nombres,apellidos,dni',
                'evaluaciones',
            ])
            ->findOrFail($id);

        return response()->json($simulacro);
    }

    /**
     * PUT /api/simulacros/{id}
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $simulacro = Simulacro::where('empresa_id', $request->user()->empresa_id)
            ->findOrFail($id);

        $validated = $request->validate([
            'tipo'                  => 'sometimes|in:sismo,incendio,derrame,evacuacion,primeros_auxilios,otro',
            'nombre'                => 'sometimes|string|max:200',
            'descripcion'           => 'nullable|string',
            'fecha_programada'      => 'sometimes|date',
            'hora_inicio'           => 'nullable|date_format:H:i',
            'hora_fin'              => 'nullable|date_format:H:i',
            'lugar'                 => 'nullable|string|max:200',
            'area_id'               => 'nullable|exists:areas,id',
            'coordinador_id'        => 'nullable|exists:personal,id',
            'estado'                => 'sometimes|in:programado,ejecutado,cancelado',
            'observaciones'         => 'nullable|string',
            'lecciones_aprendidas'  => 'nullable|string',
        ]);

        $simulacro->update($validated);

        return response()->json($simulacro->load(['area:id,nombre', 'coordinador:id,nombres,apellidos']));
    }

    /**
     * DELETE /api/simulacros/{id}
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $simulacro = Simulacro::where('empresa_id', $request->user()->empresa_id)
            ->findOrFail($id);
        $simulacro->delete();

        return response()->json(['message' => 'Simulacro eliminado correctamente']);
    }

    /**
     * GET /api/simulacros/estadisticas
     */
    public function estadisticas(Request $request): JsonResponse
    {
        $empresaId = $request->user()->empresa_id;
        $anio = $request->integer('anio', now()->year);

        $total = Simulacro::where('empresa_id', $empresaId)
            ->whereYear('fecha_programada', $anio)->count();

        $ejecutados = Simulacro::where('empresa_id', $empresaId)
            ->whereYear('fecha_programada', $anio)
            ->where('estado', 'ejecutado')->count();

        $programados = Simulacro::where('empresa_id', $empresaId)
            ->whereYear('fecha_programada', $anio)
            ->where('estado', 'programado')->count();

        $porTipo = Simulacro::where('empresa_id', $empresaId)
            ->whereYear('fecha_programada', $anio)
            ->selectRaw('tipo, COUNT(*) as total')
            ->groupBy('tipo')->get();

        $promedioEvaluacion = SimulacroEvaluacion::whereHas('simulacro', fn($q) =>
            $q->where('empresa_id', $empresaId)
              ->whereYear('fecha_programada', $anio)
        )->avg('calificacion');

        $promedioTiempoRespuesta = Simulacro::where('empresa_id', $empresaId)
            ->whereYear('fecha_programada', $anio)
            ->where('estado', 'ejecutado')
            ->whereNotNull('tiempo_respuesta_min')
            ->avg('tiempo_respuesta_min');

        $proximo = Simulacro::where('empresa_id', $empresaId)
            ->where('estado', 'programado')
            ->where('fecha_programada', '>=', now())
            ->orderBy('fecha_programada')
            ->first(['id', 'nombre', 'tipo', 'fecha_programada']);

        return response()->json([
            'total'                     => $total,
            'ejecutados'                => $ejecutados,
            'programados'               => $programados,
            'por_tipo'                  => $porTipo,
            'promedio_evaluacion'       => $promedioEvaluacion ? round($promedioEvaluacion, 1) : null,
            'promedio_tiempo_respuesta' => $promedioTiempoRespuesta ? round($promedioTiempoRespuesta, 1) : null,
            'proximo'                   => $proximo,
            'cumplimiento'              => $total > 0 ? round(($ejecutados / $total) * 100, 1) : 0,
        ]);
    }

    /**
     * POST /api/simulacros/{id}/ejecutar
     */
    public function ejecutar(Request $request, int $id): JsonResponse
    {
        $simulacro = Simulacro::where('empresa_id', $request->user()->empresa_id)
            ->findOrFail($id);

        $validated = $request->validate([
            'fecha_ejecutada'       => 'nullable|date',
            'hora_inicio'           => 'nullable|date_format:H:i',
            'hora_fin'              => 'nullable|date_format:H:i',
            'tiempo_respuesta_min'  => 'nullable|integer|min:0',
            'personas_evacuadas'    => 'nullable|integer|min:0',
            'observaciones'         => 'nullable|string',
            'lecciones_aprendidas'  => 'nullable|string',
            'participantes'                 => 'nullable|array',
            'participantes.*.personal_id'   => 'required|exists:personal,id',
            'participantes.*.rol'           => 'required|in:participante,observador,brigadista,coordinador',
            'participantes.*.asistio'       => 'required|boolean',
        ]);

        $simulacro->update([
            'estado'                => 'ejecutado',
            'fecha_ejecutada'       => $validated['fecha_ejecutada'] ?? now()->toDateString(),
            'hora_inicio'           => $validated['hora_inicio'] ?? $simulacro->hora_inicio,
            'hora_fin'              => $validated['hora_fin'] ?? $simulacro->hora_fin,
            'tiempo_respuesta_min'  => $validated['tiempo_respuesta_min'] ?? $simulacro->tiempo_respuesta_min,
            'personas_evacuadas'    => $validated['personas_evacuadas'] ?? $simulacro->personas_evacuadas,
            'observaciones'         => $validated['observaciones'] ?? $simulacro->observaciones,
            'lecciones_aprendidas'  => $validated['lecciones_aprendidas'] ?? $simulacro->lecciones_aprendidas,
        ]);

        // Registrar participantes si se envían
        if (!empty($validated['participantes'])) {
            foreach ($validated['participantes'] as $part) {
                SimulacroParticipante::updateOrCreate(
                    [
                        'simulacro_id' => $simulacro->id,
                        'personal_id'  => $part['personal_id'],
                    ],
                    $part
                );
            }
        }

        $this->auditoria->registrar(
            modulo: 'simulacros',
            accion: 'ejecutar_simulacro',
            usuario: $request->user(),
            modelo: 'Simulacro',
            modeloId: $simulacro->id,
            request: $request
        );

        return response()->json($simulacro->load([
            'area:id,nombre',
            'coordinador:id,nombres,apellidos',
            'participantes.personal:id,nombres,apellidos',
        ]));
    }

    /**
     * POST /api/simulacros/{id}/evaluacion
     * Registrar criterios de evaluación del simulacro
     */
    public function registrarEvaluacion(Request $request, int $id): JsonResponse
    {
        $simulacro = Simulacro::where('empresa_id', $request->user()->empresa_id)
            ->findOrFail($id);

        $validated = $request->validate([
            'criterios'                 => 'required|array|min:1',
            'criterios.*.criterio'      => 'required|string|max:200',
            'criterios.*.calificacion'  => 'required|integer|min:1|max:5',
            'criterios.*.observacion'   => 'nullable|string',
            'evaluado_por'              => 'nullable|string|max:150',
        ]);

        // Limpiar evaluaciones previas y registrar nuevas
        $simulacro->evaluaciones()->delete();

        foreach ($validated['criterios'] as $criterio) {
            SimulacroEvaluacion::create([
                'simulacro_id'  => $simulacro->id,
                'criterio'      => $criterio['criterio'],
                'calificacion'  => $criterio['calificacion'],
                'observacion'   => $criterio['observacion'] ?? null,
                'evaluado_por'  => $validated['evaluado_por'] ?? null,
            ]);
        }

        return response()->json([
            'message'       => 'Evaluación registrada correctamente',
            'evaluaciones'  => $simulacro->load('evaluaciones')->evaluaciones,
            'promedio'      => $simulacro->promedio_evaluacion,
        ]);
    }
}
