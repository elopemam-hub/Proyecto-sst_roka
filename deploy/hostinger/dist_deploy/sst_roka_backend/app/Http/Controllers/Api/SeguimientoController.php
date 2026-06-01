<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AccionSeguimiento;
use App\Services\AuditoriaService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\Rule;

class SeguimientoController extends Controller
{
    public function __construct(
        private AuditoriaService $auditoria
    ) {}

    /**
     * GET /api/seguimiento
     */
    public function index(Request $request): JsonResponse
    {
        $query = AccionSeguimiento::where('empresa_id', $request->user()->empresa_id)
            ->with(['responsable:id,nombres,apellidos', 'area:id,nombre', 'validador:id,nombre']);

        if ($request->filled('estado'))      $query->where('estado', $request->estado);
        if ($request->filled('tipo'))        $query->where('tipo', $request->tipo);
        if ($request->filled('prioridad'))   $query->where('prioridad', $request->prioridad);
        if ($request->filled('origen_tipo')) $query->where('origen_tipo', $request->origen_tipo);
        if ($request->filled('area_id'))     $query->where('area_id', $request->area_id);
        if ($request->filled('responsable_id')) $query->where('responsable_id', $request->responsable_id);
        if ($request->boolean('vencidas'))   $query->where('fecha_limite', '<', now())->whereNotIn('estado', ['completada','validada','cancelada']);
        if ($request->boolean('proximas')) {
            $query->whereBetween('fecha_limite', [now(), now()->addDays(7)])
                  ->whereNotIn('estado', ['completada','validada','cancelada']);
        }
        if ($request->filled('search')) {
            $q = $request->search;
            $query->where(fn($sub) =>
                $sub->where('codigo', 'like', "%{$q}%")
                    ->orWhere('titulo', 'like', "%{$q}%")
            );
        }

        // Actualizar automáticamente vencidas
        AccionSeguimiento::where('empresa_id', $request->user()->empresa_id)
            ->where('fecha_limite', '<', now())
            ->whereIn('estado', ['pendiente', 'en_proceso'])
            ->update(['estado' => 'vencida']);

        $acciones = $query->orderByRaw("FIELD(prioridad, 'critica', 'alta', 'media', 'baja')")
            ->orderBy('fecha_limite')
            ->paginate(min($request->integer('per_page', 20), 100));

        $acciones->getCollection()->transform(function ($item) {
            $item->esta_vencida    = $item->esta_vencida;
            $item->dias_restantes  = $item->dias_restantes;
            return $item;
        });

        return response()->json($acciones);
    }

    /**
     * POST /api/seguimiento
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'origen_tipo'       => ['required', Rule::in(['inspeccion','accidente','auditoria','iperc','ats','otro'])],
            'origen_id'         => 'nullable|integer',
            'tipo'              => ['required', Rule::in(['correctiva','preventiva','mejora','legal'])],
            'titulo'            => 'required|string|max:255',
            'descripcion'       => 'required|string|min:10',
            'responsable_id'    => 'required|exists:personal,id',
            'area_id'           => 'nullable|exists:areas,id',
            'prioridad'         => ['required', Rule::in(['baja','media','alta','critica'])],
            'fecha_programada'  => 'required|date',
            'fecha_limite'      => 'required|date|after_or_equal:fecha_programada',
            'observaciones'     => 'nullable|string',
        ]);

        $usuario = $request->user();

        $accion = AccionSeguimiento::create([
            ...$validated,
            'empresa_id' => $usuario->empresa_id,
            'codigo'     => AccionSeguimiento::generarCodigo($usuario->empresa_id),
            'estado'     => 'pendiente',
        ]);

        $this->auditoria->registrar(
            modulo: 'seguimiento',
            accion: 'crear',
            usuario: $usuario,
            modelo: 'AccionSeguimiento',
            modeloId: $accion->id,
            valorNuevo: ['codigo' => $accion->codigo, 'tipo' => $accion->tipo],
            request: $request
        );

        return response()->json($accion->load(['responsable:id,nombres,apellidos', 'area']), 201);
    }

    /**
     * GET /api/seguimiento/{id}
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $accion = AccionSeguimiento::where('empresa_id', $request->user()->empresa_id)
            ->with(['responsable:id,nombres,apellidos,dni', 'area', 'validador:id,nombre'])
            ->findOrFail($id);

        $accion->esta_vencida   = $accion->esta_vencida;
        $accion->dias_restantes = $accion->dias_restantes;

        return response()->json($accion);
    }

    /**
     * PUT /api/seguimiento/{id}
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $accion = AccionSeguimiento::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);

        if (in_array($accion->estado, ['validada', 'cancelada'])) {
            return response()->json(['message' => 'No se puede modificar una acción validada o cancelada.'], 422);
        }

        $validated = $request->validate([
            'titulo'              => 'sometimes|string|max:255',
            'descripcion'         => 'sometimes|string|min:10',
            'responsable_id'      => 'sometimes|exists:personal,id',
            'prioridad'           => ['sometimes', Rule::in(['baja','media','alta','critica'])],
            'fecha_limite'        => 'sometimes|date',
            'fecha_ejecucion'     => 'nullable|date',
            'porcentaje_avance'   => 'sometimes|integer|min:0|max:100',
            'estado'              => ['sometimes', Rule::in(['pendiente','en_proceso','completada','vencida','validada','cancelada'])],
            'evidencias'          => 'nullable|array',
            'observaciones'       => 'nullable|string',
        ]);

        $anterior = $accion->toArray();

        // Si se marca como completada, registrar fecha
        if (($validated['estado'] ?? '') === 'completada' && !$accion->fecha_ejecucion) {
            $validated['fecha_ejecucion'] = now()->toDateString();
            $validated['porcentaje_avance'] = 100;
        }

        $accion->update($validated);

        $this->auditoria->registrarCambioModelo(
            modulo: 'seguimiento',
            accion: 'actualizar',
            usuario: $request->user(),
            modelo: 'AccionSeguimiento',
            modeloId: $accion->id,
            anterior: $anterior,
            nuevo: $accion->toArray(),
            request: $request
        );

        return response()->json($accion->load(['responsable:id,nombres,apellidos', 'area']));
    }

    /**
     * DELETE /api/seguimiento/{id}
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $accion = AccionSeguimiento::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);

        if (!in_array($accion->estado, ['pendiente', 'cancelada'])) {
            return response()->json(['message' => 'Solo se puede eliminar acciones pendientes o canceladas.'], 422);
        }

        $accion->delete();

        return response()->json(['message' => 'Acción de seguimiento eliminada.']);
    }

    /**
     * POST /api/seguimiento/{id}/validar — Supervisor valida que la acción fue eficaz
     */
    public function validar(Request $request, int $id): JsonResponse
    {
        $accion = AccionSeguimiento::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);

        if ($accion->estado !== 'completada') {
            return response()->json(['message' => 'Solo se puede validar una acción completada.'], 422);
        }

        $validated = $request->validate([
            'observaciones_validacion' => 'required|string|min:10',
        ]);

        $accion->update([
            'estado'                   => 'validada',
            'validado_por'             => $request->user()->id,
            'validado_en'              => now(),
            'observaciones_validacion' => $validated['observaciones_validacion'],
        ]);

        $this->auditoria->registrar(
            modulo: 'seguimiento',
            accion: 'validar',
            usuario: $request->user(),
            modelo: 'AccionSeguimiento',
            modeloId: $accion->id,
            request: $request
        );

        return response()->json(['message' => 'Acción validada correctamente.', 'accion' => $accion]);
    }

    /**
     * GET /api/seguimiento/resumen — KPIs del módulo
     */
    public function resumen(Request $request): JsonResponse
    {
        $empresaId = $request->user()->empresa_id;

        $totales = AccionSeguimiento::where('empresa_id', $empresaId)
            ->selectRaw('estado, COUNT(*) as total')
            ->groupBy('estado')
            ->pluck('total', 'estado');

        $porOrigen = AccionSeguimiento::where('empresa_id', $empresaId)
            ->selectRaw('origen_tipo, COUNT(*) as total')
            ->groupBy('origen_tipo')
            ->pluck('total', 'origen_tipo');

        $vencidas = AccionSeguimiento::where('empresa_id', $empresaId)
            ->where('fecha_limite', '<', now())
            ->whereNotIn('estado', ['completada', 'validada', 'cancelada'])
            ->count();

        $proximas = AccionSeguimiento::where('empresa_id', $empresaId)
            ->whereBetween('fecha_limite', [now(), now()->addDays(7)])
            ->whereNotIn('estado', ['completada', 'validada', 'cancelada'])
            ->count();

        return response()->json([
            'totales'   => $totales,
            'por_origen'=> $porOrigen,
            'vencidas'  => $vencidas,
            'proximas'  => $proximas,
        ]);
    }
}
