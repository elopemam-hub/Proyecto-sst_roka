<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Accidente extends Model
{
    use SoftDeletes;

    protected $table = 'accidentes';

    protected $fillable = [
        'empresa_id', 'sede_id', 'area_id',
        'codigo', 'tipo',
        'fecha_accidente', 'lugar_exacto', 'descripcion_evento',
        'accidentado_id', 'testigos',
        'dias_perdidos', 'parte_cuerpo_afectada', 'tipo_lesion',
        'agente_causante', 'descripcion_lesion',
        'requiere_hospitalizacion', 'centro_medico', 'descripcion_atencion',
        'estado',
        'notificado_mintra', 'fecha_notificacion_mintra', 'numero_notificacion_mintra',
        'elaborado_por',
        'costo_atencion', 'costo_dias_perdidos', 'costo_danos_materiales', 'costo_total',
    ];

    protected $casts = [
        'fecha_accidente'            => 'datetime',
        'fecha_notificacion_mintra'  => 'date',
        'requiere_hospitalizacion'   => 'boolean',
        'notificado_mintra'          => 'boolean',
        'testigos'                   => 'array',
        'costo_atencion'             => 'decimal:2',
        'costo_dias_perdidos'        => 'decimal:2',
        'costo_danos_materiales'     => 'decimal:2',
        'costo_total'                => 'decimal:2',
    ];

    // Horas límite para notificar a MINTRA según tipo
    const HORAS_NOTIFICACION_MINTRA = [
        'accidente_mortal'      => 24,
        'incidente_peligroso'   => 24,
        'accidente_incapacitante' => 48,
    ];

    public function empresa(): BelongsTo      { return $this->belongsTo(Empresa::class); }
    public function sede(): BelongsTo         { return $this->belongsTo(Sede::class); }
    public function area(): BelongsTo         { return $this->belongsTo(Area::class); }
    public function accidentado(): BelongsTo  { return $this->belongsTo(Personal::class, 'accidentado_id'); }
    public function elaborador(): BelongsTo   { return $this->belongsTo(Usuario::class, 'elaborado_por'); }
    public function investigacion(): HasOne   { return $this->hasOne(AccidenteInvestigacion::class); }
    public function acciones(): HasMany       { return $this->hasMany(AccidenteAccion::class); }

    public static function generarCodigo(int $empresaId, string $tipo): string
    {
        $prefijo = match($tipo) {
            'accidente_mortal'         => 'ACM',
            'accidente_incapacitante'  => 'ACI',
            'accidente_leve'           => 'ACL',
            'incidente_peligroso'      => 'INP',
            default                    => 'INC',
        };
        $anio   = now()->year;
        $ultimo = self::where('empresa_id', $empresaId)
            ->whereYear('fecha_accidente', $anio)
            ->count() + 1;
        return sprintf('ACC-%d-%s-%04d', $anio, $prefijo, $ultimo);
    }

    public function getCostoTotalCalculadoAttribute(): float
    {
        return (float) ($this->costo_atencion ?? 0)
            + (float) ($this->costo_dias_perdidos ?? 0)
            + (float) ($this->costo_danos_materiales ?? 0);
    }

    public function getRequiereNotificacionMintaAttribute(): bool
    {
        return isset(self::HORAS_NOTIFICACION_MINTRA[$this->tipo]);
    }

    public function getHorasParaNotificarAttribute(): ?int
    {
        return self::HORAS_NOTIFICACION_MINTRA[$this->tipo] ?? null;
    }
}
