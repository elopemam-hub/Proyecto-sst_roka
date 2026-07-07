<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Carbon\Carbon;

class EquipoCertificadoOperatividad extends Model
{
    use SoftDeletes;

    protected $table = 'equipos_certificados_operatividad';

    protected $fillable = [
        'empresa_id',
        'equipo_catalogo_id',
        'codigo',
        'nombre',
        'frecuencia',
        'fecha_informe',
        'fecha_vencimiento',
        'documento_path',
        'estado',
        'observaciones',
    ];

    protected $casts = [
        'fecha_informe' => 'date',
        'fecha_vencimiento' => 'date',
    ];

    protected $appends = ['dias_para_vencer', 'esta_vencido'];

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    public function equipoCatalogo(): BelongsTo
    {
        return $this->belongsTo(EquipoCatalogo::class, 'equipo_catalogo_id');
    }

    public function getDiasParaVencerAttribute(): ?int
    {
        if (!$this->fecha_vencimiento) return null;
        return Carbon::today()->diffInDays($this->fecha_vencimiento, false);
    }

    public function getEstaVencidoAttribute(): bool
    {
        if (!$this->fecha_vencimiento) return false;
        return Carbon::today()->greaterThan($this->fecha_vencimiento);
    }
}
