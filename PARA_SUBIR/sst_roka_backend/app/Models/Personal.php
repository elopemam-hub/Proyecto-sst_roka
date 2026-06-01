<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Personal extends Model
{
    use SoftDeletes;

    protected $table = 'personal';

    protected $fillable = [
        'empresa_id', 'sede_id', 'area_id', 'cargo_id',
        'nombres', 'apellidos', 'dni',
        'fecha_nacimiento', 'genero',
        'telefono', 'email', 'direccion', 'foto_path',
        'codigo_empleado', 'fecha_ingreso', 'fecha_cese',
        'tipo_contrato', 'estado', 'es_supervisor_sst',
        'contacto_emergencia_nombre', 'contacto_emergencia_telefono',
        'grupo_sanguineo',
    ];

    protected $casts = [
        'fecha_nacimiento' => 'date',
        'fecha_ingreso'    => 'date',
        'fecha_cese'       => 'date',
        'es_supervisor_sst' => 'boolean',
    ];

    // Relaciones
    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    public function sede(): BelongsTo
    {
        return $this->belongsTo(Sede::class);
    }

    public function area(): BelongsTo
    {
        return $this->belongsTo(Area::class);
    }

    public function cargo(): BelongsTo
    {
        return $this->belongsTo(Cargo::class);
    }

    public function usuario(): HasOne
    {
        return $this->hasOne(Usuario::class);
    }

    // Nombre completo
    public function getNombreCompletoAttribute(): string
    {
        return "{$this->nombres} {$this->apellidos}";
    }

    // Foto URL
    public function getFotoUrlAttribute(): ?string
    {
        return $this->foto_path ? asset('storage/' . $this->foto_path) : null;
    }

    // Años de antigüedad
    public function getAntiguedadAniosAttribute(): int
    {
        return $this->fecha_ingreso->diffInYears(now());
    }
}
