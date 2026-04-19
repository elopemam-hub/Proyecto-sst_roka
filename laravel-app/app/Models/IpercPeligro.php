<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class IpercPeligro extends Model
{
    protected $table = 'iperc_peligros';

    protected $fillable = [
        'iperc_proceso_id',
        'tipo_peligro', 'descripcion_peligro', 'riesgo', 'consecuencia',
        'prob_personas_expuestas', 'prob_procedimientos',
        'prob_capacitacion', 'prob_exposicion',
        'indice_probabilidad', 'indice_severidad',
        'nivel_riesgo_inicial', 'clasificacion_inicial',
        'ip_residual', 'is_residual',
        'nivel_riesgo_residual', 'clasificacion_residual',
        'es_riesgo_significativo',
    ];

    protected $casts = [
        'es_riesgo_significativo' => 'boolean',
    ];

    // Relaciones
    public function proceso(): BelongsTo { return $this->belongsTo(IpercProceso::class, 'iperc_proceso_id'); }
    public function controles(): HasMany { return $this->hasMany(IpercControl::class, 'iperc_peligro_id'); }

    public function eppsRequeridos(): BelongsToMany
    {
        return $this->belongsToMany(EppCategoria::class, 'iperc_epps_requeridos', 'iperc_peligro_id', 'categoria_id')
            ->withPivot('es_obligatorio', 'observacion')
            ->withTimestamps();
    }

    /**
     * Calcular nivel y clasificación automáticamente
     * Metodología IPERC peruana (Ley 29783)
     */
    public function calcularNivelRiesgo(): void
    {
        // Índice de Probabilidad = suma de 4 factores (rango 4-16)
        $this->indice_probabilidad =
            $this->prob_personas_expuestas +
            $this->prob_procedimientos +
            $this->prob_capacitacion +
            $this->prob_exposicion;

        // Nivel de Riesgo = IP × IS (rango 4-64)
        $this->nivel_riesgo_inicial = $this->indice_probabilidad * $this->indice_severidad;

        // Clasificación según nivel
        $this->clasificacion_inicial = self::clasificar($this->nivel_riesgo_inicial);

        // Riesgo significativo — automático para importante/intolerable
        $this->es_riesgo_significativo = in_array(
            $this->clasificacion_inicial,
            ['importante', 'intolerable']
        );

        // Si hay controles residuales, calcular también el riesgo residual
        if ($this->ip_residual && $this->is_residual) {
            $this->nivel_riesgo_residual = $this->ip_residual * $this->is_residual;
            $this->clasificacion_residual = self::clasificar($this->nivel_riesgo_residual);
        }
    }

    /**
     * Clasificar un nivel numérico en categoría
     */
    public static function clasificar(int $nivel): string
    {
        if ($nivel <= 4)  return 'trivial';
        if ($nivel <= 8)  return 'tolerable';
        if ($nivel <= 16) return 'moderado';
        if ($nivel <= 24) return 'importante';
        return 'intolerable';
    }

    /**
     * Color hexadecimal asociado a la clasificación
     */
    public function getColorClasificacionAttribute(): string
    {
        return Iperc::NIVELES_RIESGO[$this->clasificacion_inicial]['color'] ?? '#64748b';
    }

    /**
     * Acción recomendada según clasificación
     */
    public function getAccionRecomendadaAttribute(): string
    {
        $clasif = $this->clasificacion_residual ?? $this->clasificacion_inicial;
        return Iperc::NIVELES_RIESGO[$clasif]['accion'] ?? 'Evaluar';
    }

    // Hook: calcular automáticamente al guardar
    protected static function booted(): void
    {
        static::saving(function ($peligro) {
            $peligro->calcularNivelRiesgo();
        });
    }
}
