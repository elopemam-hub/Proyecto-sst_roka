<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\Empresa;

class AlertasCertificadosSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $empresas = Empresa::where('activa', true)->get();

        foreach ($empresas as $empresa) {
            // Verificar si ya existe configuración
            $existe = DB::table('alertas_config')
                ->where('empresa_id', $empresa->id)
                ->where('tipo', 'certificado_vencimiento')
                ->exists();

            if ($existe) {
                $this->command->warn("Configuración ya existe para empresa: {$empresa->razon_social}");
                continue;
            }

            DB::table('alertas_config')->insert([
                'empresa_id' => $empresa->id,
                'tipo' => 'certificado_vencimiento',
                'dias_anticipacion' => 30,
                'notificar_email' => true,
                'notificar_push' => true,
                'notificar_sms' => false,
                'roles_destinatarios' => json_encode([
                    'administrador',
                    'supervisor_sst',
                    'jefe_mantenimiento',
                    'operador',
                    'supervisor',
                    'analista',
                ]),
                'activa' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $this->command->info("✅ Configuración creada para empresa: {$empresa->razon_social}");
        }

        $this->command->info('✅ Configuración de alertas de certificados completada');
    }
}
