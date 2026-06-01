<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class FormatoArchivo extends Model
{
    protected $table = 'formato_archivos';

    protected $fillable = [
        'empresa_id', 'nombre', 'descripcion', 'categoria', 'tipo_registro',
        'archivo_path', 'archivo_nombre_orig', 'archivo_extension',
        'archivo_mime', 'archivo_tamano', 'version', 'activo', 'descargas', 'subido_por',
    ];

    protected $casts = [
        'activo'         => 'boolean',
        'archivo_tamano' => 'integer',
        'descargas'      => 'integer',
    ];

    protected $appends = ['archivo_url', 'tamano_legible', 'icono_tipo'];

    public function empresa(): BelongsTo  { return $this->belongsTo(Empresa::class); }
    public function subidoPor(): BelongsTo { return $this->belongsTo(Usuario::class, 'subido_por'); }

    public function getArchivoUrlAttribute(): ?string
    {
        return $this->archivo_path
            ? asset('storage/' . $this->archivo_path)
            : null;
    }

    public function getTamanoLegibleAttribute(): string
    {
        $bytes = $this->archivo_tamano;
        if ($bytes < 1024)        return "{$bytes} B";
        if ($bytes < 1048576)     return round($bytes / 1024, 1) . ' KB';
        return round($bytes / 1048576, 1) . ' MB';
    }

    public function getIconoTipoAttribute(): string
    {
        return match($this->archivo_extension) {
            'pdf'           => 'pdf',
            'xlsx', 'xls'   => 'excel',
            'docx', 'doc'   => 'word',
            'pptx', 'ppt'   => 'ppt',
            default         => 'file',
        };
    }
}
