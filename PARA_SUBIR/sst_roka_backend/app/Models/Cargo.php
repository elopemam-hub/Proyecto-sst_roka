<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Cargo extends Model
{
    use SoftDeletes;

    protected $table = 'cargos';

    protected $fillable = [
        'empresa_id',
        'nombre',
        'codigo',
        'es_critico',
        'requiere_emo',
        'funciones',
    ];

    protected $casts = [
        'es_critico'   => 'boolean',
        'requiere_emo' => 'boolean',
    ];

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    public function personal(): HasMany
    {
        return $this->hasMany(Personal::class);
    }
}
