<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ChecklistPregunta;
use App\Models\Equipo;
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

    /**
     * GET /api/checklist/equipos/{id}/inventario
     * Activos físicos vinculados a este tipo de catálogo.
     */
    public function inventarioPorCatalogo(Request $request, int $id): JsonResponse
    {
        $empresaId = $request->user()->empresa_id;

        $activos = Equipo::where('empresa_id', $empresaId)
            ->where('equipo_catalogo_id', $id)
            ->with(['area:id,nombre', 'responsable:id,nombres,apellidos'])
            ->orderBy('codigo')
            ->get();

        return response()->json($activos);
    }

    /**
     * GET /api/checklist/inventario-resumen
     * Catálogo completo con activos físicos embebidos — una sola query.
     */
    public function inventarioResumen(Request $request): JsonResponse
    {
        $empresaId = $request->user()->empresa_id;

        // 1. Todos los catálogos
        $catalogos = EquipoCatalogo::with('submodulo:id,codigo,nombre,color,tipo_inspeccion')
            ->withCount(['preguntasActivas as preguntas_count'])
            ->orderBy('submodulo_id')->orderBy('orden')
            ->get();

        // 2. Todos los activos de la empresa en UNA sola query, agrupados por catalogo_id
        $todosActivos = Equipo::where('empresa_id', $empresaId)
            ->whereNotNull('equipo_catalogo_id')
            ->with(['area:id,nombre', 'responsable:id,nombres,apellidos'])
            ->get()
            ->groupBy('equipo_catalogo_id');

        // 3. Merge en memoria — sin queries adicionales
        $result = $catalogos->map(function ($cat) use ($todosActivos) {
            $activos = $todosActivos->get($cat->id, collect());
            $cat->activos              = $activos->values();
            $cat->activos_total        = $activos->count();
            $cat->activos_operativos   = $activos->where('estado', 'operativo')->count();
            $cat->activos_mantenimiento= $activos->where('estado', 'mantenimiento')->count();
            return $cat;
        });

        return response()->json($result);
    }

    public function equipoStore(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'submodulo_id'      => 'required|exists:inspeccion_submodulos,id',
            'nombre'            => 'required|string|max:100',
            'descripcion'       => 'nullable|string',
            'codigo'            => 'nullable|string|max:30',
            'requiere_operador'     => 'boolean',
            'frecuencia_inspeccion' => 'nullable|in:diaria,semanal,mensual,trimestral,semestral,anual',
            'orden'                 => 'nullable|integer|min:0',
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
            'requiere_operador'     => 'boolean',
            'frecuencia_inspeccion' => 'nullable|in:diaria,semanal,mensual,trimestral,semestral,anual',
            'orden'                 => 'nullable|integer|min:0',
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

        // 1. Desvincular inspecciones (preserva historial, quita la FK)
        DB::table('inspecciones')->where('equipo_catalogo_id', $id)->update(['equipo_catalogo_id' => null]);

        // 2. Borrar respuestas y preguntas del catálogo
        $preguntaIds = ChecklistPregunta::where('equipo_id', $id)->pluck('id');
        if ($preguntaIds->isNotEmpty()) {
            InspeccionRespuesta::whereIn('pregunta_id', $preguntaIds)->delete();
            ChecklistPregunta::whereIn('id', $preguntaIds)->delete();
        }

        $equipo->delete();

        return response()->json(['message' => 'Equipo eliminado']);
    }

    public function equipoDuplicar(int $id): JsonResponse
    {
        $original = EquipoCatalogo::with('preguntasActivas')->findOrFail($id);

        $copia = EquipoCatalogo::create([
            'submodulo_id'          => $original->submodulo_id,
            'nombre'                => $original->nombre . ' (copia)',
            'codigo'                => $original->codigo ? $original->codigo . '-C' : null,
            'descripcion'           => $original->descripcion,
            'requiere_operador'     => $original->requiere_operador,
            'frecuencia_inspeccion' => $original->frecuencia_inspeccion,
            'orden'                 => $original->orden,
            'activo'                => true,
        ]);

        foreach ($original->preguntasActivas as $p) {
            ChecklistPregunta::create([
                'equipo_id'                 => $copia->id,
                'orden'                     => $p->orden,
                'texto'                     => $p->texto,
                'tipo_respuesta'            => $p->tipo_respuesta,
                'es_obligatoria'            => $p->es_obligatoria,
                'permite_foto'              => $p->permite_foto,
                'permite_nota'              => $p->permite_nota,
                'permite_cantidad'          => $p->permite_cantidad,
                'permite_fecha_vencimiento' => $p->permite_fecha_vencimiento,
                'ayuda'                     => $p->ayuda,
                'valor_limite'              => $p->valor_limite,
                'frecuencia'                => $p->frecuencia,
                'activo'                    => true,
            ]);
        }

        return response()->json($copia->load('submodulo:id,codigo,nombre,color'), 201);
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

        if ($request->filled('frecuencia')) {
            $frecuencia = $request->input('frecuencia');
            $query->whereIn('frecuencia', [$frecuencia, 'ambas']);
        }

        $preguntas = $query->get();

        // Plantilla adaptativa: marcar preguntas que tuvieron NC en la inspección anterior
        if ($request->filled('inspeccion_id')) {
            $actual = \App\Models\Inspeccion::find($request->integer('inspeccion_id'));
            if ($actual?->equipo_catalogo_id) {
                $anterior = \App\Models\Inspeccion::where('empresa_id', $actual->empresa_id)
                    ->where('equipo_catalogo_id', $actual->equipo_catalogo_id)
                    ->when($actual->equipo_id, fn($q) => $q->where('equipo_id', $actual->equipo_id))
                    ->whereIn('estado', ['ejecutada', 'con_hallazgos', 'cerrada'])
                    ->where('id', '!=', $actual->id)
                    ->orderByDesc('planificada_para')
                    ->first(['id', 'codigo', 'planificada_para']);

                if ($anterior) {
                    $ncPrevios = \App\Models\InspeccionRespuesta::where('inspeccion_id', $anterior->id)
                        ->where('resultado', 'N')
                        ->pluck('pregunta_id')
                        ->flip();

                    $preguntas = $preguntas->map(function ($p) use ($ncPrevios, $anterior) {
                        $p->nc_anterior        = $ncPrevios->has($p->id);
                        $p->nc_anterior_codigo = $p->nc_anterior ? $anterior->codigo : null;
                        $p->nc_anterior_fecha  = $p->nc_anterior ? substr($anterior->planificada_para, 0, 7) : null;
                        return $p;
                    });
                }
            }
        }

        return response()->json($preguntas);
    }

    public function preguntaStore(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'equipo_id'      => 'required|exists:equipos_catalogo,id',
            'texto'          => 'required|string',
            'tipo_respuesta' => ['required', Rule::in(['conf_nc_obs','si_no_na','texto','numero','fecha'])],
            'es_obligatoria' => 'boolean',
            'permite_foto'   => 'boolean',
            'permite_nota'   => 'boolean',
            'ayuda'          => 'nullable|string',
            'valor_limite'   => 'nullable|string|max:80',
            'orden'          => 'nullable|integer|min:0',
            'frecuencia'     => ['nullable', Rule::in(['diaria', 'semanal', 'mensual', 'ambas'])],
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
            'tipo_respuesta' => ['sometimes', Rule::in(['conf_nc_obs','si_no_na','texto','numero','fecha'])],
            'es_obligatoria' => 'boolean',
            'permite_foto'   => 'boolean',
            'permite_nota'   => 'boolean',
            'ayuda'          => 'nullable|string',
            'valor_limite'   => 'nullable|string|max:80',
            'orden'          => 'nullable|integer|min:0',
            'frecuencia'     => ['nullable', Rule::in(['diaria', 'semanal', 'mensual', 'ambas'])],
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
        InspeccionRespuesta::where('pregunta_id', $id)->delete();
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
            'items'                         => 'required|array|min:1',
            'items.*.pregunta_id'           => 'required|exists:checklist_preguntas,id',
            'items.*.resultado'             => 'nullable|string|max:20',
            'items.*.nota'                  => 'nullable|string',
            'items.*.foto_base64'           => 'nullable|string',
            'items.*.cantidad'              => 'nullable|numeric|min:0',
            'items.*.fecha_vencimiento_item'=> 'nullable|date',
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
                        'resultado'             => $item['resultado'] ?? null,
                        'nota'                  => $item['nota'] ?? null,
                        'cantidad'              => $item['cantidad'] ?? null,
                        'fecha_vencimiento_item'=> $item['fecha_vencimiento_item'] ?? null,
                        'foto_path'             => $fotoPath ?? InspeccionRespuesta::where('inspeccion_id', $inspeccion->id)
                            ->where('pregunta_id', $item['pregunta_id'])->value('foto_path'),
                    ]
                );
            }

            // Actualizar fecha de ejecución y estado
            if ($inspeccion->estado === 'programada') {
                $inspeccion->update([
                    'estado'       => 'en_ejecucion',
                    'ejecutada_en' => now(),
                ]);
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
    // RECÁLCULO MASIVO
    // ═══════════════════════════════════════════════════════════

    public function recalcularTodas(Request $request): JsonResponse
    {
        $eid   = $request->user()->empresa_id;
        $solo  = $request->filled('inspeccion_id') ? (int)$request->inspeccion_id : null;

        $query = Inspeccion::where('empresa_id', $eid)
            ->whereNotNull('equipo_catalogo_id');

        if ($solo) $query->where('id', $solo);

        $inspecciones = $query->get();
        $ok = 0; $errores = [];

        foreach ($inspecciones as $insp) {
            try {
                $this->recalcularPuntaje($insp);
                $ok++;
            } catch (\Exception $e) {
                $errores[] = ['id' => $insp->id, 'codigo' => $insp->codigo, 'error' => $e->getMessage()];
            }
        }

        return response()->json([
            'recalculadas' => $ok,
            'errores'      => $errores,
            'total'        => $inspecciones->count(),
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
            ->whereIn('tipo_respuesta', ['conf_nc_obs', 'conf_nc', 'si_no_na'])
            ->count();

        $respuestas = InspeccionRespuesta::where('inspeccion_id', $inspeccion->id)
            ->whereHas('pregunta', fn($q) => $q->whereIn('tipo_respuesta', ['conf_nc_obs', 'conf_nc', 'si_no_na']))
            ->pluck('resultado');

        // NA no cuenta en el denominador — descontarlo del total
        $naCount   = $respuestas->filter(fn($r) => $r === 'NA')->count();
        $puntuables = max(0, $totalPreguntas - $naCount);

        $conformes = $respuestas->filter(fn($r) => in_array($r, ['C', 'S', 'A']))->count();
        $nc        = $respuestas->filter(fn($r) => $r === 'N')->count();
        $obs       = $respuestas->filter(fn($r) => $r === 'O')->count();
        $pct       = $puntuables > 0 ? round($conformes / $puntuables * 100, 2) : 0;

        $estado = $inspeccion->estado;
        if ($pct > 0 && in_array($estado, ['programada', 'en_ejecucion'])) {
            $estado = $nc > 0 ? 'con_hallazgos' : 'ejecutada';
        }

        $inspeccion->update([
            'porcentaje_cumplimiento' => $pct,
            'puntaje_total'           => $puntuables,
            'puntaje_obtenido'        => $conformes,
            'items_conformes'         => $conformes,
            'items_nc'                => $nc,
            'items_obs'               => $obs,
            'estado'                  => $estado,
        ]);
    }
}
