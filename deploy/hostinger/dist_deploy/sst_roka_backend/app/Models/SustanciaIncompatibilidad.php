<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class SustanciaIncompatibilidad extends Model
{
    protected $table = 'sustancia_incompatibilidades';
    public $timestamps = false;
    protected $fillable = ['empresa_id','sustancia_a_id','sustancia_b_id','nivel','descripcion'];
    public function sustanciaA() { return $this->belongsTo(SustanciaPeligrosa::class, 'sustancia_a_id'); }
    public function sustanciaB() { return $this->belongsTo(SustanciaPeligrosa::class, 'sustancia_b_id'); }
}
