<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Emo extends Model
{
    protected $table = 'salud_emo';

    protected $fillable = [
        'empresa_id', 'personal_id', 'tipo', 'fecha_examen',
        'fecha_vencimiento', 'clinica', 'medico', 'resultado',
        'restricciones', 'observaciones', 'archivo_path', 'notificado',
        // Indicadores biométricos
        'peso', 'talla', 'imc',
        'presion_sistolica', 'presion_diastolica',
        'glucosa', 'hemoglobina', 'frecuencia_cardiaca',
        'agudeza_od', 'agudeza_oi',
    ];

    protected $casts = [
        'fecha_examen'       => 'date',
        'fecha_vencimiento'  => 'date',
        'notificado'         => 'boolean',
        'peso'               => 'decimal:2',
        'talla'              => 'decimal:2',
        'imc'                => 'decimal:2',
        'glucosa'            => 'decimal:2',
        'hemoglobina'        => 'decimal:2',
    ];

    protected $appends = ['esta_vencida', 'dias_para_vencer', 'imc_calculado', 'interpretacion_imc'];

    public function empresa(): BelongsTo   { return $this->belongsTo(Empresa::class); }
    public function personal(): BelongsTo  { return $this->belongsTo(Personal::class); }
    public function restriccionesRelacion(): HasMany
    {
        return $this->hasMany(SaludRestriccion::class, 'emo_id');
    }

    public function getEstaVencidaAttribute(): bool
    {
        return $this->fecha_vencimiento !== null && $this->fecha_vencimiento->isPast();
    }

    public function getDiasParaVencerAttribute(): ?int
    {
        if ($this->fecha_vencimiento === null) return null;
        return (int) now()->diffInDays($this->fecha_vencimiento, false);
    }

    public function getImcCalculadoAttribute(): ?float
    {
        if (!$this->peso || !$this->talla || $this->talla == 0) return $this->imc;
        return round($this->peso / ($this->talla * $this->talla), 2);
    }

    public function getInterpretacionImcAttribute(): ?string
    {
        $imc = $this->imc_calculado;
        if ($imc === null) return null;
        if ($imc < 18.5) return 'Bajo peso';
        if ($imc < 25.0) return 'Normal';
        if ($imc < 30.0) return 'Sobrepeso';
        return 'Obesidad';
    }
}
