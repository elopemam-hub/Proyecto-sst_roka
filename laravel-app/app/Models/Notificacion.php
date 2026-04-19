<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Notificacion extends Model
{
    protected $table = 'notificaciones';

    protected $fillable = [
        'empresa_id', 'usuario_id', 'titulo', 'mensaje',
        'tipo', 'modulo', 'referencia_tipo', 'referencia_id',
        'leida', 'leida_en', 'url',
    ];

    protected $casts = [
        'leida'    => 'boolean',
        'leida_en' => 'datetime',
    ];

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(Usuario::class);
    }
}
