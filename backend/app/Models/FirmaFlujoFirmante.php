<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FirmaFlujoFirmante extends Model
{
    protected $table = 'firmas_flujo_firmantes';

    protected $fillable = [
        'flujo_id',
        'orden',
        'tipo_firmante',
        'valor_firmante',
        'accion',
        'es_obligatorio',
    ];

    protected $casts = [
        'es_obligatorio' => 'boolean',
    ];

    public function flujo(): BelongsTo
    {
        return $this->belongsTo(FirmaFlujo::class, 'flujo_id');
    }
}
