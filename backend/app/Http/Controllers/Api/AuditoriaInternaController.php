<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditoriaInterna;
use App\Models\AuditoriaHallazgo;
use App\Models\AuditoriaSeguimiento;
use App\Services\AuditoriaService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class AuditoriaInternaController extends Controller
{
    public function __construct(
        private AuditoriaService $auditoria
    ) {}

    /**
     * GET /api/auditorias
     */
    public function index(Request $request): JsonResponse
    {
        $query = AuditoriaInterna::where('empresa_id', $request->user()->empresa_id)
            ->with(['area:id,nombre'])
            ->withCount(['hallazgos']);

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
                $sub->where('auditor_lider', 'like', "%{$q}%")
                    ->orWhere('norma_referencia', 'like', "%{$q}%")
                    ->orWhere('alcance', 'like', "%{$q}%")
            );
        }

        $auditorias = $query->orderByDesc('fecha_programada')
            ->paginate(min($request->integer('per_page', 15), 100));

        return response()->json($auditorias);
    }

    /**
     * POST /api/auditorias
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'tipo'              => 'required|in:interna,externa',
            'norma_referencia'  => 'nullable|string|max:150',
            'auditor_lider'     => 'required|string|max:150',
            'equipo_auditor'    => 'nullable|array',
            'equipo_auditor.*'  => 'string|max:200',
            'fecha_programada'  => 'required|date',
            'area_id'           => 'nullable|exists:areas,id',
            'alcance'           => 'nullable|string',
            'objetivo'          => 'nullable|string',
            'observaciones'     => 'nullable|string',
        ]);

        $aud = AuditoriaInterna::create([
            ...$validated,
            'empresa_id' => $request->user()->empresa_id,
            'estado'     => 'programada',
        ]);

        $this->auditoria->registrar(
            modulo: 'auditorias',
            accion: 'crear_auditoria',
            usuario: $request->user(),
            modelo: 'AuditoriaInterna',
            modeloId: $aud->id,
            valorNuevo: ['tipo' => $aud->tipo, 'auditor_lider' => $aud->auditor_lider],
            request: $request
        );

        return response()->json($aud->load('area:id,nombre'), 201);
    }

    /**
     * GET /api/auditorias/{id}
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $aud = AuditoriaInterna::where('empresa_id', $request->user()->empresa_id)
            ->with([
                'area:id,nombre',
                'hallazgos' => fn($q) => $q->with([
                    'responsable:id,nombres,apellidos',
                    'seguimientos' => fn($sq) => $sq->orderBy('fecha'),
                ])->orderByDesc('created_at'),
            ])
            ->findOrFail($id);

        // Append computed fields on hallazgos
        $aud->hallazgos->each(function($h) {
            $h->esta_vencido   = $h->esta_vencido;
            $h->dias_restantes = $h->dias_restantes;
        });

        return response()->json($aud);
    }

    /**
     * PUT /api/auditorias/{id}
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $aud = AuditoriaInterna::where('empresa_id', $request->user()->empresa_id)
            ->findOrFail($id);

        $validated = $request->validate([
            'tipo'              => 'sometimes|in:interna,externa',
            'norma_referencia'  => 'nullable|string|max:150',
            'auditor_lider'     => 'sometimes|string|max:150',
            'equipo_auditor'    => 'nullable|array',
            'fecha_programada'  => 'sometimes|date',
            'fecha_ejecutada'   => 'nullable|date',
            'area_id'           => 'nullable|exists:areas,id',
            'alcance'           => 'nullable|string',
            'objetivo'          => 'nullable|string',
            'estado'            => 'sometimes|in:programada,en_proceso,completada,cancelada',
            'conclusion'        => 'nullable|string',
        ]);

        $aud->update($validated);

        return response()->json($aud->load('area:id,nombre'));
    }

    /**
     * DELETE /api/auditorias/{id}
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $aud = AuditoriaInterna::where('empresa_id', $request->user()->empresa_id)
            ->findOrFail($id);
        $aud->delete();

        return response()->json(['message' => 'Auditoría eliminada correctamente']);
    }

    /**
     * GET /api/auditorias/estadisticas
     */
    public function estadisticas(Request $request): JsonResponse
    {
        $empresaId = $request->user()->empresa_id;
        $anio = $request->integer('anio', now()->year);

        $total = AuditoriaInterna::where('empresa_id', $empresaId)
            ->whereYear('fecha_programada', $anio)->count();

        $completadas = AuditoriaInterna::where('empresa_id', $empresaId)
            ->whereYear('fecha_programada', $anio)
            ->where('estado', 'completada')->count();

        $enProceso = AuditoriaInterna::where('empresa_id', $empresaId)
            ->whereYear('fecha_programada', $anio)
            ->where('estado', 'en_proceso')->count();

        $hallazgosAbiertos = AuditoriaHallazgo::where('empresa_id', $empresaId)
            ->whereIn('estado', ['abierto', 'en_proceso'])->count();

        $hallazgosVencidos = AuditoriaHallazgo::where('empresa_id', $empresaId)
            ->whereIn('estado', ['abierto', 'en_proceso'])
            ->whereNotNull('fecha_limite')
            ->where('fecha_limite', '<', now())->count();

        $porTipoHallazgo = AuditoriaHallazgo::where('empresa_id', $empresaId)
            ->selectRaw('tipo_hallazgo, COUNT(*) as total')
            ->groupBy('tipo_hallazgo')->get();

        $porEstadoHallazgo = AuditoriaHallazgo::where('empresa_id', $empresaId)
            ->selectRaw('estado, COUNT(*) as total')
            ->groupBy('estado')->get();

        return response()->json([
            'total'                => $total,
            'completadas'          => $completadas,
            'en_proceso'           => $enProceso,
            'hallazgos_abiertos'   => $hallazgosAbiertos,
            'hallazgos_vencidos'   => $hallazgosVencidos,
            'por_tipo_hallazgo'    => $porTipoHallazgo,
            'por_estado_hallazgo'  => $porEstadoHallazgo,
            'cumplimiento'         => $total > 0 ? round(($completadas / $total) * 100, 1) : 0,
        ]);
    }

    /**
     * POST /api/auditorias/{id}/hallazgos
     */
    public function registrarHallazgo(Request $request, int $id): JsonResponse
    {
        $aud = AuditoriaInterna::where('empresa_id', $request->user()->empresa_id)
            ->findOrFail($id);

        $validated = $request->validate([
            'tipo_hallazgo'     => 'required|in:no_conformidad_mayor,no_conformidad_menor,observacion,oportunidad_mejora',
            'clausula_norma'    => 'nullable|string|max:100',
            'descripcion'       => 'required|string',
            'evidencia'         => 'nullable|string',
            'accion_correctiva' => 'nullable|string',
            'responsable_id'    => 'nullable|exists:personal,id',
            'fecha_limite'      => 'nullable|date',
        ]);

        $hallazgo = AuditoriaHallazgo::create([
            ...$validated,
            'empresa_id'    => $request->user()->empresa_id,
            'auditoria_id'  => $aud->id,
            'estado'        => 'abierto',
        ]);

        $this->auditoria->registrar(
            modulo: 'auditorias',
            accion: 'registrar_hallazgo',
            usuario: $request->user(),
            modelo: 'AuditoriaHallazgo',
            modeloId: $hallazgo->id,
            valorNuevo: ['tipo_hallazgo' => $hallazgo->tipo_hallazgo],
            request: $request
        );

        return response()->json(
            $hallazgo->load('responsable:id,nombres,apellidos'),
            201
        );
    }

    /**
     * POST /api/auditorias/hallazgos/{id}/seguimiento
     */
    public function registrarSeguimiento(Request $request, int $id): JsonResponse
    {
        $hallazgo = AuditoriaHallazgo::where('empresa_id', $request->user()->empresa_id)
            ->findOrFail($id);

        $validated = $request->validate([
            'fecha'             => 'required|date',
            'descripcion'       => 'required|string',
            'evidencia_cierre'  => 'nullable|string',
            'verificado_por'    => 'nullable|string|max:150',
            'resultado'         => 'nullable|in:conforme,no_conforme,parcial',
        ]);

        $seguimiento = AuditoriaSeguimiento::create([
            ...$validated,
            'hallazgo_id' => $hallazgo->id,
        ]);

        // Si el resultado es conforme, cerrar el hallazgo automáticamente
        if (($validated['resultado'] ?? null) === 'conforme') {
            $hallazgo->update([
                'estado'       => 'cerrado',
                'fecha_cierre' => $validated['fecha'],
            ]);
        } elseif (($validated['resultado'] ?? null) === 'parcial') {
            $hallazgo->update(['estado' => 'en_proceso']);
        }

        return response()->json([
            'seguimiento' => $seguimiento,
            'hallazgo'    => $hallazgo->fresh()->load([
                'responsable:id,nombres,apellidos',
                'seguimientos',
            ]),
        ], 201);
    }
}
