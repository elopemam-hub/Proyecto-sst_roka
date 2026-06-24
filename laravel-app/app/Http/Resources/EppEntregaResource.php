<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EppEntregaResource extends JsonResource
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
            'cantidad' => $this->cantidad,
            'estado' => $this->estado,

            // Personal
            'personal' => [
                'id' => $this->personal->id ?? null,
                'nombres' => $this->personal->nombres ?? null,
                'apellidos' => $this->personal->apellidos ?? null,
                'dni' => $this->personal->dni ?? null,
            ],

            // EPP
            'inventario' => [
                'id' => $this->inventario->id ?? null,
                'nombre' => $this->inventario->nombre ?? null,
                'codigo_interno' => $this->inventario->codigo_interno ?? null,
            ],

            // Fechas
            'fecha_entrega' => $this->fecha_entrega,
            'fecha_vencimiento' => $this->fecha_vencimiento,
            'fecha_devolucion' => $this->fecha_devolucion,

            // Atributos calculados
            'esta_vencido' => $this->esta_vencido ?? false,
            'dias_para_vencer' => $this->dias_para_vencer ?? null,

            // Otros
            'motivo_entrega' => $this->motivo_entrega,
            'observaciones' => $this->observaciones,
            'tiene_firma' => !empty($this->firma_path),
            'firma_url' => $this->firma_path ? asset('storage/' . $this->firma_path) : null,

            // Auditoría
            'entregado_por' => [
                'id' => $this->entregadoPor->id ?? null,
                'nombre' => $this->entregadoPor->nombre ?? null,
            ],

            // Metadatos
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
