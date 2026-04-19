<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class FlujosFirmaSeeder extends Seeder
{
    public function run(): void
    {
        $empresaId = DB::table('empresas')->value('id');
        if (!$empresaId) {
            $this->command->warn('No hay empresas — omitiendo seeder de flujos de firma');
            return;
        }

        // ======================================
        // Flujo IPERC: Elabora → Revisa → Aprueba
        // ======================================
        $flujoIpercId = DB::table('firmas_flujos')->insertGetId([
            'empresa_id'       => $empresaId,
            'nombre'           => 'Flujo estándar IPERC',
            'documento_tipo'   => 'iperc',
            'descripcion'      => 'Elaboración (Técnico SST) → Revisión (Supervisor SST) → Aprobación (Gerencia)',
            'activo'           => true,
            'created_at'       => now(),
            'updated_at'       => now(),
        ]);

        $firmantesIperc = [
            ['orden' => 1, 'rol_firma' => 'elaborador', 'rol_requerido' => 'tecnico_sst',   'titulo' => 'Elaborado por'],
            ['orden' => 2, 'rol_firma' => 'revisor',    'rol_requerido' => 'supervisor_sst','titulo' => 'Revisado por'],
            ['orden' => 3, 'rol_firma' => 'aprobador',  'rol_requerido' => 'administrador', 'titulo' => 'Aprobado por'],
        ];

        foreach ($firmantesIperc as $f) {
            DB::table('firmas_flujo_firmantes')->insert(array_merge($f, [
                'flujo_id'   => $flujoIpercId,
                'created_at' => now(),
                'updated_at' => now(),
            ]));
        }

        // ==========================================
        // Flujo ATS: participantes + supervisor firma
        // ==========================================
        $flujoAtsId = DB::table('firmas_flujos')->insertGetId([
            'empresa_id'       => $empresaId,
            'nombre'           => 'Flujo estándar ATS',
            'documento_tipo'   => 'ats',
            'descripcion'      => 'Todos los participantes + Supervisor responsable firman antes del inicio',
            'activo'           => true,
            'created_at'       => now(),
            'updated_at'       => now(),
        ]);

        // ATS es dinámico: los firmantes se crean desde participantes + supervisor
        // al invocar solicitarFirmas() — solo dejamos el flujo registrado.

        $this->command->info('✓ Flujos de firma creados: IPERC y ATS');
    }
}
