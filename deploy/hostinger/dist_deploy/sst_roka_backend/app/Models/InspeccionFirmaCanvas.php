<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InspeccionFirmaCanvas extends Model
{
    public $timestamps = false;

    protected $table = 'inspeccion_firmas_canvas';

    protected $fillable = [
        'inspeccion_id', 'rol_firma', 'usuario_id',
        'nombre_firmante', 'firma_base64', 'ip_firma',
    ];

    protected $hidden = ['firma_base64'];

    public function inspeccion(): BelongsTo
    {
        return $this->belongsTo(Inspeccion::class);
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(Usuario::class);
    }
}
