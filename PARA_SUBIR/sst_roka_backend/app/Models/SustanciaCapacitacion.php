<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class SustanciaCapacitacion extends Model
{
    protected $table = 'sustancia_capacitaciones';
    protected $fillable = [
        'sustancia_id','empresa_id','personal_id','nombre_trabajador',
        'fecha_capacitacion','fecha_vencimiento','tipo_capacitacion',
        'autorizado','observaciones',
    ];
    protected $casts = [
        'fecha_capacitacion' => 'date',
        'fecha_vencimiento'  => 'date',
        'autorizado'         => 'boolean',
    ];
    public function sustancia() { return $this->belongsTo(SustanciaPeligrosa::class, 'sustancia_id'); }
    public function personal()  { return $this->belongsTo(Personal::class); }
}
