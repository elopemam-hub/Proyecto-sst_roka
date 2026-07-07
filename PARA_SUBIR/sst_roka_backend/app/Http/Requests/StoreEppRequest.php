<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreEppRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true; // Autorización manejada por middleware
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'categoria_id'      => 'required|exists:epps_categorias,id',
            'proveedor_id'      => 'nullable|exists:epps_proveedores,id',
            'nombre'            => 'required|string|max:200',
            'codigo_interno'    => 'nullable|string|max:50',
            'talla'             => 'nullable|string|max:20',
            'stock_total'       => 'required|integer|min:0',
            'stock_minimo'      => 'required|integer|min:0',
            'stock_maximo'      => 'nullable|integer|min:0',
            'costo_unitario'    => 'nullable|numeric|min:0',
            'ubicacion'         => 'nullable|string|max:100',
            'lote'              => 'nullable|string|max:50',
            'fecha_adquisicion' => 'nullable|date',
            'activo'            => 'nullable|boolean',
        ];
    }

    /**
     * Mensajes personalizados
     */
    public function messages(): array
    {
        return [
            'categoria_id.required' => 'La categoría es obligatoria',
            'nombre.required' => 'El nombre del EPP es obligatorio',
            'stock_total.required' => 'El stock total es obligatorio',
            'stock_minimo.required' => 'El stock mínimo es obligatorio',
        ];
    }
}
