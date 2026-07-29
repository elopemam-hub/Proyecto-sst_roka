<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class SustanciaExposicion extends Model
{
    protected $table = 'sustancia_exposiciones';
    protected $fillable = [
        'sustancia_id','empresa_id','personal_id','nombre_trabajador','cargo',
        'area_id','frecuencia','duracion_horas','via_exposicion',
        'nivel_medido','nivel_medido_valor','nivel_medido_unidad',
        'resultado_evaluacion','evaluacion_automatica','pct_limite',
        'limite_aplicado','motivo_evaluacion','fecha_evaluacion',
        'medidas_control','observaciones',
    ];
    protected $casts = [
        'fecha_evaluacion'   => 'date',
        'duracion_horas'     => 'decimal:2',
        'nivel_medido_valor' => 'decimal:4',
        'pct_limite'         => 'decimal:2',
    ];
    public function sustancia() { return $this->belongsTo(SustanciaPeligrosa::class, 'sustancia_id'); }
    public function personal()  { return $this->belongsTo(Personal::class); }
}
