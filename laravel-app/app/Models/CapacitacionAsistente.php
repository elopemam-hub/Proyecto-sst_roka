<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CapacitacionAsistente extends Model
{
    protected $table = 'capacitacion_asistentes';

    protected $fillable = [
        'capacitacion_id', 'personal_id', 'asistio', 'hora_ingreso',
        'hora_salida', 'nota_evaluacion', 'aprobado', 'firma_path',
        'observaciones',
    ];

    protected $casts = [
        'asistio'          => 'boolean',
        'nota_evaluacion'  => 'decimal:2',
        'aprobado'         => 'boolean',
    ];

    public function capacitacion(): BelongsTo
    {
        return $this->belongsTo(Capacitacion::class);
    }

    public function personal(): BelongsTo
    {
        return $this->belongsTo(Personal::class);
    }
}
