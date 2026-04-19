<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class InspeccionItem extends Model
{
    protected $table = 'inspecciones_items';

    protected $fillable = [
        'inspeccion_id',
        'numero_item', 'categoria', 'descripcion',
        'es_critico', 'aplica',
        'resultado', 'puntaje_maximo', 'puntaje_obtenido',
        'evidencia_path', 'observaciones',
    ];

    protected $casts = [
        'es_critico' => 'boolean',
        'aplica'     => 'boolean',
    ];

    public function inspeccion(): BelongsTo { return $this->belongsTo(Inspeccion::class); }
    public function hallazgo(): HasOne      { return $this->hasOne(InspeccionHallazgo::class, 'inspeccion_item_id'); }

    public function getEsConformeAttribute(): bool
    {
        return $this->resultado === 'conforme';
    }
}
