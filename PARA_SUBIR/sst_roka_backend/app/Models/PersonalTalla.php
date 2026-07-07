<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PersonalTalla extends Model
{
    protected $table = 'personal_tallas';

    protected $fillable = [
        'empresa_id',
        'personal_id',
        'categoria_epp_id',
        'talla',
        'observaciones',
        'actualizado_por',
    ];

    // ═══════════════════════════════════════════════════════════════════════
    // RELACIONES
    // ═══════════════════════════════════════════════════════════════════════

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    public function personal(): BelongsTo
    {
        return $this->belongsTo(Personal::class);
    }

    public function categoria(): BelongsTo
    {
        return $this->belongsTo(EppCategoria::class, 'categoria_epp_id');
    }

    public function actualizadoPor(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'actualizado_por');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SCOPES
    // ═══════════════════════════════════════════════════════════════════════

    public function scopePorPersonal($query, int $personalId)
    {
        return $query->where('personal_id', $personalId);
    }

    public function scopePorCategoria($query, int $categoriaId)
    {
        return $query->where('categoria_epp_id', $categoriaId);
    }
}
