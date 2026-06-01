<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProgramaSstActividad extends Model
{
    protected $table = 'programa_sst_actividades';

    protected $fillable = [
        'programa_id', 'objetivo', 'descripcion', 'responsable_id',
        'fecha_inicio', 'fecha_fin', 'presupuesto', 'avance',
        'estado', 'evidencia_path', 'observaciones',
    ];

    protected $casts = [
        'fecha_inicio' => 'date',
        'fecha_fin'    => 'date',
        'presupuesto'  => 'decimal:2',
        'avance'       => 'integer',
    ];

    public function programa(): BelongsTo
    {
        return $this->belongsTo(ProgramaSst::class, 'programa_id');
    }

    public function responsable(): BelongsTo
    {
        return $this->belongsTo(Personal::class, 'responsable_id');
    }
}
