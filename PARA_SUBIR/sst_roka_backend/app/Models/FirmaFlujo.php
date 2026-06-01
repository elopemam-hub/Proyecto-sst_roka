<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FirmaFlujo extends Model
{
    use SoftDeletes;

    protected $table = 'firmas_flujos';

    protected $fillable = [
        'empresa_id',
        'nombre',
        'modulo',
        'tipo_documento',
        'descripcion',
        'activo',
        'secuencial',
        'dias_limite',
    ];

    protected $casts = [
        'activo'     => 'boolean',
        'secuencial' => 'boolean',
    ];

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    public function firmantes(): HasMany
    {
        return $this->hasMany(FirmaFlujoFirmante::class, 'flujo_id')->orderBy('orden');
    }

    public function solicitudes(): HasMany
    {
        return $this->hasMany(FirmaSolicitud::class, 'flujo_id');
    }
}
