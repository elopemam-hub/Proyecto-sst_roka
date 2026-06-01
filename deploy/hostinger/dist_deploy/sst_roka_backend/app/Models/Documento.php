<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Storage;

class Documento extends Model
{
    protected $table = 'documentos';

    protected $fillable = [
        'empresa_id', 'area_id', 'codigo', 'titulo', 'descripcion',
        'tipo', 'version_actual', 'estado', 'archivo_path', 'archivo_nombre',
        'creado_por', 'aprobado_por', 'fecha_aprobacion', 'fecha_revision',
        'observaciones',
    ];

    protected $casts = [
        'fecha_aprobacion' => 'date',
        'fecha_revision'   => 'date',
    ];

    protected $appends = ['archivo_url'];

    // ─── Relaciones ────────────────────────────────────────────────────

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    public function area(): BelongsTo
    {
        return $this->belongsTo(Area::class);
    }

    public function versiones(): HasMany
    {
        return $this->hasMany(DocumentoVersion::class)->orderByDesc('created_at');
    }

    public function creadoPor(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'creado_por');
    }

    public function aprobadoPor(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'aprobado_por');
    }

    // ─── Accessors ─────────────────────────────────────────────────────

    public function getArchivoUrlAttribute(): ?string
    {
        if (!$this->archivo_path) return null;
        return Storage::url($this->archivo_path);
    }

    // ─── Scopes ────────────────────────────────────────────────────────

    public function scopeAprobados(Builder $query): Builder
    {
        return $query->where('estado', 'aprobado');
    }

    public function scopePorTipo(Builder $query, string $tipo): Builder
    {
        return $query->where('tipo', $tipo);
    }
}
