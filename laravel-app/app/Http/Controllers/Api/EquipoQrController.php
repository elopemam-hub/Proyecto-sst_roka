<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Equipo;
use App\Models\QrScan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EquipoQrController extends Controller
{
    /**
     * GET /api/equipos/{id}/qr-data
     * Obtiene datos para generar QR del equipo
     */
    public function qrData(Request $request, int $id): JsonResponse
    {
        $equipo = Equipo::with(['equipoCatalogo:id,nombre', 'area:id,nombre'])
            ->where('empresa_id', $request->user()->empresa_id)
            ->findOrFail($id);

        // URL base del sistema
        $appUrl = config('app.url');

        // URL landing del QR (sin autenticación)
        $qrUrl = "{$appUrl}/qr/{$equipo->codigo}";

        return response()->json([
            'equipo_id'   => $equipo->id,
            'codigo'      => $equipo->codigo,
            'nombre'      => $equipo->nombre,
            'catalogo'    => $equipo->equipoCatalogo?->nombre,
            'area'        => $equipo->area?->nombre,
            'qr_url'      => $qrUrl,
            'qr_text'     => $qrUrl, // Texto que va en el QR
        ]);
    }

    /**
     * GET /api/equipos/batch-qr-data
     * Obtiene datos QR de múltiples equipos
     */
    public function batchQrData(Request $request): JsonResponse
    {
        $request->validate([
            'equipo_ids' => 'required|array',
            'equipo_ids.*' => 'integer|exists:equipos,id',
        ]);

        $equipos = Equipo::with(['equipoCatalogo:id,nombre', 'area:id,nombre'])
            ->where('empresa_id', $request->user()->empresa_id)
            ->whereIn('id', $request->equipo_ids)
            ->get();

        $appUrl = config('app.url');

        $data = $equipos->map(function ($equipo) use ($appUrl) {
            return [
                'equipo_id' => $equipo->id,
                'codigo'    => $equipo->codigo,
                'nombre'    => $equipo->nombre,
                'catalogo'  => $equipo->equipoCatalogo?->nombre,
                'area'      => $equipo->area?->nombre,
                'qr_url'    => "{$appUrl}/qr/{$equipo->codigo}",
            ];
        });

        return response()->json($data);
    }

    /**
     * GET /api/qr/{codigo}
     * Resuelve código de equipo a datos completos (sin autenticación)
     */
    public function resolverCodigo(string $codigo): JsonResponse
    {
        $equipo = Equipo::with([
            'area:id,nombre',
            'plantillas:id,nombre,codigo,frecuencia_inspeccion',
        ])
        ->where('codigo', $codigo)
        ->first();

        if (!$equipo) {
            return response()->json([
                'error' => 'Equipo no encontrado',
                'codigo' => $codigo,
            ], 404);
        }

        // Plantillas con su frecuencia desde el pivot (una por tipo de inspección)
        $plantillas = $equipo->plantillas->map(fn($p) => [
            'id'          => $p->id,
            'nombre'      => $p->nombre,
            'codigo'      => $p->codigo,
            'frecuencia'  => $p->pivot->frecuencia_inspeccion,
            'url'         => "/inspecciones/checklist/nueva?catalogo_id={$p->id}&equipo_id={$equipo->id}",
        ])->sortBy(fn($p) => match($p['frecuencia']) {
            'diaria' => 1, 'semanal' => 2, 'mensual' => 3,
            'trimestral' => 4, 'semestral' => 5, 'anual' => 6, default => 9,
        })->values();

        return response()->json([
            'equipo_id'  => $equipo->id,
            'codigo'     => $equipo->codigo,
            'nombre'     => $equipo->nombre,
            'area'       => $equipo->area?->nombre,
            'estado'     => $equipo->estado,
            'empresa_id' => $equipo->empresa_id,
            'plantillas' => $plantillas,

            'acciones' => [
                'ver_ficha' => "/equipos/{$equipo->id}",
                'historial' => "/equipos/{$equipo->id}/historial",
            ],
        ]);
    }

    /**
     * POST /api/qr/registrar-escaneo
     * Registra un escaneo de QR (sin autenticación)
     */
    public function registrarEscaneo(Request $request)
    {
        $validated = $request->validate([
            'equipo_id'        => 'required|exists:equipos,id',
            'latitud'          => 'nullable|numeric|between:-90,90',
            'longitud'         => 'nullable|numeric|between:-180,180',
            'precision_metros' => 'nullable|integer|min:0',
            'accion'           => 'nullable|in:visualizar,inspeccionar,ver_ficha,ver_historial',
        ]);

        $scan = QrScan::create([
            'equipo_id'        => $validated['equipo_id'],
            'usuario_id'       => $request->user()?->id,
            'ip'               => $request->ip(),
            'user_agent'       => $request->userAgent(),
            'latitud'          => $validated['latitud'] ?? null,
            'longitud'         => $validated['longitud'] ?? null,
            'precision_metros' => $validated['precision_metros'] ?? null,
            'accion'           => $validated['accion'] ?? 'visualizar',
            'escaneado_en'     => now(),
        ]);

        return response()->json([
            'success' => true,
            'scan_id' => $scan->id,
        ]);
    }

    /**
     * GET /api/equipos/{id}/qr-estadisticas
     * Obtiene estadísticas de escaneos QR de un equipo
     */
    public function estadisticasQr(Request $request, int $id): JsonResponse
    {
        $equipo = Equipo::where('empresa_id', $request->user()->empresa_id)
            ->findOrFail($id);

        $stats = [
            'total_escaneos'   => QrScan::where('equipo_id', $id)->count(),
            'ultimos_30_dias'  => QrScan::where('equipo_id', $id)
                ->where('escaneado_en', '>=', now()->subDays(30))
                ->count(),
            'ultimos_7_dias'   => QrScan::where('equipo_id', $id)
                ->where('escaneado_en', '>=', now()->subDays(7))
                ->count(),
            'hoy'              => QrScan::where('equipo_id', $id)
                ->whereDate('escaneado_en', today())
                ->count(),

            'por_accion' => QrScan::where('equipo_id', $id)
                ->select('accion', DB::raw('count(*) as total'))
                ->groupBy('accion')
                ->pluck('total', 'accion'),

            'ultimos_escaneos' => QrScan::where('equipo_id', $id)
                ->with('usuario:id,nombre,email')
                ->orderBy('escaneado_en', 'desc')
                ->limit(10)
                ->get()
                ->map(fn($scan) => [
                    'id'           => $scan->id,
                    'usuario'      => $scan->usuario?->nombre ?? 'Anónimo',
                    'accion'       => $scan->accion,
                    'latitud'      => $scan->latitud,
                    'longitud'     => $scan->longitud,
                    'escaneado_en' => $scan->escaneado_en->format('d/m/Y H:i'),
                ]),
        ];

        return response()->json($stats);
    }

    /**
     * GET /api/equipos/{id}/ultimas-inspecciones
     * Obtiene últimas inspecciones del equipo (para mostrar en QR landing)
     */
    public function ultimasInspecciones(int $id): JsonResponse
    {
        $inspecciones = DB::table('inspecciones')
            ->where('equipo_id', $id)
            ->whereIn('estado', ['ejecutada', 'con_hallazgos', 'cerrada'])
            ->orderBy('ejecutada_en', 'desc')
            ->limit(5)
            ->get(['id', 'estado', 'ejecutada_en', 'tipo']);

        return response()->json($inspecciones);
    }
}
