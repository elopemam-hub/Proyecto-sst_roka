<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProgramaSst extends Model
{
    protected $table = 'programa_sst';

    protected $fillable = [
        'empresa_id', 'anio', 'nombre', 'objetivo_general',
        'monto_total', 'estado', 'aprobado_por', 'fecha_aprobacion',
    ];

    protected $casts = [
        'anio'             => 'integer',
        'monto_total'      => 'decimal:2',
        'fecha_aprobacion' => 'date',
    ];

    protected $appends = ['porcentaje_cumplimiento'];

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    public function actividades(): HasMany
    {
        return $this->hasMany(ProgramaSstActividad::class, 'programa_id');
    }

    public function getPorcentajeCumplimientoAttribute(): float
    {
        $total = $this->actividades()->count();
        if ($total === 0) return 0;
        $completadas = $this->actividades()->where('estado', 'completado')->count();
        return round(($completadas / $total) * 100, 1);
    }
}
