<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IpercBanco extends Model
{
    protected $table = 'iperc_banco';

    protected $fillable = [
        'empresa_id', 'tipo', 'codigo', 'nombre', 'descripcion',
        'categoria', 'subcategoria', 'area_aplicacion', 'norma_referencia',
        'tipo_control', 'costo_referencial',
        'duracion_horas', 'modalidad',
        'nivel_cargo', 'activo',
    ];

    protected $casts = [
        'activo'            => 'boolean',
        'costo_referencial' => 'decimal:2',
        'duracion_horas'    => 'integer',
    ];

    const TIPOS = [
        'actividad'    => 'Actividad',
        'tarea'        => 'Tarea',
        'puesto'       => 'Puesto de Trabajo',
        'situacion'    => 'Situación',
        'peligro'      => 'Peligro',
        'riesgo'       => 'Riesgo',
        'consecuencia' => 'Consecuencia',
        'capacitacion' => 'Capacitación',
        'control'      => 'Control',
    ];

    const CATEGORIAS_PELIGRO = [
        'fisico', 'quimico', 'biologico', 'ergonomico',
        'psicosocial', 'mecanico', 'electrico', 'locativo',
        'fenomeno_natural', 'otro',
    ];

    const TIPOS_CONTROL = [
        'eliminacion', 'sustitucion', 'ingenieria', 'administrativo', 'epp',
    ];

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }
}
