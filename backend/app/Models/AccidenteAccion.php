<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AccidenteAccion extends Model
{
    protected $table = 'accidentes_acciones';

    protected $fillable = [
        'accidente_id',
        'tipo', 'descripcion',
        'responsable_id', 'fecha_limite',
        'estado',
        'evidencia_path', 'observaciones',
        'completada_en', 'verificado_por',
    ];

    protected $casts = [
        'fecha_limite'  => 'date',
        'completada_en' => 'datetime',
    ];

    public function accidente(): BelongsTo   { return $this->belongsTo(Accidente::class); }
    public function responsable(): BelongsTo { return $this->belongsTo(Personal::class, 'responsable_id'); }
    public function verificador(): BelongsTo { return $this->belongsTo(Usuario::class, 'verificado_por'); }

    public function getEstaVencidaAttribute(): bool
    {
        return $this->fecha_limite->isPast()
            && !in_array($this->estado, ['completada']);
    }
}
