<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Equipo;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class EquipoPdfController extends Controller
{
    /**
     * GET /api/print/equipo/{id}/etiqueta
     * Genera HTML para imprimir etiqueta con QR (PÚBLICO - sin autenticación)
     */
    public function etiquetaPublica(int $id)
    {
        $equipo = Equipo::with(['equipoCatalogo:id,nombre,frecuencia_inspeccion', 'area:id,nombre'])
            ->findOrFail($id);

        $appUrl = config('app.url');
        $qrUrl = "{$appUrl}/qr/{$equipo->codigo}";

        // Generar QR usando API pública
        $qrImageUrl = "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=" . urlencode($qrUrl);

        return view('pdf.etiqueta-equipo', [
            'equipo' => $equipo,
            'qrUrl' => $qrUrl,
            'qrImageUrl' => $qrImageUrl,
        ]);
    }

    /**
     * GET /api/equipos/{id}/etiqueta
     * Genera HTML para imprimir etiqueta con QR (requiere autenticación)
     */
    public function etiquetaHtml(Request $request, int $id)
    {
        $equipo = Equipo::with(['equipoCatalogo:id,nombre,frecuencia_inspeccion', 'area:id,nombre'])
            ->where('empresa_id', $request->user()->empresa_id)
            ->findOrFail($id);

        $appUrl = config('app.url');
        $qrUrl = "{$appUrl}/qr/{$equipo->codigo}";

        // Generar QR usando API pública
        $qrImageUrl = "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=" . urlencode($qrUrl);

        return view('pdf.etiqueta-equipo', [
            'equipo' => $equipo,
            'qrUrl' => $qrUrl,
            'qrImageUrl' => $qrImageUrl,
        ]);
    }

    /**
     * GET /api/equipos/etiquetas-batch
     * Genera HTML para imprimir múltiples etiquetas
     */
    public function etiquetasBatchHtml(Request $request)
    {
        $request->validate([
            'equipo_ids' => 'required|array',
            'equipo_ids.*' => 'integer|exists:equipos,id',
        ]);

        $equipos = Equipo::with(['equipoCatalogo:id,nombre,frecuencia_inspeccion', 'area:id,nombre'])
            ->where('empresa_id', $request->user()->empresa_id)
            ->whereIn('id', $request->equipo_ids)
            ->get();

        $appUrl = config('app.url');

        $equiposConQr = $equipos->map(function ($equipo) use ($appUrl) {
            $qrUrl = "{$appUrl}/qr/{$equipo->codigo}";
            return [
                'equipo' => $equipo,
                'qrUrl' => $qrUrl,
                'qrImageUrl' => "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=" . urlencode($qrUrl),
            ];
        });

        return view('pdf.etiquetas-batch', [
            'equipos' => $equiposConQr,
        ]);
    }

    /**
     * GET /api/equipos/todas-etiquetas
     * Genera etiquetas de todos los equipos activos (por catálogo opcional)
     */
    public function todasEtiquetasHtml(Request $request)
    {
        $query = Equipo::with(['equipoCatalogo:id,nombre,frecuencia_inspeccion', 'area:id,nombre'])
            ->where('empresa_id', $request->user()->empresa_id)
            ->where('estado', 'operativo');

        if ($request->filled('catalogo_id')) {
            $query->where('equipo_catalogo_id', $request->catalogo_id);
        }

        $equipos = $query->orderBy('codigo')->get();

        $appUrl = config('app.url');

        $equiposConQr = $equipos->map(function ($equipo) use ($appUrl) {
            $qrUrl = "{$appUrl}/qr/{$equipo->codigo}";
            return [
                'equipo' => $equipo,
                'qrUrl' => $qrUrl,
                'qrImageUrl' => "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=" . urlencode($qrUrl),
            ];
        });

        return view('pdf.etiquetas-batch', [
            'equipos' => $equiposConQr,
        ]);
    }
}
