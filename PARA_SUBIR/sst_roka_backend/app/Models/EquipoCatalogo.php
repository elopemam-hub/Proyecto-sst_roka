<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EquipoCatalogo extends Model
{
    public $timestamps = false;

    protected $table = 'equipos_catalogo';

    protected $fillable = [
        'submodulo_id', 'nombre', 'descripcion', 'codigo',
        'requiere_operador', 'activo', 'orden',
    ];

    protected $casts = [
        'requiere_operador' => 'boolean',
        'activo'            => 'boolean',
    ];

    public function submodulo(): BelongsTo
    {
        return $this->belongsTo(InspeccionSubmodulo::class, 'submodulo_id');
    }

    public function preguntas(): HasMany
    {
        return $this->hasMany(ChecklistPregunta::class, 'equipo_id')->orderBy('orden');
    }

    public function preguntasActivas(): HasMany
    {
        return $this->hasMany(ChecklistPregunta::class, 'equipo_id')
            ->where('activo', true)
            ->orderBy('orden');
    }

    public function getPreguntasActivasCountAttribute(): int
    {
        return $this->preguntasActivas()->count();
    }
}
