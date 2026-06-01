<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AtsControl extends Model
{
    protected $table = 'ats_controles';

    protected $fillable = [
        'ats_tarea_id',
        'tipo_control',
        'descripcion',
        'implementado',
    ];

    protected $casts = [
        'implementado' => 'boolean',
    ];

    public function tarea(): BelongsTo
    {
        return $this->belongsTo(AtsTarea::class, 'ats_tarea_id');
    }
}
