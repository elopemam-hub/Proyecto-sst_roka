<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Capacitacion extends Model
{
    protected $table = 'capacitaciones';

    protected $fillable = [
        'empresa_id', 'area_id', 'titulo', 'tema', 'tipo', 'modalidad',
        'fecha_programada', 'fecha_ejecutada', 'duracion_horas', 'expositor',
        'expositor_cargo', 'lugar', 'max_participantes', 'estado',
        'observaciones', 'archivo_material',
    ];

    protected $casts = [
        'fecha_programada' => 'date',
        'fecha_ejecutada'  => 'date',
        'duracion_horas'   => 'decimal:2',
        'max_participantes' => 'integer',
    ];

    protected $appends = ['porcentaje_asistencia', 'total_asistentes'];

    // ─── Relaciones ────────────────────────────────────────────────────

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    public function area(): BelongsTo
    {
        return $this->belongsTo(Area::class);
    }

    public function asistentes(): HasMany
    {
        return $this->hasMany(CapacitacionAsistente::class);
    }

    public function evaluacion(): HasOne
    {
        return $this->hasOne(CapacitacionEvaluacion::class);
    }

    // ─── Accessors ─────────────────────────────────────────────────────

    public function getPorcentajeAsistenciaAttribute(): ?float
    {
        $total = $this->asistentes()->count();
        if ($total === 0) return null;

        $presentes = $this->asistentes()->where('asistio', true)->count();
        return round(($presentes / $total) * 100, 1);
    }

    public function getTotalAsistentesAttribute(): int
    {
        return $this->asistentes()->count();
    }
}
