<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChecklistPregunta extends Model
{
    protected $table = 'checklist_preguntas';

    protected $fillable = [
        'equipo_id', 'orden', 'texto', 'tipo_respuesta',
        'es_obligatoria', 'permite_foto', 'permite_nota',
        'permite_cantidad', 'permite_fecha_vencimiento',
        'ayuda', 'valor_limite', 'activo', 'frecuencia',
    ];

    protected $casts = [
        'es_obligatoria'           => 'boolean',
        'permite_foto'             => 'boolean',
        'permite_nota'             => 'boolean',
        'permite_cantidad'         => 'boolean',
        'permite_fecha_vencimiento'=> 'boolean',
        'activo'                   => 'boolean',
    ];

    public function equipo(): BelongsTo
    {
        return $this->belongsTo(EquipoCatalogo::class, 'equipo_id');
    }
}
