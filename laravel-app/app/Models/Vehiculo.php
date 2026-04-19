<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Carbon\Carbon;

class Vehiculo extends Model
{
    protected $table = 'vehiculos';

    protected $fillable = [
        'empresa_id', 'area_id', 'placa', 'marca', 'modelo', 'anio',
        'color', 'tipo', 'nro_chasis', 'nro_motor',
        'soat_vencimiento', 'revision_tecnica_vencimiento', 'fecha_ultima_revision',
        'conductor_habitual_id', 'estado', 'observaciones',
    ];

    protected $casts = [
        'anio'                        => 'integer',
        'soat_vencimiento'            => 'date',
        'revision_tecnica_vencimiento' => 'date',
        'fecha_ultima_revision'       => 'date',
    ];

    protected $appends = ['documentos_vencidos', 'dias_para_vencer_soat'];

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    public function area(): BelongsTo
    {
        return $this->belongsTo(Area::class);
    }

    public function conductor(): BelongsTo
    {
        return $this->belongsTo(Personal::class, 'conductor_habitual_id');
    }

    public function getDocumentosVencidosAttribute(): bool
    {
        $hoy = Carbon::today();
        $soatVencido = $this->soat_vencimiento && $this->soat_vencimiento->lt($hoy);
        $revVencida  = $this->revision_tecnica_vencimiento && $this->revision_tecnica_vencimiento->lt($hoy);
        return $soatVencido || $revVencida;
    }

    public function getDiasParaVencerSoatAttribute(): ?int
    {
        if (!$this->soat_vencimiento) return null;
        return (int) Carbon::today()->diffInDays($this->soat_vencimiento, false);
    }
}
