<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Carbon\Carbon;

class EquipoAsignacion extends Model
{
    use SoftDeletes;

    protected $table = 'equipo_asignaciones';

    protected $fillable = [
        'empresa_id', 'equipo_id', 'usuario_id',
        'fecha', 'turno', 'estado',
        'inspeccion_id', 'observaciones', 'creado_por',
    ];

    protected $casts = [
        'fecha' => 'date',
    ];

    protected $appends = ['vencida'];

    /**
     * Vencida = sigue pendiente y su fecha ya pasó (día anterior a hoy).
     * No cambia el estado; solo es una marca visual. La inspección aún se
     * puede ejecutar.
     */
    public function getVencidaAttribute(): bool
    {
        return $this->estado === 'pendiente'
            && $this->fecha
            && $this->fecha->lt(Carbon::today());
    }

    public function empresa(): BelongsTo   { return $this->belongsTo(Empresa::class); }
    public function equipo(): BelongsTo    { return $this->belongsTo(Equipo::class); }
    public function usuario(): BelongsTo   { return $this->belongsTo(Usuario::class); }
    public function inspeccion(): BelongsTo { return $this->belongsTo(Inspeccion::class); }
    public function creadoPor(): BelongsTo { return $this->belongsTo(Usuario::class, 'creado_por'); }

    public function scopeHoy($query)
    {
        return $query->whereDate('fecha', Carbon::today());
    }

    public function scopePendientes($query)
    {
        return $query->where('estado', 'pendiente');
    }

    public static function marcarVencidas(int $empresaId): void
    {
        // Desactivado: las asignaciones de días pasados NO se marcan como
        // "omitido" automáticamente. Se mantienen en "pendiente" para que el
        // inspector todavía pueda ejecutar la inspección aunque sea tarde.
        // El estado "omitido" solo se aplica de forma manual (endpoint omitir).
    }
}
