<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Emo;
use App\Models\Personal;
use App\Models\SaludRestriccion;
use App\Models\SaludAtencion;
use App\Models\SaludFichaMedica;
use App\Services\AuditoriaService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;

class SaludController extends Controller
{
    public function __construct(private AuditoriaService $auditoria) {}

    // ── Validaciones biométricas reutilizables ─────────────────────────────
    private function bioRules(string $prefix = ''): array
    {
        $p = $prefix;
        return [
            "{$p}peso"               => 'nullable|numeric|min:20|max:300',
            "{$p}talla"              => 'nullable|numeric|min:0.5|max:2.5',
            "{$p}imc"                => 'nullable|numeric|min:10|max:70',
            "{$p}presion_sistolica"  => 'nullable|integer|min:60|max:250',
            "{$p}presion_diastolica" => 'nullable|integer|min:40|max:150',
            "{$p}glucosa"            => 'nullable|numeric|min:30|max:600',
            "{$p}hemoglobina"        => 'nullable|numeric|min:5|max:25',
            "{$p}frecuencia_cardiaca"=> 'nullable|integer|min:30|max:250',
            "{$p}agudeza_od"         => 'nullable|string|max:20',
            "{$p}agudeza_oi"         => 'nullable|string|max:20',
        ];
    }

    /** GET /api/salud */
    public function index(Request $request): JsonResponse
    {
        $query = Emo::where('empresa_id', $request->user()->empresa_id)
            ->with('personal:id,nombres,apellidos,dni');

        if ($request->filled('personal_id')) $query->where('personal_id', $request->personal_id);
        if ($request->filled('tipo'))        $query->where('tipo', $request->tipo);
        if ($request->filled('resultado'))   $query->where('resultado', $request->resultado);
        if ($request->boolean('vencidas'))   $query->whereNotNull('fecha_vencimiento')->where('fecha_vencimiento', '<', now());
        if ($request->boolean('proximas'))   $query->whereNotNull('fecha_vencimiento')->whereBetween('fecha_vencimiento', [now(), now()->addDays(30)]);
        if ($request->filled('search')) {
            $q = $request->search;
            $query->whereHas('personal', fn($s) =>
                $s->where('nombres', 'like', "%{$q}%")->orWhere('apellidos', 'like', "%{$q}%")->orWhere('dni', 'like', "%{$q}%")
            );
        }

        return response()->json(
            $query->orderByDesc('fecha_examen')->paginate(min($request->integer('per_page', 15), 100))
        );
    }

    /** POST /api/salud */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate(array_merge([
            'personal_id'       => 'required|exists:personal,id',
            'tipo'              => 'required|in:pre_ocupacional,periodico,retiro,por_cambio_ocupacional',
            'fecha_examen'      => 'required|date',
            'fecha_vencimiento' => 'nullable|date|after:fecha_examen',
            'clinica'           => 'nullable|string|max:150',
            'medico'            => 'nullable|string|max:150',
            'resultado'         => 'required|in:apto,apto_con_restricciones,no_apto',
            'restricciones'     => 'nullable|string',
            'observaciones'     => 'nullable|string',
            'archivo'           => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:5120',
        ], $this->bioRules()));

        if ($request->hasFile('archivo')) {
            $validated['archivo_path'] = $request->file('archivo')->store('emos', 'public');
        }
        unset($validated['archivo']);

        // Auto-calcular IMC si no fue enviado
        if (!isset($validated['imc']) && isset($validated['peso'], $validated['talla']) && $validated['talla'] > 0) {
            $validated['imc'] = round($validated['peso'] / ($validated['talla'] ** 2), 2);
        }

        $emo = Emo::create([...$validated, 'empresa_id' => $request->user()->empresa_id]);

        $this->auditoria->registrar(
            modulo: 'salud', accion: 'crear_emo', usuario: $request->user(),
            modelo: 'Emo', modeloId: $emo->id,
            valorNuevo: ['personal_id' => $emo->personal_id, 'resultado' => $emo->resultado],
            request: $request
        );

        return response()->json($emo->load('personal:id,nombres,apellidos'), 201);
    }

    /**
     * POST /api/salud/emo/importar
     *
     * Carga masiva de la programación de EMOs desde plantilla Excel.
     * Cada fila se identifica por el DNI del trabajador; el resto de campos
     * son los mismos que el alta manual. En modo "upsert" se actualiza el EMO
     * que coincida en trabajador + tipo + fecha de examen, en vez de duplicarlo.
     */
    public function importarEmos(Request $request): JsonResponse
    {
        $request->validate([
            'registros' => 'required|array|min:1|max:1000',
            'modo'      => 'in:insertar,upsert',
        ]);

        $empresaId = $request->user()->empresa_id;
        $modo      = $request->input('modo', 'insertar');

        $tiposValidos      = ['pre_ocupacional', 'periodico', 'retiro', 'por_cambio_ocupacional'];
        $resultadosValidos = ['apto', 'apto_con_restricciones', 'no_apto'];

        // Un solo lookup de DNIs en vez de una consulta por fila
        $dnis = collect($request->registros)
            ->map(fn($r) => trim((string)($r['dni'] ?? '')))
            ->filter()
            ->unique();

        $personalPorDni = Personal::where('empresa_id', $empresaId)
            ->whereIn('dni', $dnis)
            ->pluck('id', 'dni');

        $insertados = 0; $actualizados = 0; $errores = [];

        foreach ($request->registros as $idx => $reg) {
            $fila = $reg['_fila'] ?? ($idx + 2);
            $dni  = trim((string)($reg['dni'] ?? ''));

            $fallo = function (string $msg) use (&$errores, $fila, $dni) {
                $errores[] = ['fila' => $fila, 'dni' => $dni, 'error' => $msg];
            };

            if (!$dni) { $fallo('DNI vacío'); continue; }

            $personalId = $personalPorDni[$dni] ?? null;
            if (!$personalId) { $fallo("El DNI {$dni} no está registrado en Gestión Humana"); continue; }

            $tipo = strtolower(trim((string)($reg['tipo'] ?? 'periodico')));
            if (!in_array($tipo, $tiposValidos, true)) { $fallo("Tipo de examen inválido: \"{$tipo}\""); continue; }

            $resultado = strtolower(trim((string)($reg['resultado'] ?? 'apto')));
            if (!in_array($resultado, $resultadosValidos, true)) { $fallo("Resultado inválido: \"{$resultado}\""); continue; }

            $fechaExamen = $this->fechaValida($reg['fecha_examen'] ?? null);
            if (!$fechaExamen) { $fallo('Fecha de examen vacía o con formato inválido'); continue; }

            // Sin fecha de vencimiento se asume vigencia de un año (EMO periódico anual)
            $fechaVenc = $this->fechaValida($reg['fecha_vencimiento'] ?? null)
                ?? $fechaExamen->copy()->addYear();

            if ($fechaVenc->lte($fechaExamen)) {
                $fallo('La fecha de vencimiento debe ser posterior a la del examen');
                continue;
            }

            $datos = [
                'empresa_id'        => $empresaId,
                'personal_id'       => $personalId,
                'tipo'              => $tipo,
                'fecha_examen'      => $fechaExamen->toDateString(),
                'fecha_vencimiento' => $fechaVenc->toDateString(),
                'clinica'           => $this->valorONull($reg['clinica'] ?? null),
                'medico'            => $this->valorONull($reg['medico'] ?? null),
                'resultado'         => $resultado,
                'restricciones'     => $this->valorONull($reg['restricciones'] ?? null),
                'observaciones'     => $this->valorONull($reg['observaciones'] ?? null),
            ];

            try {
                $existente = Emo::where('empresa_id', $empresaId)
                    ->where('personal_id', $personalId)
                    ->where('tipo', $tipo)
                    ->whereDate('fecha_examen', $fechaExamen->toDateString())
                    ->first();

                if ($existente) {
                    if ($modo === 'upsert') {
                        $existente->update($datos);
                        $actualizados++;
                    } else {
                        $fallo('Ya existe un EMO de ese tipo y fecha para este trabajador');
                    }
                    continue;
                }

                Emo::create($datos);
                $insertados++;
            } catch (\Throwable $e) {
                $fallo('No se pudo guardar: ' . $e->getMessage());
            }
        }

        $this->auditoria->registrar(
            modulo: 'salud', accion: 'importar_emo', usuario: $request->user(),
            modelo: 'Emo', modeloId: null,
            valorNuevo: ['insertados' => $insertados, 'actualizados' => $actualizados, 'fallidos' => count($errores)],
            request: $request
        );

        return response()->json([
            'total'        => count($request->registros),
            'insertados'   => $insertados,
            'actualizados' => $actualizados,
            'errores'      => $errores,
        ]);
    }

    /** Acepta yyyy-mm-dd y dd/mm/yyyy; devuelve null si no es una fecha usable */
    private function fechaValida($valor): ?\Carbon\Carbon
    {
        $valor = trim((string) $valor);
        if ($valor === '') return null;

        foreach (['Y-m-d', 'd/m/Y', 'd-m-Y'] as $formato) {
            try {
                return \Carbon\Carbon::createFromFormat($formato, $valor)->startOfDay();
            } catch (\Throwable) {
                continue;
            }
        }
        return null;
    }

    private function valorONull($valor): ?string
    {
        $valor = trim((string) $valor);
        return $valor === '' ? null : $valor;
    }

    /** GET /api/salud/{id} */
    public function show(Request $request, int $id): JsonResponse
    {
        $emo = Emo::where('empresa_id', $request->user()->empresa_id)
            ->with(['personal:id,nombres,apellidos,dni', 'restriccionesRelacion.area:id,nombre'])
            ->findOrFail($id);

        return response()->json($emo);
    }

    /** PUT /api/salud/{id} */
    public function update(Request $request, int $id): JsonResponse
    {
        $emo = Emo::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);

        $validated = $request->validate(array_merge([
            'tipo'              => 'sometimes|in:pre_ocupacional,periodico,retiro,por_cambio_ocupacional',
            'fecha_examen'      => 'sometimes|date',
            'fecha_vencimiento' => 'nullable|date',
            'clinica'           => 'nullable|string|max:150',
            'medico'            => 'nullable|string|max:150',
            'resultado'         => 'sometimes|in:apto,apto_con_restricciones,no_apto',
            'restricciones'     => 'nullable|string',
            'observaciones'     => 'nullable|string',
            'notificado'        => 'boolean',
            'archivo'           => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:5120',
        ], $this->bioRules()));

        if ($request->hasFile('archivo')) {
            if ($emo->archivo_path) Storage::disk('public')->delete($emo->archivo_path);
            $validated['archivo_path'] = $request->file('archivo')->store('emos', 'public');
        }
        unset($validated['archivo']);

        if (!isset($validated['imc']) && isset($validated['peso'], $validated['talla']) && $validated['talla'] > 0) {
            $validated['imc'] = round($validated['peso'] / ($validated['talla'] ** 2), 2);
        }

        $emo->update($validated);
        return response()->json($emo->load('personal:id,nombres,apellidos'));
    }

    /** DELETE /api/salud/{id} */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $emo = Emo::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);
        $emo->delete();
        return response()->json(['message' => 'EMO eliminado correctamente']);
    }

    /** GET /api/salud/estadisticas */
    public function estadisticas(Request $request): JsonResponse
    {
        $empresaId = $request->user()->empresa_id;

        $vencidas    = Emo::where('empresa_id', $empresaId)->whereNotNull('fecha_vencimiento')->where('fecha_vencimiento', '<', now())->count();
        $proximas30d = Emo::where('empresa_id', $empresaId)->whereNotNull('fecha_vencimiento')->whereBetween('fecha_vencimiento', [now(), now()->addDays(30)])->count();
        $porResultado= Emo::where('empresa_id', $empresaId)->selectRaw('resultado, COUNT(*) as total')->groupBy('resultado')->get();
        $porTipo     = Emo::where('empresa_id', $empresaId)->selectRaw('tipo, COUNT(*) as total')->groupBy('tipo')->get();
        $conRestricc = SaludRestriccion::where('empresa_id', $empresaId)->where('activa', true)->distinct('personal_id')->count('personal_id');

        return response()->json([
            'vencidas'          => $vencidas,
            'proximas_30d'      => $proximas30d,
            'por_resultado'     => $porResultado,
            'por_tipo'          => $porTipo,
            'con_restricciones' => $conRestricc,
        ]);
    }

    /**
     * GET /api/salud/documentos
     * Lista todos los EMOs que tienen archivo adjunto, con URL de descarga.
     */
    public function documentos(Request $request): JsonResponse
    {
        $query = Emo::where('empresa_id', $request->user()->empresa_id)
            ->whereNotNull('archivo_path')
            ->with('personal:id,nombres,apellidos,dni');

        if ($request->filled('personal_id')) $query->where('personal_id', $request->personal_id);
        if ($request->filled('tipo'))        $query->where('tipo', $request->tipo);
        if ($request->filled('search')) {
            $q = $request->search;
            $query->whereHas('personal', fn($s) =>
                $s->where('nombres', 'like', "%{$q}%")
                  ->orWhere('apellidos', 'like', "%{$q}%")
                  ->orWhere('dni', 'like', "%{$q}%")
            );
        }

        $emos = $query->orderByDesc('fecha_examen')
            ->paginate(min($request->integer('per_page', 20), 100));

        // Agregar URL pública a cada registro
        $emos->getCollection()->transform(function ($emo) {
            $emo->archivo_url    = $emo->archivo_path
                ? asset('storage/' . $emo->archivo_path)
                : null;
            $emo->archivo_nombre = $emo->archivo_path
                ? basename($emo->archivo_path)
                : null;
            // Extensión para mostrar ícono
            $emo->archivo_tipo   = $emo->archivo_path
                ? strtolower(pathinfo($emo->archivo_path, PATHINFO_EXTENSION))
                : null;
            return $emo;
        });

        return response()->json($emos);
    }

    /**
     * GET /api/salud/fichas-medicas
     * Lista todas las fichas médicas de la empresa (para administradores).
     */
    public function listFichasMedicas(Request $request): JsonResponse
    {
        $empresaId = $request->user()->empresa_id;

        $query = Personal::where('empresa_id', $empresaId)
            ->where('estado', 'activo')
            ->with(['area:id,nombre', 'cargo:id,nombre', 'fichaMedica'])
            ->orderBy('apellidos');

        if ($request->filled('search')) {
            $q = $request->search;
            $query->where(fn($s) =>
                $s->where('nombres', 'like', "%{$q}%")
                  ->orWhere('apellidos', 'like', "%{$q}%")
                  ->orWhere('dni', 'like', "%{$q}%")
            );
        }
        if ($request->filled('area_id')) {
            $query->where('area_id', $request->area_id);
        }
        if ($request->filled('tiene_ficha')) {
            if ($request->tiene_ficha === 'si') {
                $query->has('fichaMedica');
            } else {
                $query->doesntHave('fichaMedica');
            }
        }

        $personal = $query->paginate(min($request->integer('per_page', 20), 100));

        return response()->json($personal);
    }

    /**
     * GET /api/salud/ficha-medica
     * Devuelve la ficha médica del trabajador logueado (datos personal + ficha extendida).
     */
    public function getFichaMedica(Request $request): JsonResponse
    {
        $user = $request->user();

        // Admin puede pasar ?personal_id=X para ver la ficha de cualquier trabajador
        $personalId = $request->filled('personal_id')
            ? (int) $request->personal_id
            : $user->personal_id;

        if (!$personalId) {
            return response()->json(['message' => 'Usuario no vinculado a un trabajador.'], 422);
        }

        $personal = Personal::where('empresa_id', $user->empresa_id)
            ->with(['area:id,nombre', 'cargo:id,nombre', 'sede:id,nombre'])
            ->find($personalId);

        if (!$personal) {
            return response()->json(['message' => 'Trabajador no encontrado.'], 404);
        }

        $ficha = SaludFichaMedica::firstOrNew(
            ['personal_id' => $personalId],
            ['empresa_id'  => $user->empresa_id]
        );

        return response()->json([
            'personal' => $personal,
            'ficha'    => $ficha,
        ]);
    }

    /**
     * PUT /api/salud/ficha-medica
     * Guarda/actualiza la ficha médica del trabajador logueado.
     */
    public function saveFichaMedica(Request $request): JsonResponse
    {
        $user = $request->user();

        $personalId = $request->filled('personal_id')
            ? (int) $request->personal_id
            : $user->personal_id;

        if (!$personalId) {
            return response()->json(['message' => 'Usuario no vinculado a un trabajador.'], 422);
        }

        // Actualizar datos básicos del personal
        $personal = Personal::where('empresa_id', $user->empresa_id)->find($personalId);
        $personalFields = $request->validate([
            'nombres'          => 'sometimes|string|max:150',
            'apellidos'        => 'sometimes|string|max:150',
            'fecha_nacimiento' => 'nullable|date',
            'genero'           => 'nullable|in:M,F',
            'telefono'         => 'nullable|string|max:20',
            'direccion'        => 'nullable|string|max:300',
            'tipo_contrato'    => 'nullable|string|max:50',
            'grupo_sanguineo'  => 'nullable|string|max:5',
        ]);
        if ($personal && !empty($personalFields)) {
            $personal->update($personalFields);
        }

        // Guardar ficha médica extendida
        $fichaFields = $request->validate([
            'estado_civil'           => 'nullable|in:soltero,casado,conviviente,divorciado,viudo',
            'turno'                  => 'nullable|in:diurno,nocturno,rotativo',
            'anios_empresa'          => 'nullable|integer|min:0',
            'puestos_anteriores'     => 'nullable|array',
            'exposiciones_laborales' => 'nullable|array',
            'descripcion_trabajo'    => 'nullable|string',
            'enfermedades_cronicas'  => 'nullable|string',
            'cirugias'               => 'nullable|string',
            'alergias'               => 'nullable|string',
            'medicamentos_actuales'  => 'nullable|string',
            'accidente_trabajo'      => 'nullable|in:si,no',
            'accidentes_previos'     => 'nullable|string',
            'antecedentes_familiares'=> 'nullable|array',
            'fumador'                => 'boolean',
            'cigarrillos_dia'        => 'nullable|integer|min:0',
            'consumo_alcohol'        => 'nullable|in:nunca,ocasional,frecuente,diario',
            'actividad_fisica'       => 'nullable|in:sedentario,leve,moderado,intenso',
            'vacunas'                => 'nullable|array',
        ]);

        $ficha = SaludFichaMedica::updateOrCreate(
            ['personal_id' => $personalId],
            array_merge($fichaFields, ['empresa_id' => $user->empresa_id])
        );

        return response()->json([
            'message'  => 'Ficha médica guardada correctamente',
            'personal' => $personal->fresh(['area:id,nombre', 'cargo:id,nombre']),
            'ficha'    => $ficha,
        ]);
    }

    /**
     * GET /api/salud/mi-panel
     * Panel personal del trabajador logueado.
     */
    public function miPanel(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user->personal_id) {
            return response()->json(['message' => 'Usuario no vinculado a un trabajador.'], 422);
        }

        $emos = Emo::where('empresa_id', $user->empresa_id)
            ->where('personal_id', $user->personal_id)
            ->orderByDesc('fecha_examen')
            ->get();

        $ultimoEmo = $emos->first();

        // Alertas por tipo de examen (Ley 29783 exige: pre-ocupacional, periódico, retiro, cambio)
        $tiposObligatorios = ['pre_ocupacional', 'periodico', 'por_cambio_ocupacional', 'retiro'];
        $alertas = [];
        foreach ($tiposObligatorios as $tipo) {
            $ultimo = $emos->where('tipo', $tipo)->first();
            $estado = 'pendiente';
            $fecha  = null;
            $diasRestantes = null;
            if ($ultimo) {
                $fecha = $ultimo->fecha_examen;
                if ($ultimo->fecha_vencimiento) {
                    $dias = $ultimo->dias_para_vencer;
                    $diasRestantes = $dias;
                    if ($dias < 0)      $estado = 'vencido';
                    elseif ($dias <= 30) $estado = 'por_vencer';
                    else                $estado = 'al_dia';
                } else {
                    $estado = 'al_dia';
                }
            }
            $alertas[] = [
                'tipo'          => $tipo,
                'estado'        => $estado,
                'fecha_examen'  => $fecha,
                'dias_restantes'=> $diasRestantes,
                'emo_id'        => $ultimo?->id,
            ];
        }

        // Estadísticas personales
        $diasProximo = $ultimoEmo?->dias_para_vencer;
        $stats = [
            'total_examenes'    => $emos->count(),
            'dias_proximo'      => $diasProximo,
            'ultimo_anual'      => $emos->where('tipo', 'periodico')->first()?->fecha_examen?->year,
            'resultado_actual'  => $ultimoEmo?->resultado,
        ];

        // Indicadores del último examen
        $indicadores = $ultimoEmo ? [
            'presion_sistolica'  => $ultimoEmo->presion_sistolica,
            'presion_diastolica' => $ultimoEmo->presion_diastolica,
            'imc'                => $ultimoEmo->imc_calculado,
            'interpretacion_imc' => $ultimoEmo->interpretacion_imc,
            'glucosa'            => $ultimoEmo->glucosa,
            'hemoglobina'        => $ultimoEmo->hemoglobina,
            'peso'               => $ultimoEmo->peso,
            'talla'              => $ultimoEmo->talla,
            'frecuencia_cardiaca'=> $ultimoEmo->frecuencia_cardiaca,
        ] : null;

        return response()->json([
            'stats'      => $stats,
            'alertas'    => $alertas,
            'indicadores'=> $indicadores,
            'historial'  => $emos->take(5)->values(),
        ]);
    }

    /**
     * GET /api/salud/mi-ficha
     * Ficha médica completa del trabajador logueado.
     */
    public function miFicha(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user->personal_id) {
            return response()->json(['message' => 'Usuario no vinculado a un trabajador.'], 422);
        }

        $personal = Personal::with(['area:id,nombre', 'cargo:id,nombre'])->find($user->personal_id);

        $emos = Emo::where('empresa_id', $user->empresa_id)
            ->where('personal_id', $user->personal_id)
            ->orderByDesc('fecha_examen')
            ->get();

        $restricciones = SaludRestriccion::where('empresa_id', $user->empresa_id)
            ->where('personal_id', $user->personal_id)
            ->where('activa', true)
            ->with('area:id,nombre')
            ->get();

        $atenciones = SaludAtencion::where('empresa_id', $user->empresa_id)
            ->where('personal_id', $user->personal_id)
            ->orderByDesc('fecha')
            ->take(10)
            ->get();

        return response()->json([
            'personal'     => $personal,
            'emos'         => $emos,
            'restricciones'=> $restricciones,
            'atenciones'   => $atenciones,
        ]);
    }

    /**
     * GET /api/salud/cronograma-medico
     * Lista de todos los trabajadores con estado de su EMO periódico.
     */
    public function cronogramaMedico(Request $request): JsonResponse
    {
        $empresaId = $request->user()->empresa_id;

        $query = Personal::where('empresa_id', $empresaId)
            ->where('estado', 'activo')
            ->with(['area:id,nombre', 'cargo:id,nombre']);

        if ($request->filled('area_id')) $query->where('area_id', $request->area_id);
        if ($request->filled('search')) {
            $q = $request->search;
            $query->where(fn($s) =>
                $s->where('nombres', 'like', "%{$q}%")->orWhere('apellidos', 'like', "%{$q}%")->orWhere('dni', 'like', "%{$q}%")
            );
        }

        $personal = $query->orderBy('apellidos')->get();

        // Último EMO periódico por trabajador
        $ultimosEmos = Emo::where('empresa_id', $empresaId)
            ->where('tipo', 'periodico')
            ->whereIn('personal_id', $personal->pluck('id'))
            ->orderByDesc('fecha_examen')
            ->get()
            ->groupBy('personal_id')
            ->map(fn($g) => $g->first());

        $cronograma = $personal->map(function ($p) use ($ultimosEmos) {
            $emo = $ultimosEmos->get($p->id);
            $dias = $emo?->dias_para_vencer;

            if (!$emo) {
                $semaforo = 'sin_examen';
            } elseif ($emo->esta_vencida) {
                $semaforo = 'vencido';
            } elseif ($dias !== null && $dias <= 30) {
                $semaforo = 'por_vencer';
            } else {
                $semaforo = 'al_dia';
            }

            return [
                'personal_id'        => $p->id,
                'nombres'            => $p->nombres,
                'apellidos'          => $p->apellidos,
                'dni'                => $p->dni,
                'area'               => $p->area?->nombre,
                'cargo'              => $p->cargo?->nombre,
                'emo_id'             => $emo?->id,
                'ultimo_examen'      => $emo?->fecha_examen,
                'fecha_vencimiento'  => $emo?->fecha_vencimiento,
                'resultado'          => $emo?->resultado,
                'dias_para_vencer'   => $dias,
                'semaforo'           => $semaforo,
            ];
        });

        $filtroSemaforo = $request->filled('semaforo') ? $request->semaforo : null;
        if ($filtroSemaforo) {
            $cronograma = $cronograma->filter(fn($r) => $r['semaforo'] === $filtroSemaforo)->values();
        }

        return response()->json([
            'data'    => $cronograma->values(),
            'totales' => [
                'al_dia'     => $cronograma->where('semaforo', 'al_dia')->count(),
                'por_vencer' => $cronograma->where('semaforo', 'por_vencer')->count(),
                'vencido'    => $cronograma->where('semaforo', 'vencido')->count(),
                'sin_examen' => $cronograma->where('semaforo', 'sin_examen')->count(),
            ],
        ]);
    }

    /**
     * GET /api/salud/certificado/{personalId}
     * Datos del certificado de aptitud del trabajador.
     */
    public function certificado(Request $request, int $personalId): JsonResponse
    {
        $empresaId = $request->user()->empresa_id;

        $personal = Personal::where('empresa_id', $empresaId)
            ->with(['area:id,nombre', 'cargo:id,nombre', 'sede:id,nombre'])
            ->findOrFail($personalId);

        $ultimoEmo = Emo::where('empresa_id', $empresaId)
            ->where('personal_id', $personalId)
            ->latest('fecha_examen')
            ->first();

        $restricciones = SaludRestriccion::where('empresa_id', $empresaId)
            ->where('personal_id', $personalId)
            ->where('activa', true)
            ->get();

        $empresa = $request->user()->empresa;

        return response()->json([
            'personal'     => $personal,
            'empresa'      => $empresa,
            'emo'          => $ultimoEmo,
            'restricciones'=> $restricciones,
            'generado_en'  => now()->toDateTimeString(),
        ]);
    }

    /** GET /api/salud/personal/{personalId}/restricciones */
    public function restricciones(Request $request, int $personalId): JsonResponse
    {
        return response()->json(
            SaludRestriccion::where('empresa_id', $request->user()->empresa_id)
                ->where('personal_id', $personalId)->where('activa', true)
                ->with(['area:id,nombre', 'emo:id,tipo,fecha_examen,resultado'])
                ->orderByDesc('fecha_inicio')->get()
        );
    }

    /** POST /api/salud/restricciones */
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

        return response()->json(
            SaludRestriccion::create([...$validated, 'empresa_id' => $request->user()->empresa_id, 'activa' => true]),
            201
        );
    }

    /** GET /api/salud/atenciones */
    public function atenciones(Request $request): JsonResponse
    {
        $query = SaludAtencion::where('empresa_id', $request->user()->empresa_id)
            ->with('personal:id,nombres,apellidos,dni');

        if ($request->filled('personal_id'))   $query->where('personal_id', $request->personal_id);
        if ($request->filled('tipo'))           $query->where('tipo', $request->tipo);
        if ($request->boolean('baja_laboral'))  $query->where('baja_laboral', true);
        if ($request->filled('fecha_desde'))    $query->where('fecha', '>=', $request->fecha_desde);
        if ($request->filled('fecha_hasta'))    $query->where('fecha', '<=', $request->fecha_hasta . ' 23:59:59');

        return response()->json(
            $query->orderByDesc('fecha')->paginate(min($request->integer('per_page', 15), 100))
        );
    }

    /** POST /api/salud/atenciones */
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

        return response()->json(
            SaludAtencion::create([...$validated, 'empresa_id' => $request->user()->empresa_id])
                ->load('personal:id,nombres,apellidos'),
            201
        );
    }
}
