<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AuditoriaInterna extends Model
{
    protected $table = 'auditorias';

    protected $fillable = [
        'empresa_id', 'area_id', 'tipo', 'norma_referencia', 'auditor_lider',
        'equipo_auditor', 'fecha_programada', 'fecha_ejecutada', 'alcance',
        'objetivo', 'estado', 'conclusion', 'archivo_informe',
    ];

    protected $casts = [
        'fecha_programada' => 'date',
        'fecha_ejecutada'  => 'date',
        'equipo_auditor'   => 'array',
    ];

    protected $appends = ['hallazgos_abiertos_count'];

    // ─── Relaciones ────────────────────────────────────────────────────

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    public function area(): BelongsTo
    {
        return $this->belongsTo(Area::class);
    }

    public function hallazgos(): HasMany
    {
        return $this->hasMany(AuditoriaHallazgo::class, 'auditoria_id');
    }

    // ─── Accessors ─────────────────────────────────────────────────────

    public function getHallazgosAbiertosCountAttribute(): int
    {
        return $this->hallazgos()
            ->whereIn('estado', ['abierto', 'en_proceso'])
            ->count();
    }
}
