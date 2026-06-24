<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EquipoTipo extends Model
{
    protected $table = 'equipos_tipos';

    protected $fillable = [
        'empresa_id', 'nombre', 'descripcion', 'icono', 'activo', 'orden',
    ];

    protected $casts = [
        'activo' => 'boolean',
    ];

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    public function equipos(): HasMany
    {
        return $this->hasMany(Equipo::class, 'tipo_id');
    }
}
