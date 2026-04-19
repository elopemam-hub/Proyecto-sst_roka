<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Iperc;
use App\Models\IpercProceso;
use App\Models\IpercPeligro;
use App\Models\IpercControl;
use App\Services\AuditoriaService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class IpercController extends Controller
{
    public function __construct(
        private AuditoriaService $auditoria
    ) {}

    /**
     * GET /api/iperc — Listar matrices IPERC
     */
    public function index(Request $request): JsonResponse
    {
        $empresaId = $request->user()->empresa_id;

        $query = Iperc::where('empresa_id', $empresaId)
            ->with(['area:id,nombre,tipo', 'sede:id,nombre', 'elaborador:id,nombre']);

        // Filtros
        if ($request->filled('estado'))       $query->where('estado', $request->estado);
        if ($request->filled('area_id'))      $query->where('area_id', $request->area_id);
        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('codigo',  'like', "%{$request->search}%")
                  ->orWhere('titulo', 'like', "%{$request->search}%");
            });
        }

        $per = min($request->get('per_page', 20), 100);
        $iperc = $query->orderByDesc('fecha_elaboracion')->paginate($per);

        // Agregar resumen de riesgos
        $iperc->getCollection()->transform(function ($item) {
            $item->resumen_riesgos = $item->resumen_riesgos;
            $item->esta_vencido    = $item->esta_vencido;
            return $item;
        });

        return response()->json($iperc);
    }

    /**
     * POST /api/iperc — Crear nueva matriz IPERC
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'sede_id'           => 'required|exists:sedes,id',
            'area_id'           => 'required|exists:areas,id',
            'titulo'            => 'required|string|max:255',
            'alcance'           => 'nullable|string',
            'metodologia'       => ['required', Rule::in(['IPERC_CONTINUO','IPERC_LINEA_BASE','IPERC_ESPECIFICO'])],
            'fecha_elaboracion' => 'required|date',
            'fecha_vigencia'    => 'nullable|date|after:fecha_elaboracion',
            'revisado_por'      => 'nullable|exists:usuarios,id',
            'aprobado_por'      => 'nullable|exists:usuarios,id',
            'procesos'          => 'nullable|array',
        ]);

        $usuario = $request->user();

        $iperc = DB::transaction(function () use ($validated, $usuario) {
            $iperc = Iperc::create([
                ...$validated,
                'empresa_id'    => $usuario->empresa_id,
                'codigo'        => Iperc::generarCodigo($usuario->empresa_id, $validated['area_id']),
                'elaborado_por' => $usuario->id,
                'version'       => 1,
                'estado'        => 'borrador',
            ]);

            // Crear procesos si se enviaron
            if (!empty($validated['procesos'])) {
                foreach ($validated['procesos'] as $idx => $proceso) {
                    $procModel = IpercProceso::create([
                        'iperc_id'       => $iperc->id,
                        'proceso'        => $proceso['proceso'],
                        'actividad'      => $proceso['actividad'],
                        'tarea'          => $proceso['tarea'] ?? null,
                        'tipo_actividad' => $proceso['tipo_actividad'] ?? 'rutinaria',
                        'orden'          => $idx,
                    ]);

                    // Crear peligros del proceso
                    foreach ($proceso['peligros'] ?? [] as $peligro) {
                        $pelModel = IpercPeligro::create([
                            'iperc_proceso_id'        => $procModel->id,
                            'tipo_peligro'            => $peligro['tipo_peligro'],
                            'descripcion_peligro'     => $peligro['descripcion_peligro'],
                            'riesgo'                  => $peligro['riesgo'],
                            'consecuencia'            => $peligro['consecuencia'] ?? null,
                            'prob_personas_expuestas' => $peligro['prob_personas_expuestas'],
                            'prob_procedimientos'     => $peligro['prob_procedimientos'],
                            'prob_capacitacion'       => $peligro['prob_capacitacion'],
                            'prob_exposicion'         => $peligro['prob_exposicion'],
                            'indice_severidad'        => $peligro['indice_severidad'],
                            // Los campos calculados se llenan automáticamente en el modelo
                            'indice_probabilidad'     => 0,
                            'nivel_riesgo_inicial'    => 0,
                            'clasificacion_inicial'   => 'trivial',
                        ]);

                        // Controles
                        foreach ($peligro['controles'] ?? [] as $control) {
                            IpercControl::create([
                                'iperc_peligro_id'       => $pelModel->id,
                                'tipo_control'           => $control['tipo_control'],
                                'descripcion'            => $control['descripcion'],
                                'responsable_id'         => $control['responsable_id'] ?? null,
                                'estado_implementacion'  => 'pendiente',
                            ]);
                        }
                    }
                }
            }

            return $iperc;
        });

        $this->auditoria->registrar(
            modulo: 'iperc',
            accion: 'crear',
            usuario: $usuario,
            modelo: 'Iperc',
            modeloId: $iperc->id,
            valorNuevo: ['codigo' => $iperc->codigo],
            request: $request
        );

        return response()->json(
            $iperc->load(['procesos.peligros.controles', 'area', 'sede']),
            201
        );
    }

    /**
     * GET /api/iperc/{id}
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $iperc = Iperc::where('empresa_id', $request->user()->empresa_id)
            ->with([
                'area', 'sede', 'elaborador:id,nombre',
                'revisor:id,nombre', 'aprobador:id,nombre',
                'procesos.peligros.controles',
                'procesos.peligros.eppsRequeridos',
                'firmas' => fn($q) => $q->where('rechazada', false),
            ])
            ->findOrFail($id);

        $iperc->resumen_riesgos = $iperc->resumen_riesgos;
        $iperc->esta_vencido    = $iperc->esta_vencido;

        return response()->json($iperc);
    }

    /**
     * PUT /api/iperc/{id}
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $iperc = Iperc::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);

        if ($iperc->estado === 'aprobado') {
            return response()->json([
                'message' => 'No se puede modificar un IPERC aprobado. Cree una nueva versión.',
            ], 422);
        }

        $validated = $request->validate([
            'titulo'            => 'sometimes|string|max:255',
            'alcance'           => 'nullable|string',
            'fecha_vigencia'    => 'nullable|date',
            'estado'            => ['sometimes', Rule::in(['borrador','en_revision','aprobado','vencido','archivado'])],
            'observaciones'     => 'nullable|string',
        ]);

        $anterior = $iperc->toArray();
        $iperc->update($validated);

        $this->auditoria->registrarCambioModelo(
            modulo: 'iperc',
            accion: 'actualizar',
            usuario: $request->user(),
            modelo: 'Iperc',
            modeloId: $iperc->id,
            anterior: $anterior,
            nuevo: $iperc->toArray(),
            request: $request
        );

        return response()->json($iperc);
    }

    /**
     * DELETE /api/iperc/{id}
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $iperc = Iperc::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);

        if ($iperc->estado === 'aprobado') {
            return response()->json(['message' => 'No se puede eliminar un IPERC aprobado.'], 422);
        }

        $iperc->delete();

        $this->auditoria->registrar(
            modulo: 'iperc',
            accion: 'eliminar',
            usuario: $request->user(),
            modelo: 'Iperc',
            modeloId: $id,
            request: $request
        );

        return response()->json(['message' => 'IPERC eliminado.']);
    }

    /**
     * GET /api/iperc/matriz-riesgos — Datos para matriz visual 5x5
     */
    public function matrizRiesgos(Request $request): JsonResponse
    {
        $empresaId = $request->user()->empresa_id;

        // Matriz 5x5 (severidad × probabilidad)
        $matriz = DB::table('iperc_peligros as p')
            ->join('iperc_procesos as pr', 'p.iperc_proceso_id', '=', 'pr.id')
            ->join('iperc', 'pr.iperc_id', '=', 'iperc.id')
            ->where('iperc.empresa_id', $empresaId)
            ->whereNull('iperc.deleted_at')
            ->where('iperc.estado', 'aprobado')
            ->selectRaw('clasificacion_inicial, COUNT(*) as total')
            ->groupBy('clasificacion_inicial')
            ->pluck('total', 'clasificacion_inicial');

        return response()->json([
            'trivial'     => $matriz['trivial']     ?? 0,
            'tolerable'   => $matriz['tolerable']   ?? 0,
            'moderado'    => $matriz['moderado']    ?? 0,
            'importante'  => $matriz['importante']  ?? 0,
            'intolerable' => $matriz['intolerable'] ?? 0,
            'niveles'     => Iperc::NIVELES_RIESGO,
        ]);
    }

    /**
     * POST /api/iperc/{id}/enviar-a-firma — Iniciar flujo de firma
     */
    public function enviarAFirma(Request $request, int $id): JsonResponse
    {
        $iperc = Iperc::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);

        if ($iperc->estado !== 'borrador') {
            return response()->json(['message' => 'Solo un IPERC en borrador puede enviarse a firma.'], 422);
        }

        $firmaService = app(\App\Services\FirmaService::class);
        $solicitud = $firmaService->crearSolicitud(
            documento: $iperc,
            solicitadoPor: $request->user(),
            titulo: "IPERC {$iperc->codigo} — {$iperc->titulo}",
        );

        $iperc->update(['estado' => 'en_revision']);

        return response()->json([
            'message'   => 'IPERC enviado al flujo de firma.',
            'solicitud' => $solicitud,
        ]);
    }
}
