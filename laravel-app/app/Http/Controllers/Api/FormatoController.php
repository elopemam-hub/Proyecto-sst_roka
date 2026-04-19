<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FormatoRegistro;
use App\Models\Accidente;
use App\Models\Inspeccion;
use App\Models\AuditoriaInterna;
use App\Models\Capacitacion;
use App\Models\Simulacro;
use App\Services\AuditoriaService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;

class FormatoController extends Controller
{
    public function __construct(
        private AuditoriaService $auditoria
    ) {}

    /**
     * GET /api/formatos
     */
    public function index(Request $request): JsonResponse
    {
        $query = FormatoRegistro::where('empresa_id', $request->user()->empresa_id)
            ->with(['creadoPor:id,nombres,apellidos']);

        if ($request->filled('tipo_registro')) {
            $query->where('tipo_registro', $request->tipo_registro);
        }
        if ($request->filled('estado')) {
            $query->where('estado', $request->estado);
        }
        if ($request->filled('periodo_anio')) {
            $query->where('periodo_anio', $request->periodo_anio);
        }
        if ($request->filled('search')) {
            $q = $request->search;
            $query->where(fn($sub) =>
                $sub->where('titulo', 'like', "%{$q}%")
                    ->orWhere('correlativo', 'like', "%{$q}%")
            );
        }

        $registros = $query->orderByDesc('created_at')
            ->paginate(min($request->integer('per_page', 15), 100));

        return response()->json($registros);
    }

    /**
     * POST /api/formatos
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'tipo_registro' => 'required|in:reg_01,reg_02,reg_03,reg_04,reg_05,reg_06,reg_07,reg_08,reg_09,reg_10',
            'titulo'        => 'required|string|max:250',
            'periodo_anio'  => 'required|integer|min:2000|max:2100',
            'periodo_mes'   => 'nullable|integer|min:1|max:12',
            'datos_json'    => 'nullable|array',
            'observaciones' => 'nullable|string',
        ]);

        $correlativo = $this->generarCorrelativo($validated['tipo_registro'], $request->user()->empresa_id);

        $formato = FormatoRegistro::create([
            ...$validated,
            'empresa_id'  => $request->user()->empresa_id,
            'correlativo' => $correlativo,
            'estado'      => 'borrador',
            'creado_por'  => $request->user()->id,
        ]);

        $this->auditoria->registrar(
            modulo: 'formatos',
            accion: 'crear_formato',
            usuario: $request->user(),
            modelo: 'FormatoRegistro',
            modeloId: $formato->id,
            valorNuevo: ['tipo' => $formato->tipo_registro, 'correlativo' => $formato->correlativo],
            request: $request
        );

        return response()->json($formato->load('creadoPor:id,nombres,apellidos'), 201);
    }

    /**
     * GET /api/formatos/{id}
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $formato = FormatoRegistro::where('empresa_id', $request->user()->empresa_id)
            ->with(['creadoPor:id,nombres,apellidos'])
            ->findOrFail($id);

        return response()->json($formato);
    }

    /**
     * PUT /api/formatos/{id}
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $formato = FormatoRegistro::where('empresa_id', $request->user()->empresa_id)
            ->findOrFail($id);

        if ($formato->estado !== 'borrador') {
            return response()->json(['message' => 'Solo se pueden editar registros en estado borrador.'], 422);
        }

        $validated = $request->validate([
            'titulo'        => 'sometimes|string|max:250',
            'periodo_anio'  => 'sometimes|integer|min:2000|max:2100',
            'periodo_mes'   => 'nullable|integer|min:1|max:12',
            'datos_json'    => 'nullable|array',
            'observaciones' => 'nullable|string',
        ]);

        $formato->update($validated);

        return response()->json($formato->load('creadoPor:id,nombres,apellidos'));
    }

    /**
     * DELETE /api/formatos/{id}
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $formato = FormatoRegistro::where('empresa_id', $request->user()->empresa_id)
            ->findOrFail($id);

        if ($formato->estado !== 'borrador') {
            return response()->json(['message' => 'Solo se pueden eliminar registros en estado borrador.'], 422);
        }

        $formato->delete();

        return response()->json(['message' => 'Registro eliminado correctamente.']);
    }

    /**
     * GET /api/formatos/estadisticas
     */
    public function estadisticas(Request $request): JsonResponse
    {
        $empresaId = $request->user()->empresa_id;
        $anio = $request->integer('anio', now()->year);

        $totalAnio = FormatoRegistro::where('empresa_id', $empresaId)
            ->where('periodo_anio', $anio)->count();

        $vigentes = FormatoRegistro::where('empresa_id', $empresaId)
            ->where('estado', 'vigente')->count();

        $borradores = FormatoRegistro::where('empresa_id', $empresaId)
            ->where('estado', 'borrador')->count();

        $porTipo = FormatoRegistro::where('empresa_id', $empresaId)
            ->where('periodo_anio', $anio)
            ->selectRaw('tipo_registro, estado, COUNT(*) as total')
            ->groupBy('tipo_registro', 'estado')
            ->get();

        // Cuántos de los 10 tipos tienen al menos 1 registro vigente este año
        $tiposConRegistro = FormatoRegistro::where('empresa_id', $empresaId)
            ->where('periodo_anio', $anio)
            ->where('estado', 'vigente')
            ->distinct('tipo_registro')
            ->count('tipo_registro');

        return response()->json([
            'total_anio'          => $totalAnio,
            'vigentes'            => $vigentes,
            'borradores'          => $borradores,
            'tipos_con_registro'  => $tiposConRegistro,
            'total_tipos'         => 10,
            'por_tipo'            => $porTipo,
        ]);
    }

    /**
     * POST /api/formatos/generar/{tipo}
     * Genera automáticamente un registro consultando datos existentes del sistema.
     */
    public function generar(Request $request, string $tipo): JsonResponse
    {
        $tiposValidos = ['reg_01','reg_02','reg_03','reg_04','reg_05','reg_06','reg_07','reg_08','reg_09','reg_10'];
        if (!in_array($tipo, $tiposValidos)) {
            return response()->json(['message' => 'Tipo de registro inválido.'], 422);
        }

        $validated = $request->validate([
            'periodo_anio' => 'required|integer|min:2000|max:2100',
            'periodo_mes'  => 'nullable|integer|min:1|max:12',
        ]);

        $empresaId  = $request->user()->empresa_id;
        $anio       = $validated['periodo_anio'];
        $mes        = $validated['periodo_mes'] ?? null;
        $datosJson  = $this->extraerDatos($tipo, $empresaId, $anio, $mes);
        $correlativo = $this->generarCorrelativo($tipo, $empresaId);

        $labels = FormatoRegistro::getTiposLabels();

        $formato = FormatoRegistro::create([
            'empresa_id'    => $empresaId,
            'tipo_registro' => $tipo,
            'correlativo'   => $correlativo,
            'titulo'        => $labels[$tipo] . ' — ' . $anio . ($mes ? '/' . str_pad($mes, 2, '0', STR_PAD_LEFT) : ''),
            'periodo_anio'  => $anio,
            'periodo_mes'   => $mes,
            'estado'        => 'borrador',
            'datos_json'    => $datosJson,
            'origen_tipo'   => $this->origenTipo($tipo),
            'creado_por'    => $request->user()->id,
        ]);

        $this->auditoria->registrar(
            modulo: 'formatos',
            accion: 'generar_formato',
            usuario: $request->user(),
            modelo: 'FormatoRegistro',
            modeloId: $formato->id,
            valorNuevo: ['tipo' => $tipo, 'periodo' => $anio],
            request: $request
        );

        return response()->json($formato->load('creadoPor:id,nombres,apellidos'), 201);
    }

    /**
     * POST /api/formatos/{id}/aprobar
     */
    public function aprobar(Request $request, int $id): JsonResponse
    {
        $formato = FormatoRegistro::where('empresa_id', $request->user()->empresa_id)
            ->findOrFail($id);

        if ($formato->estado !== 'borrador') {
            return response()->json(['message' => 'Solo se pueden aprobar registros en estado borrador.'], 422);
        }

        $formato->update(['estado' => 'vigente']);

        $this->auditoria->registrar(
            modulo: 'formatos',
            accion: 'aprobar_formato',
            usuario: $request->user(),
            modelo: 'FormatoRegistro',
            modeloId: $formato->id,
            request: $request
        );

        return response()->json($formato->load('creadoPor:id,nombres,apellidos'));
    }

    /**
     * POST /api/formatos/{id}/anular
     */
    public function anular(Request $request, int $id): JsonResponse
    {
        $formato = FormatoRegistro::where('empresa_id', $request->user()->empresa_id)
            ->findOrFail($id);

        if ($formato->estado === 'anulado') {
            return response()->json(['message' => 'El registro ya está anulado.'], 422);
        }

        $formato->update(['estado' => 'anulado']);

        $this->auditoria->registrar(
            modulo: 'formatos',
            accion: 'anular_formato',
            usuario: $request->user(),
            modelo: 'FormatoRegistro',
            modeloId: $formato->id,
            request: $request
        );

        return response()->json($formato);
    }

    // ─── Helpers privados ──────────────────────────────────────────────

    private function generarCorrelativo(string $tipo, int $empresaId): string
    {
        $num = substr($tipo, 4); // "01"..."10"
        $prefix = 'REG' . $num . '-' . now()->format('Ym') . '-';

        $ultimo = FormatoRegistro::where('empresa_id', $empresaId)
            ->where('tipo_registro', $tipo)
            ->where('correlativo', 'like', $prefix . '%')
            ->orderByDesc('correlativo')
            ->value('correlativo');

        $siguiente = $ultimo
            ? (int) substr($ultimo, -5) + 1
            : 1;

        return $prefix . str_pad($siguiente, 5, '0', STR_PAD_LEFT);
    }

    private function origenTipo(string $tipo): ?string
    {
        return match ($tipo) {
            'reg_01', 'reg_03', 'reg_04' => 'accidente',
            'reg_06' => 'inspeccion',
            'reg_08' => 'auditoria',
            'reg_09' => 'capacitacion_simulacro',
            'reg_10' => 'estadisticas',
            default  => null,
        };
    }

    private function extraerDatos(string $tipo, int $empresaId, int $anio, ?int $mes): array
    {
        return match ($tipo) {
            'reg_01' => $this->datosAccidentes($empresaId, $anio, $mes, ['mortal', 'incapacitante', 'leve']),
            'reg_03' => $this->datosAccidentes($empresaId, $anio, $mes, ['incidente_peligroso', 'incidente']),
            'reg_04' => $this->datosInvestigaciones($empresaId, $anio, $mes),
            'reg_06' => $this->datosInspecciones($empresaId, $anio, $mes),
            'reg_08' => $this->datosAuditorias($empresaId, $anio, $mes),
            'reg_09' => $this->datosCapacitacionesSimulacros($empresaId, $anio, $mes),
            'reg_10' => $this->datosEstadisticas($empresaId, $anio),
            default  => ['generado_en' => now()->toDateTimeString(), 'requiere_llenado_manual' => true],
        };
    }

    private function datosAccidentes(int $empresaId, int $anio, ?int $mes, array $tipos): array
    {
        $query = Accidente::where('empresa_id', $empresaId)
            ->whereIn('tipo', $tipos)
            ->whereYear('fecha_accidente', $anio);

        if ($mes) $query->whereMonth('fecha_accidente', $mes);

        $accidentes = $query->with(['personal:id,nombres,apellidos,dni', 'area:id,nombre'])
            ->orderBy('fecha_accidente')
            ->get(['id', 'numero_registro', 'fecha_accidente', 'tipo', 'descripcion',
                   'dias_descanso', 'personal_id', 'area_id', 'estado']);

        return [
            'total'      => $accidentes->count(),
            'registros'  => $accidentes->map(fn($a) => [
                'numero_registro'  => $a->numero_registro,
                'fecha'            => $a->fecha_accidente?->format('d/m/Y'),
                'tipo'             => $a->tipo,
                'trabajador'       => $a->personal?->nombres . ' ' . $a->personal?->apellidos,
                'dni'              => $a->personal?->dni,
                'area'             => $a->area?->nombre,
                'descripcion'      => $a->descripcion,
                'dias_descanso'    => $a->dias_descanso,
                'estado'           => $a->estado,
            ])->values()->toArray(),
            'generado_en' => now()->toDateTimeString(),
        ];
    }

    private function datosInvestigaciones(int $empresaId, int $anio, ?int $mes): array
    {
        $query = Accidente::where('empresa_id', $empresaId)
            ->whereYear('fecha_accidente', $anio)
            ->has('investigacion');

        if ($mes) $query->whereMonth('fecha_accidente', $mes);

        $accidentes = $query->with([
            'personal:id,nombres,apellidos,dni',
            'investigacion:id,accidente_id,causa_basica,causa_inmediata,tipo_agente,fecha_investigacion',
        ])->get(['id', 'numero_registro', 'fecha_accidente', 'tipo', 'personal_id']);

        return [
            'total'      => $accidentes->count(),
            'registros'  => $accidentes->map(fn($a) => [
                'numero_registro'    => $a->numero_registro,
                'fecha_accidente'    => $a->fecha_accidente?->format('d/m/Y'),
                'tipo'               => $a->tipo,
                'trabajador'         => $a->personal?->nombres . ' ' . $a->personal?->apellidos,
                'causa_inmediata'    => $a->investigacion?->causa_inmediata,
                'causa_basica'       => $a->investigacion?->causa_basica,
                'tipo_agente'        => $a->investigacion?->tipo_agente,
                'fecha_investigacion'=> $a->investigacion?->fecha_investigacion,
            ])->values()->toArray(),
            'generado_en' => now()->toDateTimeString(),
        ];
    }

    private function datosInspecciones(int $empresaId, int $anio, ?int $mes): array
    {
        $query = Inspeccion::where('empresa_id', $empresaId)
            ->whereYear('fecha_programada', $anio);

        if ($mes) $query->whereMonth('fecha_programada', $mes);

        $inspecciones = $query->with(['area:id,nombre', 'responsable:id,nombres,apellidos'])
            ->orderBy('fecha_programada')
            ->get(['id', 'numero', 'tipo', 'area_id', 'responsable_id', 'fecha_programada',
                   'fecha_ejecucion', 'estado', 'porcentaje_cumplimiento', 'total_hallazgos']);

        return [
            'total'            => $inspecciones->count(),
            'ejecutadas'       => $inspecciones->where('estado', 'cerrada')->count(),
            'registros'        => $inspecciones->map(fn($i) => [
                'numero'               => $i->numero,
                'tipo'                 => $i->tipo,
                'area'                 => $i->area?->nombre,
                'responsable'          => $i->responsable?->nombres . ' ' . $i->responsable?->apellidos,
                'fecha_programada'     => $i->fecha_programada?->format('d/m/Y'),
                'fecha_ejecucion'      => $i->fecha_ejecucion?->format('d/m/Y'),
                'estado'               => $i->estado,
                'cumplimiento'         => $i->porcentaje_cumplimiento,
                'total_hallazgos'      => $i->total_hallazgos,
            ])->values()->toArray(),
            'generado_en' => now()->toDateTimeString(),
        ];
    }

    private function datosAuditorias(int $empresaId, int $anio, ?int $mes): array
    {
        $query = AuditoriaInterna::where('empresa_id', $empresaId)
            ->whereYear('fecha_programada', $anio);

        if ($mes) $query->whereMonth('fecha_programada', $mes);

        $auditorias = $query->with(['auditor:id,nombres,apellidos'])
            ->orderBy('fecha_programada')
            ->get(['id', 'numero', 'tipo', 'alcance', 'auditor_id',
                   'fecha_programada', 'fecha_ejecucion', 'estado', 'total_hallazgos']);

        return [
            'total'      => $auditorias->count(),
            'registros'  => $auditorias->map(fn($a) => [
                'numero'           => $a->numero,
                'tipo'             => $a->tipo,
                'alcance'          => $a->alcance,
                'auditor'          => $a->auditor?->nombres . ' ' . $a->auditor?->apellidos,
                'fecha_programada' => $a->fecha_programada?->format('d/m/Y'),
                'fecha_ejecucion'  => $a->fecha_ejecucion?->format('d/m/Y'),
                'estado'           => $a->estado,
                'total_hallazgos'  => $a->total_hallazgos,
            ])->values()->toArray(),
            'generado_en' => now()->toDateTimeString(),
        ];
    }

    private function datosCapacitacionesSimulacros(int $empresaId, int $anio, ?int $mes): array
    {
        $qCap = Capacitacion::where('empresa_id', $empresaId)->whereYear('fecha_programada', $anio);
        $qSim = Simulacro::where('empresa_id', $empresaId)->whereYear('fecha_programada', $anio);

        if ($mes) {
            $qCap->whereMonth('fecha_programada', $mes);
            $qSim->whereMonth('fecha_programada', $mes);
        }

        $caps = $qCap->get(['id', 'titulo', 'tipo', 'modalidad', 'fecha_programada', 'fecha_ejecutada',
                             'duracion_horas', 'expositor', 'estado']);
        $sims = $qSim->get(['id', 'nombre', 'tipo_emergencia', 'fecha_programada', 'fecha_ejecucion',
                             'estado', 'duracion_minutos']);

        return [
            'capacitaciones' => [
                'total'     => $caps->count(),
                'ejecutadas'=> $caps->where('estado', 'ejecutada')->count(),
                'registros' => $caps->map(fn($c) => [
                    'titulo'    => $c->titulo,
                    'tipo'      => $c->tipo,
                    'modalidad' => $c->modalidad,
                    'fecha'     => $c->fecha_ejecutada?->format('d/m/Y') ?? $c->fecha_programada?->format('d/m/Y'),
                    'horas'     => $c->duracion_horas,
                    'expositor' => $c->expositor,
                    'estado'    => $c->estado,
                ])->values()->toArray(),
            ],
            'simulacros' => [
                'total'     => $sims->count(),
                'ejecutados'=> $sims->where('estado', 'ejecutado')->count(),
                'registros' => $sims->map(fn($s) => [
                    'nombre'          => $s->nombre,
                    'tipo_emergencia' => $s->tipo_emergencia,
                    'fecha'           => $s->fecha_ejecucion?->format('d/m/Y') ?? $s->fecha_programada?->format('d/m/Y'),
                    'duracion_min'    => $s->duracion_minutos,
                    'estado'          => $s->estado,
                ])->values()->toArray(),
            ],
            'generado_en' => now()->toDateTimeString(),
        ];
    }

    private function datosEstadisticas(int $empresaId, int $anio): array
    {
        $accidentes = Accidente::where('empresa_id', $empresaId)
            ->whereYear('fecha_accidente', $anio)
            ->whereIn('tipo', ['mortal', 'incapacitante', 'leve'])
            ->get(['tipo', 'dias_descanso', 'horas_perdidas']);

        $mortales      = $accidentes->where('tipo', 'mortal')->count();
        $incapacitantes= $accidentes->where('tipo', 'incapacitante')->count();
        $leves         = $accidentes->where('tipo', 'leve')->count();
        $totalAccidentes = $accidentes->count();

        $diasPerdidos  = $accidentes->sum('dias_descanso');
        $horasTrabajadas = 2000000; // Se puede parametrizar; MINTRA usa HHT acumuladas

        $if  = $horasTrabajadas > 0 ? round(($totalAccidentes * 1000000) / $horasTrabajadas, 2) : 0;
        $ig  = $horasTrabajadas > 0 ? round(($diasPerdidos * 1000000) / $horasTrabajadas, 2) : 0;
        $isal = $if > 0 ? round($ig / $if, 2) : 0;
        $ta  = $mortales > 0 ? round(($mortales * 1000000) / max($horasTrabajadas, 1), 2) : 0;

        return [
            'periodo'         => $anio,
            'accidentes'      => [
                'mortales'        => $mortales,
                'incapacitantes'  => $incapacitantes,
                'leves'           => $leves,
                'total'           => $totalAccidentes,
                'dias_perdidos'   => $diasPerdidos,
            ],
            'indicadores'     => [
                'IF'   => $if,
                'IG'   => $ig,
                'ISAL' => $isal,
                'TA'   => $ta,
            ],
            'nota_hht'    => 'Horas Hombre Trabajadas usadas para cálculo: ' . number_format($horasTrabajadas),
            'generado_en' => now()->toDateTimeString(),
        ];
    }
}
