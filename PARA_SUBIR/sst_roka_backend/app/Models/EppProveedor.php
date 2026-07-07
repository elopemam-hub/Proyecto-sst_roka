<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EppProveedor extends Model
{
    use SoftDeletes;

    protected $table = 'epps_proveedores';

    protected $fillable = [
        'empresa_id',
        'ruc',
        'razon_social',
        'nombre_comercial',
        'contacto_nombre',
        'contacto_telefono',
        'contacto_email',
        'direccion',
        'ciudad',
        'calificacion',
        'tiempo_entrega_dias',
        'observaciones',
        'activo',
    ];

    protected $casts = [
        'tiempo_entrega_dias' => 'integer',
        'activo'              => 'boolean',
    ];

    // ═══════════════════════════════════════════════════════════════════════
    // RELACIONES
    // ═══════════════════════════════════════════════════════════════════════

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    public function inventarios(): HasMany
    {
        return $this->hasMany(EppInventario::class, 'proveedor_id');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // MÉTODOS DE NEGOCIO
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Calcula el total invertido en EPPs de este proveedor
     */
    public function totalInvertido(): float
    {
        return $this->inventarios()
            ->where('activo', true)
            ->get()
            ->sum(fn($inv) => $inv->stock_total * ($inv->costo_unitario ?? 0));
    }

    /**
     * Cuenta EPPs activos de este proveedor
     */
    public function cantidadEppsActivos(): int
    {
        return $this->inventarios()->where('activo', true)->count();
    }

    /**
     * Obtiene la última compra realizada
     */
    public function ultimaCompra()
    {
        return $this->inventarios()
            ->orderBy('created_at', 'desc')
            ->first();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SCOPES
    // ═══════════════════════════════════════════════════════════════════════

    public function scopeActivos($query)
    {
        return $query->where('activo', true);
    }

    public function scopePorCalificacion($query, $calificacion)
    {
        return $query->where('calificacion', $calificacion);
    }

    public function scopeConEpps($query)
    {
        return $query->has('inventarios');
    }
}
