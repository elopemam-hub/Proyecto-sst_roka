<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Firma;
use App\Models\FirmaSolicitud;
use App\Services\FirmaService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class FirmaController extends Controller
{
    public function __construct(
        private FirmaService $firmaService
    ) {}

    /**
     * GET /api/firmas/pendientes — Firmas pendientes del usuario autenticado
     */
    public function pendientes(Request $request): JsonResponse
    {
        $pendientes = FirmaSolicitud::where('empresa_id', $request->user()->empresa_id)
            ->whereIn('estado', ['pendiente', 'en_proceso'])
            ->where('fecha_limite', '>', now())
            ->whereDoesntHave('firmas', function ($q) use ($request) {
                $q->where('usuario_id', $request->user()->id);
            })
            ->with(['solicitante:id,nombre'])
            ->orderBy('fecha_limite')
            ->paginate(20);

        return response()->json($pendientes);
    }

    /**
     * GET /api/firmas/solicitud/{id}
     */
    public function showSolicitud(Request $request, int $id): JsonResponse
    {
        $solicitud = FirmaSolicitud::where('empresa_id', $request->user()->empresa_id)
            ->with(['firmas.usuario:id,nombre', 'solicitante:id,nombre', 'flujo.firmantes'])
            ->findOrFail($id);

        return response()->json($solicitud);
    }

    /**
     * POST /api/firmas/firmar — Registrar firma digital
     */
    public function firmar(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'solicitud_id'     => 'nullable|exists:firmas_solicitudes,id',
            'documento_tipo'   => 'required|string',
            'documento_id'     => 'required|integer',
            'accion'           => 'required|in:elabora,revisa,aprueba,recibe,ejecuta,acepta',
            'metodo'           => 'required|in:canvas,pin,totp,biometrico',
            'firma_imagen'     => 'nullable|string',
            'token_2fa'        => 'nullable|string',
            'observaciones'    => 'nullable|string|max:500',
            'geolocalizacion'  => 'nullable|array',
            'dispositivo'      => 'nullable|string|max:100',
        ]);

        // Resolver el modelo del documento
        $claseDoc = $validated['documento_tipo'];
        if (!class_exists($claseDoc)) {
            return response()->json(['message' => 'Tipo de documento no válido.'], 422);
        }

        $documento = $claseDoc::findOrFail($validated['documento_id']);

        // Verificar que pertenezca a la misma empresa
        if (method_exists($documento, 'empresa_id') || isset($documento->empresa_id)) {
            if ($documento->empresa_id !== $request->user()->empresa_id) {
                return response()->json(['message' => 'No tiene permiso para firmar este documento.'], 403);
            }
        }

        // Solicitud (si existe)
        $solicitud = null;
        if ($validated['solicitud_id']) {
            $solicitud = FirmaSolicitud::where('empresa_id', $request->user()->empresa_id)
                ->findOrFail($validated['solicitud_id']);
        }

        try {
            $firma = $this->firmaService->registrarFirma(
                solicitud: $solicitud,
                documento: $documento,
                usuario: $request->user(),
                accion: $validated['accion'],
                metodo: $validated['metodo'],
                request: $request,
                firmaImagenBase64: $validated['firma_imagen'] ?? null,
                token2fa: $validated['token_2fa'] ?? null,
                observaciones: $validated['observaciones'] ?? null,
            );

            return response()->json([
                'message'      => 'Firma registrada correctamente.',
                'firma'        => $firma,
                'hash'         => $firma->hash_firma,
                'timestamp'    => $firma->firmado_en->toIso8601String(),
            ], 201);

        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    /**
     * POST /api/firmas/rechazar — Rechazar una solicitud de firma
     */
    public function rechazar(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'solicitud_id' => 'required|exists:firmas_solicitudes,id',
            'motivo'       => 'required|string|min:10|max:500',
        ]);

        $solicitud = FirmaSolicitud::where('empresa_id', $request->user()->empresa_id)
            ->findOrFail($validated['solicitud_id']);

        $this->firmaService->rechazarFirma(
            solicitud: $solicitud,
            usuario: $request->user(),
            motivo: $validated['motivo'],
            request: $request
        );

        return response()->json(['message' => 'Firma rechazada.']);
    }

    /**
     * GET /api/firmas/documento/{tipo}/{id} — Todas las firmas de un documento
     */
    public function firmasDocumento(string $tipo, int $id): JsonResponse
    {
        // Decodificar tipo (url-safe)
        $tipoClase = str_replace('_', '\\', $tipo);

        $firmas = Firma::where('documento_tipo', $tipoClase)
            ->where('documento_id', $id)
            ->where('rechazada', false)
            ->with('usuario:id,nombre,email')
            ->orderBy('firmado_en')
            ->get();

        return response()->json($firmas);
    }

    /**
     * GET /api/firmas/{id}/verificar — Verificar integridad de una firma
     */
    public function verificar(int $id): JsonResponse
    {
        $firma = Firma::findOrFail($id);

        // Obtener el documento actual
        $claseDoc = $firma->documento_tipo;
        if (!class_exists($claseDoc)) {
            return response()->json(['valida' => false, 'motivo' => 'Tipo de documento no existe'], 200);
        }

        $documento = $claseDoc::find($firma->documento_id);

        if (!$documento) {
            return response()->json([
                'valida' => false,
                'motivo' => 'El documento ha sido eliminado',
            ]);
        }

        $valida = $this->firmaService->verificarIntegridad($firma, $documento);

        return response()->json([
            'valida'     => $valida,
            'hash_firma' => $firma->hash_firma,
            'firmado_en' => $firma->firmado_en,
            'firmante'   => $firma->firmante_nombre,
            'motivo'     => $valida ? 'Firma válida' : 'El documento ha sido modificado',
        ]);
    }

    /**
     * GET /api/firmas/log — Log de eventos de firma
     */
    public function log(Request $request): JsonResponse
    {
        $log = DB::table('firmas_log')
            ->leftJoin('usuarios', 'firmas_log.usuario_id', '=', 'usuarios.id')
            ->select('firmas_log.*', 'usuarios.nombre as usuario_nombre')
            ->orderByDesc('firmas_log.creado_en')
            ->paginate(50);

        return response()->json($log);
    }
}
