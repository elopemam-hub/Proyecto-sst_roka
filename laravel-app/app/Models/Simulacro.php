<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Simulacro extends Model
{
    protected $table = 'simulacros';

    protected $fillable = [
        'empresa_id', 'area_id', 'coordinador_id', 'tipo', 'nombre',
        'descripcion', 'fecha_programada', 'fecha_ejecutada', 'hora_inicio',
        'hora_fin', 'lugar', 'estado', 'tiempo_respuesta_min',
        'personas_evacuadas', 'observaciones', 'lecciones_aprendidas',
        'archivo_informe',
    ];

    protected $casts = [
        'fecha_programada'     => 'date',
        'fecha_ejecutada'      => 'date',
        'tiempo_respuesta_min' => 'integer',
        'personas_evacuadas'   => 'integer',
    ];

    protected $appends = ['duracion_minutos', 'promedio_evaluacion'];

    // ─── Relaciones ────────────────────────────────────────────────────

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    public function area(): BelongsTo
    {
        return $this->belongsTo(Area::class);
    }

    public function coordinador(): BelongsTo
    {
        return $this->belongsTo(Personal::class, 'coordinador_id');
    }

    public function participantes(): HasMany
    {
        return $this->hasMany(SimulacroParticipante::class);
    }

    public function evaluaciones(): HasMany
    {
        return $this->hasMany(SimulacroEvaluacion::class);
    }

    // ─── Accessors ─────────────────────────────────────────────────────

    public function getDuracionMinutosAttribute(): ?int
    {
        if (!$this->hora_inicio || !$this->hora_fin) return null;
        $inicio = \Carbon\Carbon::parse($this->hora_inicio);
        $fin    = \Carbon\Carbon::parse($this->hora_fin);
        return $inicio->diffInMinutes($fin);
    }

    public function getPromedioEvaluacionAttribute(): ?float
    {
        $promedio = $this->evaluaciones()->avg('calificacion');
        return $promedio ? round($promedio, 1) : null;
    }
}
