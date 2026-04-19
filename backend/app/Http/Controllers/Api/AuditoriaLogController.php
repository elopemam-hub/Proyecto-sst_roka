<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditoriaLog;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class AuditoriaLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = AuditoriaLog::where('empresa_id', $request->user()->empresa_id)
            ->with('usuario:id,nombres,apellidos,email');

        if ($request->filled('usuario_id'))  $query->where('usuario_id', $request->usuario_id);
        if ($request->filled('modulo'))      $query->where('modulo', $request->modulo);
        if ($request->filled('accion'))      $query->where('accion', $request->accion);
        if ($request->filled('fecha_desde')) $query->where('created_at', '>=', $request->fecha_desde);
        if ($request->filled('fecha_hasta')) $query->where('created_at', '<=', $request->fecha_hasta . ' 23:59:59');
        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(fn($q) =>
                $q->where('descripcion', 'like', "%{$s}%")
                  ->orWhere('modulo', 'like', "%{$s}%")
            );
        }

        return response()->json(
            $query->orderByDesc('created_at')->paginate(min($request->integer('per_page', 25), 100))
        );
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $log = AuditoriaLog::where('empresa_id', $request->user()->empresa_id)
            ->with('usuario:id,nombres,apellidos,email')
            ->findOrFail($id);
        return response()->json($log);
    }
}
