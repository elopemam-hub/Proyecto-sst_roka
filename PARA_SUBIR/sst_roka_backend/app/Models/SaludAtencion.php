<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SaludAtencion extends Model
{
    protected $table = 'salud_atenciones';

    protected $fillable = [
        'empresa_id', 'personal_id', 'fecha', 'tipo',
        'descripcion', 'tratamiento', 'derivado_a',
        'baja_laboral', 'dias_descanso', 'observaciones', 'atendido_por',
    ];

    protected $casts = [
        'fecha'         => 'datetime',
        'baja_laboral'  => 'boolean',
        'dias_descanso' => 'integer',
    ];

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    public function personal(): BelongsTo
    {
        return $this->belongsTo(Personal::class);
    }
}
