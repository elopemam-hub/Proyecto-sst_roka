<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InspeccionHallazgo extends Model
{
    protected $table = 'inspecciones_hallazgos';

    protected $fillable = [
        'inspeccion_id', 'inspeccion_item_id',
        'numero_hallazgo', 'descripcion',
        'tipo', 'criticidad',
        'area_id', 'responsable_id', 'fecha_limite_correccion',
        'estado',
        'evidencia_antes_path', 'evidencia_despues_path',
        'observaciones', 'accion_seguimiento_id',
    ];

    protected $casts = [
        'fecha_limite_correccion' => 'date',
    ];

    public function inspeccion(): BelongsTo   { return $this->belongsTo(Inspeccion::class); }
    public function item(): BelongsTo         { return $this->belongsTo(InspeccionItem::class, 'inspeccion_item_id'); }
    public function area(): BelongsTo         { return $this->belongsTo(Area::class); }
    public function responsable(): BelongsTo  { return $this->belongsTo(Personal::class, 'responsable_id'); }
    public function accion(): BelongsTo       { return $this->belongsTo(AccionSeguimiento::class, 'accion_seguimiento_id'); }

    public function getEstaVencidoAttribute(): bool
    {
        return $this->fecha_limite_correccion
            && $this->fecha_limite_correccion->isPast()
            && !in_array($this->estado, ['subsanado', 'verificado']);
    }
}
