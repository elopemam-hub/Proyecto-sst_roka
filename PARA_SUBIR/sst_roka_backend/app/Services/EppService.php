<?php

namespace App\Services;

use App\Models\EppInventario;
use App\Models\EppCategoria;
use App\Models\EppMovimiento;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class EppService
{
    /**
     * Obtener inventario con relaciones
     */
    public function getInventario(int $empresaId, array $filters = []): Collection
    {
        $query = EppInventario::where('empresa_id', $empresaId)
            ->with(['categoria', 'proveedor']);

        // Filtros opcionales
        if (!empty($filters['categoria_id'])) {
            $query->where('categoria_id', $filters['categoria_id']);
        }

        if (!empty($filters['activo'])) {
            $query->where('activo', $filters['activo']);
        }

        if (!empty($filters['stock_bajo'])) {
            $query->stockBajo();
        }

        if (!empty($filters['talla'])) {
            $query->where('talla', $filters['talla']);
        }

        return $query->orderBy('nombre')->get();
    }

    /**
     * Crear EPP en inventario
     */
    public function crear(int $empresaId, array $data): EppInventario
    {
        return DB::transaction(function () use ($empresaId, $data) {
            $epp = EppInventario::create([
                ...$data,
                'empresa_id' => $empresaId,
                'stock_disponible' => $data['stock_total'] ?? 0,
            ]);

            // El observer registrará el movimiento automáticamente
            return $epp->load(['categoria', 'proveedor']);
        });
    }

    /**
     * Actualizar EPP
     */
    public function actualizar(int $id, int $empresaId, array $data): EppInventario
    {
        return DB::transaction(function () use ($id, $empresaId, $data) {
            $epp = EppInventario::where('empresa_id', $empresaId)->findOrFail($id);

            // Si cambia el stock total, ajustar disponible proporcionalmente
            if (isset($data['stock_total']) && $data['stock_total'] != $epp->stock_total) {
                $diferencia = $data['stock_total'] - $epp->stock_total;
                $data['stock_disponible'] = max(0, $epp->stock_disponible + $diferencia);
            }

            $epp->update($data);

            return $epp->fresh(['categoria', 'proveedor']);
        });
    }

    /**
     * Eliminar EPP
     */
    public function eliminar(int $id, int $empresaId): bool
    {
        $epp = EppInventario::where('empresa_id', $empresaId)->findOrFail($id);

        // Verificar que no tenga entregas activas
        if ($epp->entregas()->where('estado', 'entregado')->exists()) {
            throw new \Exception('No se puede eliminar: tiene entregas activas');
        }

        return $epp->delete();
    }

    /**
     * Ajustar stock manualmente
     */
    public function ajustarStock(
        int $id,
        int $empresaId,
        int $nuevaCantidad,
        string $motivo,
        ?int $usuarioId = null
    ): EppInventario {
        return DB::transaction(function () use ($id, $empresaId, $nuevaCantidad, $motivo, $usuarioId) {
            $epp = EppInventario::where('empresa_id', $empresaId)
                ->lockForUpdate()
                ->findOrFail($id);

            $stockAnterior = $epp->stock_disponible;

            // Usar método del modelo
            $epp->ajustarStock($nuevaCantidad, $motivo);

            // Registrar movimiento manual
            EppMovimiento::registrar(
                empresaId: $empresaId,
                inventarioId: $epp->id,
                tipo: 'ajuste',
                cantidad: abs($nuevaCantidad - $stockAnterior),
                stockAnterior: $stockAnterior,
                stockNuevo: $nuevaCantidad,
                motivo: $motivo,
                usuarioId: $usuarioId
            );

            return $epp->fresh(['categoria', 'proveedor']);
        });
    }

    /**
     * Obtener categorías
     */
    public function getCategorias(int $empresaId): Collection
    {
        return EppCategoria::where('empresa_id', $empresaId)
            ->where('activa', true)
            ->orderBy('nombre')
            ->get();
    }

    /**
     * Crear categoría
     */
    public function crearCategoria(int $empresaId, array $data): EppCategoria
    {
        return EppCategoria::create([
            ...$data,
            'empresa_id' => $empresaId,
        ]);
    }

    /**
     * Dashboard con estadísticas
     */
    public function getDashboard(int $empresaId): array
    {
        $inventarios = EppInventario::where('empresa_id', $empresaId)
            ->where('activo', true)
            ->get();

        return [
            'total_epps' => $inventarios->count(),
            'stock_total' => $inventarios->sum('stock_total'),
            'stock_disponible' => $inventarios->sum('stock_disponible'),
            'stock_entregado' => $inventarios->sum(fn($i) => $i->stock_total - $i->stock_disponible),
            'valor_total' => $inventarios->sum(fn($i) => $i->stock_total * ($i->costo_unitario ?? 0)),
            'stock_bajo' => $inventarios->filter(fn($i) => $i->stock_disponible <= $i->stock_minimo)->count(),
            'stock_critico' => $inventarios->filter(fn($i) => $i->stock_disponible <= ($i->stock_minimo * 0.5))->count(),
        ];
    }

    /**
     * Trazabilidad de movimientos
     */
    public function getTrazabilidad(int $empresaId, ?int $inventarioId = null): Collection
    {
        $query = EppMovimiento::where('empresa_id', $empresaId)
            ->with(['inventario', 'usuario', 'entrega.personal']);

        if ($inventarioId) {
            $query->where('inventario_id', $inventarioId);
        }

        return $query->orderByDesc('created_at')->limit(100)->get();
    }
}
