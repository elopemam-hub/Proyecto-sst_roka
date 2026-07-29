<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Carbon\Carbon;

class EmoCita extends Model
{
    protected $table = 'salud_emo_citas';

    protected $fillable = [
        'empresa_id', 'personal_id', 'tipo', 'fecha_cita', 'hora',
        'clinica', 'medico', 'estado', 'emo_id', 'observaciones',
    ];

    protected $casts = [
        'fecha_cita' => 'date',
    ];

    protected $appends = ['dias_para_cita', 'vencida'];

    public function empresa(): BelongsTo  { return $this->belongsTo(Empresa::class); }
    public function personal(): BelongsTo { return $this->belongsTo(Personal::class); }
    public function emo(): BelongsTo      { return $this->belongsTo(Emo::class, 'emo_id'); }

    /** Días que faltan para la cita. Negativo si ya pasó. */
    public function getDiasParaCitaAttribute(): ?int
    {
        if (!$this->fecha_cita) return null;

        // Carbon 3 devuelve float con signo (b − a): positivo si la cita es futura
        return (int) round(Carbon::today()->diffInDays($this->fecha_cita->copy()->startOfDay()));
    }

    /** La fecha ya pasó y la cita sigue sin cerrarse */
    public function getVencidaAttribute(): bool
    {
        return in_array($this->estado, ['programada', 'confirmada'], true)
            && $this->fecha_cita
            && $this->fecha_cita->lt(Carbon::today());
    }

    public function scopePendientes($query)
    {
        return $query->whereIn('estado', ['programada', 'confirmada']);
    }
}
