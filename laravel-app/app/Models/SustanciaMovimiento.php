<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class SustanciaMovimiento extends Model
{
    protected $table = 'sustancia_movimientos';
    protected $fillable = [
        'sustancia_id','empresa_id','tipo','cantidad','stock_resultante',
        'unidad_medida','motivo','referencia','usuario_id','fecha','observaciones',
    ];
    protected $casts = [
        'cantidad'         => 'decimal:2',
        'stock_resultante' => 'decimal:2',
        'fecha'            => 'date',
    ];
    public function sustancia() { return $this->belongsTo(SustanciaPeligrosa::class, 'sustancia_id'); }
}
