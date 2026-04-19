<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EppInventario extends Model
{
    use SoftDeletes;

    protected $table = 'epps_inventario';

    protected $fillable = [
        'empresa_id', 'categoria_id', 'nombre', 'marca', 'modelo',
        'codigo_interno', 'talla', 'stock_total', 'stock_disponible',
        'stock_minimo', 'unidad', 'costo_unitario', 'proveedor',
        'ficha_tecnica_path', 'activo',
    ];

    protected $casts = [
        'stock_total'      => 'integer',
        'stock_disponible' => 'integer',
        'stock_minimo'     => 'integer',
        'costo_unitario'   => 'decimal:2',
        'activo'           => 'boolean',
    ];

    protected $appends = ['stock_critico'];

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    public function categoria(): BelongsTo
    {
        return $this->belongsTo(EppCategoria::class, 'categoria_id');
    }

    public function entregas(): HasMany
    {
        return $this->hasMany(EppEntrega::class, 'inventario_id');
    }

    public function getStockCriticoAttribute(): bool
    {
        return $this->stock_disponible <= $this->stock_minimo;
    }
}
