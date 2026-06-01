<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class FirmaSolicitud extends Model
{
    protected $table = 'firmas_solicitudes';

    protected $fillable = [
        'empresa_id',
        'flujo_id',
        'documento_tipo',
        'documento_id',
        'documento_codigo',
        'documento_titulo',
        'hash_documento',
        'snapshot_datos',
        'estado',
        'solicitada_en',
        'fecha_limite',
        'completada_en',
        'solicitada_por',
    ];

    protected $casts = [
        'snapshot_datos' => 'array',
        'solicitada_en'  => 'datetime',
        'fecha_limite'   => 'datetime',
        'completada_en'  => 'datetime',
    ];

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    public function flujo(): BelongsTo
    {
        return $this->belongsTo(FirmaFlujo::class, 'flujo_id');
    }

    public function solicitante(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'solicitada_por');
    }

    public function documento(): MorphTo
    {
        return $this->morphTo('documento', 'documento_tipo', 'documento_id');
    }

    public function firmas(): HasMany
    {
        return $this->hasMany(Firma::class, 'solicitud_id');
    }

    public function getEstaVencidaAttribute(): bool
    {
        return $this->fecha_limite
            && $this->fecha_limite->isPast()
            && $this->estado === 'pendiente';
    }

    public function getTotalFirmasAttribute(): int
    {
        return $this->firmas()->where('rechazada', false)->count();
    }
}
