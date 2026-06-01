<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AccidenteInvestigacion extends Model
{
    protected $table = 'accidentes_investigacion';

    protected $fillable = [
        'accidente_id',
        'metodologia',
        'causas_inmediatas', 'causas_basicas',
        'factores_trabajo', 'factores_personales',
        'descripcion_metodologia', 'lecciones_aprendidas',
        'investigador_id',
        'fecha_inicio_investigacion', 'fecha_cierre_investigacion',
    ];

    protected $casts = [
        'causas_inmediatas'           => 'array',
        'causas_basicas'              => 'array',
        'fecha_inicio_investigacion'  => 'date',
        'fecha_cierre_investigacion'  => 'date',
    ];

    public function accidente(): BelongsTo    { return $this->belongsTo(Accidente::class); }
    public function investigador(): BelongsTo { return $this->belongsTo(Usuario::class, 'investigador_id'); }
}
