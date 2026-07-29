<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ProgramaSst;
use App\Models\ProgramaSstActividad;
use App\Models\ProgramaSstElemento;
use App\Services\ProgramaCumplimientoService;
use App\Services\ProgramaPlantillaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ProgramaSstController extends Controller
{
    public function __construct(
        private ProgramaCumplimientoService $cumplimiento,
        private ProgramaPlantillaService $plantilla,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = ProgramaSst::where('empresa_id', $request->user()->empresa_id)
            ->with('actividades:id,programa_id,estado,meta_cantidad,cantidad_ejecutada')
            ->withCount('actividades');

        if ($request->filled('anio'))   $query->where('anio', $request->anio);
        if ($request->filled('estado')) $query->where('estado', $request->estado);

        $programas = $query->orderByDesc('anio')->paginate(min($request->integer('per_page', 15), 50));

        // El porcentaje se calcula sobre las actividades ya cargadas; sin esto
        // el accessor dispararía una consulta por programa.
        $programas->getCollection()->each->append('porcentaje_cumplimiento');
        $programas->getCollection()->makeHidden('actividades');

        return response()->json($programas);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validarPrograma($request, esCreacion: true);

        $data['empresa_id'] = $request->user()->empresa_id;
        $programa = ProgramaSst::create($data);

        if ($request->boolean('generar_plantilla')) {
            $this->plantilla->aplicar($programa);
            $this->cumplimiento->recalcular($programa);
        }

        return response()->json($this->matriz($programa), 201);
    }

    /** Devuelve el programa completo en forma de matriz PASST. */
    public function show(Request $request, int $id): JsonResponse
    {
        return response()->json($this->matriz($this->buscar($request, $id)));
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $programa = $this->buscar($request, $id);
        $programa->update($this->validarPrograma($request, esCreacion: false));

        return response()->json($this->matriz($programa));
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $this->buscar($request, $id)->delete();

        return response()->json(['message' => 'Programa eliminado']);
    }

    /**
     * El programa anual debe ser aprobado por el Comité de SST antes de
     * ejecutarse (Ley 29783, art. 42). Queda registrado quién y cuándo.
     */
    public function aprobar(Request $request, int $id): JsonResponse
    {
        $programa = $this->buscar($request, $id);

        if (!$programa->actividades()->exists()) {
            return response()->json(['message' => 'No se puede aprobar un programa sin actividades'], 422);
        }

        $programa->update([
            'estado'           => 'aprobado',
            'aprobado_por'     => $request->user()->id,
            'fecha_aprobacion' => $request->date('fecha_aprobacion') ?? now()->toDateString(),
        ]);

        return response()->json($this->matriz($programa));
    }

    public function generarPlantilla(Request $request, int $id): JsonResponse
    {
        $programa = $this->buscar($request, $id);

        if ($programa->actividades()->exists() || $programa->elementos()->exists()) {
            return response()->json([
                'message' => 'El programa ya tiene actividades cargadas. Elimínelas antes de generar la plantilla.',
            ], 422);
        }

        $resumen = $this->plantilla->aplicar($programa);
        $this->cumplimiento->recalcular($programa);

        return response()->json([
            'message' => "Plantilla generada: {$resumen['elementos']} elementos y {$resumen['actividades']} actividades",
            'programa' => $this->matriz($programa),
        ]);
    }

    /** Recuenta la ejecución real registrada en los módulos vinculados. */
    public function recalcular(Request $request, int $id): JsonResponse
    {
        $programa = $this->buscar($request, $id);
        $actualizadas = $this->cumplimiento->recalcular($programa);

        return response()->json([
            'message'  => "{$actualizadas} actividades actualizadas",
            'programa' => $this->matriz($programa),
        ]);
    }

    // ─── Elementos (secciones numeradas) ───────────────────────────────────

    public function guardarElemento(Request $request, int $id): JsonResponse
    {
        $programa = $this->buscar($request, $id);

        $data = $request->validate([
            'numero' => 'required|integer|min:1|max:99',
            'nombre' => 'required|string|max:250',
            'orden'  => 'nullable|integer|min:0',
        ]);

        $data['orden'] ??= (int) $programa->elementos()->max('orden') + 1;

        return response()->json($programa->elementos()->create($data), 201);
    }

    public function actualizarElemento(Request $request, int $elementoId): JsonResponse
    {
        $elemento = $this->buscarElemento($request, $elementoId);

        $elemento->update($request->validate([
            'numero' => 'sometimes|integer|min:1|max:99',
            'nombre' => 'sometimes|string|max:250',
            'orden'  => 'sometimes|integer|min:0',
        ]));

        return response()->json($elemento);
    }

    public function eliminarElemento(Request $request, int $elementoId): JsonResponse
    {
        // Las actividades de la sección caen con ella (onDelete cascade).
        $this->buscarElemento($request, $elementoId)->delete();

        return response()->json(['message' => 'Elemento eliminado']);
    }

    // ─── Actividades ───────────────────────────────────────────────────────

    public function actividades(Request $request, int $id): JsonResponse
    {
        $programa = $this->buscar($request, $id);

        return response()->json(
            $programa->actividades()->with('responsable:id,nombres,apellidos')->get()
        );
    }

    public function guardarActividad(Request $request, int $id): JsonResponse
    {
        $programa = $this->buscar($request, $id);
        $data = $this->validarActividad($request, esCreacion: true);

        $this->verificarElemento($programa, $data['elemento_id'] ?? null);
        $data['orden'] ??= (int) $programa->actividades()->max('orden') + 1;

        $actividad = $programa->actividades()->create($data);
        $this->refrescarActividad($actividad, $programa);

        return response()->json($actividad->load('responsable:id,nombres,apellidos'), 201);
    }

    public function actualizarActividad(Request $request, int $actividadId): JsonResponse
    {
        $actividad = ProgramaSstActividad::findOrFail($actividadId);
        $programa  = $this->buscar($request, $actividad->programa_id);
        $data      = $this->validarActividad($request, esCreacion: false);

        if (array_key_exists('elemento_id', $data)) {
            $this->verificarElemento($programa, $data['elemento_id']);
        }

        $actividad->update($data);
        $this->refrescarActividad($actividad, $programa);

        return response()->json($actividad->load('responsable:id,nombres,apellidos'));
    }

    public function eliminarActividad(Request $request, int $actividadId): JsonResponse
    {
        $actividad = ProgramaSstActividad::findOrFail($actividadId);
        $this->buscar($request, $actividad->programa_id);
        $actividad->delete();

        return response()->json(['message' => 'Actividad eliminada']);
    }

    /** Marca o desmarca un mes en la fila de la actividad. */
    public function alternarMes(Request $request, int $actividadId): JsonResponse
    {
        $actividad = ProgramaSstActividad::findOrFail($actividadId);
        $this->buscar($request, $actividad->programa_id);

        $mes = $request->validate(['mes' => 'required|integer|min:1|max:12'])['mes'];

        $meses = collect($actividad->meses ?? []);
        $meses = $meses->contains($mes) ? $meses->reject(fn ($m) => $m == $mes) : $meses->push($mes);

        $actividad->update(['meses' => $meses->sort()->values()->all()]);

        return response()->json($actividad);
    }

    public function estadisticas(Request $request): JsonResponse
    {
        $anio = $request->integer('anio', (int) date('Y'));

        $programa = ProgramaSst::where('empresa_id', $request->user()->empresa_id)
            ->where('anio', $anio)
            ->with('actividades')
            ->first();

        if (!$programa) {
            return response()->json([
                'anio' => $anio, 'existe' => false, 'total' => 0, 'completadas' => 0,
                'en_proceso' => 0, 'pendientes' => 0, 'no_aplica' => 0, 'porcentaje' => 0,
            ]);
        }

        $actividades = $programa->actividades;

        return response()->json([
            'anio'        => $anio,
            'existe'      => true,
            'programa_id' => $programa->id,
            'estado'      => $programa->estado,
            'total'       => $actividades->count(),
            'completadas' => $actividades->where('estado', 'completado')->count(),
            'en_proceso'  => $actividades->where('estado', 'en_proceso')->count(),
            'pendientes'  => $actividades->where('estado', 'pendiente')->count(),
            'no_aplica'   => $actividades->where('estado', 'no_aplica')->count(),
            'porcentaje'  => $programa->porcentaje_cumplimiento,
        ]);
    }

    // ─── Apoyo ─────────────────────────────────────────────────────────────

    private function buscar(Request $request, int $id): ProgramaSst
    {
        return ProgramaSst::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);
    }

    private function buscarElemento(Request $request, int $elementoId): ProgramaSstElemento
    {
        $elemento = ProgramaSstElemento::findOrFail($elementoId);
        $this->buscar($request, $elemento->programa_id);

        return $elemento;
    }

    /** Impide colgar una actividad de una sección de otro programa. */
    private function verificarElemento(ProgramaSst $programa, ?int $elementoId): void
    {
        if ($elementoId && !$programa->elementos()->whereKey($elementoId)->exists()) {
            abort(422, 'El elemento no pertenece a este programa');
        }
    }

    /** Recalcula solo esta actividad si quedó vinculada a un módulo. */
    private function refrescarActividad(ProgramaSstActividad $actividad, ProgramaSst $programa): void
    {
        $ejecutado = $this->cumplimiento->contar($actividad, $programa->empresa_id, (int) $programa->anio);
        if ($ejecutado === null) return;

        $actividad->update([
            'cantidad_ejecutada'          => $ejecutado,
            'cumplimiento_actualizado_at' => now(),
        ]);
    }

    /**
     * Programa con sus secciones, actividades y — para las vinculadas a un
     * módulo — los meses en que hubo ejecución real, que es lo que permite
     * contrastar lo programado con lo cumplido.
     */
    private function matriz(ProgramaSst $programa): array
    {
        $programa->load([
            'empresa:id,razon_social,ruc',
            'elementos',
            'actividades.responsable:id,nombres,apellidos',
            'actividades.elemento:id,numero,nombre',
        ]);

        $actividades = $programa->actividades->map(function (ProgramaSstActividad $a) use ($programa) {
            $datos = $a->toArray();
            $datos['meses_ejecutados'] = $this->cumplimiento->mesesEjecutados(
                $a, $programa->empresa_id, (int) $programa->anio
            );

            return $datos;
        });

        return [
            'programa'    => $programa->makeHidden(['elementos', 'actividades'])->toArray(),
            'elementos'   => $programa->elementos->toArray(),
            'actividades' => $actividades->all(),
            'modulos'     => ProgramaCumplimientoService::modulosDisponibles(),
        ];
    }

    private function validarPrograma(Request $request, bool $esCreacion): array
    {
        $obligatorio = $esCreacion ? 'required' : 'sometimes';

        $reglas = [
            'anio' => [
                $obligatorio, 'integer', 'min:2020', 'max:2040',
                Rule::unique('programa_sst')
                    ->where('empresa_id', $request->user()->empresa_id)
                    ->whereNull('deleted_at')
                    ->ignore($request->route('id')),
            ],
            'nombre'           => [$obligatorio, 'string', 'max:200'],
            'codigo'           => 'nullable|string|max:30',
            'version'          => 'nullable|string|max:20',
            'mes_inicio'       => 'nullable|integer|min:1|max:12',
            'objetivo_general' => 'nullable|string',
            'presupuesto'      => 'nullable|numeric|min:0',
            'estado'           => 'sometimes|in:borrador,aprobado,en_ejecucion,cerrado',
            'fecha_aprobacion' => 'nullable|date',
        ];

        return $request->validate($reglas);
    }

    private function validarActividad(Request $request, bool $esCreacion): array
    {
        $obligatorio = $esCreacion ? 'required' : 'sometimes';

        return $request->validate([
            'elemento_id'       => 'nullable|integer|exists:programa_sst_elementos,id',
            'numero'            => 'nullable|string|max:10',
            'actividad'         => [$obligatorio, 'string', 'max:300'],
            'meses'             => 'nullable|array',
            'meses.*'           => 'integer|min:1|max:12',
            'segun_corresponda' => 'boolean',
            'meta_cantidad'     => 'nullable|integer|min:0|max:9999',
            'meta_texto'        => 'nullable|string|max:300',
            'evidencia_texto'   => 'nullable|string|max:300',
            'responsable_texto' => 'nullable|string|max:200',
            'responsable_id'    => 'nullable|integer|exists:personal,id',
            'modulo_vinculado'  => ['sometimes', Rule::in(ProgramaCumplimientoService::modulosDisponibles())],
            'filtro'            => 'nullable|array',
            // Solo tiene sentido cargarlo a mano cuando no hay módulo que contar.
            'cantidad_ejecutada' => 'nullable|integer|min:0|max:9999',
            'estado'            => 'sometimes|in:pendiente,en_proceso,completado,no_aplica',
            'observaciones'     => 'nullable|string',
            'orden'             => 'nullable|integer|min:0',
        ]);
    }
}
