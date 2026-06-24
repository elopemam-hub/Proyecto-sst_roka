<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EppResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'nombre' => $this->nombre,
            'codigo_interno' => $this->codigo_interno,
            'talla' => $this->talla,

            // Relaciones
            'categoria' => [
                'id' => $this->categoria->id ?? null,
                'nombre' => $this->categoria->nombre ?? null,
                'vida_util_meses' => $this->categoria->vida_util_meses ?? null,
            ],
            'proveedor' => $this->when($this->proveedor, [
                'id' => $this->proveedor->id ?? null,
                'razon_social' => $this->proveedor->razon_social ?? null,
                'ruc' => $this->proveedor->ruc ?? null,
            ]),

            // Stock
            'stock_total' => $this->stock_total,
            'stock_disponible' => $this->stock_disponible,
            'stock_minimo' => $this->stock_minimo,
            'stock_maximo' => $this->stock_maximo,

            // Atributos calculados
            'stock_critico' => $this->stock_critico,
            'requiere_reposicion' => $this->requiere_reposicion,
            'porcentaje_disponible' => $this->porcentaje_disponible,
            'valor_total_stock' => $this->valor_total_stock,

            // Otros
            'costo_unitario' => $this->costo_unitario,
            'ubicacion' => $this->ubicacion,
            'lote' => $this->lote,
            'fecha_adquisicion' => $this->fecha_adquisicion,
            'activo' => $this->activo,

            // Metadatos
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
