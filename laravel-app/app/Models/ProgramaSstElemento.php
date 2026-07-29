<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Sección numerada del Programa Anual de SST: "1 EVALUACIÓN Y DIAGNÓSTICO DE
 * LÍNEA BASE", "3 CAPACITACIÓN"… Agrupa las actividades 1.1, 1.2, 3.1…
 */
class ProgramaSstElemento extends Model
{
    protected $table = 'programa_sst_elementos';

    protected $fillable = ['programa_id', 'numero', 'nombre', 'orden'];

    protected $casts = [
        'numero' => 'integer',
        'orden'  => 'integer',
    ];

    public function programa(): BelongsTo
    {
        return $this->belongsTo(ProgramaSst::class, 'programa_id');
    }

    public function actividades(): HasMany
    {
        return $this->hasMany(ProgramaSstActividad::class, 'elemento_id')->orderBy('orden');
    }
}
