<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Area extends Model
{
    use SoftDeletes;

    protected $table = 'areas';

    protected $fillable = [
        'sede_id',
        'nombre',
        'codigo',
        'tipo',
        'descripcion',
        'activa',
    ];

    protected $casts = [
        'activa' => 'boolean',
    ];

    public function sede(): BelongsTo
    {
        return $this->belongsTo(Sede::class);
    }

    public function personal(): HasMany
    {
        return $this->hasMany(Personal::class);
    }

    public function ipercs(): HasMany
    {
        return $this->hasMany(Iperc::class);
    }

    public function ats(): HasMany
    {
        return $this->hasMany(Ats::class);
    }
}
