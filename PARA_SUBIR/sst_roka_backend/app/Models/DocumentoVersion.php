<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DocumentoVersion extends Model
{
    protected $table = 'documentos_versiones';

    protected $fillable = [
        'documento_id', 'version', 'archivo_path', 'cambios', 'creado_por',
    ];

    // ─── Relaciones ────────────────────────────────────────────────────

    public function documento(): BelongsTo
    {
        return $this->belongsTo(Documento::class);
    }

    public function creadoPor(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'creado_por');
    }
}
