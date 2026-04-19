<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class Usuario extends Authenticatable
{
    use HasApiTokens, Notifiable, SoftDeletes;

    protected $table = 'usuarios';

    protected $fillable = [
        'personal_id',
        'empresa_id',
        'nombre',
        'email',
        'password',
        'rol',
        'permisos',
        'activo',
        'dos_factores',
        'dos_factores_secret',
        'ultimo_acceso',
        'ultimo_ip',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'dos_factores_secret',
    ];

    protected $casts = [
        'permisos'       => 'array',
        'activo'         => 'boolean',
        'dos_factores'   => 'boolean',
        'ultimo_acceso'  => 'datetime',
        'bloqueado_hasta' => 'datetime',
    ];

    // Permisos por rol (jerárquicos)
    const PERMISOS_ROL = [
        'administrador'  => ['*'],
        'supervisor_sst' => ['dashboard','inspecciones','iperc','ats','accidentes','capacitaciones','epps','salud','seguimiento','reportes'],
        'tecnico_sst'    => ['dashboard','inspecciones','iperc','ats','accidentes','capacitaciones','epps','salud','seguimiento'],
        'operativo'      => ['dashboard','inspecciones.ver','ats','epps.ver'],
        'vigilante'      => ['dashboard','inspecciones.ver'],
        'solo_lectura'   => ['dashboard'],
    ];

    // Relaciones
    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    public function personal(): BelongsTo
    {
        return $this->belongsTo(Personal::class);
    }

    public function notificaciones(): HasMany
    {
        return $this->hasMany(Notificacion::class, 'usuario_id');
    }

    // Verificar si tiene permiso
    public function tienePermiso(string $permiso): bool
    {
        $permisosMiRol = self::PERMISOS_ROL[$this->rol] ?? [];

        // Administrador tiene todo
        if (in_array('*', $permisosMiRol)) {
            return true;
        }

        // Permiso exacto o comodín de módulo
        $modulo = explode('.', $permiso)[0];
        return in_array($permiso, $permisosMiRol)
            || in_array($modulo, $permisosMiRol)
            || in_array($permiso, $this->permisos ?? []);
    }

    // Es administrador
    public function esAdmin(): bool
    {
        return $this->rol === 'administrador';
    }

    // Registrar último acceso
    public function registrarAcceso(string $ip): void
    {
        $this->update([
            'ultimo_acceso'    => now(),
            'ultimo_ip'        => $ip,
            'intentos_fallidos' => 0,
            'bloqueado_hasta'  => null,
        ]);
    }

    // Notificaciones no leídas
    public function getNotificacionesNoLeidasAttribute(): int
    {
        return $this->notificaciones()->where('leida', false)->count();
    }
}
