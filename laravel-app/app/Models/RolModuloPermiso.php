<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class RolModuloPermiso extends Model
{
    public $timestamps = false;
    protected $table   = 'rol_modulo_permisos';
    protected $fillable = [
        'rol','modulo_clave',
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
