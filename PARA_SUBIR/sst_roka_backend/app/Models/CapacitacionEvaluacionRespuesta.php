<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CapacitacionEvaluacionRespuesta extends Model
{
    protected $table = 'capacitacion_evaluacion_respuestas';

    protected $fillable = [
        'evaluacion_id', 'personal_id', 'respuestas',
        'puntaje', 'aprobado', 'completado_en',
    ];

    protected $casts = [
        'respuestas'    => 'array',
        'puntaje'       => 'decimal:2',
        'aprobado'      => 'boolean',
        'completado_en' => 'datetime',
    ];

    public function evaluacion(): BelongsTo { return $this->belongsTo(CapacitacionEvaluacion::class); }
    public function personal(): BelongsTo  { return $this->belongsTo(Personal::class); }
}
