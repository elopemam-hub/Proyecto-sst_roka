<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Carbon\Carbon;

class Equipo extends Model
{
    use SoftDeletes;

    protected $table = 'equipos';

    protected $fillable = [
        'empresa_id', 'area_id', 'responsable_id', 'codigo', 'nombre',
        'tipo', 'marca', 'modelo', 'serie', 'anio_fabricacion',
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

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    public function area(): BelongsTo
    {
        return $this->belongsTo(Area::class);
    }

    public function responsable(): BelongsTo
    {
        return $this->belongsTo(Personal::class, 'responsable_id');
    }

    public function getCalibracionProxima30dAttribute(): bool
    {
        if (!$this->fecha_proxima_calibracion) return false;
        $dias = Carbon::today()->diffInDays($this->fecha_proxima_calibracion, false);
        return $dias >= 0 && $dias <= 30;
    }
}
