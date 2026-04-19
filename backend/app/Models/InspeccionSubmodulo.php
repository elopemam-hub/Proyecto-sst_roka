<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InspeccionSubmodulo extends Model
{
    public $timestamps = false;

    protected $table = 'inspeccion_submodulos';

    protected $fillable = ['codigo', 'nombre', 'color', 'activo'];

    protected $casts = ['activo' => 'boolean'];

    public function equipos(): HasMany
    {
        return $this->hasMany(EquipoCatalogo::class, 'submodulo_id')->orderBy('orden');
    }
}
