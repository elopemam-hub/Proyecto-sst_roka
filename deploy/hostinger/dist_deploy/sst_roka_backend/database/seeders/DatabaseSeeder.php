<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\Empresa;
use App\Models\Sede;
use App\Models\Area;
use App\Models\Cargo;
use App\Models\Personal;
use App\Models\Usuario;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('🚀 Iniciando seed de SST ROKA...');

        // 1. Empresa demo
        $empresa = Empresa::create([
            'razon_social'        => 'ROKA INDUSTRIAL S.A.C.',
            'ruc'                 => '20601234567',
            'ciiu'                => '4610',
            'representante_legal' => 'Carlos Mamani Quispe',
            'dni_representante'   => '10234567',
            'direccion'           => 'Av. Industrial 1234, Juliaca, Puno',
            'telefono'            => '051-321456',
            'email'               => 'gerencia@rokaindustrial.pe',
            'activa'              => true,
        ]);

        // 2. Sede principal
        $sede = Sede::create([
            'empresa_id'      => $empresa->id,
            'nombre'          => 'Sede Principal - Juliaca',
            'direccion'       => 'Av. Industrial 1234, Juliaca',
            'ubigeo'          => '210101',
            'departamento'    => 'Puno',
            'provincia'       => 'San Román',
            'distrito'        => 'Juliaca',
            'responsable_sst' => 'Ing. María Flores Condori',
            'activa'          => true,
        ]);

        // 3. Áreas operativas
        $tiposArea = [
            ['nombre' => 'Almacén Central',     'tipo' => 'almacen'],
            ['nombre' => 'Taller Mecánico',     'tipo' => 'taller'],
            ['nombre' => 'Flota de Transporte', 'tipo' => 'transporte'],
            ['nombre' => 'Limpieza y Sanidad',  'tipo' => 'limpieza'],
            ['nombre' => 'Vigilancia',           'tipo' => 'vigilancia'],
            ['nombre' => 'Distribución',         'tipo' => 'distribucion'],
            ['nombre' => 'Administración',       'tipo' => 'oficina'],
        ];

        $areas = [];
        foreach ($tiposArea as $datoArea) {
            $areas[$datoArea['tipo']] = Area::create([
                'sede_id'  => $sede->id,
                'nombre'   => $datoArea['nombre'],
                'tipo'     => $datoArea['tipo'],
                'activa'   => true,
            ]);
        }

        // 4. Cargos
        $cargos = [
            ['nombre' => 'Gerente General',        'es_critico' => false],
            ['nombre' => 'Jefe de SST',            'es_critico' => false, 'requiere_emo' => true],
            ['nombre' => 'Operario de Almacén',    'es_critico' => true],
            ['nombre' => 'Mecánico',               'es_critico' => true],
            ['nombre' => 'Conductor',              'es_critico' => true],
            ['nombre' => 'Agente de Seguridad',    'es_critico' => false],
            ['nombre' => 'Auxiliar Administrativo','es_critico' => false],
        ];

        $cargoModels = [];
        foreach ($cargos as $datosCargo) {
            $cargoModels[] = Cargo::create([
                'empresa_id' => $empresa->id,
                'nombre'     => $datosCargo['nombre'],
                'es_critico' => $datosCargo['es_critico'],
                'requiere_emo' => $datosCargo['requiere_emo'] ?? true,
            ]);
        }

        // 5. Usuario Administrador
        $adminPersonal = Personal::create([
            'empresa_id'      => $empresa->id,
            'sede_id'         => $sede->id,
            'area_id'         => $areas['oficina']->id,
            'cargo_id'        => $cargoModels[1]->id, // Jefe SST
            'nombres'         => 'Admin',
            'apellidos'       => 'SST ROKA',
            'dni'             => '00000001',
            'fecha_ingreso'   => now()->startOfYear(),
            'tipo_contrato'   => 'planilla',
            'estado'          => 'activo',
            'es_supervisor_sst' => true,
        ]);

        Usuario::create([
            'personal_id' => $adminPersonal->id,
            'empresa_id'  => $empresa->id,
            'nombre'      => 'Administrador SST',
            'email'       => 'admin@sstroka.pe',
            'password'    => Hash::make('Admin@2024'),
            'rol'         => 'administrador',
            'activo'      => true,
        ]);

        // 6. Usuario Supervisor
        Usuario::create([
            'empresa_id' => $empresa->id,
            'nombre'     => 'Supervisor Demo',
            'email'      => 'supervisor@sstroka.pe',
            'password'   => Hash::make('Supervisor@2024'),
            'rol'        => 'supervisor_sst',
            'activo'     => true,
        ]);

        // 7. Alertas por defecto
        $alertas = [
            ['tipo' => 'vencimiento_emo',          'dias_anticipacion' => 30],
            ['tipo' => 'vencimiento_soat',          'dias_anticipacion' => 15],
            ['tipo' => 'stock_critico_epp',         'dias_anticipacion' => 0],
            ['tipo' => 'inspeccion_vencida',        'dias_anticipacion' => 0],
            ['tipo' => 'capacitacion_vencida',      'dias_anticipacion' => 7],
            ['tipo' => 'documento_por_vencer',      'dias_anticipacion' => 15],
            ['tipo' => 'revision_tecnica_vehiculo', 'dias_anticipacion' => 30],
        ];

        foreach ($alertas as $alerta) {
            \DB::table('alertas_config')->insert([
                'empresa_id'        => $empresa->id,
                'tipo'              => $alerta['tipo'],
                'dias_anticipacion' => $alerta['dias_anticipacion'],
                'notificar_email'   => true,
                'notificar_push'    => true,
                'notificar_sms'     => false,
                'roles_destinatarios' => json_encode(['administrador','supervisor_sst']),
                'activa'            => true,
                'created_at'        => now(),
                'updated_at'        => now(),
            ]);
        }

        $this->command->info('✅ Seed completado. Usuario: admin@sstroka.pe / Admin@2024');
    }
}
