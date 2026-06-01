<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SustanciaPeligrosa extends Model
{
    use SoftDeletes;

    protected $table = 'sustancias_peligrosas';

    protected $fillable = [
        'empresa_id', 'nombre', 'nombre_quimico', 'cas_number', 'numero_onu',
        'formula_quimica', 'estado_fisico', 'pictogramas_ghs', 'nivel_riesgo',
        'area_uso', 'cantidad_stock', 'unidad_medida', 'ubicacion_almacenamiento',
        'proveedor', 'requiere_epp', 'incompatibilidades', 'medidas_control',
        'procedimiento_derrame', 'hds_disponible', 'hds_actualizado',
        'stock_minimo', 'stock_maximo',
        'hds_path', 'hds_fecha_emision', 'hds_fecha_vencimiento',
        'nfpa_salud', 'nfpa_inflamabilidad', 'nfpa_inestabilidad', 'nfpa_especial',
        'limite_tlv_twa', 'limite_stel', 'limite_idlh',
        'observaciones', 'activo',
    ];

    protected $casts = [
        'pictogramas_ghs'     => 'array',
        'requiere_epp'        => 'array',
        'hds_disponible'      => 'boolean',
        'hds_actualizado'     => 'boolean',
        'activo'              => 'boolean',
        'cantidad_stock'      => 'decimal:2',
        'stock_minimo'        => 'decimal:2',
        'stock_maximo'        => 'decimal:2',
        'hds_fecha_emision'   => 'date',
        'hds_fecha_vencimiento' => 'date',
    ];

    public function empresa(): BelongsTo { return $this->belongsTo(Empresa::class); }

    public function movimientos(): HasMany
    {
        return $this->hasMany(SustanciaMovimiento::class, 'sustancia_id')->orderByDesc('fecha');
    }

    public function exposiciones(): HasMany
    {
        return $this->hasMany(SustanciaExposicion::class, 'sustancia_id');
    }

    public function capacitaciones(): HasMany
    {
        return $this->hasMany(SustanciaCapacitacion::class, 'sustancia_id')->orderByDesc('fecha_capacitacion');
    }
}
