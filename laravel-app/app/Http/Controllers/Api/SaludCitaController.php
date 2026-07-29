<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Emo;
use App\Models\EmoCita;
use App\Models\Personal;
use App\Services\AuditoriaService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Carbon\Carbon;

/**
 * Agenda de citas de EMO: exámenes programados que aún no se han realizado.
 * Al marcarse como realizada se crea el EMO correspondiente, que es lo que
 * alimenta el cronograma médico y las alertas de vencimiento.
 */
class SaludCitaController extends Controller
{
    private const TIPOS   = ['pre_ocupacional', 'periodico', 'retiro', 'por_cambio_ocupacional'];
    private const ESTADOS = ['programada', 'confirmada', 'realizada', 'cancelada', 'no_asistio'];

    public function __construct(private AuditoriaService $auditoria) {}

    /** GET /api/salud/citas */
    public function index(Request $request): JsonResponse
    {
        $empresaId = $request->user()->empresa_id;

        $query = EmoCita::where('empresa_id', $empresaId)
            ->with(['personal:id,nombres,apellidos,dni,area_id,cargo_id', 'personal.area:id,nombre', 'personal.cargo:id,nombre']);

        if ($request->filled('estado')) $query->where('estado', $request->estado);
        if ($request->filled('tipo'))   $query->where('tipo', $request->tipo);
        if ($request->filled('desde'))  $query->whereDate('fecha_cita', '>=', $request->desde);
        if ($request->filled('hasta'))  $query->whereDate('fecha_cita', '<=', $request->hasta);

        if ($request->boolean('solo_pendientes')) $query->pendientes();

        if ($request->filled('search')) {
            $s = $request->search;
            $query->whereHas('personal', fn($q) =>
                $q->where('nombres', 'like', "%{$s}%")
                  ->orWhere('apellidos', 'like', "%{$s}%")
                  ->orWhere('dni', 'like', "%{$s}%")
            );
        }

        $citas = $query->orderBy('fecha_cita')->orderBy('hora')->get();

        $hoy = Carbon::today();
        return response()->json([
            'citas'  => $citas,
            'resumen' => [
                'total'      => $citas->count(),
                'pendientes' => $citas->whereIn('estado', ['programada', 'confirmada'])->count(),
                'realizadas' => $citas->where('estado', 'realizada')->count(),
                'vencidas'   => $citas->where('vencida', true)->count(),
                'esta_semana'=> $citas->filter(fn($c) =>
                    in_array($c->estado, ['programada', 'confirmada'], true)
                    && $c->fecha_cita
                    && $c->fecha_cita->between($hoy, $hoy->copy()->addDays(7))
                )->count(),
            ],
        ]);
    }

    /** POST /api/salud/citas */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'personal_id'   => 'required|exists:personal,id',
            'tipo'          => 'required|in:' . implode(',', self::TIPOS),
            'fecha_cita'    => 'required|date',
            'hora'          => 'nullable|date_format:H:i',
            'clinica'       => 'nullable|string|max:150',
            'medico'        => 'nullable|string|max:150',
            'estado'        => 'nullable|in:' . implode(',', self::ESTADOS),
            'observaciones' => 'nullable|string',
        ]);

        $cita = EmoCita::create([
            ...$validated,
            'empresa_id' => $request->user()->empresa_id,
            'estado'     => $validated['estado'] ?? 'programada',
        ]);

        return response()->json($cita->load('personal:id,nombres,apellidos,dni'), 201);
    }

    /** PUT /api/salud/citas/{id} */
    public function update(Request $request, int $id): JsonResponse
    {
        $cita = EmoCita::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);

        $validated = $request->validate([
            'tipo'          => 'sometimes|in:' . implode(',', self::TIPOS),
            'fecha_cita'    => 'sometimes|date',
            'hora'          => 'nullable|date_format:H:i',
            'clinica'       => 'nullable|string|max:150',
            'medico'        => 'nullable|string|max:150',
            'estado'        => 'sometimes|in:' . implode(',', self::ESTADOS),
            'observaciones' => 'nullable|string',
        ]);

        $cita->update($validated);

        return response()->json($cita->load('personal:id,nombres,apellidos,dni'));
    }

    /** DELETE /api/salud/citas/{id} */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $cita = EmoCita::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);
        $cita->delete();

        return response()->json(['message' => 'Cita eliminada']);
    }

    /**
     * POST /api/salud/citas/{id}/realizar
     * Cierra la cita creando el EMO con su resultado.
     */
    public function realizar(Request $request, int $id): JsonResponse
    {
        $cita = EmoCita::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);

        if ($cita->emo_id) {
            return response()->json(['message' => 'Esta cita ya tiene un examen registrado.'], 422);
        }

        $validated = $request->validate([
            'fecha_examen'      => 'required|date',
            'fecha_vencimiento' => 'nullable|date|after:fecha_examen',
            'resultado'         => 'required|in:apto,apto_con_restricciones,no_apto',
            'clinica'           => 'nullable|string|max:150',
            'medico'            => 'nullable|string|max:150',
            'restricciones'     => 'nullable|string',
            'observaciones'     => 'nullable|string',
        ]);

        $fechaExamen = Carbon::parse($validated['fecha_examen'])->startOfDay();

        $emo = Emo::create([
            'empresa_id'        => $cita->empresa_id,
            'personal_id'       => $cita->personal_id,
            'tipo'              => $cita->tipo,
            'fecha_examen'      => $fechaExamen->toDateString(),
            'fecha_vencimiento' => $validated['fecha_vencimiento']
                ?? $fechaExamen->copy()->addYear()->toDateString(),
            'clinica'           => $validated['clinica'] ?? $cita->clinica,
            'medico'            => $validated['medico'] ?? $cita->medico,
            'resultado'         => $validated['resultado'],
            'restricciones'     => $validated['restricciones'] ?? null,
            'observaciones'     => $validated['observaciones'] ?? null,
        ]);

        $cita->update(['estado' => 'realizada', 'emo_id' => $emo->id]);

        $this->auditoria->registrar(
            modulo: 'salud', accion: 'cita_realizada', usuario: $request->user(),
            modelo: 'EmoCita', modeloId: $cita->id,
            valorNuevo: ['emo_id' => $emo->id, 'resultado' => $emo->resultado],
            request: $request
        );

        return response()->json([
            'message' => 'Examen registrado y cita cerrada',
            'cita'    => $cita->fresh()->load('personal:id,nombres,apellidos,dni'),
            'emo'     => $emo,
        ]);
    }

    /**
     * POST /api/salud/citas/importar
     * Carga masiva de la agenda desde plantilla Excel.
     */
    public function importar(Request $request): JsonResponse
    {
        $request->validate([
            'registros' => 'required|array|min:1|max:1000',
            'modo'      => 'in:insertar,upsert',
        ]);

        $empresaId = $request->user()->empresa_id;
        $modo      = $request->input('modo', 'insertar');

        $dnis = collect($request->registros)
            ->map(fn($r) => trim((string)($r['dni'] ?? '')))
            ->filter()->unique();

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
            if (!in_array($tipo, self::TIPOS, true)) { $fallo("Tipo de examen inválido: \"{$tipo}\""); continue; }

            $fecha = $this->fechaValida($reg['fecha_cita'] ?? null);
            if (!$fecha) { $fallo('Fecha de cita vacía o con formato inválido'); continue; }

            $hora = $this->horaValida($reg['hora'] ?? null);
            if ($hora === false) { $fallo('Hora inválida (usar HH:MM)'); continue; }

            $datos = [
                'empresa_id'    => $empresaId,
                'personal_id'   => $personalId,
                'tipo'          => $tipo,
                'fecha_cita'    => $fecha->toDateString(),
                'hora'          => $hora,
                'clinica'       => $this->valorONull($reg['clinica'] ?? null),
                'medico'        => $this->valorONull($reg['medico'] ?? null),
                'observaciones' => $this->valorONull($reg['observaciones'] ?? null),
            ];

            try {
                $existente = EmoCita::where('empresa_id', $empresaId)
                    ->where('personal_id', $personalId)
                    ->where('tipo', $tipo)
                    ->whereDate('fecha_cita', $fecha->toDateString())
                    ->first();

                if ($existente) {
                    if ($modo === 'upsert') {
                        // Una cita ya cerrada no se toca
                        if ($existente->emo_id) {
                            $fallo('La cita ya se realizó y tiene examen registrado');
                            continue;
                        }
                        $existente->update($datos);
                        $actualizados++;
                    } else {
                        $fallo('Ya existe una cita de ese tipo y fecha para este trabajador');
                    }
                    continue;
                }

                EmoCita::create([...$datos, 'estado' => 'programada']);
                $insertados++;
            } catch (\Throwable $e) {
                $fallo('No se pudo guardar: ' . $e->getMessage());
            }
        }

        $this->auditoria->registrar(
            modulo: 'salud', accion: 'importar_citas', usuario: $request->user(),
            modelo: 'EmoCita', modeloId: null,
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

    /** Acepta yyyy-mm-dd y dd/mm/yyyy */
    private function fechaValida($valor): ?Carbon
    {
        $valor = trim((string) $valor);
        if ($valor === '') return null;

        foreach (['Y-m-d', 'd/m/Y', 'd-m-Y'] as $formato) {
            try { return Carbon::createFromFormat($formato, $valor)->startOfDay(); }
            catch (\Throwable) { continue; }
        }
        return null;
    }

    /** null = sin hora · false = venía algo pero no es una hora */
    private function horaValida($valor): string|false|null
    {
        $valor = trim((string) $valor);
        if ($valor === '') return null;

        if (preg_match('/^(\d{1,2}):(\d{2})/', $valor, $m)) {
            $h = (int) $m[1]; $i = (int) $m[2];
            if ($h <= 23 && $i <= 59) return sprintf('%02d:%02d:00', $h, $i);
        }
        return false;
    }

    private function valorONull($valor): ?string
    {
        $valor = trim((string) $valor);
        return $valor === '' ? null : $valor;
    }
}
