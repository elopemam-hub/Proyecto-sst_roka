<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Accidente;
use App\Models\AccidenteInvestigacion;
use App\Models\AccidenteAccion;
use App\Services\AuditoriaService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AccidenteController extends Controller
{
    public function __construct(
        private AuditoriaService $auditoria
    ) {}

    /**
     * GET /api/accidentes
     */
    public function index(Request $request): JsonResponse
    {
        $query = Accidente::where('empresa_id', $request->user()->empresa_id)
            ->with(['area:id,nombre', 'accidentado:id,nombres,apellidos', 'elaborador:id,nombre']);

        if ($request->filled('tipo'))          $query->where('tipo', $request->tipo);
        if ($request->filled('estado'))        $query->where('estado', $request->estado);
        if ($request->filled('area_id'))       $query->where('area_id', $request->area_id);
        if ($request->filled('fecha_desde'))   $query->where('fecha_accidente', '>=', $request->fecha_desde);
        if ($request->filled('fecha_hasta'))   $query->where('fecha_accidente', '<=', $request->fecha_hasta);
        if ($request->boolean('sin_notificar')) {
            $query->where('notificado_mintra', false)
                ->whereIn('tipo', ['accidente_mortal', 'accidente_incapacitante', 'incidente_peligroso']);
        }

        $accidentes = $query->orderByDesc('fecha_accidente')
            ->paginate(min($request->integer('per_page', 20), 100));

        return response()->json($accidentes);
    }

    /**
     * POST /api/accidentes — Registro inmediato (Ley 29783 Art. 82)
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'sede_id'               => 'required|exists:sedes,id',
            'area_id'               => 'required|exists:areas,id',
            'tipo'                  => ['required', Rule::in(['accidente_leve','accidente_incapacitante','accidente_mortal','incidente_peligroso','incidente'])],
            'fecha_accidente'       => 'required|date',
            'lugar_exacto'          => 'required|string|max:255',
            'descripcion_evento'    => 'required|string|min:20',
            'accidentado_id'        => 'required|exists:personal,id',
            'testigos'              => 'nullable|array',
            'dias_perdidos'         => 'integer|min:0',
            'parte_cuerpo_afectada' => 'nullable|string|max:150',
            'tipo_lesion'           => 'nullable|string|max:150',
            'agente_causante'       => 'nullable|string|max:255',
            'descripcion_lesion'    => 'nullable|string',
            'requiere_hospitalizacion' => 'boolean',
            'centro_medico'         => 'nullable|string|max:255',
            'descripcion_atencion'  => 'nullable|string',
            'costo_atencion'        => 'nullable|numeric|min:0',
            'costo_dias_perdidos'   => 'nullable|numeric|min:0',
            'costo_danos_materiales'=> 'nullable|numeric|min:0',
        ]);

        $usuario = $request->user();

        $accidente = Accidente::create([
            ...$validated,
            'empresa_id'    => $usuario->empresa_id,
            'codigo'        => Accidente::generarCodigo($usuario->empresa_id, $validated['tipo']),
            'elaborado_por' => $usuario->id,
            'estado'        => 'registrado',
            'costo_total'   => ($validated['costo_atencion'] ?? 0)
                             + ($validated['costo_dias_perdidos'] ?? 0)
                             + ($validated['costo_danos_materiales'] ?? 0),
        ]);

        $this->auditoria->registrar(
            modulo: 'accidentes',
            accion: 'registrar',
            usuario: $usuario,
            modelo: 'Accidente',
            modeloId: $accidente->id,
            valorNuevo: [
                'codigo' => $accidente->codigo,
                'tipo'   => $accidente->tipo,
                'requiere_notificacion_mintra' => $accidente->requiere_notificacion_minta,
            ],
            request: $request
        );

        return response()->json(
            $accidente->load(['accidentado', 'area', 'sede']),
            201
        );
    }

    /**
     * GET /api/accidentes/{id}
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $accidente = Accidente::where('empresa_id', $request->user()->empresa_id)
            ->with([
                'area', 'sede',
                'accidentado:id,nombres,apellidos,dni,cargo_id',
                'accidentado.cargo:id,nombre',
                'elaborador:id,nombre',
                'investigacion.investigador:id,nombre',
                'acciones.responsable:id,nombres,apellidos',
            ])
            ->findOrFail($id);

        $accidente->requiere_notificacion_mintra = $accidente->requiere_notificacion_minta;
        $accidente->horas_para_notificar = $accidente->horas_para_notificar;

        return response()->json($accidente);
    }

    /**
     * PUT /api/accidentes/{id}
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $accidente = Accidente::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);

        if ($accidente->estado === 'cerrado') {
            return response()->json(['message' => 'No se puede modificar un accidente cerrado.'], 422);
        }

        $validated = $request->validate([
            'estado'                    => ['sometimes', Rule::in(['registrado','en_investigacion','investigado','notificado_mintra','cerrado'])],
            'dias_perdidos'             => 'sometimes|integer|min:0',
            'parte_cuerpo_afectada'     => 'nullable|string|max:150',
            'tipo_lesion'               => 'nullable|string|max:150',
            'agente_causante'           => 'nullable|string|max:255',
            'descripcion_lesion'        => 'nullable|string',
            'requiere_hospitalizacion'  => 'boolean',
            'centro_medico'             => 'nullable|string|max:255',
            'descripcion_atencion'      => 'nullable|string',
            'notificado_mintra'         => 'boolean',
            'fecha_notificacion_mintra' => 'nullable|date',
            'numero_notificacion_mintra'=> 'nullable|string|max:50',
            'costo_atencion'            => 'nullable|numeric|min:0',
            'costo_dias_perdidos'       => 'nullable|numeric|min:0',
            'costo_danos_materiales'    => 'nullable|numeric|min:0',
        ]);

        if (isset($validated['costo_atencion']) || isset($validated['costo_dias_perdidos']) || isset($validated['costo_danos_materiales'])) {
            $validated['costo_total'] =
                ($validated['costo_atencion']       ?? $accidente->costo_atencion ?? 0) +
                ($validated['costo_dias_perdidos']  ?? $accidente->costo_dias_perdidos ?? 0) +
                ($validated['costo_danos_materiales'] ?? $accidente->costo_danos_materiales ?? 0);
        }

        $anterior = $accidente->toArray();
        $accidente->update($validated);

        $this->auditoria->registrarCambioModelo(
            modulo: 'accidentes',
            accion: 'actualizar',
            usuario: $request->user(),
            modelo: 'Accidente',
            modeloId: $accidente->id,
            anterior: $anterior,
            nuevo: $accidente->toArray(),
            request: $request
        );

        return response()->json($accidente);
    }

    /**
     * DELETE /api/accidentes/{id}
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $accidente = Accidente::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);

        if ($accidente->estado !== 'registrado') {
            return response()->json(['message' => 'Solo se puede eliminar un accidente recién registrado.'], 422);
        }

        $accidente->delete();

        $this->auditoria->registrar(
            modulo: 'accidentes',
            accion: 'eliminar',
            usuario: $request->user(),
            modelo: 'Accidente',
            modeloId: $id,
            request: $request
        );

        return response()->json(['message' => 'Accidente eliminado.']);
    }

    /**
     * POST /api/accidentes/{id}/investigacion — Registrar/actualizar investigación
     */
    public function registrarInvestigacion(Request $request, int $id): JsonResponse
    {
        $accidente = Accidente::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);

        $validated = $request->validate([
            'metodologia'                => ['required', Rule::in(['arbol_causas','cinco_porques','ishikawa','combinado'])],
            'causas_inmediatas'          => 'nullable|array',
            'causas_basicas'             => 'nullable|array',
            'factores_trabajo'           => 'nullable|string',
            'factores_personales'        => 'nullable|string',
            'descripcion_metodologia'    => 'nullable|string',
            'lecciones_aprendidas'       => 'nullable|string',
            'fecha_inicio_investigacion' => 'required|date',
            'fecha_cierre_investigacion' => 'nullable|date|after_or_equal:fecha_inicio_investigacion',
        ]);

        $investigacion = AccidenteInvestigacion::updateOrCreate(
            ['accidente_id' => $accidente->id],
            [
                ...$validated,
                'investigador_id' => $request->user()->id,
            ]
        );

        $accidente->update(['estado' => 'en_investigacion']);

        return response()->json($investigacion->load('investigador:id,nombre'));
    }

    /**
     * POST /api/accidentes/{id}/acciones — Registrar acción correctiva
     */
    public function registrarAccion(Request $request, int $id): JsonResponse
    {
        $accidente = Accidente::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);

        $validated = $request->validate([
            'tipo'           => ['required', Rule::in(['correctiva','preventiva','mejora'])],
            'descripcion'    => 'required|string|min:10',
            'responsable_id' => 'required|exists:personal,id',
            'fecha_limite'   => 'required|date|after:today',
            'observaciones'  => 'nullable|string',
        ]);

        $accion = AccidenteAccion::create([
            ...$validated,
            'accidente_id' => $accidente->id,
            'estado'       => 'pendiente',
        ]);

        if ($accidente->estado === 'investigado') {
            $accidente->update(['estado' => 'investigado']);
        }

        return response()->json($accion->load('responsable:id,nombres,apellidos'), 201);
    }

    /**
     * GET /api/accidentes/estadisticas
     */
    public function estadisticas(Request $request): JsonResponse
    {
        $empresaId = $request->user()->empresa_id;
        $anio      = $request->integer('anio', now()->year);

        $porTipo = Accidente::where('empresa_id', $empresaId)
            ->whereYear('fecha_accidente', $anio)
            ->selectRaw('tipo, COUNT(*) as total, SUM(dias_perdidos) as total_dias')
            ->groupBy('tipo')
            ->get();

        $porMes = Accidente::where('empresa_id', $empresaId)
            ->whereYear('fecha_accidente', $anio)
            ->whereIn('tipo', ['accidente_leve', 'accidente_incapacitante', 'accidente_mortal'])
            ->selectRaw('MONTH(fecha_accidente) as mes, COUNT(*) as total, SUM(dias_perdidos) as dias')
            ->groupBy('mes')
            ->orderBy('mes')
            ->get();

        $sinNotificar = Accidente::where('empresa_id', $empresaId)
            ->where('notificado_mintra', false)
            ->whereIn('tipo', ['accidente_mortal', 'accidente_incapacitante', 'incidente_peligroso'])
            ->count();

        return response()->json([
            'anio'         => $anio,
            'por_tipo'     => $porTipo,
            'por_mes'      => $porMes,
            'sin_notificar'=> $sinNotificar,
        ]);
    }
}
