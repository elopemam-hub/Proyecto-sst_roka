<?php

namespace App\Observers;

use App\Models\EppInventario;
use App\Models\EppMovimiento;

class EppInventarioObserver
{
    /**
     * Handle the EppInventario "updated" event.
     *
     * Registra automáticamente el movimiento cuando el stock cambia
     */
    public function updated(EppInventario $inventario): void
    {
        // Solo registrar si cambió el stock_disponible
        if (!$inventario->isDirty('stock_disponible')) {
            return;
        }

        $stockAnterior = $inventario->getOriginal('stock_disponible');
        $stockNuevo = $inventario->stock_disponible;
        $diferencia = $stockNuevo - $stockAnterior;

        // Determinar tipo de movimiento
        $tipo = $diferencia > 0 ? 'ingreso' : 'egreso';

        // Determinar motivo por defecto
        $motivo = $tipo === 'ingreso'
            ? 'Incremento de stock'
            : 'Decremento de stock';

        // Registrar el movimiento
        EppMovimiento::registrar(
            empresaId: $inventario->empresa_id,
            inventarioId: $inventario->id,
            tipo: $tipo,
            cantidad: abs($diferencia),
            stockAnterior: $stockAnterior,
            stockNuevo: $stockNuevo,
            motivo: $motivo,
            documentoReferencia: null,
            observaciones: 'Movimiento registrado automáticamente por cambio en stock',
            entregaId: null,
            usuarioId: auth()->id()
        );
    }

    /**
     * Handle the EppInventario "created" event.
     */
    public function created(EppInventario $inventario): void
    {
        // Si se crea con stock inicial, registrarlo como ingreso
        if ($inventario->stock_disponible > 0) {
            EppMovimiento::registrar(
                empresaId: $inventario->empresa_id,
                inventarioId: $inventario->id,
                tipo: 'ingreso',
                cantidad: $inventario->stock_disponible,
                stockAnterior: 0,
                stockNuevo: $inventario->stock_disponible,
                motivo: 'Stock inicial',
                documentoReferencia: null,
                observaciones: 'Registro de inventario inicial',
                entregaId: null,
                usuarioId: auth()->id()
            );
        }
    }
}
