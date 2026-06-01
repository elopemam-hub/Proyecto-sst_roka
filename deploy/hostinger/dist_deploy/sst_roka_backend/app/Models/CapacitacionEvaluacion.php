<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CapacitacionEvaluacion extends Model
{
    protected $table = 'capacitacion_evaluaciones';

    protected $fillable = [
        'empresa_id', 'capacitacion_id', 'titulo', 'preguntas',
        'nota_minima_aprobacion', 'activa',
    ];

    protected $casts = [
        'preguntas'               => 'array',
        'nota_minima_aprobacion'  => 'decimal:2',
        'activa'                  => 'boolean',
    ];

    public function capacitacion(): BelongsTo
    {
        return $this->belongsTo(Capacitacion::class);
    }

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }
}
