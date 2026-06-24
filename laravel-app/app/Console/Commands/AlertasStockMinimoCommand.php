<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use App\Models\EppInventario;
use App\Models\Empresa;
use App\Models\Notificacion;
use App\Models\Usuario;
use App\Services\AuditoriaService;
use Carbon\Carbon;

class AlertasStockMinimoCommand extends Command
{
    protected $signature = 'epps:alertas-stock {--empresa_id=}';
    protected $description = 'Genera alertas para EPPs con stock bajo o crítico';

    public function __construct(
        private AuditoriaService $auditoria
    ) {
        parent::__construct();
    }

    public function handle(): int
    {
        $this->info('🔍 Iniciando generación de alertas de stock EPPs...');

        $empresas = $this->option('empresa_id')
            ? Empresa::where('id', $this->option('empresa_id'))->where('activa', true)->get()
            : Empresa::where('activa', true)->get();

        if ($empresas->isEmpty()) {
            $this->warn('No se encontraron empresas activas.');
            return self::SUCCESS;
        }

        $totalAlertas = 0;
        $hoy = Carbon::today();

        foreach ($empresas as $empresa) {
            $this->line("📊 Empresa: {$empresa->razon_social}");

            // Leer configuración de alertas
            $config = DB::table('alertas_config')
                ->where('empresa_id', $empresa->id)
                ->where('tipo', 'epp_stock_bajo')
                ->where('activa', true)
                ->first();

            $rolesDestino = $config ? json_decode($config->roles_destinatarios ?? '[]', true) : ['administrador', 'supervisor_sst'];
            $notificarEmail = $config->notificar_email ?? false;

            // Query: EPPs con stock bajo (disponible <= mínimo)
            $eppsBajo = EppInventario::where('empresa_id', $empresa->id)
                ->where('activo', true)
                ->stockBajo()
                ->with('categoria')
                ->get();

            // Query: EPPs con stock crítico (disponible <= mínimo * 0.5)
            $eppsCritico = EppInventario::where('empresa_id', $empresa->id)
                ->where('activo', true)
                ->stockCritico()
                ->with('categoria')
                ->get();

            if ($eppsBajo->isEmpty() && $eppsCritico->isEmpty()) {
                $this->line("  ✓ Todos los EPPs tienen stock adecuado");
                continue;
            }

            $this->line("  🔔 {$eppsBajo->count()} EPPs con stock bajo");
            $this->line("  ⚠️  {$eppsCritico->count()} EPPs con stock CRÍTICO");

            // Transacción para integridad
            DB::transaction(function() use ($eppsBajo, $eppsCritico, $empresa, $hoy, $rolesDestino, &$totalAlertas) {

                // Procesar EPPs con stock crítico (prioridad alta)
                foreach ($eppsCritico as $epp) {
                    // Evitar duplicados: verificar si ya existe notificación hoy
                    $yaNotificadoHoy = Notificacion::where('modulo', 'epps_stock')
                        ->where('referencia_id', $epp->id)
                        ->whereDate('created_at', $hoy)
                        ->exists();

                    if ($yaNotificadoHoy) continue;

                    // Obtener usuarios destino
                    $usuarios = Usuario::where('empresa_id', $empresa->id)
                        ->where('activo', true)
                        ->when(!empty($rolesDestino), fn($q) => $q->whereIn('rol', $rolesDestino))
                        ->get();

                    foreach ($usuarios as $usuario) {
                        Notificacion::create([
                            'usuario_id' => $usuario->id,
                            'titulo' => "⚠️ Stock CRÍTICO: {$epp->nombre}",
                            'mensaje' => "Stock crítico de {$epp->nombre}. Disponible: {$epp->stock_disponible}, Mínimo: {$epp->stock_minimo}. Realizar pedido URGENTE.",
                            'tipo' => 'danger',
                            'modulo' => 'epps_stock',
                            'referencia_id' => $epp->id,
                            'url_accion' => "/epps/alertas",
                            'leida' => false,
                        ]);

                        $totalAlertas++;
                    }
                }

                // Procesar EPPs con stock bajo (prioridad normal)
                foreach ($eppsBajo as $epp) {
                    // Evitar duplicados
                    $yaNotificadoHoy = Notificacion::where('modulo', 'epps_stock')
                        ->where('referencia_id', $epp->id)
                        ->whereDate('created_at', $hoy)
                        ->exists();

                    if ($yaNotificadoHoy) continue;

                    // No notificar si ya está en crítico
                    if ($eppsCritico->contains('id', $epp->id)) continue;

                    $usuarios = Usuario::where('empresa_id', $empresa->id)
                        ->where('activo', true)
                        ->when(!empty($rolesDestino), fn($q) => $q->whereIn('rol', $rolesDestino))
                        ->get();

                    foreach ($usuarios as $usuario) {
                        Notificacion::create([
                            'usuario_id' => $usuario->id,
                            'titulo' => "🔔 Stock bajo: {$epp->nombre}",
                            'mensaje' => "Stock bajo de {$epp->nombre}. Disponible: {$epp->stock_disponible}, Mínimo: {$epp->stock_minimo}. Considerar pedido.",
                            'tipo' => 'warning',
                            'modulo' => 'epps_stock',
                            'referencia_id' => $epp->id,
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
                    accion: 'generar_alertas_stock',
                    valorNuevo: [
                        'empresa_id' => $empresa->id,
                        'epps_bajo' => $eppsBajo->count(),
                        'epps_critico' => $eppsCritico->count(),
                        'alertas_generadas' => $totalAlertas,
                    ]
                );
            } catch (\Exception $e) {
                $this->warn("  ⚠️  Error al registrar auditoría: {$e->getMessage()}");
            }
        }

        $this->info("✅ Proceso completado:");
        $this->line("   - {$totalAlertas} notificaciones de stock creadas");

        return self::SUCCESS;
    }
}
