<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InspeccionRespuesta extends Model
{
    protected $table = 'inspeccion_respuestas';

    public $timestamps = false;

    protected $fillable = [
        'inspeccion_id', 'pregunta_id', 'resultado', 'nota', 'foto_path',
    ];

    public function inspeccion(): BelongsTo
    {
        return $this->belongsTo(Inspeccion::class);
    }

    public function pregunta(): BelongsTo
    {
        return $this->belongsTo(ChecklistPregunta::class, 'pregunta_id');
    }
}
