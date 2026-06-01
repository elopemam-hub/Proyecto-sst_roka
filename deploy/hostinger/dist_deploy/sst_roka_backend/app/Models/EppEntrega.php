<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EppEntrega extends Model
{
    protected $table = 'epps_entregas';

    protected $fillable = [
        'empresa_id', 'personal_id', 'inventario_id', 'cantidad',
        'fecha_entrega', 'fecha_devolucion', 'fecha_vencimiento',
        'motivo_entrega', 'estado', 'firmado_en', 'firma_path',
        'observaciones', 'entregado_por',
    ];

    protected $casts = [
        'fecha_entrega'     => 'date',
        'fecha_devolucion'  => 'date',
        'fecha_vencimiento' => 'date',
        'firmado_en'        => 'datetime',
        'cantidad'          => 'integer',
    ];

    protected $appends = ['esta_vencida'];

    public function personal(): BelongsTo
    {
        return $this->belongsTo(Personal::class);
    }

    public function inventario(): BelongsTo
    {
        return $this->belongsTo(EppInventario::class, 'inventario_id');
    }

    public function entregadoPor(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'entregado_por');
    }

    public function getEstaVencidaAttribute(): bool
    {
        return $this->fecha_vencimiento !== null
            && $this->fecha_vencimiento->isPast()
            && $this->estado === 'entregado';
    }
}
