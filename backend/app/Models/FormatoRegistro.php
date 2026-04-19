<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;

class FormatoRegistro extends Model
{
    protected $table = 'formatos_registros';

    protected $fillable = [
        'empresa_id', 'tipo_registro', 'correlativo', 'titulo',
        'periodo_anio', 'periodo_mes', 'estado', 'datos_json',
        'origen_tipo', 'origen_id', 'creado_por', 'observaciones',
    ];

    protected $casts = [
        'datos_json'   => 'array',
        'periodo_anio' => 'integer',
        'periodo_mes'  => 'integer',
    ];

    protected $appends = ['tipo_label'];

    private static array $tipoLabels = [
        'reg_01' => 'Registro 01 - Accidentes de Trabajo',
        'reg_02' => 'Registro 02 - Enfermedades Ocupacionales',
        'reg_03' => 'Registro 03 - Incidentes Peligrosos e Incidentes',
        'reg_04' => 'Registro 04 - Investigación de Accidentes e Incidentes',
        'reg_05' => 'Registro 05 - Monitoreo de Agentes Ocupacionales',
        'reg_06' => 'Registro 06 - Inspecciones Internas de SST',
        'reg_07' => 'Registro 07 - Equipos de Atención de Emergencias',
        'reg_08' => 'Registro 08 - Auditorías',
        'reg_09' => 'Registro 09 - Capacitaciones, Inducciones y Simulacros',
        'reg_10' => 'Registro 10 - Estadísticas de Seguridad y Salud',
    ];

    // ─── Relaciones ────────────────────────────────────────────────────

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    public function creadoPor(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'creado_por');
    }

    // ─── Accessors ─────────────────────────────────────────────────────

    public function getTipoLabelAttribute(): string
    {
        return self::$tipoLabels[$this->tipo_registro] ?? $this->tipo_registro;
    }

    public static function getTiposLabels(): array
    {
        return self::$tipoLabels;
    }

    // ─── Scopes ────────────────────────────────────────────────────────

    public function scopeVigentes(Builder $query): Builder
    {
        return $query->where('estado', 'vigente');
    }

    public function scopePorTipo(Builder $query, string $tipo): Builder
    {
        return $query->where('tipo_registro', $tipo);
    }
}
