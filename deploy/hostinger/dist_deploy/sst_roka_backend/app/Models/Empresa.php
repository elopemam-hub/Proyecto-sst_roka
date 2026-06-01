<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Empresa extends Model
{
    use SoftDeletes;

    protected $table = 'empresas';

    protected $fillable = [
        'razon_social',
        'ruc',
        'ciiu',
        'representante_legal',
        'dni_representante',
        'direccion',
        'telefono',
        'email',
        'logo_path',
        'activa',
    ];

    protected $casts = [
        'activa' => 'boolean',
    ];

    // Relaciones
    public function sedes(): HasMany
    {
        return $this->hasMany(Sede::class);
    }

    public function areas(): HasMany
    {
        return $this->hasMany(Area::class)->through('sedes');
    }

    public function cargos(): HasMany
    {
        return $this->hasMany(Cargo::class);
    }

    public function personal(): HasMany
    {
        return $this->hasMany(Personal::class);
    }

    public function usuarios(): HasMany
    {
        return $this->hasMany(Usuario::class);
    }

    // Accessor para logo URL
    public function getLogoUrlAttribute(): ?string
    {
        return $this->logo_path ? asset('storage/' . $this->logo_path) : null;
    }
}
