<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class Ats extends Model
{
    use SoftDeletes;

    protected $table = 'ats';

    protected $fillable = [
        'empresa_id', 'area_id', 'iperc_id',
        'codigo', 'titulo_trabajo', 'descripcion', 'ubicacion',
        'fecha_ejecucion', 'hora_inicio', 'hora_fin',
        'nivel_riesgo', 'requiere_permiso_especial',
        'supervisor_id', 'elaborado_por',
        'estado', 'autorizado_en', 'cerrado_en', 'cerrado_por',
        'observaciones_cierre',
    ];

    protected $casts = [
        'fecha_ejecucion'           => 'date',
        'autorizado_en'             => 'datetime',
        'cerrado_en'                => 'datetime',
        'requiere_permiso_especial' => 'boolean',
    ];

    // Relaciones
    public function empresa(): BelongsTo     { return $this->belongsTo(Empresa::class); }
    public function area(): BelongsTo        { return $this->belongsTo(Area::class); }
    public function iperc(): BelongsTo       { return $this->belongsTo(Iperc::class); }
    public function supervisor(): BelongsTo  { return $this->belongsTo(Personal::class, 'supervisor_id'); }
    public function elaborador(): BelongsTo  { return $this->belongsTo(Usuario::class, 'elaborado_por'); }
    public function tareas(): HasMany        { return $this->hasMany(AtsTarea::class)->orderBy('orden'); }
    public function participantes(): HasMany { return $this->hasMany(AtsParticipante::class); }
    public function permisos(): HasMany      { return $this->hasMany(PermisoTrabajo::class); }

    public function firmas(): MorphMany
    {
        return $this->morphMany(Firma::class, 'documento', 'documento_tipo', 'documento_id');
    }

    // Generar código
    public static function generarCodigo(int $empresaId, int $areaId): string
    {
        $area = Area::find($areaId);
        $codigoArea = strtoupper(substr($area->codigo ?? $area->tipo, 0, 3));
        $anio = now()->year;
        $ultimo = self::where('empresa_id', $empresaId)
            ->where('codigo', 'like', "ATS-{$anio}-{$codigoArea}-%")
            ->count() + 1;
        return sprintf('ATS-%d-%s-%04d', $anio, $codigoArea, $ultimo);
    }

    // ¿Puede ser ejecutado?
    public function getPuedeEjecutarseAttribute(): bool
    {
        return $this->estado === 'autorizado'
            && $this->participantes()->whereNotNull('firmado_en')->count() === $this->participantes()->count();
    }

    // Duración en minutos
    public function getDuracionMinutosAttribute(): ?int
    {
        if (!$this->hora_fin || !$this->hora_inicio) return null;
        return now()->parse($this->hora_inicio)->diffInMinutes(now()->parse($this->hora_fin));
    }

    // Scope: ATS del día
    public function scopeDelDia($query, $fecha = null)
    {
        return $query->whereDate('fecha_ejecucion', $fecha ?? today());
    }

    // Scope: por nivel de riesgo
    public function scopeNivelRiesgo($query, string $nivel)
    {
        return $query->where('nivel_riesgo', $nivel);
    }
}
