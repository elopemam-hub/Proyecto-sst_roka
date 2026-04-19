<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AuditoriaHallazgo extends Model
{
    protected $table = 'auditoria_hallazgos';

    protected $fillable = [
        'empresa_id', 'auditoria_id', 'responsable_id', 'tipo_hallazgo',
        'clausula_norma', 'descripcion', 'evidencia', 'accion_correctiva',
        'fecha_limite', 'fecha_cierre', 'estado',
    ];

    protected $casts = [
        'fecha_limite' => 'date',
        'fecha_cierre' => 'date',
    ];

    protected $appends = ['esta_vencido', 'dias_restantes'];

    // ─── Relaciones ────────────────────────────────────────────────────

    public function auditoria(): BelongsTo
    {
        return $this->belongsTo(AuditoriaInterna::class, 'auditoria_id');
    }

    public function responsable(): BelongsTo
    {
        return $this->belongsTo(Personal::class, 'responsable_id');
    }

    public function seguimientos(): HasMany
    {
        return $this->hasMany(AuditoriaSeguimiento::class, 'hallazgo_id');
    }

    // ─── Accessors ─────────────────────────────────────────────────────

    public function getEstaVencidoAttribute(): bool
    {
        return $this->fecha_limite !== null
            && $this->fecha_limite->isPast()
            && !in_array($this->estado, ['cerrado']);
    }

    public function getDiasRestantesAttribute(): ?int
    {
        if ($this->fecha_limite === null || $this->estado === 'cerrado') {
            return null;
        }
        return (int) now()->diffInDays($this->fecha_limite, false);
    }
}
