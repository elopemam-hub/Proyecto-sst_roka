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
    ];

    protected $casts = [
        'fecha_examen'      => 'date',
        'fecha_vencimiento' => 'date',
        'notificado'        => 'boolean',
    ];

    protected $appends = ['esta_vencida', 'dias_para_vencer'];

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    public function personal(): BelongsTo
    {
        return $this->belongsTo(Personal::class);
    }

    public function restriccionesRelacion(): HasMany
    {
        return $this->hasMany(SaludRestriccion::class, 'emo_id');
    }

    public function getEstaVencidaAttribute(): bool
    {
        return $this->fecha_vencimiento !== null
            && $this->fecha_vencimiento->isPast();
    }

    public function getDiasParaVencerAttribute(): ?int
    {
        if ($this->fecha_vencimiento === null) {
            return null;
        }
        return (int) now()->diffInDays($this->fecha_vencimiento, false);
    }
}
