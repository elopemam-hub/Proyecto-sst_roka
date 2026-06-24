<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QrScan extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'equipo_id',
        'usuario_id',
        'ip',
        'user_agent',
        'latitud',
        'longitud',
        'precision_metros',
        'accion',
        'escaneado_en',
    ];

    protected $casts = [
        'escaneado_en' => 'datetime',
        'latitud' => 'decimal:8',
        'longitud' => 'decimal:8',
    ];

    public function equipo(): BelongsTo
    {
        return $this->belongsTo(Equipo::class);
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(Usuario::class);
    }
}
