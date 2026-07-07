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
        self::where('empresa_id', $empresaId)
            ->where('estado', 'pendiente')
            ->where('fecha', '<', Carbon::today())
            ->update(['estado' => 'omitido']);
    }
}
