<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SimulacroEvaluacion extends Model
{
    protected $table = 'simulacro_evaluacion';

    protected $fillable = [
        'simulacro_id', 'criterio', 'calificacion', 'observacion', 'evaluado_por',
    ];

    protected $casts = [
        'calificacion' => 'integer',
    ];

    public function simulacro(): BelongsTo
    {
        return $this->belongsTo(Simulacro::class);
    }
}
