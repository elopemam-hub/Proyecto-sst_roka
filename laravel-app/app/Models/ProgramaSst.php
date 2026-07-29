<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class ProgramaSst extends Model
{
    use SoftDeletes;

    protected $table = 'programa_sst';

    protected $fillable = [
        'empresa_id', 'anio', 'nombre', 'codigo', 'version', 'mes_inicio',
        'objetivo_general', 'presupuesto', 'estado', 'aprobado_por', 'fecha_aprobacion',
    ];

    protected $casts = [
        'anio'             => 'integer',
        'mes_inicio'       => 'integer',
        'presupuesto'      => 'decimal:2',
        'fecha_aprobacion' => 'date',
    ];

    protected $appends = ['porcentaje_cumplimiento'];

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    public function elementos(): HasMany
    {
        return $this->hasMany(ProgramaSstElemento::class, 'programa_id')->orderBy('orden');
    }

    public function actividades(): HasMany
    {
        return $this->hasMany(ProgramaSstActividad::class, 'programa_id')->orderBy('orden');
    }

    /**
     * Promedio del cumplimiento de las actividades medibles, no el porcentaje
     * de actividades completadas: una actividad con 4 de 7 reuniones aporta
     * 57%, no 0%. Las no medibles (sin meta cuantificada o "no aplica") quedan
     * fuera del promedio en vez de arrastrarlo a cero.
     */
    public function getPorcentajeCumplimientoAttribute(): float
    {
        $actividades = $this->relationLoaded('actividades')
            ? $this->actividades
            : $this->actividades()->get();

        $medibles = $actividades
            ->map(fn ($a) => $a->porcentaje_cumplimiento)
            ->filter(fn ($p) => $p !== null);

        return $medibles->isEmpty() ? 0 : round($medibles->avg(), 1);
    }
}
