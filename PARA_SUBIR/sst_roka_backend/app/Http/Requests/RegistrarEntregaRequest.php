<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class RegistrarEntregaRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'personal_id'       => 'required|exists:personal,id',
            'inventario_id'     => 'required|exists:epps_inventario,id',
            'cantidad'          => 'required|integer|min:1',
            'fecha_entrega'     => 'required|date',
            'fecha_vencimiento' => 'nullable|date|after:fecha_entrega',
            'motivo_entrega'    => 'required|in:ingreso,reposicion,deterioro,talla,perdida',
            'observaciones'     => 'nullable|string|max:500',
            'firma'             => 'nullable|string|regex:/^data:image\/(png|jpeg|jpg);base64,/',
        ];
    }

    public function messages(): array
    {
        return [
            'personal_id.required' => 'El trabajador es obligatorio',
            'inventario_id.required' => 'El EPP es obligatorio',
            'cantidad.required' => 'La cantidad es obligatoria',
            'cantidad.min' => 'La cantidad debe ser mayor a 0',
            'fecha_entrega.required' => 'La fecha de entrega es obligatoria',
            'motivo_entrega.required' => 'El motivo es obligatorio',
            'firma.regex' => 'Formato de firma inválido',
        ];
    }
}
