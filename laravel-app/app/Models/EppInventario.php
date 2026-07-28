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
        'stock_minimo', 'consumo_anual', 'unidad', 'costo_unitario', 'proveedor',
        'ficha_tecnica_path', 'imagen_path', 'activo',
    ];

    protected $casts = [
        'stock_total'      => 'integer',
        'stock_disponible' => 'integer',
        'stock_minimo'     => 'integer',
        'consumo_anual'    => 'integer',
        'costo_unitario'   => 'decimal:2',
        'activo'           => 'boolean',
    ];

    protected $appends = [
        'stock_critico',
        'stock_minimo_calculado',
        'stock_maximo_calculado',
        'valor_total_stock',
        'porcentaje_disponible',
        'requiere_reposicion',
        'imagen_url',
    ];

    // ═══════════════════════════════════════════════════════════════════════
    // RELACIONES
    // ═══════════════════════════════════════════════════════════════════════

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    public function categoria(): BelongsTo
    {
        return $this->belongsTo(EppCategoria::class, 'categoria_id');
    }

    public function proveedor(): BelongsTo
    {
        return $this->belongsTo(EppProveedor::class, 'proveedor_id');
    }

    public function entregas(): HasMany
    {
        return $this->hasMany(EppEntrega::class, 'inventario_id');
    }

    public function movimientos(): HasMany
    {
        return $this->hasMany(EppMovimiento::class, 'inventario_id');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ATRIBUTOS CALCULADOS
    // ═══════════════════════════════════════════════════════════════════════

    public function getStockCriticoAttribute(): bool
    {
        return $this->stock_disponible <= $this->stock_minimo;
    }

    public function getStockMinimoCalculadoAttribute(): int
    {
        return $this->consumo_anual ? (int)round($this->consumo_anual * 0.10) : 0;
    }

    public function getStockMaximoCalculadoAttribute(): int
    {
        return $this->consumo_anual ? (int)round($this->consumo_anual * 0.20) : 0;
    }

    public function getValorTotalStockAttribute(): float
    {
        return $this->stock_disponible * ($this->costo_unitario ?? 0);
    }

    public function getPorcentajeDisponibleAttribute(): float
    {
        if ($this->stock_total <= 0) return 0;
        return round(($this->stock_disponible / $this->stock_total) * 100, 2);
    }

    public function getRequiereReposicionAttribute(): bool
    {
        return $this->stock_disponible < ($this->stock_minimo * 0.5);
    }

    public function getImagenUrlAttribute(): ?string
    {
        return $this->imagen_path ? '/storage/' . ltrim($this->imagen_path, '/') : null;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // MÉTODOS DE NEGOCIO
    // ═══════════════════════════════════════════════════════════════════════

    public function incrementarStock(int $cantidad): void
    {
        $this->increment('stock_disponible', $cantidad);
        $this->increment('stock_total', $cantidad);
    }

    public function decrementarStock(int $cantidad): void
    {
        if ($this->stock_disponible < $cantidad) {
            throw new \Exception("Stock insuficiente. Disponible: {$this->stock_disponible}, Solicitado: {$cantidad}");
        }
        $this->decrement('stock_disponible', $cantidad);
    }

    public function ajustarStock(int $nuevaCantidad): void
    {
        $this->stock_disponible = $nuevaCantidad;
        $this->save();
    }

    public function entregasActivas()
    {
        return $this->entregas()->where('estado', 'entregado')->orderBy('fecha_entrega', 'desc');
    }

    public function calcularConsumoMensual(): float
    {
        $ultimosSeisMeses = now()->subMonths(6);
        $totalEntregado = $this->entregas()
            ->where('fecha_entrega', '>=', $ultimosSeisMeses)
            ->sum('cantidad');
        return round($totalEntregado / 6, 2);
    }

    public function diasHastaAgotarStock(): ?int
    {
        $consumoMensual = $this->calcularConsumoMensual();
        if ($consumoMensual <= 0) return null;
        $consumoDiario = $consumoMensual / 30;
        if ($consumoDiario <= 0) return null;
        return (int) ceil($this->stock_disponible / $consumoDiario);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SCOPES
    // ═══════════════════════════════════════════════════════════════════════

    public function scopeActivos($query)
    {
        return $query->where('activo', true);
    }

    public function scopeStockBajo($query)
    {
        return $query->whereRaw('stock_disponible <= stock_minimo');
    }

    public function scopeStockCritico($query)
    {
        return $query->whereRaw('stock_disponible <= (stock_minimo * 0.5)');
    }

    public function scopePorCategoria($query, $categoriaId)
    {
        return $query->where('categoria_id', $categoriaId);
    }

    public function scopePorTalla($query, $talla)
    {
        return $query->where('talla', $talla);
    }
}
