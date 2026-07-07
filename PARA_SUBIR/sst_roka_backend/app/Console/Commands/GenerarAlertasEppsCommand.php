<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use App\Models\EppEntrega;
use App\Models\Empresa;
use App\Models\Notificacion;
use App\Models\Usuario;
use App\Services\AuditoriaService;
use Carbon\Carbon;

class GenerarAlertasEppsCommand extends Command
{
    protected $signature = 'epps:generar-alertas {--empresa_id=}';
    protected $description = 'Genera alertas para EPPs vencidos o próximos a vencer';

    public function __construct(
        private AuditoriaService $auditoria
    ) {
        parent::__construct();
    }

    public function handle(): int
    {
        $this->info('🔍 Iniciando generación de alertas de EPPs...');

        $empresas = $this->option('empresa_id')
            ? Empresa::where('id', $this->option('empresa_id'))->where('activa', true)->get()
            : Empresa::where('activa', true)->get();

        if ($empresas->isEmpty()) {
            $this->warn('No se encontraron empresas activas.');
            return self::SUCCESS;
        }

        $totalAlertas = 0;
        $totalActualizados = 0;

        foreach ($empresas as $empresa) {
            $this->line("📊 Empresa: {$empresa->razon_social}");

            // Leer configuración de alertas (usar la misma tabla que certificados)
            $config = DB::table('alertas_config')
                ->where('empresa_id', $empresa->id)
                ->where('tipo', 'epp_vencimiento')
                ->where('activa', true)
                ->first();

            // Si no existe config específica para EPPs, usar configuración por defecto
            $diasAnticipacion = $config->dias_anticipacion ?? 30;
            $rolesDestino = $config ? json_decode($config->roles_destinatarios ?? '[]', true) : [];
            $notificarEmail = $config->notificar_email ?? false;

            $hoy = Carbon::today();
            $limiteAnticipacion = $hoy->copy()->addDays($diasAnticipacion);

            // Query: EPPs entregados vencidos o próximos a vencer
            $entregas = EppEntrega::where('empresa_id', $empresa->id)
                ->where('estado', 'entregado')
                ->whereNotNull('fecha_vencimiento')
                ->where(function($q) use ($hoy, $limiteAnticipacion) {
                    $q->where('fecha_vencimiento', '<', $hoy) // Vencidos
                      ->orWhereBetween('fecha_vencimiento', [$hoy, $limiteAnticipacion]); // Por vencer
                })
                ->with(['personal', 'inventario'])
                ->get();

            if ($entregas->isEmpty()) {
                $this->line("  ✓ Sin EPPs vencidos o próximos a vencer");
                continue;
            }

            $this->line("  🔔 {$entregas->count()} EPPs requieren atención");

            // Transacción para integridad
            DB::transaction(function() use ($entregas, $empresa, $hoy, $rolesDestino, $notificarEmail, &$totalAlertas, &$totalActualizados) {
                foreach ($entregas as $entrega) {
                    $fechaVenc = Carbon::parse($entrega->fecha_vencimiento);
                    $diasRestantes = $hoy->diffInDays($fechaVenc, false);
                    $estaVencido = $diasRestantes < 0;

                    // Evitar duplicados: verificar si ya existe notificación hoy
                    $yaNotificadoHoy = Notificacion::where('modulo', 'epps')
                        ->where('referencia_id', $entrega->id)
                        ->whereDate('created_at', $hoy)
                        ->exists();

                    if ($yaNotificadoHoy) continue;

                    // Obtener usuarios destino
                    $usuariosQuery = Usuario::where('empresa_id', $empresa->id)
                        ->where('activo', true);

                    // Si roles_destinatarios está vacío, notificar a todos
                    if (!empty($rolesDestino)) {
                        $usuariosQuery->whereIn('rol', $rolesDestino);
                    }

                    $usuarios = $usuariosQuery->get();

                    // Datos del EPP para notificaciones
                    $eppNombre = $entrega->inventario->nombre ?? 'EPP';
                    $personalNombre = $entrega->personal->nombres ?? '';
                    $personalApellidos = $entrega->personal->apellidos ?? '';

                    foreach ($usuarios as $usuario) {
                        // Crear notificación in-app
                        Notificacion::create([
                            'usuario_id' => $usuario->id,
                            'titulo' => $estaVencido
                                ? "EPP vencido: {$eppNombre}"
                                : "EPP por vencer: {$eppNombre}",
                            'mensaje' => $estaVencido
                                ? "El EPP {$eppNombre} de {$personalNombre} {$personalApellidos} venció hace " . abs($diasRestantes) . " días."
                                : "El EPP {$eppNombre} de {$personalNombre} {$personalApellidos} vence en {$diasRestantes} días.",
                            'tipo' => $estaVencido ? 'danger' : 'warning',
                            'modulo' => 'epps',
                            'referencia_id' => $entrega->id,
                            'url_accion' => "/epps/alertas",
                            'leida' => false,
                        ]);

                        $totalAlertas++;
                    }
                }
            });

            // Registrar en auditoría
            try {
                $this->auditoria->registrar(
                    modulo: 'epps',
                    accion: 'generar_alertas_vencimiento',
                    valorNuevo: [
                        'empresa_id' => $empresa->id,
                        'epps_procesados' => $entregas->count(),
                        'alertas_generadas' => $totalAlertas,
                    ]
                );
            } catch (\Exception $e) {
                $this->warn("  ⚠️  Error al registrar auditoría: {$e->getMessage()}");
            }
        }

        $this->info("✅ Proceso completado:");
        $this->line("   - {$totalAlertas} notificaciones creadas");

        return self::SUCCESS;
    }
}
