<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EquipoAsignacionRegla extends Model
{
    use SoftDeletes;

    protected $table = 'equipo_asignacion_reglas';

    protected $fillable = [
        'empresa_id', 'area_id', 'equipo_id', 'usuario_id', 'tipo_id',
        'turno', 'dias_semana', 'activo', 'observaciones', 'creado_por',
    ];

    protected $casts = [
        'dias_semana' => 'array',
        'activo'      => 'boolean',
    ];

    public function empresa(): BelongsTo   { return $this->belongsTo(Empresa::class); }
    public function area(): BelongsTo      { return $this->belongsTo(Area::class); }
    public function equipo(): BelongsTo    { return $this->belongsTo(Equipo::class); }
    public function usuario(): BelongsTo   { return $this->belongsTo(Usuario::class); }
    public function tipo(): BelongsTo      { return $this->belongsTo(EquipoTipo::class, 'tipo_id'); }
    public function creadoPor(): BelongsTo { return $this->belongsTo(Usuario::class, 'creado_por'); }
}
