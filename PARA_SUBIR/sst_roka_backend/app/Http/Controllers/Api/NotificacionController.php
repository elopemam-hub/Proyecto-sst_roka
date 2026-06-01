<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notificacion;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Carbon\Carbon;

class NotificacionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Notificacion::where('usuario_id', $request->user()->id)
            ->orderByDesc('created_at');

        if ($request->filled('leida'))  $query->where('leida', (bool) $request->leida);
        if ($request->filled('modulo')) $query->where('modulo', $request->modulo);

        return response()->json($query->paginate(min($request->integer('per_page', 20), 50)));
    }

    public function conteo(Request $request): JsonResponse
    {
        $count = Notificacion::where('usuario_id', $request->user()->id)
            ->where('leida', false)->count();
        return response()->json(['total' => $count]);
    }

    public function marcarLeida(Request $request, int $id): JsonResponse
    {
        $notif = Notificacion::where('usuario_id', $request->user()->id)->findOrFail($id);
        $notif->update(['leida' => true, 'leida_en' => Carbon::now()]);
        return response()->json($notif);
    }

    public function marcarTodasLeidas(Request $request): JsonResponse
    {
        Notificacion::where('usuario_id', $request->user()->id)
            ->where('leida', false)
            ->update(['leida' => true, 'leida_en' => Carbon::now()]);
        return response()->json(['message' => 'Todas marcadas como leídas']);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $notif = Notificacion::where('usuario_id', $request->user()->id)->findOrFail($id);
        $notif->delete();
        return response()->json(['message' => 'Notificación eliminada']);
    }
}
