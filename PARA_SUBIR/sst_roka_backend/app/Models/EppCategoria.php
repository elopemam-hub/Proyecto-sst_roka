<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EppCategoria extends Model
{
    protected $table = 'epps_categorias';

    protected $fillable = [
        'empresa_id', 'nombre', 'descripcion',
        'requiere_talla', 'vida_util_meses', 'activa',
    ];

    protected $casts = [
        'requiere_talla' => 'boolean',
        'activa'         => 'boolean',
    ];

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    public function inventario(): HasMany
    {
        return $this->hasMany(EppInventario::class, 'categoria_id');
    }
}
