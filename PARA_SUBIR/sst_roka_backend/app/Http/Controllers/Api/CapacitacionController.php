<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Capacitacion;
use App\Models\CapacitacionAsistente;
use App\Services\AuditoriaService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class CapacitacionController extends Controller
{
    public function __construct(
        private AuditoriaService $auditoria
    ) {}

    /**
     * GET /api/capacitaciones
     */
    public function index(Request $request): JsonResponse
    {
        $query = Capacitacion::where('empresa_id', $request->user()->empresa_id)
            ->with(['area:id,nombre']);

        if ($request->filled('estado')) {
            $query->where('estado', $request->estado);
        }
        if ($request->filled('tipo')) {
            $query->where('tipo', $request->tipo);
        }
        if ($request->filled('area_id')) {
            $query->where('area_id', $request->area_id);
        }
        if ($request->filled('modalidad')) {
            $query->where('modalidad', $request->modalidad);
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
                $sub->where('titulo', 'like', "%{$q}%")
                    ->orWhere('tema', 'like', "%{$q}%")
                    ->orWhere('expositor', 'like', "%{$q}%")
            );
        }

        $capacitaciones = $query->orderByDesc('fecha_programada')
            ->paginate(min($request->integer('per_page', 15), 100));

        return response()->json($capacitaciones);
    }

    /**
     * POST /api/capacitaciones
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'titulo'            => 'required|string|max:200',
            'tema'              => 'nullable|string|max:300',
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
            modulo: 'capacitaciones',
            accion: 'crear_capacitacion',
            usuario: $request->user(),
            modelo: 'Capacitacion',
            modeloId: $capacitacion->id,
            valorNuevo: ['titulo' => $capacitacion->titulo, 'tipo' => $capacitacion->tipo],
            request: $request
        );

        return response()->json($capacitacion->load('area:id,nombre'), 201);
    }

    /**
     * GET /api/capacitaciones/{id}
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $capacitacion = Capacitacion::where('empresa_id', $request->user()->empresa_id)
            ->with([
                'area:id,nombre',
                'asistentes.personal:id,nombres,apellidos,dni',
                'evaluacion',
            ])
            ->findOrFail($id);

        return response()->json($capacitacion);
    }

    /**
     * PUT /api/capacitaciones/{id}
     */
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

    /**
     * DELETE /api/capacitaciones/{id}
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $capacitacion = Capacitacion::where('empresa_id', $request->user()->empresa_id)
            ->findOrFail($id);
        $capacitacion->delete();

        return response()->json(['message' => 'Capacitación eliminada correctamente']);
    }

    /**
     * GET /api/capacitaciones/estadisticas
     */
    public function estadisticas(Request $request): JsonResponse
    {
        $empresaId = $request->user()->empresa_id;
        $anio = $request->integer('anio', now()->year);

        $total = Capacitacion::where('empresa_id', $empresaId)
            ->whereYear('fecha_programada', $anio)->count();

        $ejecutadas = Capacitacion::where('empresa_id', $empresaId)
            ->whereYear('fecha_programada', $anio)
            ->where('estado', 'ejecutada')->count();

        $programadas = Capacitacion::where('empresa_id', $empresaId)
            ->whereYear('fecha_programada', $anio)
            ->where('estado', 'programada')->count();

        $horasAcumuladas = Capacitacion::where('empresa_id', $empresaId)
            ->whereYear('fecha_programada', $anio)
            ->where('estado', 'ejecutada')
            ->sum('duracion_horas');

        $totalAsistentes = CapacitacionAsistente::whereHas('capacitacion', fn($q) =>
            $q->where('empresa_id', $empresaId)
              ->whereYear('fecha_programada', $anio)
              ->where('estado', 'ejecutada')
        )->where('asistio', true)->count();

        $totalConvocados = CapacitacionAsistente::whereHas('capacitacion', fn($q) =>
            $q->where('empresa_id', $empresaId)
              ->whereYear('fecha_programada', $anio)
              ->where('estado', 'ejecutada')
        )->count();

        $porcentajeAsistencia = $totalConvocados > 0
            ? round(($totalAsistentes / $totalConvocados) * 100, 1)
            : null;

        $porTipo = Capacitacion::where('empresa_id', $empresaId)
            ->whereYear('fecha_programada', $anio)
            ->selectRaw('tipo, COUNT(*) as total')
            ->groupBy('tipo')->get();

        return response()->json([
            'total'                  => $total,
            'ejecutadas'             => $ejecutadas,
            'programadas'            => $programadas,
            'horas_acumuladas'       => $horasAcumuladas,
            'porcentaje_asistencia'  => $porcentajeAsistencia,
            'total_asistentes'       => $totalAsistentes,
            'por_tipo'               => $porTipo,
            'cumplimiento'           => $total > 0 ? round(($ejecutadas / $total) * 100, 1) : 0,
        ]);
    }

    /**
     * POST /api/capacitaciones/{id}/asistencia
     * Registro masivo de asistencia
     */
    public function registrarAsistencia(Request $request, int $id): JsonResponse
    {
        $capacitacion = Capacitacion::where('empresa_id', $request->user()->empresa_id)
            ->findOrFail($id);

        $validated = $request->validate([
            'asistentes'                  => 'required|array|min:1',
            'asistentes.*.personal_id'    => 'required|exists:personal,id',
            'asistentes.*.asistio'        => 'required|boolean',
            'asistentes.*.hora_ingreso'   => 'nullable|date_format:H:i',
            'asistentes.*.hora_salida'    => 'nullable|date_format:H:i',
            'asistentes.*.nota_evaluacion'=> 'nullable|numeric|min:0|max:20',
            'asistentes.*.aprobado'       => 'nullable|boolean',
            'asistentes.*.observaciones'  => 'nullable|string',
        ]);

        foreach ($validated['asistentes'] as $asist) {
            CapacitacionAsistente::updateOrCreate(
                [
                    'capacitacion_id' => $capacitacion->id,
                    'personal_id'     => $asist['personal_id'],
                ],
                $asist
            );
        }

        $this->auditoria->registrar(
            modulo: 'capacitaciones',
            accion: 'registrar_asistencia',
            usuario: $request->user(),
            modelo: 'Capacitacion',
            modeloId: $capacitacion->id,
            valorNuevo: ['total_registros' => count($validated['asistentes'])],
            request: $request
        );

        return response()->json([
            'message'    => 'Asistencia registrada correctamente',
            'registros'  => count($validated['asistentes']),
            'asistentes' => $capacitacion->load('asistentes.personal:id,nombres,apellidos,dni')->asistentes,
        ]);
    }

    /**
     * POST /api/capacitaciones/{id}/ejecutar
     */
    public function ejecutar(Request $request, int $id): JsonResponse
    {
        $capacitacion = Capacitacion::where('empresa_id', $request->user()->empresa_id)
            ->findOrFail($id);

        $validated = $request->validate([
            'fecha_ejecutada' => 'nullable|date',
            'observaciones'   => 'nullable|string',
        ]);

        $capacitacion->update([
            'estado'          => 'ejecutada',
            'fecha_ejecutada' => $validated['fecha_ejecutada'] ?? now()->toDateString(),
            'observaciones'   => $validated['observaciones'] ?? $capacitacion->observaciones,
        ]);

        $this->auditoria->registrar(
            modulo: 'capacitaciones',
            accion: 'ejecutar_capacitacion',
            usuario: $request->user(),
            modelo: 'Capacitacion',
            modeloId: $capacitacion->id,
            request: $request
        );

        return response()->json($capacitacion->load(['area:id,nombre', 'asistentes.personal:id,nombres,apellidos']));
    }
}
