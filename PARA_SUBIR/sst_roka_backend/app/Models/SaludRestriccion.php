<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SaludRestriccion extends Model
{
    protected $table = 'salud_restricciones';

    protected $fillable = [
        'empresa_id', 'personal_id', 'emo_id', 'area_id',
        'descripcion', 'tipo_restriccion', 'fecha_inicio',
        'fecha_fin', 'activa', 'observaciones',
    ];

    protected $casts = [
        'fecha_inicio' => 'date',
        'fecha_fin'    => 'date',
        'activa'       => 'boolean',
    ];

    public function personal(): BelongsTo
    {
        return $this->belongsTo(Personal::class);
    }

    public function emo(): BelongsTo
    {
        return $this->belongsTo(Emo::class, 'emo_id');
    }

    public function area(): BelongsTo
    {
        return $this->belongsTo(Area::class);
    }
}
