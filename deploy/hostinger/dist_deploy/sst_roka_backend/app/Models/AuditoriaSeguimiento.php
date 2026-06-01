<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuditoriaSeguimiento extends Model
{
    protected $table = 'auditoria_seguimiento';

    protected $fillable = [
        'hallazgo_id', 'fecha', 'descripcion', 'evidencia_cierre',
        'verificado_por', 'resultado',
    ];

    protected $casts = [
        'fecha' => 'date',
    ];

    public function hallazgo(): BelongsTo
    {
        return $this->belongsTo(AuditoriaHallazgo::class, 'hallazgo_id');
    }
}
