<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AccionSeguimiento extends Model
{
    use SoftDeletes;

    protected $table = 'acciones_seguimiento';

    protected $fillable = [
        'empresa_id',
        'origen_tipo', 'origen_id',
        'codigo', 'tipo', 'titulo', 'descripcion',
        'responsable_id', 'area_id',
        'prioridad',
        'fecha_programada', 'fecha_limite', 'fecha_ejecucion',
        'porcentaje_avance',
        'estado',
        'evidencias', 'observaciones',
        'validado_por', 'validado_en', 'observaciones_validacion',
    ];

    protected $casts = [
        'fecha_programada' => 'date',
        'fecha_limite'     => 'date',
        'fecha_ejecucion'  => 'date',
        'validado_en'      => 'datetime',
        'evidencias'       => 'array',
    ];

    const COLORES_PRIORIDAD = [
        'baja'    => 'text-slate-400',
        'media'   => 'text-blue-400',
        'alta'    => 'text-amber-400',
        'critica' => 'text-red-400',
    ];

    public function empresa(): BelongsTo    { return $this->belongsTo(Empresa::class); }
    public function responsable(): BelongsTo{ return $this->belongsTo(Personal::class, 'responsable_id'); }
    public function area(): BelongsTo       { return $this->belongsTo(Area::class); }
    public function validador(): BelongsTo  { return $this->belongsTo(Usuario::class, 'validado_por'); }

    public static function generarCodigo(int $empresaId): string
    {
        $anio   = now()->year;
        $ultimo = self::where('empresa_id', $empresaId)
            ->whereYear('created_at', $anio)
            ->withTrashed()
            ->count() + 1;
        return sprintf('SEG-%d-%04d', $anio, $ultimo);
    }

    public function getEstaVencidaAttribute(): bool
    {
        return $this->fecha_limite->isPast()
            && !in_array($this->estado, ['completada', 'validada', 'cancelada']);
    }

    public function getDiasRestantesAttribute(): int
    {
        return max(0, now()->diffInDays($this->fecha_limite, false));
    }
}
