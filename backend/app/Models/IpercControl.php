<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IpercControl extends Model
{
    protected $table = 'iperc_controles';

    protected $fillable = [
        'iperc_peligro_id',
        'tipo_control',
        'descripcion',
        'responsable_id',
        'fecha_implementacion',
        'estado_implementacion',
        'costo_estimado',
        'evidencia_path',
    ];

    protected $casts = [
        'fecha_implementacion' => 'date',
        'costo_estimado'       => 'decimal:2',
    ];

    public function peligro(): BelongsTo
    {
        return $this->belongsTo(IpercPeligro::class, 'iperc_peligro_id');
    }

    public function responsable(): BelongsTo
    {
        return $this->belongsTo(Personal::class, 'responsable_id');
    }
}
