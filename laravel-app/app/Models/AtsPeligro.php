<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AtsPeligro extends Model
{
    protected $table = 'ats_peligros';

    protected $fillable = [
        'ats_tarea_id',
        'tipo_peligro',
        'descripcion',
        'riesgo',
        'severidad',
        'probabilidad',
        'nivel_riesgo',
        'clasificacion',
    ];

    // Severidad enum (texto) → escala 1-4 para el cálculo P×S
    const SEVERIDAD_NUM = [
        'leve'      => 1,
        'moderada'  => 2,
        'grave'     => 3,
        'muy_grave' => 4,
    ];

    public function tarea(): BelongsTo
    {
        return $this->belongsTo(AtsTarea::class, 'ats_tarea_id');
    }

    /**
     * Clasificar un nivel P×S (rango 1-16) — alineado a la metodología IPERC
     */
    public static function clasificar(int $nivel): string
    {
        if ($nivel <= 2)  return 'trivial';
        if ($nivel <= 4)  return 'tolerable';
        if ($nivel <= 8)  return 'moderado';
        if ($nivel <= 12) return 'importante';
        return 'intolerable';
    }

    public function calcularNivel(): void
    {
        $sev = self::SEVERIDAD_NUM[$this->severidad] ?? 1;
        $prob = max(1, min(4, (int) ($this->probabilidad ?? 1)));
        $this->nivel_riesgo  = $prob * $sev;
        $this->clasificacion = self::clasificar($this->nivel_riesgo);
    }

    protected static function booted(): void
    {
        static::saving(function ($peligro) {
            $peligro->calcularNivel();
        });
    }
}
