<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Documento;
use App\Models\DocumentoVersion;
use App\Services\AuditoriaService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;

class DocumentoController extends Controller
{
    public function __construct(
        private AuditoriaService $auditoria
    ) {}

    /**
     * GET /api/documentos
     */
    public function index(Request $request): JsonResponse
    {
        $query = Documento::where('empresa_id', $request->user()->empresa_id)
            ->with(['area:id,nombre', 'creadoPor:id,nombres,apellidos', 'aprobadoPor:id,nombres,apellidos']);

        if ($request->filled('tipo')) {
            $query->where('tipo', $request->tipo);
        }
        if ($request->filled('estado')) {
            $query->where('estado', $request->estado);
        }
        if ($request->filled('area_id')) {
            $query->where('area_id', $request->area_id);
        }
        if ($request->filled('search')) {
            $q = $request->search;
            $query->where(fn($sub) =>
                $sub->where('titulo', 'like', "%{$q}%")
                    ->orWhere('codigo', 'like', "%{$q}%")
                    ->orWhere('descripcion', 'like', "%{$q}%")
            );
        }

        $documentos = $query->orderByDesc('updated_at')
            ->paginate(min($request->integer('per_page', 15), 100));

        return response()->json($documentos);
    }

    /**
     * POST /api/documentos
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'titulo'         => 'required|string|max:200',
            'descripcion'    => 'nullable|string',
            'tipo'           => 'required|in:politica,procedimiento,instructivo,registro,plan,programa,otro',
            'area_id'        => 'nullable|exists:areas,id',
            'fecha_revision' => 'nullable|date',
            'observaciones'  => 'nullable|string',
            'archivo'        => 'nullable|file|mimes:pdf,doc,docx,xls,xlsx|max:20480',
        ]);

        $empresaId = $request->user()->empresa_id;
        $codigo    = $this->generarCodigo($empresaId);

        $archivoPath   = null;
        $archivoNombre = null;

        if ($request->hasFile('archivo')) {
            $file          = $request->file('archivo');
            $archivoNombre = $file->getClientOriginalName();
            $archivoPath   = $file->store("documentos/{$empresaId}", 'local');
        }

        $documento = Documento::create([
            'empresa_id'     => $empresaId,
            'area_id'        => $validated['area_id'] ?? null,
            'codigo'         => $codigo,
            'titulo'         => $validated['titulo'],
            'descripcion'    => $validated['descripcion'] ?? null,
            'tipo'           => $validated['tipo'],
            'version_actual' => '1.0',
            'estado'         => 'borrador',
            'archivo_path'   => $archivoPath,
            'archivo_nombre' => $archivoNombre,
            'creado_por'     => $request->user()->id,
            'fecha_revision' => $validated['fecha_revision'] ?? null,
            'observaciones'  => $validated['observaciones'] ?? null,
        ]);

        if ($archivoPath) {
            DocumentoVersion::create([
                'documento_id' => $documento->id,
                'version'      => '1.0',
                'archivo_path' => $archivoPath,
                'cambios'      => 'Versión inicial',
                'creado_por'   => $request->user()->id,
            ]);
        }

        $this->auditoria->registrar(
            modulo: 'documentos',
            accion: 'crear_documento',
            usuario: $request->user(),
            modelo: 'Documento',
            modeloId: $documento->id,
            valorNuevo: ['titulo' => $documento->titulo, 'tipo' => $documento->tipo],
            request: $request
        );

        return response()->json(
            $documento->load(['area:id,nombre', 'creadoPor:id,nombres,apellidos', 'versiones.creadoPor:id,nombres,apellidos']),
            201
        );
    }

    /**
     * GET /api/documentos/{id}
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $documento = Documento::where('empresa_id', $request->user()->empresa_id)
            ->with([
                'area:id,nombre',
                'creadoPor:id,nombres,apellidos',
                'aprobadoPor:id,nombres,apellidos',
                'versiones.creadoPor:id,nombres,apellidos',
            ])
            ->findOrFail($id);

        return response()->json($documento);
    }

    /**
     * PUT /api/documentos/{id}
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $documento = Documento::where('empresa_id', $request->user()->empresa_id)
            ->findOrFail($id);

        $validated = $request->validate([
            'titulo'          => 'sometimes|string|max:200',
            'descripcion'     => 'nullable|string',
            'tipo'            => 'sometimes|in:politica,procedimiento,instructivo,registro,plan,programa,otro',
            'area_id'         => 'nullable|exists:areas,id',
            'fecha_revision'  => 'nullable|date',
            'observaciones'   => 'nullable|string',
            'archivo'         => 'nullable|file|mimes:pdf,doc,docx,xls,xlsx|max:20480',
            'descripcion_cambio' => 'nullable|string|max:300',
            'tipo_cambio'     => 'nullable|in:menor,mayor',
        ]);

        if ($request->hasFile('archivo')) {
            $file          = $request->file('archivo');
            $archivoNombre = $file->getClientOriginalName();
            $archivoPath   = $file->store("documentos/{$documento->empresa_id}", 'local');

            $nuevaVersion  = $this->incrementarVersion(
                $documento->version_actual,
                $validated['tipo_cambio'] ?? 'menor'
            );

            if ($documento->archivo_path) {
                Storage::disk('local')->delete($documento->archivo_path);
            }

            $documento->update([
                'archivo_path'   => $archivoPath,
                'archivo_nombre' => $archivoNombre,
                'version_actual' => $nuevaVersion,
            ]);

            DocumentoVersion::create([
                'documento_id' => $documento->id,
                'version'      => $nuevaVersion,
                'archivo_path' => $archivoPath,
                'cambios'      => $validated['descripcion_cambio'] ?? 'Actualización de archivo',
                'creado_por'   => $request->user()->id,
            ]);
        }

        $documento->update(array_filter([
            'titulo'         => $validated['titulo'] ?? null,
            'descripcion'    => $validated['descripcion'] ?? null,
            'tipo'           => $validated['tipo'] ?? null,
            'area_id'        => array_key_exists('area_id', $validated) ? $validated['area_id'] : '__skip__',
            'fecha_revision' => $validated['fecha_revision'] ?? null,
            'observaciones'  => $validated['observaciones'] ?? null,
        ], fn($v) => $v !== null && $v !== '__skip__'));

        // area_id puede ser null explícito
        if (array_key_exists('area_id', $validated)) {
            $documento->update(['area_id' => $validated['area_id']]);
        }

        return response()->json(
            $documento->load(['area:id,nombre', 'creadoPor:id,nombres,apellidos', 'versiones.creadoPor:id,nombres,apellidos'])
        );
    }

    /**
     * DELETE /api/documentos/{id}
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $documento = Documento::where('empresa_id', $request->user()->empresa_id)
            ->findOrFail($id);

        foreach ($documento->versiones as $version) {
            if ($version->archivo_path) {
                Storage::disk('local')->delete($version->archivo_path);
            }
        }
        if ($documento->archivo_path) {
            Storage::disk('local')->delete($documento->archivo_path);
        }

        $documento->delete();

        return response()->json(['message' => 'Documento eliminado correctamente.']);
    }

    /**
     * GET /api/documentos/estadisticas
     */
    public function estadisticas(Request $request): JsonResponse
    {
        $empresaId = $request->user()->empresa_id;

        $total      = Documento::where('empresa_id', $empresaId)->count();
        $aprobados  = Documento::where('empresa_id', $empresaId)->where('estado', 'aprobado')->count();
        $enRevision = Documento::where('empresa_id', $empresaId)->where('estado', 'en_revision')->count();
        $obsoletos  = Documento::where('empresa_id', $empresaId)->where('estado', 'obsoleto')->count();
        $borradores = Documento::where('empresa_id', $empresaId)->where('estado', 'borrador')->count();

        $porTipo = Documento::where('empresa_id', $empresaId)
            ->selectRaw('tipo, COUNT(*) as total')
            ->groupBy('tipo')->get();

        $proximosVencer = Documento::where('empresa_id', $empresaId)
            ->where('estado', 'aprobado')
            ->whereNotNull('fecha_revision')
            ->where('fecha_revision', '<=', now()->addDays(30))
            ->count();

        return response()->json([
            'total'             => $total,
            'aprobados'         => $aprobados,
            'en_revision'       => $enRevision,
            'obsoletos'         => $obsoletos,
            'borradores'        => $borradores,
            'por_tipo'          => $porTipo,
            'proximos_vencer'   => $proximosVencer,
        ]);
    }

    /**
     * POST /api/documentos/{id}/aprobar
     */
    public function aprobar(Request $request, int $id): JsonResponse
    {
        $documento = Documento::where('empresa_id', $request->user()->empresa_id)
            ->findOrFail($id);

        if (!in_array($documento->estado, ['borrador', 'en_revision'])) {
            return response()->json(['message' => 'Solo se pueden aprobar documentos en borrador o en revisión.'], 422);
        }

        $documento->update([
            'estado'          => 'aprobado',
            'aprobado_por'    => $request->user()->id,
            'fecha_aprobacion'=> now()->toDateString(),
        ]);

        $this->auditoria->registrar(
            modulo: 'documentos',
            accion: 'aprobar_documento',
            usuario: $request->user(),
            modelo: 'Documento',
            modeloId: $documento->id,
            request: $request
        );

        return response()->json($documento->load(['aprobadoPor:id,nombres,apellidos']));
    }

    /**
     * POST /api/documentos/{id}/obsoleto
     */
    public function obsoleto(Request $request, int $id): JsonResponse
    {
        $documento = Documento::where('empresa_id', $request->user()->empresa_id)
            ->findOrFail($id);

        if ($documento->estado !== 'aprobado') {
            return response()->json(['message' => 'Solo se pueden marcar como obsoletos documentos aprobados.'], 422);
        }

        $documento->update(['estado' => 'obsoleto']);

        $this->auditoria->registrar(
            modulo: 'documentos',
            accion: 'obsoleto_documento',
            usuario: $request->user(),
            modelo: 'Documento',
            modeloId: $documento->id,
            request: $request
        );

        return response()->json($documento);
    }

    /**
     * GET /api/documentos/{id}/versiones
     */
    public function versiones(Request $request, int $id): JsonResponse
    {
        $documento = Documento::where('empresa_id', $request->user()->empresa_id)
            ->findOrFail($id);

        $versiones = DocumentoVersion::where('documento_id', $documento->id)
            ->with('creadoPor:id,nombres,apellidos')
            ->orderByDesc('created_at')
            ->get();

        return response()->json($versiones);
    }

    /**
     * GET /api/documentos/{id}/descargar
     */
    public function descargar(Request $request, int $id): mixed
    {
        $documento = Documento::where('empresa_id', $request->user()->empresa_id)
            ->findOrFail($id);

        if (!$documento->archivo_path || !Storage::disk('local')->exists($documento->archivo_path)) {
            return response()->json(['message' => 'No hay archivo disponible para este documento.'], 404);
        }

        return Storage::disk('local')->download(
            $documento->archivo_path,
            $documento->archivo_nombre ?? basename($documento->archivo_path)
        );
    }

    // ─── Helpers privados ──────────────────────────────────────────────

    private function generarCodigo(int $empresaId): string
    {
        $prefix = 'DOC-' . now()->format('Ym') . '-';

        $ultimo = Documento::where('empresa_id', $empresaId)
            ->where('codigo', 'like', $prefix . '%')
            ->orderByDesc('codigo')
            ->value('codigo');

        $siguiente = $ultimo
            ? (int) substr($ultimo, -5) + 1
            : 1;

        return $prefix . str_pad($siguiente, 5, '0', STR_PAD_LEFT);
    }

    private function incrementarVersion(string $versionActual, string $tipoCambio): string
    {
        [$mayor, $menor] = array_map('intval', explode('.', $versionActual . '.0'));

        if ($tipoCambio === 'mayor') {
            return ($mayor + 1) . '.0';
        }

        return $mayor . '.' . ($menor + 1);
    }
}
