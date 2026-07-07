<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class UsuarioModuloPermiso extends Model
{
    public $timestamps = false;
    protected $table   = 'usuario_modulo_permisos';
    protected $fillable = [
        'usuario_id','modulo_clave',
        'puede_ver','puede_crear','puede_editar',
        'puede_eliminar','puede_aprobar','puede_exportar',
    ];
    protected $casts = [
        'puede_ver'      => 'boolean',
        'puede_crear'    => 'boolean',
        'puede_editar'   => 'boolean',
        'puede_eliminar' => 'boolean',
        'puede_aprobar'  => 'boolean',
        'puede_exportar' => 'boolean',
    ];
}
