<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SimulacroParticipante extends Model
{
    protected $table = 'simulacro_participantes';

    protected $fillable = [
        'simulacro_id', 'personal_id', 'rol', 'asistio', 'observaciones',
    ];

    protected $casts = [
        'asistio' => 'boolean',
    ];

    public function simulacro(): BelongsTo
    {
        return $this->belongsTo(Simulacro::class);
    }

    public function personal(): BelongsTo
    {
        return $this->belongsTo(Personal::class);
    }
}
