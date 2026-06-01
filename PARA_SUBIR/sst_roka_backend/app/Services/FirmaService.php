<?php

namespace App\Services;

use App\Models\Firma;
use App\Models\FirmaSolicitud;
use App\Models\Usuario;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * Servicio central de firmas digitales
 * Maneja: creación de solicitudes, registro de firmas, verificación de integridad
 */
class FirmaService
{
    public function __construct(
        private AuditoriaService $auditoria
    ) {}

    /**
     * Crear solicitud de firma para un documento
     */
    public function crearSolicitud(
        Model    $documento,
        Usuario  $solicitadoPor,
        ?int     $flujoId = null,
        ?string  $titulo = null,
        ?int     $diasLimite = 7
    ): FirmaSolicitud {
        return DB::transaction(function () use ($documento, $solicitadoPor, $flujoId, $titulo, $diasLimite) {
            $hashDoc = $this->calcularHashDocumento($documento);

            $solicitud = FirmaSolicitud::create([
                'empresa_id'      => $solicitadoPor->empresa_id,
                'flujo_id'        => $flujoId,
                'documento_tipo'  => get_class($documento),
                'documento_id'    => $documento->id,
                'documento_codigo' => $documento->codigo ?? null,
                'documento_titulo' => $titulo ?? ($documento->titulo ?? 'Sin título'),
                'hash_documento'  => $hashDoc,
                'snapshot_datos'  => $documento->toArray(),
                'estado'          => 'pendiente',
                'fecha_limite'    => now()->addDays($diasLimite),
                'solicitada_por'  => $solicitadoPor->id,
            ]);

            // Log del evento
            DB::table('firmas_log')->insert([
                'solicitud_id' => $solicitud->id,
                'usuario_id'   => $solicitadoPor->id,
                'evento'       => 'solicitud_creada',
                'detalles'     => json_encode([
                    'documento' => $documento->codigo ?? $documento->id,
                    'flujo_id'  => $flujoId,
                ]),
                'creado_en'    => now(),
            ]);

            return $solicitud;
        });
    }

    /**
     * Registrar una firma digital
     */
    public function registrarFirma(
        ?FirmaSolicitud $solicitud,
        Model    $documento,
        Usuario  $usuario,
        string   $accion,
        string   $metodo,
        Request  $request,
        ?string  $firmaImagenBase64 = null,
        ?string  $token2fa = null,
        ?string  $observaciones = null
    ): Firma {
        return DB::transaction(function () use ($solicitud, $documento, $usuario, $accion, $metodo, $request, $firmaImagenBase64, $token2fa, $observaciones) {

            // Verificar que el documento no haya cambiado
            $hashActual = $this->calcularHashDocumento($documento);
            if ($solicitud && !hash_equals($solicitud->hash_documento, $hashActual)) {
                throw new \Exception('El documento ha sido modificado desde la solicitud de firma. Firma rechazada por integridad.');
            }

            // Verificar que el usuario no haya firmado ya este documento con la misma acción
            $yaFirmo = Firma::where('documento_tipo', get_class($documento))
                ->where('documento_id', $documento->id)
                ->where('usuario_id', $usuario->id)
                ->where('accion_firma', $accion)
                ->where('rechazada', false)
                ->exists();

            if ($yaFirmo) {
                throw new \Exception("Ya ha firmado este documento con la acción '{$accion}'.");
            }

            // Guardar imagen de firma si es canvas
            $imagenPath = null;
            $imagenHash = null;
            if ($metodo === 'canvas' && $firmaImagenBase64) {
                [$imagenPath, $imagenHash] = $this->guardarImagenFirma($firmaImagenBase64, $usuario->id);
            }

            // Generar hash único de esta firma
            $hashFirma = hash('sha256', implode('|', [
                $usuario->id,
                get_class($documento) . ':' . $documento->id,
                $accion,
                $hashActual,
                now()->toIso8601String(),
                Str::random(16),
            ]));

            // Snapshot datos del firmante (personal enlazado)
            $personal = $usuario->personal;

            $firma = Firma::create([
                'solicitud_id'           => $solicitud?->id,
                'usuario_id'             => $usuario->id,
                'documento_tipo'         => get_class($documento),
                'documento_id'           => $documento->id,
                'firmante_nombre'        => $usuario->nombre,
                'firmante_dni'           => $personal?->dni,
                'firmante_cargo'         => $personal?->cargo?->nombre,
                'firmante_rol'           => $usuario->rol,
                'accion_firma'           => $accion,
                'metodo_firma'           => $metodo,
                'firma_imagen_path'      => $imagenPath,
                'firma_imagen_hash'      => $imagenHash,
                'hash_documento_firmado' => $hashActual,
                'hash_firma'             => $hashFirma,
                'ip'                     => $request->ip(),
                'user_agent'             => substr($request->userAgent() ?? '', 0, 500),
                'geolocalizacion'        => $request->input('geolocalizacion'),
                'dispositivo'            => $request->input('dispositivo'),
                'firmado_en'             => now(),
                'verificado_2fa'         => $metodo === 'totp' && !empty($token2fa),
                'token_2fa_usado'        => $metodo === 'totp' ? $token2fa : null,
                'observaciones'          => $observaciones,
            ]);

            // Log inmutable
            DB::table('firmas_log')->insert([
                'firma_id'     => $firma->id,
                'solicitud_id' => $solicitud?->id,
                'usuario_id'   => $usuario->id,
                'evento'       => 'firma_realizada',
                'detalles'     => json_encode([
                    'accion'      => $accion,
                    'metodo'      => $metodo,
                    'hash_firma'  => $hashFirma,
                ]),
                'ip'           => $request->ip(),
                'creado_en'    => now(),
            ]);

            // Auditoría general
            $this->auditoria->registrar(
                modulo: 'firmas',
                accion: 'firma_registrada',
                usuario: $usuario,
                modelo: class_basename($documento),
                modeloId: $documento->id,
                valorNuevo: ['hash_firma' => $hashFirma, 'accion' => $accion],
                request: $request
            );

            // Si hay solicitud, verificar si se completó el flujo
            if ($solicitud) {
                $this->verificarFlujoCompleto($solicitud);
            }

            return $firma;
        });
    }

    /**
     * Rechazar una firma
     */
    public function rechazarFirma(
        FirmaSolicitud $solicitud,
        Usuario $usuario,
        string $motivo,
        Request $request
    ): void {
        DB::transaction(function () use ($solicitud, $usuario, $motivo, $request) {
            $solicitud->update(['estado' => 'rechazada']);

            DB::table('firmas_log')->insert([
                'solicitud_id' => $solicitud->id,
                'usuario_id'   => $usuario->id,
                'evento'       => 'firma_rechazada',
                'detalles'     => json_encode(['motivo' => $motivo]),
                'ip'           => $request->ip(),
                'creado_en'    => now(),
            ]);
        });
    }

    /**
     * Calcular hash SHA-256 del documento para verificar integridad
     */
    public function calcularHashDocumento(Model $documento): string
    {
        // Excluir timestamps y campos volátiles
        $datos = collect($documento->toArray())
            ->except(['updated_at', 'created_at', 'deleted_at'])
            ->sortKeys()
            ->toArray();

        return hash('sha256', json_encode($datos));
    }

    /**
     * Verificar que una firma sigue siendo válida
     */
    public function verificarIntegridad(Firma $firma, Model $documento): bool
    {
        $hashActual = $this->calcularHashDocumento($documento);
        return hash_equals($firma->hash_documento_firmado, $hashActual);
    }

    /**
     * Obtener todas las firmas pendientes para un usuario
     */
    public function firmasPendientes(Usuario $usuario): \Illuminate\Support\Collection
    {
        return FirmaSolicitud::where('empresa_id', $usuario->empresa_id)
            ->whereIn('estado', ['pendiente', 'en_proceso'])
            ->where('fecha_limite', '>', now())
            ->whereDoesntHave('firmas', function ($q) use ($usuario) {
                $q->where('usuario_id', $usuario->id);
            })
            ->with(['solicitante:id,nombre'])
            ->orderBy('fecha_limite')
            ->get()
            ->filter(fn ($s) => $this->usuarioPuedeFirmar($s, $usuario));
    }

    // --- Privados ---

    private function guardarImagenFirma(string $base64, int $usuarioId): array
    {
        // Parsear base64
        $data = $base64;
        if (str_contains($base64, ',')) {
            $data = explode(',', $base64)[1];
        }
        $binary = base64_decode($data);

        if (!$binary) {
            throw new \Exception('Imagen de firma inválida');
        }

        // Hash de la imagen
        $hash = hash('sha256', $binary);

        // Guardar
        $path = sprintf('firmas/%d/%s.png', $usuarioId, Str::uuid());
        Storage::disk('local')->put($path, $binary);

        return [$path, $hash];
    }

    private function verificarFlujoCompleto(FirmaSolicitud $solicitud): void
    {
        if (!$solicitud->flujo_id) return;

        $firmantesRequeridos = DB::table('firmas_flujo_firmantes')
            ->where('flujo_id', $solicitud->flujo_id)
            ->where('es_obligatorio', true)
            ->count();

        $firmasRealizadas = Firma::where('solicitud_id', $solicitud->id)
            ->where('rechazada', false)
            ->count();

        if ($firmasRealizadas >= $firmantesRequeridos) {
            $solicitud->update([
                'estado'         => 'completada',
                'completada_en'  => now(),
            ]);

            DB::table('firmas_log')->insert([
                'solicitud_id' => $solicitud->id,
                'evento'       => 'flujo_completado',
                'creado_en'    => now(),
            ]);
        } else {
            $solicitud->update(['estado' => 'en_proceso']);
        }
    }

    private function usuarioPuedeFirmar(FirmaSolicitud $solicitud, Usuario $usuario): bool
    {
        if (!$solicitud->flujo_id) return true;

        return DB::table('firmas_flujo_firmantes')
            ->where('flujo_id', $solicitud->flujo_id)
            ->where(function ($q) use ($usuario) {
                $q->where(function ($sub) use ($usuario) {
                    $sub->where('tipo_firmante', 'rol')->where('valor_firmante', $usuario->rol);
                })->orWhere(function ($sub) use ($usuario) {
                    $sub->where('tipo_firmante', 'usuario_especifico')->where('valor_firmante', $usuario->id);
                });
            })
            ->exists();
    }
}
