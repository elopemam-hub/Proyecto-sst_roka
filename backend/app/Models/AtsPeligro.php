<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AtsPeligro extends Model
{
    protected $table = 'ats_peligros';

    protected $fillable = [
        'ats_tarea_id',
        'tipo_peligro',
        'descripcion',
        'riesgo',
        'severidad',
    ];

    public function tarea(): BelongsTo
    {
        return $this->belongsTo(AtsTarea::class, 'ats_tarea_id');
    }
}
