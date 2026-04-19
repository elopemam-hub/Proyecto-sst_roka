<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class Inspeccion extends Model
{
    use SoftDeletes;

    protected $table = 'inspecciones';

    protected $fillable = [
        'empresa_id', 'sede_id', 'area_id',
        'codigo', 'tipo', 'titulo', 'descripcion',
        'planificada_para', 'ejecutada_en',
        'inspector_id', 'supervisor_id', 'elaborado_por',
        'estado',
        'puntaje_total', 'puntaje_obtenido', 'porcentaje_cumplimiento',
        'observaciones_generales', 'requiere_firma',
        // Modo catálogo (checklist dinámico)
        'submodulo_id', 'equipo_catalogo_id', 'turno',
        'items_conformes', 'items_nc', 'items_obs',
    ];

    protected $casts = [
        'planificada_para'       => 'date',
        'ejecutada_en'           => 'datetime',
        'requiere_firma'         => 'boolean',
        'puntaje_total'          => 'decimal:2',
        'puntaje_obtenido'       => 'decimal:2',
        'porcentaje_cumplimiento'=> 'decimal:2',
    ];

    const TIPOS_LABEL = [
        'equipos'         => 'Equipos y Maquinaria',
        'infraestructura' => 'Infraestructura',
        'emergencias'     => 'Equipos de Emergencia',
        'epps'            => 'EPPs',
        'orden_limpieza'  => 'Orden y Limpieza',
        'higiene'         => 'Higiene Industrial',
        'general'         => 'General',
    ];

    public function empresa(): BelongsTo    { return $this->belongsTo(Empresa::class); }
    public function sede(): BelongsTo       { return $this->belongsTo(Sede::class); }
    public function area(): BelongsTo       { return $this->belongsTo(Area::class); }
    public function inspector(): BelongsTo  { return $this->belongsTo(Personal::class, 'inspector_id'); }
    public function supervisor(): BelongsTo { return $this->belongsTo(Personal::class, 'supervisor_id'); }
    public function elaborador(): BelongsTo { return $this->belongsTo(Usuario::class, 'elaborado_por'); }
    public function items(): HasMany        { return $this->hasMany(InspeccionItem::class)->orderBy('numero_item'); }
    public function hallazgos(): HasMany    { return $this->hasMany(InspeccionHallazgo::class); }

    public function firmas(): MorphMany
    {
        return $this->morphMany(Firma::class, 'documento', 'documento_tipo', 'documento_id');
    }

    public function submodulo(): BelongsTo
    {
        return $this->belongsTo(InspeccionSubmodulo::class, 'submodulo_id');
    }

    public function equipoCatalogo(): BelongsTo
    {
        return $this->belongsTo(EquipoCatalogo::class, 'equipo_catalogo_id');
    }

    public function respuestas(): HasMany
    {
        return $this->hasMany(InspeccionRespuesta::class);
    }

    public function firmasCanvas(): HasMany
    {
        return $this->hasMany(InspeccionFirmaCanvas::class);
    }

    public function accionesChecklist(): HasMany
    {
        return $this->hasMany(InspeccionAccionChecklist::class);
    }

    public static function generarCodigo(int $empresaId, string $tipo): string
    {
        $prefijo = strtoupper(substr($tipo, 0, 3));
        $anio    = now()->year;
        $ultimo  = self::where('empresa_id', $empresaId)
            ->where('codigo', 'like', "INS-{$anio}-{$prefijo}-%")
            ->count() + 1;
        return sprintf('INS-%d-%s-%03d', $anio, $prefijo, $ultimo);
    }

    public function calcularPuntaje(): void
    {
        $items = $this->items()->where('aplica', true)->get();
        $total   = $items->sum('puntaje_maximo');
        $obtenido = $items->whereNotNull('puntaje_obtenido')->sum('puntaje_obtenido');

        $this->puntaje_total    = $total;
        $this->puntaje_obtenido = $obtenido;
        $this->porcentaje_cumplimiento = $total > 0 ? round(($obtenido / $total) * 100, 2) : 0;
        $this->save();
    }

    public function getTipoLabelAttribute(): string
    {
        return self::TIPOS_LABEL[$this->tipo] ?? $this->tipo;
    }

    public function getTotalHallazgosCriticosAttribute(): int
    {
        return $this->hallazgos()->where('criticidad', 'critico')->count();
    }
}
