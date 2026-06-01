<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Ats;
use App\Models\AtsTarea;
use App\Models\AtsParticipante;
use App\Services\AuditoriaService;
use App\Services\FirmaService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AtsController extends Controller
{
    public function __construct(
        private AuditoriaService $auditoria,
        private FirmaService $firmaService
    ) {}

    /**
     * GET /api/ats
     */
    public function index(Request $request): JsonResponse
    {
        $query = Ats::where('empresa_id', $request->user()->empresa_id)
            ->with(['area:id,nombre', 'supervisor:id,nombres,apellidos']);

        if ($request->filled('estado'))       $query->where('estado', $request->estado);
        if ($request->filled('nivel_riesgo')) $query->where('nivel_riesgo', $request->nivel_riesgo);
        if ($request->filled('area_id'))      $query->where('area_id', $request->area_id);
        if ($request->filled('fecha_desde'))  $query->where('fecha_ejecucion', '>=', $request->fecha_desde);
        if ($request->filled('fecha_hasta'))  $query->where('fecha_ejecucion', '<=', $request->fecha_hasta);

        $ats = $query->orderByDesc('fecha_ejecucion')->paginate(20);

        return response()->json($ats);
    }

    /**
     * POST /api/ats
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'area_id'                    => 'nullable|exists:areas,id',
            'iperc_id'                   => 'nullable|exists:iperc,id',
            'titulo_trabajo'             => 'required|string|max:255',
            'descripcion'                => 'required|string',
            'ubicacion'                  => 'required|string|max:255',
            'fecha_ejecucion'            => 'required|date',
            'hora_inicio'                => 'required|date_format:H:i',
            'hora_fin'                   => 'nullable|date_format:H:i|after:hora_inicio',
            'nivel_riesgo'               => ['required', Rule::in(['bajo','medio','alto','critico'])],
            'requiere_permiso_especial'  => 'boolean',
            'supervisor_id'              => 'required|exists:personal,id',
            'tareas'                     => 'required|array|min:1',
            'tareas.*.descripcion_tarea' => 'required|string',
            'participantes'              => 'required|array|min:1',
            'participantes.*.personal_id' => 'required|exists:personal,id',
        ]);

        $usuario = $request->user();

        $ats = DB::transaction(function () use ($validated, $usuario) {
            $ats = Ats::create([
                ...$validated,
                'empresa_id'    => $usuario->empresa_id,
                'codigo'        => Ats::generarCodigo($usuario->empresa_id, $validated['area_id']),
                'elaborado_por' => $usuario->id,
                'estado'        => 'borrador',
            ]);

            // Tareas
            foreach ($validated['tareas'] as $idx => $tareaData) {
                $tarea = AtsTarea::create([
                    'ats_id'            => $ats->id,
                    'orden'             => $idx,
                    'descripcion_tarea' => $tareaData['descripcion_tarea'],
                    'peligros_asociados' => $tareaData['peligros_asociados'] ?? null,
                    'medidas_control'    => $tareaData['medidas_control'] ?? null,
                ]);
            }

            // Participantes
            foreach ($validated['participantes'] as $part) {
                AtsParticipante::create([
                    'ats_id'      => $ats->id,
                    'personal_id' => $part['personal_id'],
                    'rol'         => $part['rol'] ?? 'ejecutor',
                ]);
            }

            return $ats;
        });

        $this->auditoria->registrar(
            modulo: 'ats',
            accion: 'crear',
            usuario: $usuario,
            modelo: 'Ats',
            modeloId: $ats->id,
            valorNuevo: ['codigo' => $ats->codigo, 'nivel_riesgo' => $ats->nivel_riesgo],
            request: $request
        );

        return response()->json(
            $ats->load(['tareas', 'participantes.personal:id,nombres,apellidos', 'area', 'supervisor']),
            201
        );
    }

    /**
     * GET /api/ats/{id}
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $ats = Ats::where('empresa_id', $request->user()->empresa_id)
            ->with([
                'area', 'supervisor:id,nombres,apellidos,dni',
                'elaborador:id,nombre',
                'tareas.peligros', 'tareas.controles',
                'participantes.personal:id,nombres,apellidos,dni',
                'permisos', 'iperc:id,codigo,titulo',
                'firmas' => fn($q) => $q->where('rechazada', false)->with('usuario:id,nombre'),
            ])
            ->findOrFail($id);

        $ats->puede_ejecutarse = $ats->puede_ejecutarse;

        return response()->json($ats);
    }

    /**
     * POST /api/ats/{id}/solicitar-firmas — Enviar a proceso de firmas de todos los participantes
     */
    public function solicitarFirmas(Request $request, int $id): JsonResponse
    {
        $ats = Ats::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);

        if (!in_array($ats->estado, ['borrador'])) {
            return response()->json(['message' => 'Solo un ATS en borrador puede enviarse a firmas.'], 422);
        }

        $solicitud = $this->firmaService->crearSolicitud(
            documento: $ats,
            solicitadoPor: $request->user(),
            titulo: "ATS {$ats->codigo} — {$ats->titulo_trabajo}",
            diasLimite: 1
        );

        $ats->update(['estado' => 'pendiente_firma']);

        return response()->json([
            'message'   => 'Solicitud de firmas creada.',
            'solicitud' => $solicitud,
        ]);
    }

    /**
     * POST /api/ats/{id}/cerrar — Cerrar ATS al finalizar trabajo
     */
    public function cerrar(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'observaciones_cierre' => 'required|string|min:10',
            'hora_fin'             => 'required|date_format:H:i',
        ]);

        $ats = Ats::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);

        if ($ats->estado !== 'en_ejecucion') {
            return response()->json(['message' => 'Solo un ATS en ejecución puede cerrarse.'], 422);
        }

        $ats->update([
            'estado'               => 'cerrado',
            'hora_fin'             => $validated['hora_fin'],
            'cerrado_en'           => now(),
            'cerrado_por'          => $request->user()->id,
            'observaciones_cierre' => $validated['observaciones_cierre'],
        ]);

        return response()->json(['message' => 'ATS cerrado correctamente.']);
    }
}
