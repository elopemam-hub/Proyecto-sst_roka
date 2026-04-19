<?php

namespace App\Services;

use App\Models\Usuario;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AuditoriaService
{
    /**
     * Registrar una acción en el log de auditoría
     * El log es inmutable — solo se puede insertar, nunca actualizar ni borrar
     */
    public function registrar(
        string   $modulo,
        string   $accion,
        ?Usuario $usuario = null,
        string   $modelo = '',
        ?int     $modeloId = null,
        mixed    $valorAnterior = null,
        mixed    $valorNuevo = null,
        ?Request $request = null
    ): void {
        try {
            DB::table('auditoria_log')->insert([
                'usuario_id'      => $usuario?->id,
                'usuario_nombre'  => $usuario?->nombre,
                'modulo'          => $modulo,
                'accion'          => $accion,
                'modelo'          => $modelo ?: null,
                'modelo_id'       => $modeloId,
                'valor_anterior'  => $valorAnterior ? json_encode($valorAnterior) : null,
                'valor_nuevo'     => $valorNuevo ? json_encode($valorNuevo) : null,
                'ip'              => $request?->ip(),
                'user_agent'      => $request?->userAgent(),
                'creado_en'       => now(),
            ]);
        } catch (\Exception $e) {
            // El log de auditoría nunca debe detener el flujo principal
            Log::error("Error al registrar auditoría: {$e->getMessage()}");
        }
    }

    /**
     * Registrar cambios en un modelo Eloquent (antes/después)
     */
    public function registrarCambioModelo(
        string   $modulo,
        string   $accion,
        ?Usuario $usuario,
        string   $modelo,
        int      $modeloId,
        array    $anterior,
        array    $nuevo,
        ?Request $request = null
    ): void {
        // Solo registrar campos que cambiaron
        $camposCambiados = array_keys(array_diff_assoc($nuevo, $anterior));

        $this->registrar(
            modulo: $modulo,
            accion: $accion,
            usuario: $usuario,
            modelo: $modelo,
            modeloId: $modeloId,
            valorAnterior: array_intersect_key($anterior, array_flip($camposCambiados)),
            valorNuevo: array_intersect_key($nuevo, array_flip($camposCambiados)),
            request: $request
        );
    }
}
