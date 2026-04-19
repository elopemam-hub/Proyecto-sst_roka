<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Sede extends Model
{
    use SoftDeletes;

    protected $table = 'sedes';

    protected $fillable = [
        'empresa_id',
        'nombre',
        'direccion',
        'ubigeo',
        'departamento',
        'provincia',
        'distrito',
        'responsable_sst',
        'activa',
    ];

    protected $casts = [
        'activa' => 'boolean',
    ];

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    public function areas(): HasMany
    {
        return $this->hasMany(Area::class);
    }

    public function personal(): HasMany
    {
        return $this->hasMany(Personal::class);
    }
}
