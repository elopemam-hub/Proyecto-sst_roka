<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ChecklistPregunta;
use App\Models\EquipoCatalogo;
use App\Models\Inspeccion;
use App\Models\InspeccionAccionChecklist;
use App\Models\InspeccionFirmaCanvas;
use App\Models\InspeccionRespuesta;
use App\Models\InspeccionSubmodulo;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class ChecklistController extends Controller
{
    // ═══════════════════════════════════════════════════════════
    // CATÁLOGO — Sub-módulos
    // ═══════════════════════════════════════════════════════════

    public function submodulos(): JsonResponse
    {
        return response()->json(
            InspeccionSubmodulo::where('activo', true)->orderBy('codigo')->get()
        );
    }

    // ═══════════════════════════════════════════════════════════
    // CATÁLOGO — Equipos
    // ═══════════════════════════════════════════════════════════

    public function equipos(Request $request): JsonResponse
    {
        $query = EquipoCatalogo::with('submodulo:id,codigo,nombre,color')
            ->withCount(['preguntasActivas as preguntas_count']);

        if ($request->filled('submodulo_id')) {
            $query->where('submodulo_id', $request->submodulo_id);
        }
        if ($request->boolean('activos', true)) {
            $query->where('activo', true);
        }

        return response()->json($query->orderBy('submodulo_id')->orderBy('orden')->get());
    }

    public function equipoShow(int $id): JsonResponse
    {
        $equipo = EquipoCatalogo::with([
            'submodulo:id,codigo,nombre,color',
            'preguntasActivas',
        ])->findOrFail($id);

        return response()->json($equipo);
    }

    public function equipoStore(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'submodulo_id'      => 'required|exists:inspeccion_submodulos,id',
            'nombre'            => 'required|string|max:100',
            'descripcion'       => 'nullable|string',
            'codigo'            => 'nullable|string|max:30',
            'requiere_operador' => 'boolean',
            'orden'             => 'nullable|integer|min:0',
        ]);

        $equipo = EquipoCatalogo::create($validated + ['activo' => true]);

        return response()->json($equipo->load('submodulo:id,codigo,nombre,color'), 201);
    }

    public function equipoUpdate(Request $request, int $id): JsonResponse
    {
        $equipo = EquipoCatalogo::findOrFail($id);

        $validated = $request->validate([
            'nombre'            => 'sometimes|string|max:100',
            'descripcion'       => 'nullable|string',
            'codigo'            => 'nullable|string|max:30',
            'requiere_operador' => 'boolean',
            'orden'             => 'nullable|integer|min:0',
        ]);

        $equipo->update($validated);

        return response()->json($equipo);
    }

    public function equipoToggle(int $id): JsonResponse
    {
        $equipo = EquipoCatalogo::findOrFail($id);
        $equipo->update(['activo' => !$equipo->activo]);

        return response()->json(['activo' => $equipo->activo]);
    }

    public function equipoDestroy(int $id): JsonResponse
    {
        $equipo = EquipoCatalogo::findOrFail($id);
        $equipo->delete();

        return response()->json(['message' => 'Equipo eliminado']);
    }

    // ═══════════════════════════════════════════════════════════
    // CATÁLOGO — Preguntas
    // ═══════════════════════════════════════════════════════════

    public function preguntas(Request $request, int $equipoId): JsonResponse
    {
        $query = ChecklistPregunta::where('equipo_id', $equipoId)->orderBy('orden');

        if ($request->boolean('solo_activas', false)) {
            $query->where('activo', true);
        }

        return response()->json($query->get());
    }

    public function preguntaStore(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'equipo_id'      => 'required|exists:equipos_catalogo,id',
            'texto'          => 'required|string',
            'tipo_respuesta' => ['nullable', Rule::in(['conf_nc_obs','si_no_na','texto','numero','fecha'])],
            'es_obligatoria' => 'boolean',
            'permite_foto'   => 'boolean',
            'permite_nota'   => 'boolean',
            'ayuda'          => 'nullable|string',
            'valor_limite'   => 'nullable|string|max:80',
            'orden'          => 'nullable|integer|min:0',
        ]);

        if (!isset($validated['orden'])) {
            $validated['orden'] = ChecklistPregunta::where('equipo_id', $validated['equipo_id'])->max('orden') + 1;
        }

        $pregunta = ChecklistPregunta::create($validated + ['activo' => true]);

        return response()->json($pregunta, 201);
    }

    public function preguntaUpdate(Request $request, int $id): JsonResponse
    {
        $pregunta = ChecklistPregunta::findOrFail($id);

        $validated = $request->validate([
            'texto'          => 'sometimes|string',
            'tipo_respuesta' => ['nullable', Rule::in(['conf_nc_obs','si_no_na','texto','numero','fecha'])],
            'es_obligatoria' => 'boolean',
            'permite_foto'   => 'boolean',
            'permite_nota'   => 'boolean',
            'ayuda'          => 'nullable|string',
            'valor_limite'   => 'nullable|string|max:80',
            'orden'          => 'nullable|integer|min:0',
        ]);

        $pregunta->update($validated);

        return response()->json($pregunta);
    }

    public function preguntaToggle(int $id): JsonResponse
    {
        $pregunta = ChecklistPregunta::findOrFail($id);
        $pregunta->update(['activo' => !$pregunta->activo]);

        return response()->json(['activo' => $pregunta->activo]);
    }

    public function preguntaDestroy(int $id): JsonResponse
    {
        $pregunta = ChecklistPregunta::findOrFail($id);
        $pregunta->delete();

        return response()->json(['message' => 'Pregunta eliminada']);
    }

    // ═══════════════════════════════════════════════════════════
    // RESPUESTAS
    // ═══════════════════════════════════════════════════════════

    public function respuestas(Request $request, int $inspId): JsonResponse
    {
        $inspeccion = Inspeccion::where('empresa_id', $request->user()->empresa_id)->findOrFail($inspId);

        $respuestas = InspeccionRespuesta::where('inspeccion_id', $inspeccion->id)
            ->with('pregunta:id,texto,tipo_respuesta,es_obligatoria,orden')
            ->get();

        return response()->json($respuestas);
    }

    public function guardarRespuestas(Request $request, int $inspId): JsonResponse
    {
        $inspeccion = Inspeccion::where('empresa_id', $request->user()->empresa_id)->findOrFail($inspId);

        $validated = $request->validate([
            'items'              => 'required|array|min:1',
            'items.*.pregunta_id' => 'required|exists:checklist_preguntas,id',
            'items.*.resultado'   => 'nullable|string|max:20',
            'items.*.nota'        => 'nullable|string',
            'items.*.foto_base64' => 'nullable|string',
        ]);

        DB::transaction(function () use ($inspeccion, $validated) {
            foreach ($validated['items'] as $item) {
                $fotoPath = null;
                if (!empty($item['foto_base64'])) {
                    $b64 = preg_replace('/^data:image\/\w+;base64,/', '', $item['foto_base64']);
                    $decoded = base64_decode($b64);
                    if ($decoded !== false) {
                        $fname = 'inspecciones/checklist/' . $inspeccion->id . '_' . $item['pregunta_id'] . '_' . time() . '.jpg';
                        Storage::disk('public')->put($fname, $decoded);
                        $fotoPath = $fname;
                    }
                }

                InspeccionRespuesta::updateOrCreate(
                    ['inspeccion_id' => $inspeccion->id, 'pregunta_id' => $item['pregunta_id']],
                    [
                        'resultado'    => $item['resultado'] ?? null,
                        'nota'         => $item['nota'] ?? null,
                        'foto_path'    => $fotoPath ?? InspeccionRespuesta::where('inspeccion_id', $inspeccion->id)
                            ->where('pregunta_id', $item['pregunta_id'])->value('foto_path'),
                    ]
                );
            }

            $this->recalcularPuntaje($inspeccion);
        });

        return response()->json(['message' => 'Respuestas guardadas.', 'puntaje' => $inspeccion->fresh()->porcentaje_cumplimiento]);
    }

    // ═══════════════════════════════════════════════════════════
    // FIRMAS CANVAS
    // ═══════════════════════════════════════════════════════════

    public function firmas(Request $request, int $inspId): JsonResponse
    {
        $inspeccion = Inspeccion::where('empresa_id', $request->user()->empresa_id)->findOrFail($inspId);

        return response()->json(
            InspeccionFirmaCanvas::where('inspeccion_id', $inspeccion->id)
                ->select(['id','rol_firma','nombre_firmante','usuario_id','firmado_at'])
                ->orderBy('firmado_at')
                ->get()
        );
    }

    public function firmarCanvas(Request $request, int $inspId): JsonResponse
    {
        $inspeccion = Inspeccion::where('empresa_id', $request->user()->empresa_id)->findOrFail($inspId);

        $validated = $request->validate([
            'rol_firma'       => ['required', Rule::in(['inspector','responsable_area','supervisor','trabajador'])],
            'nombre_firmante' => 'nullable|string|max:120',
            'firma_base64'    => 'required|string',
            'usuario_id'      => 'nullable|exists:usuarios,id',
        ]);

        $firma = InspeccionFirmaCanvas::create([
            ...$validated,
            'inspeccion_id' => $inspeccion->id,
            'ip_firma'      => $request->ip(),
        ]);

        // Si hay al menos inspector + responsable_area → estado = firmado
        $roles = InspeccionFirmaCanvas::where('inspeccion_id', $inspeccion->id)
            ->pluck('rol_firma')
            ->unique();

        if ($roles->contains('inspector') && $roles->contains('responsable_area')) {
            $inspeccion->update(['estado' => 'cerrada']);
        }

        return response()->json($firma->only(['id','rol_firma','nombre_firmante','firmado_at']), 201);
    }

    // ═══════════════════════════════════════════════════════════
    // ACCIONES CORRECTIVAS
    // ═══════════════════════════════════════════════════════════

    public function accionesChecklist(Request $request, int $inspId): JsonResponse
    {
        $inspeccion = Inspeccion::where('empresa_id', $request->user()->empresa_id)->findOrFail($inspId);

        return response()->json(
            InspeccionAccionChecklist::where('inspeccion_id', $inspeccion->id)
                ->with(['pregunta:id,texto', 'responsable:id,nombres,apellidos'])
                ->orderBy('prioridad')
                ->get()
        );
    }

    public function crearAccion(Request $request, int $inspId): JsonResponse
    {
        $inspeccion = Inspeccion::where('empresa_id', $request->user()->empresa_id)->findOrFail($inspId);

        $validated = $request->validate([
            'descripcion'      => 'required|string',
            'pregunta_id'      => 'nullable|exists:checklist_preguntas,id',
            'responsable_id'   => 'nullable|exists:personal,id',
            'fecha_compromiso' => 'nullable|date|after:today',
            'prioridad'        => ['nullable', Rule::in(['alta','media','baja'])],
        ]);

        $accion = InspeccionAccionChecklist::create([
            ...$validated,
            'inspeccion_id' => $inspeccion->id,
        ]);

        return response()->json($accion->load(['pregunta:id,texto', 'responsable:id,nombres,apellidos']), 201);
    }

    public function actualizarAccion(Request $request, int $inspId, int $accionId): JsonResponse
    {
        $inspeccion = Inspeccion::where('empresa_id', $request->user()->empresa_id)->findOrFail($inspId);

        $accion = InspeccionAccionChecklist::where('inspeccion_id', $inspeccion->id)->findOrFail($accionId);

        $validated = $request->validate([
            'estado'           => ['nullable', Rule::in(['pendiente','en_proceso','cerrado'])],
            'porcentaje'       => 'nullable|integer|min:0|max:100',
            'evidencia'        => 'nullable|string',
            'fecha_compromiso' => 'nullable|date',
            'responsable_id'   => 'nullable|exists:personal,id',
        ]);

        $accion->update($validated);

        return response()->json($accion);
    }

    public function generarAccionesNC(Request $request, int $inspId): JsonResponse
    {
        $inspeccion = Inspeccion::where('empresa_id', $request->user()->empresa_id)->findOrFail($inspId);

        $ncSinAccion = InspeccionRespuesta::where('inspeccion_id', $inspeccion->id)
            ->where('resultado', 'N')
            ->whereNotIn('pregunta_id', function ($q) use ($inspeccion) {
                $q->select('pregunta_id')
                  ->from('inspeccion_acciones_checklist')
                  ->where('inspeccion_id', $inspeccion->id)
                  ->whereNotNull('pregunta_id');
            })
            ->with('pregunta:id,texto')
            ->get();

        $creadas = 0;
        foreach ($ncSinAccion as $resp) {
            InspeccionAccionChecklist::create([
                'inspeccion_id'  => $inspeccion->id,
                'pregunta_id'    => $resp->pregunta_id,
                'descripcion'    => 'Corregir no conformidad: ' . ($resp->pregunta->texto ?? ''),
                'prioridad'      => 'alta',
                'estado'         => 'pendiente',
            ]);
            $creadas++;
        }

        return response()->json(['message' => "$creadas acciones generadas.", 'creadas' => $creadas]);
    }

    // ═══════════════════════════════════════════════════════════
    // ESTADÍSTICAS
    // ═══════════════════════════════════════════════════════════

    public function estadisticasChecklist(Request $request): JsonResponse
    {
        $empresaId = $request->user()->empresa_id;
        $anio      = $request->integer('anio', now()->year);

        $base = Inspeccion::where('empresa_id', $empresaId)
            ->whereNotNull('equipo_catalogo_id')
            ->whereYear('planificada_para', $anio);

        $total       = (clone $base)->count();
        $completadas = (clone $base)->whereIn('estado', ['ejecutada','con_hallazgos','cerrada'])->count();
        $puntajeProm = (clone $base)->whereNotNull('porcentaje_cumplimiento')->avg('porcentaje_cumplimiento');

        // Por sub-módulo
        $porSubmodulo = (clone $base)
            ->join('inspeccion_submodulos as s', 'inspecciones.submodulo_id', '=', 's.id')
            ->select('s.nombre', 's.codigo', DB::raw('COUNT(*) as total'), DB::raw('ROUND(AVG(porcentaje_cumplimiento),1) as puntaje_prom'))
            ->groupBy('s.id', 's.nombre', 's.codigo')
            ->get();

        // Top equipos con más NC
        $topNC = DB::table('inspeccion_respuestas as r')
            ->join('inspecciones as i', 'r.inspeccion_id', '=', 'i.id')
            ->join('equipos_catalogo as e', 'i.equipo_catalogo_id', '=', 'e.id')
            ->where('i.empresa_id', $empresaId)
            ->whereYear('i.planificada_para', $anio)
            ->where('r.resultado', 'N')
            ->select('e.nombre as equipo', DB::raw('COUNT(*) as nc_total'))
            ->groupBy('e.id', 'e.nombre')
            ->orderByDesc('nc_total')
            ->limit(10)
            ->get();

        // Acciones abiertas
        $accionesAbiertas = DB::table('inspeccion_acciones_checklist as a')
            ->join('inspecciones as i', 'a.inspeccion_id', '=', 'i.id')
            ->where('i.empresa_id', $empresaId)
            ->where('a.estado', '!=', 'cerrado')
            ->count();

        return response()->json([
            'total'            => $total,
            'completadas'      => $completadas,
            'puntaje_promedio' => round($puntajeProm ?? 0, 1),
            'acciones_abiertas' => $accionesAbiertas,
            'por_submodulo'    => $porSubmodulo,
            'top_nc'           => $topNC,
        ]);
    }

    // ═══════════════════════════════════════════════════════════
    // PRIVADO
    // ═══════════════════════════════════════════════════════════

    private function recalcularPuntaje(Inspeccion $inspeccion): void
    {
        if (!$inspeccion->equipo_catalogo_id) return;

        $totalPreguntas = ChecklistPregunta::where('equipo_id', $inspeccion->equipo_catalogo_id)
            ->where('activo', true)
            ->whereIn('tipo_respuesta', ['conf_nc_obs', 'si_no_na'])
            ->count();

        $respuestas = InspeccionRespuesta::where('inspeccion_id', $inspeccion->id)
            ->whereHas('pregunta', fn($q) => $q->whereIn('tipo_respuesta', ['conf_nc_obs', 'si_no_na']))
            ->pluck('resultado');

        $conformes = $respuestas->filter(fn($r) => in_array($r, ['C', 'S', 'A']))->count();
        $nc        = $respuestas->filter(fn($r) => $r === 'N')->count();
        $obs       = $respuestas->filter(fn($r) => $r === 'O')->count();
        $pct       = $totalPreguntas > 0 ? round($conformes / $totalPreguntas * 100, 2) : 0;

        $estado = $inspeccion->estado;
        if ($pct > 0 && in_array($estado, ['programada', 'en_ejecucion'])) {
            $estado = $nc > 0 ? 'con_hallazgos' : 'ejecutada';
        }

        $inspeccion->update([
            'porcentaje_cumplimiento' => $pct,
            'puntaje_total'           => $totalPreguntas,
            'puntaje_obtenido'        => $conformes,
            'items_conformes'         => $conformes,
            'items_nc'                => $nc,
            'items_obs'               => $obs,
            'estado'                  => $estado,
        ]);
    }
}
