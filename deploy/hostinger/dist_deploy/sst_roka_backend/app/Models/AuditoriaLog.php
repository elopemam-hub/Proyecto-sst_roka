<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuditoriaLog extends Model
{
    protected $table = 'auditoria_log';

    // Append-only — no actualizar ni eliminar
    protected $fillable = [
        'empresa_id', 'usuario_id', 'modulo', 'accion',
        'descripcion', 'referencia_tipo', 'referencia_id',
        'valor_anterior', 'valor_nuevo', 'ip', 'user_agent',
    ];

    protected $casts = [
        'valor_anterior' => 'array',
        'valor_nuevo'    => 'array',
    ];

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(Usuario::class);
    }
}
