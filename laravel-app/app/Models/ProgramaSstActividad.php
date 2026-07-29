<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProgramaSstActividad extends Model
{
    protected $table = 'programa_sst_actividades';

    protected $fillable = [
        'programa_id', 'elemento_id', 'numero', 'actividad',
        'meses', 'segun_corresponda',
        'meta_cantidad', 'meta_texto',
        'evidencia_texto', 'evidencia_path',
        'responsable_texto', 'responsable_id',
        'modulo_vinculado', 'filtro', 'cantidad_ejecutada', 'cumplimiento_actualizado_at',
        'estado', 'observaciones', 'orden',
    ];

    protected $casts = [
        'meses'                       => 'array',
        'filtro'                      => 'array',
        'segun_corresponda'           => 'boolean',
        'meta_cantidad'               => 'integer',
        'cantidad_ejecutada'          => 'integer',
        'orden'                       => 'integer',
        'cumplimiento_actualizado_at' => 'datetime',
    ];

    protected $appends = ['porcentaje_cumplimiento'];

    public function programa(): BelongsTo
    {
        return $this->belongsTo(ProgramaSst::class, 'programa_id');
    }

    public function elemento(): BelongsTo
    {
        return $this->belongsTo(ProgramaSstElemento::class, 'elemento_id');
    }

    public function responsable(): BelongsTo
    {
        return $this->belongsTo(Personal::class, 'responsable_id');
    }

    /**
     * Cumplimiento = ejecutado / meta.
     *
     * Devuelve null cuando la actividad no es medible: sin meta cuantificada
     * (las "según corresponda", que no tienen denominador) o marcada como no
     * aplica. Contarlas como 0% haría que un programa correcto se vea incumplido.
     */
    public function getPorcentajeCumplimientoAttribute(): ?float
    {
        if ($this->estado === 'no_aplica') return null;
        if ($this->estado === 'completado') return 100.0;

        $meta = (int) $this->meta_cantidad;
        if ($meta <= 0) return null;

        return round(min($this->cantidad_ejecutada / $meta, 1) * 100, 1);
    }
}
