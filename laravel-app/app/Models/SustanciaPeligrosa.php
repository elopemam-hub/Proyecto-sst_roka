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
        'limite_tlv_twa_valor', 'limite_tlv_twa_unidad',
        'limite_stel_valor', 'limite_stel_unidad',
        'limite_idlh_valor', 'limite_idlh_unidad',
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
        'limite_tlv_twa_valor' => 'decimal:4',
        'limite_stel_valor'    => 'decimal:4',
        'limite_idlh_valor'    => 'decimal:4',
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
