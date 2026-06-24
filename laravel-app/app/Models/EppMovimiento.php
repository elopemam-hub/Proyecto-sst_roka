<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EppMovimiento extends Model
{
    protected $table = 'epps_movimientos';

    protected $fillable = [
        'empresa_id',
        'inventario_id',
        'tipo',
        'cantidad',
        'stock_anterior',
        'stock_nuevo',
        'motivo',
        'documento_referencia',
        'observaciones',
        'entrega_id',
        'usuario_id',
    ];

    protected $casts = [
        'cantidad'        => 'integer',
        'stock_anterior'  => 'integer',
        'stock_nuevo'     => 'integer',
    ];

    // ═══════════════════════════════════════════════════════════════════════
    // RELACIONES
    // ═══════════════════════════════════════════════════════════════════════

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    public function inventario(): BelongsTo
    {
        return $this->belongsTo(EppInventario::class, 'inventario_id');
    }

    public function entrega(): BelongsTo
    {
        return $this->belongsTo(EppEntrega::class, 'entrega_id');
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'usuario_id');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SCOPES
    // ═══════════════════════════════════════════════════════════════════════

    public function scopePorTipo($query, $tipo)
    {
        return $query->where('tipo', $tipo);
    }

    public function scopePorFecha($query, $fechaInicio, $fechaFin = null)
    {
        if ($fechaFin) {
            return $query->whereBetween('created_at', [$fechaInicio, $fechaFin]);
        }
        return $query->whereDate('created_at', $fechaInicio);
    }

    public function scopePorInventario($query, $inventarioId)
    {
        return $query->where('inventario_id', $inventarioId);
    }

    public function scopePorUsuario($query, $usuarioId)
    {
        return $query->where('usuario_id', $usuarioId);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // MÉTODOS ESTÁTICOS
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Registra un movimiento de stock
     */
    public static function registrar(
        int $empresaId,
        int $inventarioId,
        string $tipo,
        int $cantidad,
        int $stockAnterior,
        int $stockNuevo,
        string $motivo,
        ?string $documentoReferencia = null,
        ?string $observaciones = null,
        ?int $entregaId = null,
        ?int $usuarioId = null
    ): self {
        return self::create([
            'empresa_id'            => $empresaId,
            'inventario_id'         => $inventarioId,
            'tipo'                  => $tipo,
            'cantidad'              => abs($cantidad),
            'stock_anterior'        => $stockAnterior,
            'stock_nuevo'           => $stockNuevo,
            'motivo'                => $motivo,
            'documento_referencia'  => $documentoReferencia,
            'observaciones'         => $observaciones,
            'entrega_id'            => $entregaId,
            'usuario_id'            => $usuarioId ?? auth()->id(),
        ]);
    }
}
