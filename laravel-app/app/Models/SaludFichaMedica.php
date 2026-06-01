<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SaludFichaMedica extends Model
{
    protected $table = 'salud_fichas_medicas';

    protected $fillable = [
        'personal_id', 'empresa_id',
        'estado_civil', 'turno',
        'anios_empresa', 'puestos_anteriores', 'exposiciones_laborales', 'descripcion_trabajo',
        'enfermedades_cronicas', 'cirugias', 'alergias', 'medicamentos_actuales',
        'accidente_trabajo', 'accidentes_previos',
        'antecedentes_familiares',
        'fumador', 'cigarrillos_dia', 'consumo_alcohol', 'actividad_fisica',
        'vacunas',
    ];

    protected $casts = [
        'puestos_anteriores'     => 'array',
        'exposiciones_laborales' => 'array',
        'antecedentes_familiares'=> 'array',
        'vacunas'                => 'array',
        'fumador'                => 'boolean',
    ];

    public function personal(): BelongsTo { return $this->belongsTo(Personal::class); }
    public function empresa(): BelongsTo  { return $this->belongsTo(Empresa::class); }
}
