<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EquipoCertificadoOperatividad;
use App\Models\EquipoCatalogo;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Carbon\Carbon;

class EquipoCertificadoController extends Controller
{
    private function areasDeEquipo(int $catalogoId, int $empresaId): string
    {
        return \DB::table('equipos')
            ->join('areas', 'equipos.area_id', '=', 'areas.id')
            ->where('equipos.equipo_catalogo_id', $catalogoId)
            ->where('equipos.empresa_id', $empresaId)
            ->distinct()
            ->pluck('areas.nombre')
            ->take(3)
            ->implode(', ') ?: 'Sin asignar';
    }

    public function index(Request $request): JsonResponse
    {
        $empresaId = $request->user()->empresa_id;

        // Obtener todos los equipos del catálogo con sus certificados (si existen)
        // Excluir equipos de inspección diaria
        $perPage = min($request->integer('per_page', 10), 100);

        $equipos = EquipoCatalogo::query()
            ->select('id', 'nombre', 'codigo', 'submodulo_id')
            ->where(function($q) {
                // Excluir plantillas de frecuencia diaria (pre-operacional)
                $q->whereNull('frecuencia_inspeccion')
                  ->orWhere('frecuencia_inspeccion', '!=', 'diaria');
            })
            ->when($request->filled('busqueda'), function($q) use ($request) {
                $busqueda = $request->busqueda;
                $q->where(function($query) use ($busqueda) {
                    $query->where('nombre', 'like', "%{$busqueda}%")
                          ->orWhere('codigo', 'like', "%{$busqueda}%");
                });
            })
            ->when($request->filled('submodulo_id'), function($q) use ($request) {
                // Filtro por submódulo de inspección (A, B, C)
                $q->where('submodulo_id', $request->submodulo_id);
            })
            ->when($request->filled('area_id'), function($q) use ($request, $empresaId) {
                // Filtro por área de empresa (Almacén, Vigilancia, etc.)
                $q->whereHas('equiposInventario', function($query) use ($request, $empresaId) {
                    $query->where('area_id', $request->area_id)
                          ->where('empresa_id', $empresaId);
                });
            })
            ->with([
                'certificadoOperatividad' => function($q) use ($empresaId) {
                    $q->where('empresa_id', $empresaId);
                },
                'submodulo:id,nombre'
            ])
            ->orderBy('nombre')
            ->paginate($perPage);

        $equipos->getCollection()->transform(function($equipo) use ($empresaId) {
            $cert = $equipo->certificadoOperatividad;

            $areasAsignadas = $this->areasDeEquipo($equipo->id, $empresaId);

            return [
                'equipo_id' => $equipo->id,
                'equipo_nombre' => $equipo->nombre,
                'equipo_codigo' => $equipo->codigo,
                'equipo_area' => $areasAsignadas,
                'id' => $cert->id ?? null,
                'codigo' => $cert->codigo ?? null,
                'nombre' => $cert->nombre ?? null,
                'frecuencia' => $cert->frecuencia ?? null,
                'fecha_informe' => $cert->fecha_informe ?? null,
                'fecha_vencimiento' => $cert->fecha_vencimiento ?? null,
                'documento_path' => $cert->documento_path ?? null,
                'estado' => $cert->estado ?? null,
                'observaciones' => $cert->observaciones ?? null,
                'tiene_certificado' => $cert !== null,
            ];
        });

        return response()->json($equipos);
    }

    public function areas(Request $request): JsonResponse
    {
        $empresaId = $request->user()->empresa_id;

        // Obtener áreas que tienen equipos
        $areas = \DB::table('equipos')
            ->join('areas', 'equipos.area_id', '=', 'areas.id')
            ->where('equipos.empresa_id', $empresaId)
            ->select('areas.id', 'areas.nombre', 'areas.codigo')
            ->distinct()
            ->orderBy('areas.nombre')
            ->get();

        return response()->json($areas);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'equipo_catalogo_id' => 'nullable|exists:equipos_catalogo,id',
            'codigo' => 'required|string|max:50',
            'nombre' => 'required|string|max:255',
            'frecuencia' => 'required|in:mensual,trimestral,semestral,anual,bienal,quinquenal',
            'fecha_informe' => 'nullable|date',
            'fecha_vencimiento' => 'nullable|date',
            'estado' => 'nullable|in:activo,vencido,por_vencer,inactivo',
            'observaciones' => 'nullable|string',
            'documento' => 'nullable|file|mimes:pdf,jpeg,jpg,png|max:10240',
        ]);

        $validated['empresa_id'] = $request->user()->empresa_id;

        if ($request->hasFile('documento')) {
            $path = $request->file('documento')->store('certificados_equipos', 'public');
            $validated['documento_path'] = $path;
        }

        $certificado = EquipoCertificadoOperatividad::create($validated);
        $certificado->load('equipoCatalogo:id,nombre');

        return response()->json($certificado, 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $certificado = EquipoCertificadoOperatividad::where('empresa_id', $request->user()->empresa_id)
            ->findOrFail($id);

        $validated = $request->validate([
            'equipo_catalogo_id' => 'nullable|exists:equipos_catalogo,id',
            'codigo' => 'sometimes|required|string|max:50',
            'nombre' => 'sometimes|required|string|max:255',
            'frecuencia' => 'sometimes|required|in:mensual,trimestral,semestral,anual,bienal,quinquenal',
            'fecha_informe' => 'nullable|date',
            'fecha_vencimiento' => 'nullable|date',
            'estado' => 'nullable|in:activo,vencido,por_vencer,inactivo',
            'observaciones' => 'nullable|string',
            'documento' => 'nullable|file|mimes:pdf,jpeg,jpg,png|max:10240',
        ]);

        if ($request->hasFile('documento')) {
            // Eliminar documento anterior si existe
            if ($certificado->documento_path) {
                Storage::disk('public')->delete($certificado->documento_path);
            }
            $path = $request->file('documento')->store('certificados_equipos', 'public');
            $validated['documento_path'] = $path;
        }

        $certificado->update($validated);
        $certificado->load('equipoCatalogo:id,nombre');

        return response()->json($certificado);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $certificado = EquipoCertificadoOperatividad::where('empresa_id', $request->user()->empresa_id)
            ->findOrFail($id);

        // Eliminar documento si existe
        if ($certificado->documento_path) {
            Storage::disk('public')->delete($certificado->documento_path);
        }

        $certificado->delete();

        return response()->json(['message' => 'Certificado eliminado correctamente']);
    }

    /**
     * GET /api/equipos-certificados/alertas
     * Dashboard de alertas de certificados
     */
    public function alertas(Request $request): JsonResponse
    {
        $empresaId = $request->user()->empresa_id;
        $hoy = Carbon::today();

        // Vencidos
        $vencidos = EquipoCertificadoOperatividad::where('empresa_id', $empresaId)
            ->whereNotNull('fecha_vencimiento')
            ->where('fecha_vencimiento', '<', $hoy)
            ->with(['equipoCatalogo'])
            ->get()
            ->map(function($cert) use ($hoy) {
                $fechaVenc = Carbon::parse($cert->fecha_vencimiento);
                $equipo = $cert->equipoCatalogo;
                $areasAsignadas = $this->areasDeEquipo($equipo->id ?? 0, $cert->empresa_id);

                return [
                    'id' => $cert->id,
                    'codigo' => $cert->codigo,
                    'nombre' => $cert->nombre,
                    'equipo_nombre' => $equipo->nombre ?? $cert->nombre,
                    'equipo_codigo' => $equipo->codigo ?? '',
                    'area' => $areasAsignadas,
                    'fecha_vencimiento' => $cert->fecha_vencimiento,
                    'dias_vencido' => abs($hoy->diffInDays($fechaVenc)),
                    'estado' => $cert->estado,
                ];
            });

        // Próximos a vencer (30 días)
        $proximosVencer = EquipoCertificadoOperatividad::where('empresa_id', $empresaId)
            ->whereNotNull('fecha_vencimiento')
            ->whereBetween('fecha_vencimiento', [$hoy, $hoy->copy()->addDays(30)])
            ->with(['equipoCatalogo'])
            ->orderBy('fecha_vencimiento')
            ->get()
            ->map(function($cert) use ($hoy) {
                $fechaVenc = Carbon::parse($cert->fecha_vencimiento);
                $equipo = $cert->equipoCatalogo;
                $areasAsignadas = $this->areasDeEquipo($equipo->id ?? 0, $cert->empresa_id);

                return [
                    'id' => $cert->id,
                    'codigo' => $cert->codigo,
                    'nombre' => $cert->nombre,
                    'equipo_nombre' => $equipo->nombre ?? $cert->nombre,
                    'equipo_codigo' => $equipo->codigo ?? '',
                    'area' => $areasAsignadas,
                    'fecha_vencimiento' => $cert->fecha_vencimiento,
                    'dias_restantes' => $hoy->diffInDays($fechaVenc),
                    'estado' => $cert->estado,
                ];
            });

        // Equipos sin certificado asignado
        $sinCertificado = EquipoCatalogo::whereDoesntHave('certificadoOperatividad', function($q) use ($empresaId) {
                $q->where('empresa_id', $empresaId);
            })
            ->whereHas('submodulo', fn($q) => $q->where('tipo_inspeccion', '!=', 'equipos'))
            ->get()
            ->map(function($equipo) use ($empresaId) {
                $areasAsignadas = $this->areasDeEquipo($equipo->id, $empresaId);

                return [
                    'id' => $equipo->id,
                    'codigo' => $equipo->codigo,
                    'nombre' => $equipo->nombre,
                    'area' => $areasAsignadas,
                ];
            });

        return response()->json([
            'vencidos' => $vencidos,
            'proximos_vencer' => $proximosVencer,
            'sin_certificado' => $sinCertificado,
            'resumen' => [
                'total_vencidos' => $vencidos->count(),
                'total_por_vencer' => $proximosVencer->count(),
                'total_sin_certificado' => $sinCertificado->count(),
            ],
        ]);
    }
}
