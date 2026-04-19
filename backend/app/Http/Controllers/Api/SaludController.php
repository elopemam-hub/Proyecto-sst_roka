<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Emo;
use App\Models\SaludRestriccion;
use App\Models\SaludAtencion;
use App\Services\AuditoriaService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class SaludController extends Controller
{
    public function __construct(
        private AuditoriaService $auditoria
    ) {}

    /**
     * GET /api/salud
     */
    public function index(Request $request): JsonResponse
    {
        $query = Emo::where('empresa_id', $request->user()->empresa_id)
            ->with('personal:id,nombres,apellidos,dni');

        if ($request->filled('personal_id')) {
            $query->where('personal_id', $request->personal_id);
        }
        if ($request->filled('tipo')) {
            $query->where('tipo', $request->tipo);
        }
        if ($request->filled('resultado')) {
            $query->where('resultado', $request->resultado);
        }
        if ($request->boolean('vencidas')) {
            $query->whereNotNull('fecha_vencimiento')
                  ->where('fecha_vencimiento', '<', now());
        }
        if ($request->boolean('proximas')) {
            $query->whereNotNull('fecha_vencimiento')
                  ->whereBetween('fecha_vencimiento', [now(), now()->addDays(30)]);
        }
        if ($request->filled('search')) {
            $q = $request->search;
            $query->whereHas('personal', fn($sub) =>
                $sub->where('nombres', 'like', "%{$q}%")
                    ->orWhere('apellidos', 'like', "%{$q}%")
                    ->orWhere('dni', 'like', "%{$q}%")
            );
        }

        $emos = $query->orderByDesc('fecha_examen')
            ->paginate(min($request->integer('per_page', 15), 100));

        $emos->getCollection()->transform(function ($emo) {
            $emo->esta_vencida     = $emo->esta_vencida;
            $emo->dias_para_vencer = $emo->dias_para_vencer;
            return $emo;
        });

        return response()->json($emos);
    }

    /**
     * POST /api/salud
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'personal_id'       => 'required|exists:personal,id',
            'tipo'              => 'required|in:pre_ocupacional,periodico,retiro,por_cambio_ocupacional',
            'fecha_examen'      => 'required|date',
            'fecha_vencimiento' => 'nullable|date|after:fecha_examen',
            'clinica'           => 'nullable|string|max:150',
            'medico'            => 'nullable|string|max:150',
            'resultado'         => 'required|in:apto,apto_con_restricciones,no_apto',
            'restricciones'     => 'nullable|string',
            'observaciones'     => 'nullable|string',
        ]);

        $emo = Emo::create([
            ...$validated,
            'empresa_id' => $request->user()->empresa_id,
        ]);

        $this->auditoria->registrar(
            modulo: 'salud',
            accion: 'crear_emo',
            usuario: $request->user(),
            modelo: 'Emo',
            modeloId: $emo->id,
            valorNuevo: ['personal_id' => $emo->personal_id, 'resultado' => $emo->resultado],
            request: $request
        );

        return response()->json($emo->load('personal:id,nombres,apellidos'), 201);
    }

    /**
     * GET /api/salud/{id}
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $emo = Emo::where('empresa_id', $request->user()->empresa_id)
            ->with([
                'personal:id,nombres,apellidos,dni',
                'restriccionesRelacion.area:id,nombre',
            ])
            ->findOrFail($id);

        $emo->esta_vencida     = $emo->esta_vencida;
        $emo->dias_para_vencer = $emo->dias_para_vencer;

        return response()->json($emo);
    }

    /**
     * PUT /api/salud/{id}
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $emo = Emo::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);

        $validated = $request->validate([
            'tipo'              => 'sometimes|in:pre_ocupacional,periodico,retiro,por_cambio_ocupacional',
            'fecha_examen'      => 'sometimes|date',
            'fecha_vencimiento' => 'nullable|date',
            'clinica'           => 'nullable|string|max:150',
            'medico'            => 'nullable|string|max:150',
            'resultado'         => 'sometimes|in:apto,apto_con_restricciones,no_apto',
            'restricciones'     => 'nullable|string',
            'observaciones'     => 'nullable|string',
            'notificado'        => 'boolean',
        ]);

        $emo->update($validated);

        return response()->json($emo->load('personal:id,nombres,apellidos'));
    }

    /**
     * DELETE /api/salud/{id}
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $emo = Emo::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);
        $emo->delete();

        return response()->json(['message' => 'EMO eliminado correctamente']);
    }

    /**
     * GET /api/salud/estadisticas
     */
    public function estadisticas(Request $request): JsonResponse
    {
        $empresaId = $request->user()->empresa_id;

        $vencidas = Emo::where('empresa_id', $empresaId)
            ->whereNotNull('fecha_vencimiento')
            ->where('fecha_vencimiento', '<', now())
            ->count();

        $proximas30d = Emo::where('empresa_id', $empresaId)
            ->whereNotNull('fecha_vencimiento')
            ->whereBetween('fecha_vencimiento', [now(), now()->addDays(30)])
            ->count();

        $porResultado = Emo::where('empresa_id', $empresaId)
            ->selectRaw('resultado, COUNT(*) as total')
            ->groupBy('resultado')
            ->get();

        $porTipo = Emo::where('empresa_id', $empresaId)
            ->selectRaw('tipo, COUNT(*) as total')
            ->groupBy('tipo')
            ->get();

        $conRestricciones = SaludRestriccion::where('empresa_id', $empresaId)
            ->where('activa', true)
            ->distinct('personal_id')
            ->count('personal_id');

        return response()->json([
            'vencidas'          => $vencidas,
            'proximas_30d'      => $proximas30d,
            'por_resultado'     => $porResultado,
            'por_tipo'          => $porTipo,
            'con_restricciones' => $conRestricciones,
        ]);
    }

    /**
     * GET /api/salud/personal/{personalId}/restricciones
     */
    public function restricciones(Request $request, int $personalId): JsonResponse
    {
        $restricciones = SaludRestriccion::where('empresa_id', $request->user()->empresa_id)
            ->where('personal_id', $personalId)
            ->where('activa', true)
            ->with(['area:id,nombre', 'emo:id,tipo,fecha_examen,resultado'])
            ->orderByDesc('fecha_inicio')
            ->get();

        return response()->json($restricciones);
    }

    /**
     * POST /api/salud/restricciones
     */
    public function registrarRestriccion(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'personal_id'      => 'required|exists:personal,id',
            'emo_id'           => 'nullable|exists:salud_emo,id',
            'area_id'          => 'nullable|exists:areas,id',
            'descripcion'      => 'required|string',
            'tipo_restriccion' => 'required|string|max:100',
            'fecha_inicio'     => 'required|date',
            'fecha_fin'        => 'nullable|date|after:fecha_inicio',
            'observaciones'    => 'nullable|string',
        ]);

        $restriccion = SaludRestriccion::create([
            ...$validated,
            'empresa_id' => $request->user()->empresa_id,
            'activa'     => true,
        ]);

        return response()->json($restriccion, 201);
    }

    /**
     * GET /api/salud/atenciones
     */
    public function atenciones(Request $request): JsonResponse
    {
        $query = SaludAtencion::where('empresa_id', $request->user()->empresa_id)
            ->with('personal:id,nombres,apellidos,dni');

        if ($request->filled('personal_id')) {
            $query->where('personal_id', $request->personal_id);
        }
        if ($request->filled('tipo')) {
            $query->where('tipo', $request->tipo);
        }
        if ($request->boolean('baja_laboral')) {
            $query->where('baja_laboral', true);
        }
        if ($request->filled('fecha_desde')) {
            $query->where('fecha', '>=', $request->fecha_desde);
        }
        if ($request->filled('fecha_hasta')) {
            $query->where('fecha', '<=', $request->fecha_hasta . ' 23:59:59');
        }

        $atenciones = $query->orderByDesc('fecha')
            ->paginate(min($request->integer('per_page', 15), 100));

        return response()->json($atenciones);
    }

    /**
     * POST /api/salud/atenciones
     */
    public function registrarAtencion(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'personal_id'   => 'required|exists:personal,id',
            'fecha'         => 'required|date',
            'tipo'          => 'required|in:primeros_auxilios,consulta,emergencia,seguimiento',
            'descripcion'   => 'required|string',
            'tratamiento'   => 'nullable|string',
            'derivado_a'    => 'nullable|string|max:150',
            'baja_laboral'  => 'boolean',
            'dias_descanso' => 'integer|min:0',
            'observaciones' => 'nullable|string',
            'atendido_por'  => 'nullable|string|max:100',
        ]);

        $atencion = SaludAtencion::create([
            ...$validated,
            'empresa_id' => $request->user()->empresa_id,
        ]);

        return response()->json(
            $atencion->load('personal:id,nombres,apellidos'),
            201
        );
    }
}
