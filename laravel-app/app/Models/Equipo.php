<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Carbon\Carbon;

class Equipo extends Model
{
    use SoftDeletes;

    protected $table = 'equipos';

    protected $fillable = [
        'empresa_id', 'area_id', 'responsable_id',
        'tipo_id',
        'equipo_catalogo_id',
        'codigo', 'nombre', 'tipo', 'marca', 'modelo', 'serie', 'anio_fabricacion',
        'fecha_adquisicion', 'fecha_ultimo_mantenimiento',
        'fecha_proxima_calibracion', 'fecha_proxima_revision',
        'estado', 'ubicacion', 'observaciones',
    ];

    protected $casts = [
        'fecha_adquisicion'           => 'date',
        'fecha_ultimo_mantenimiento'  => 'date',
        'fecha_proxima_calibracion'   => 'date',
        'fecha_proxima_revision'      => 'date',
    ];

    protected $appends = ['calibracion_proxima_30d'];

    public function empresa(): BelongsTo      { return $this->belongsTo(Empresa::class); }
    public function area(): BelongsTo         { return $this->belongsTo(Area::class); }
    public function responsable(): BelongsTo  { return $this->belongsTo(Personal::class, 'responsable_id'); }
    public function equipoTipo(): BelongsTo   { return $this->belongsTo(EquipoTipo::class, 'tipo_id'); }

    /** Catálogo único heredado — deprecado en Fase 1, se mantiene por compatibilidad */
    public function equipoCatalogo(): BelongsTo
    {
        return $this->belongsTo(EquipoCatalogo::class, 'equipo_catalogo_id');
    }

    /** Plantillas de inspección asignadas (muchos a muchos) */
    public function plantillas(): BelongsToMany
    {
        return $this->belongsToMany(
            EquipoCatalogo::class,
            'equipos_plantillas',
            'equipo_id',
            'plantilla_id'
        )->withPivot('activo', 'frecuencia_inspeccion')->withTimestamps();
    }

    public function getCalibracionProxima30dAttribute(): bool
    {
        if (!$this->fecha_proxima_calibracion) return false;
        $dias = Carbon::today()->diffInDays($this->fecha_proxima_calibracion, false);
        return $dias >= 0 && $dias <= 30;
    }
}
