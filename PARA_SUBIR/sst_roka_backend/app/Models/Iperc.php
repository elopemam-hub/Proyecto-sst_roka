<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class Iperc extends Model
{
    use SoftDeletes;

    protected $table = 'iperc';

    protected $fillable = [
        'empresa_id', 'sede_id', 'area_id',
        'codigo', 'titulo', 'alcance', 'metodologia',
        'fecha_elaboracion', 'fecha_vigencia', 'version',
        'elaborado_por', 'revisado_por', 'aprobado_por',
        'fecha_revision', 'fecha_aprobacion',
        'estado', 'observaciones',
    ];

    protected $casts = [
        'fecha_elaboracion' => 'date',
        'fecha_vigencia'    => 'date',
        'fecha_revision'    => 'date',
        'fecha_aprobacion'  => 'date',
        'version'           => 'integer',
    ];

    // Clasificación del nivel de riesgo según valor numérico (metodología IPERC peruana)
    const NIVELES_RIESGO = [
        'trivial'     => ['min' => 1,  'max' => 4,  'color' => '#10b981', 'accion' => 'No requiere acción'],
        'tolerable'   => ['min' => 5,  'max' => 8,  'color' => '#84cc16', 'accion' => 'Control actual es suficiente'],
        'moderado'    => ['min' => 9,  'max' => 16, 'color' => '#f59e0b', 'accion' => 'Requiere control en plazo definido'],
        'importante'  => ['min' => 17, 'max' => 24, 'color' => '#f97316', 'accion' => 'Intervención urgente'],
        'intolerable' => ['min' => 25, 'max' => 36, 'color' => '#ef4444', 'accion' => 'Suspender actividad'],
    ];

    // Relaciones
    public function empresa(): BelongsTo          { return $this->belongsTo(Empresa::class); }
    public function sede(): BelongsTo             { return $this->belongsTo(Sede::class); }
    public function area(): BelongsTo             { return $this->belongsTo(Area::class); }
    public function elaborador(): BelongsTo       { return $this->belongsTo(Usuario::class, 'elaborado_por'); }
    public function revisor(): BelongsTo          { return $this->belongsTo(Usuario::class, 'revisado_por'); }
    public function aprobador(): BelongsTo        { return $this->belongsTo(Usuario::class, 'aprobado_por'); }
    public function procesos(): HasMany           { return $this->hasMany(IpercProceso::class); }

    public function firmas(): MorphMany
    {
        return $this->morphMany(Firma::class, 'documento', 'documento_tipo', 'documento_id');
    }

    // Generar código automático
    public static function generarCodigo(int $empresaId, int $areaId): string
    {
        $area = Area::find($areaId);
        $codigoArea = strtoupper(substr($area->codigo ?? $area->tipo, 0, 3));
        $anio = now()->year;
        $ultimo = self::where('empresa_id', $empresaId)
            ->where('codigo', 'like', "IPERC-{$anio}-{$codigoArea}-%")
            ->count() + 1;
        return sprintf('IPERC-%d-%s-%03d', $anio, $codigoArea, $ultimo);
    }

    // Calcular nivel total de riesgos
    public function getResumenRiesgosAttribute(): array
    {
        $peligros = IpercPeligro::whereIn('iperc_proceso_id', $this->procesos->pluck('id'))->get();

        $resumen = [
            'total'       => $peligros->count(),
            'trivial'     => 0,
            'tolerable'   => 0,
            'moderado'    => 0,
            'importante'  => 0,
            'intolerable' => 0,
            'significativos' => $peligros->where('es_riesgo_significativo', true)->count(),
        ];

        foreach ($peligros as $p) {
            $clasif = $p->clasificacion_residual ?? $p->clasificacion_inicial;
            if (isset($resumen[$clasif])) $resumen[$clasif]++;
        }

        return $resumen;
    }

    // Verificar si está vencido
    public function getEstaVencidoAttribute(): bool
    {
        return $this->fecha_vigencia && $this->fecha_vigencia->isPast();
    }
}
