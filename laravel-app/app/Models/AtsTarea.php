<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AtsTarea extends Model
{
    protected $table = 'ats_tareas';

    protected $fillable = [
        'ats_id',
        'orden',
        'descripcion_tarea',
        'peligros_asociados',
        'medidas_control',
        'estado_ejecucion',
        'observaciones',
        'evidencia_foto',
        'geo_lat',
        'geo_lng',
        'ejecutada_en',
    ];

    protected $casts = [
        'ejecutada_en' => 'datetime',
    ];

    public function ats(): BelongsTo
    {
        return $this->belongsTo(Ats::class);
    }

    public function peligros(): HasMany
    {
        return $this->hasMany(AtsPeligro::class, 'ats_tarea_id');
    }

    public function controles(): HasMany
    {
        return $this->hasMany(AtsControl::class, 'ats_tarea_id');
    }
}
