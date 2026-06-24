<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Carbon\Carbon;

class InspeccionProgramada extends Model
{
    protected $table = 'inspeccion_programadas';

    protected $fillable = [
        'empresa_id', 'equipo_id', 'plantilla_id',
        'fecha_programada', 'fecha_realizada', 'inspeccion_id',
        'estado', 'observaciones',
    ];

    protected $casts = [
        'fecha_programada' => 'date',
        'fecha_realizada'  => 'date',
    ];

    protected $appends = ['dias_restantes'];

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    public function equipo(): BelongsTo
    {
        return $this->belongsTo(Equipo::class);
    }

    public function plantilla(): BelongsTo
    {
        return $this->belongsTo(EquipoCatalogo::class, 'plantilla_id');
    }

    public function inspeccion(): BelongsTo
    {
        return $this->belongsTo(Inspeccion::class);
    }

    public function getDiasRestantesAttribute(): ?int
    {
        if ($this->estado !== 'pendiente') return null;
        return Carbon::today()->diffInDays($this->fecha_programada, false);
    }

    /** Marca las pendientes cuya fecha ya pasó como vencidas */
    public static function marcarVencidas(int $empresaId): int
    {
        return static::where('empresa_id', $empresaId)
            ->where('estado', 'pendiente')
            ->where('fecha_programada', '<', Carbon::today())
            ->update(['estado' => 'vencida']);
    }
}
