<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class IpercProceso extends Model
{
    protected $table = 'iperc_procesos';

    protected $fillable = [
        'iperc_id',
        'proceso',
        'actividad',
        'tarea',
        'tipo_actividad',
        'orden',
    ];

    public function iperc(): BelongsTo
    {
        return $this->belongsTo(Iperc::class);
    }

    public function peligros(): HasMany
    {
        return $this->hasMany(IpercPeligro::class, 'iperc_proceso_id');
    }
}
