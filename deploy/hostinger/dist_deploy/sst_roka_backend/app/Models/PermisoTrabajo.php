<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PermisoTrabajo extends Model
{
    protected $table = 'permisos_trabajo';

    protected $fillable = [
        'ats_id',
        'tipo_permiso',
        'codigo_permiso',
        'fecha_validez',
        'hora_inicio_validez',
        'hora_fin_validez',
        'requisitos_cumplidos',
        'equipos_requeridos',
        'condiciones_especiales',
        'estado',
        'aprobado_por',
        'aprobado_en',
    ];

    protected $casts = [
        'fecha_validez'        => 'date',
        'aprobado_en'          => 'datetime',
        'requisitos_cumplidos' => 'array',
    ];

    public function ats(): BelongsTo
    {
        return $this->belongsTo(Ats::class);
    }

    public function aprobador(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'aprobado_por');
    }

    public function getEstaVigenteAttribute(): bool
    {
        return $this->estado === 'aprobado'
            && $this->fecha_validez->isToday();
    }
}
