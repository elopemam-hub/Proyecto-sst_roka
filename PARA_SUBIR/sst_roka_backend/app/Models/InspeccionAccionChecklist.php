<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InspeccionAccionChecklist extends Model
{
    public $timestamps = false;

    protected $table = 'inspeccion_acciones_checklist';

    protected $fillable = [
        'inspeccion_id', 'pregunta_id', 'descripcion',
        'responsable_id', 'fecha_compromiso', 'prioridad',
        'estado', 'porcentaje', 'evidencia',
    ];

    protected $casts = ['fecha_compromiso' => 'date'];

    public function inspeccion(): BelongsTo
    {
        return $this->belongsTo(Inspeccion::class);
    }

    public function pregunta(): BelongsTo
    {
        return $this->belongsTo(ChecklistPregunta::class, 'pregunta_id');
    }

    public function responsable(): BelongsTo
    {
        return $this->belongsTo(Personal::class, 'responsable_id');
    }
}
