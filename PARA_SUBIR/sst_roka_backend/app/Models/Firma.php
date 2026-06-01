<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

/**
 * Módulo transversal de firmas digitales
 * Se integra polimórficamente con cualquier modelo que requiera firma
 */
class Firma extends Model
{
    protected $table = 'firmas';

    // Las firmas son INMUTABLES — no se permite actualizar ni eliminar
    public $timestamps = true;

    protected $fillable = [
        'solicitud_id', 'usuario_id',
        'documento_tipo', 'documento_id',
        'firmante_nombre', 'firmante_dni', 'firmante_cargo', 'firmante_rol',
        'accion_firma', 'metodo_firma',
        'firma_imagen_path', 'firma_imagen_hash',
        'hash_documento_firmado', 'hash_firma',
        'ip', 'user_agent', 'geolocalizacion', 'dispositivo',
        'firmado_en', 'sello_tiempo',
        'verificado_2fa', 'token_2fa_usado',
        'observaciones', 'rechazada', 'motivo_rechazo',
    ];

    protected $casts = [
        'firmado_en'        => 'datetime',
        'verificado_2fa'    => 'boolean',
        'rechazada'         => 'boolean',
        'geolocalizacion'   => 'array',
    ];

    // Relaciones
    public function solicitud(): BelongsTo { return $this->belongsTo(FirmaSolicitud::class, 'solicitud_id'); }
    public function usuario(): BelongsTo   { return $this->belongsTo(Usuario::class); }
    public function documento(): MorphTo   { return $this->morphTo(); }

    // URL de la imagen de firma
    public function getFirmaImagenUrlAttribute(): ?string
    {
        return $this->firma_imagen_path ? asset('storage/' . $this->firma_imagen_path) : null;
    }

    // Verificar integridad
    public function verificarIntegridad(string $hashActual): bool
    {
        return hash_equals($this->hash_documento_firmado, $hashActual);
    }

    // Bloquear modificación
    protected static function booted(): void
    {
        static::updating(function () {
            throw new \Exception('Las firmas son inmutables y no pueden modificarse.');
        });

        static::deleting(function () {
            throw new \Exception('Las firmas no pueden eliminarse por ley de no repudio.');
        });
    }
}
