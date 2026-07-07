<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FormatoArchivo;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;

class FormatoArchivoController extends Controller
{
    /** GET /api/formato-archivos */
    public function index(Request $request): JsonResponse
    {
        $query = FormatoArchivo::where('empresa_id', $request->user()->empresa_id)
            ->where('activo', true)
            ->with('subidoPor:id,nombres,apellidos');

        if ($request->filled('categoria'))    $query->where('categoria', $request->categoria);
        if ($request->filled('tipo_registro'))$query->where('tipo_registro', $request->tipo_registro);
        if ($request->filled('extension'))    $query->where('archivo_extension', $request->extension);
        if ($request->filled('search')) {
            $q = $request->search;
            $query->where(fn($s) =>
                $s->where('nombre', 'like', "%{$q}%")
                  ->orWhere('descripcion', 'like', "%{$q}%")
                  ->orWhere('archivo_nombre_orig', 'like', "%{$q}%")
            );
        }

        $archivos = $query->orderByDesc('created_at')
            ->paginate(min($request->integer('per_page', 24), 100));

        return response()->json($archivos);
    }

    /** POST /api/formato-archivos */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nombre'       => 'required|string|max:250',
            'descripcion'  => 'nullable|string',
            'categoria'    => 'required|in:legal,procedimiento,registro,formulario,instructivo,plantilla,otro',
            'tipo_registro'=> 'nullable|in:reg_01,reg_02,reg_03,reg_04,reg_05,reg_06,reg_07,reg_08,reg_09,reg_10',
            'version'      => 'nullable|string|max:20',
            'archivo'      => 'required|file|mimes:pdf,doc,docx,xls,xlsx,ppt,pptx,txt,csv|max:20480',
        ]);

        $file = $request->file('archivo');
        $path = $file->store('formato-archivos', 'public');

        $archivo = FormatoArchivo::create([
            'empresa_id'         => $request->user()->empresa_id,
            'subido_por'         => $request->user()->id,
            'nombre'             => $validated['nombre'],
            'descripcion'        => $validated['descripcion'] ?? null,
            'categoria'          => $validated['categoria'],
            'tipo_registro'      => $validated['tipo_registro'] ?? null,
            'version'            => $validated['version'] ?? 'v1.0',
            'archivo_path'       => $path,
            'archivo_nombre_orig'=> $file->getClientOriginalName(),
            'archivo_extension'  => strtolower($file->getClientOriginalExtension()),
            'archivo_mime'       => $file->getMimeType(),
            'archivo_tamano'     => $file->getSize(),
        ]);

        return response()->json($archivo->load('subidoPor:id,nombres,apellidos'), 201);
    }

    /** GET /api/formato-archivos/{id} */
    public function show(Request $request, int $id): JsonResponse
    {
        $archivo = FormatoArchivo::where('empresa_id', $request->user()->empresa_id)
            ->with('subidoPor:id,nombres,apellidos')
            ->findOrFail($id);

        return response()->json($archivo);
    }

    /** PUT /api/formato-archivos/{id} */
    public function update(Request $request, int $id): JsonResponse
    {
        $archivo = FormatoArchivo::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);

        $validated = $request->validate([
            'nombre'       => 'sometimes|string|max:250',
            'descripcion'  => 'nullable|string',
            'categoria'    => 'sometimes|in:legal,procedimiento,registro,formulario,instructivo,plantilla,otro',
            'tipo_registro'=> 'nullable|in:reg_01,reg_02,reg_03,reg_04,reg_05,reg_06,reg_07,reg_08,reg_09,reg_10',
            'version'      => 'nullable|string|max:20',
        ]);

        $archivo->update($validated);
        return response()->json($archivo);
    }

    /** DELETE /api/formato-archivos/{id} */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $archivo = FormatoArchivo::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);
        Storage::disk('public')->delete($archivo->archivo_path);
        $archivo->delete();
        return response()->json(['message' => 'Archivo eliminado correctamente']);
    }

    /** GET /api/formato-archivos/{id}/descargar — incrementa contador y devuelve URL */
    public function descargar(Request $request, int $id): JsonResponse
    {
        $archivo = FormatoArchivo::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);
        $archivo->increment('descargas');
        return response()->json([
            'url'      => $archivo->archivo_url,
            'nombre'   => $archivo->archivo_nombre_orig,
            'descargas'=> $archivo->descargas,
        ]);
    }

    /** GET /api/formato-archivos/{id}/ver — sirve el archivo inline para previsualización */
    public function ver(Request $request, int $id): mixed
    {
        $archivo = FormatoArchivo::where('empresa_id', $request->user()->empresa_id)->findOrFail($id);

        if (!Storage::disk('public')->exists($archivo->archivo_path)) {
            abort(404, 'Archivo no encontrado');
        }

        return Storage::disk('public')->response(
            $archivo->archivo_path,
            $archivo->archivo_nombre_orig
        );
    }

    /** GET /api/formato-archivos/estadisticas */
    public function estadisticas(Request $request): JsonResponse
    {
        $eId = $request->user()->empresa_id;
        $base = fn() => FormatoArchivo::where('empresa_id', $eId)->where('activo', true);

        $porCategoria = $base()
            ->selectRaw('categoria, COUNT(*) as total, SUM(archivo_tamano) as tamano')
            ->groupBy('categoria')->get();

        $porExtension = $base()
            ->selectRaw('archivo_extension, COUNT(*) as total')
            ->groupBy('archivo_extension')->orderByDesc('total')->get();

        return response()->json([
            'total'          => $base()->count(),
            'tamano_total'   => $base()->sum('archivo_tamano'),
            'total_descargas'=> $base()->sum('descargas'),
            'por_categoria'  => $porCategoria,
            'por_extension'  => $porExtension,
            'recientes'      => $base()->with('subidoPor:id,nombres,apellidos')
                                    ->orderByDesc('created_at')->limit(5)->get(),
        ]);
    }
}
