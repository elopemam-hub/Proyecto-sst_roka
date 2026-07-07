<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use App\Models\EquipoCertificadoOperatividad;
use App\Models\Empresa;
use App\Models\Notificacion;
use App\Models\Usuario;
use App\Services\AuditoriaService;
use App\Mail\AlertaCertificadoMailable;
use Illuminate\Support\Facades\Mail;
use Carbon\Carbon;

class GenerarAlertasCertificadosCommand extends Command
{
    protected $signature = 'certificados:generar-alertas {--empresa_id=}';
    protected $description = 'Genera alertas para certificados de operatividad vencidos o próximos a vencer';

    public function __construct(
        private AuditoriaService $auditoria
    ) {
        parent::__construct();
    }

    public function handle(): int
    {
        $this->info('🔍 Iniciando generación de alertas de certificados...');

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

            // Leer configuración de alertas
            $config = DB::table('alertas_config')
                ->where('empresa_id', $empresa->id)
                ->where('tipo', 'certificado_vencimiento')
                ->where('activa', true)
                ->first();

            if (!$config) {
                $this->warn("  ⚠️  Sin configuración de alertas para esta empresa");
                continue;
            }

            $diasAnticipacion = $config->dias_anticipacion ?? 30;
            $rolesDestino = json_decode($config->roles_destinatarios ?? '[]', true);
            $notificarEmail = $config->notificar_email ?? false;

            $hoy = Carbon::today();
            $limiteAnticipacion = $hoy->copy()->addDays($diasAnticipacion);

            // Query: certificados vencidos o próximos a vencer
            $certificados = EquipoCertificadoOperatividad::where('empresa_id', $empresa->id)
                ->whereNotNull('fecha_vencimiento')
                ->where(function($q) use ($hoy, $limiteAnticipacion) {
                    $q->where('fecha_vencimiento', '<', $hoy) // Vencidos
                      ->orWhereBetween('fecha_vencimiento', [$hoy, $limiteAnticipacion]); // Por vencer
                })
                ->whereNull('deleted_at')
                ->with(['equipoCatalogo'])
                ->get();

            if ($certificados->isEmpty()) {
                $this->line("  ✓ Sin certificados vencidos o próximos a vencer");
                continue;
            }

            $this->line("  🔔 {$certificados->count()} certificados requieren atención");

            // Transacción para integridad
            DB::transaction(function() use ($certificados, $empresa, $hoy, $rolesDestino, $notificarEmail, &$totalAlertas, &$totalActualizados) {
                foreach ($certificados as $certificado) {
                    $fechaVenc = Carbon::parse($certificado->fecha_vencimiento);
                    $diasRestantes = $hoy->diffInDays($fechaVenc, false);
                    $estaVencido = $diasRestantes < 0;

                    // Actualizar estado del certificado
                    $nuevoEstado = $estaVencido ? 'vencido' : ($diasRestantes <= 30 ? 'por_vencer' : 'activo');

                    if ($certificado->estado !== $nuevoEstado) {
                        $certificado->update(['estado' => $nuevoEstado]);
                        $totalActualizados++;
                    }

                    // Evitar duplicados: verificar si ya existe notificación hoy
                    $yaNotificadoHoy = Notificacion::where('modulo', 'equipos_certificados')
                        ->where('referencia_id', $certificado->id)
                        ->whereDate('created_at', $hoy)
                        ->exists();

                    if ($yaNotificadoHoy) continue;

                    // Obtener usuarios destino
                    $usuariosQuery = Usuario::where('empresa_id', $empresa->id)
                        ->where('activo', true);

                    // Si roles_destinatarios está vacío o es null, notificar a todos
                    if (!empty($rolesDestino)) {
                        $usuariosQuery->whereIn('rol', $rolesDestino);
                    }

                    $usuarios = $usuariosQuery->get();

                    // Datos del certificado para notificaciones
                    $equipoNombre = $certificado->equipoCatalogo->nombre ?? $certificado->nombre;
                    $equipoCodigo = $certificado->equipoCatalogo->codigo ?? '';

                    foreach ($usuarios as $usuario) {
                        // Crear notificación in-app
                        $notificacion = Notificacion::create([
                            'usuario_id' => $usuario->id,
                            'titulo' => $estaVencido
                                ? "Certificado vencido: {$equipoNombre}"
                                : "Certificado por vencer: {$equipoNombre}",
                            'mensaje' => $estaVencido
                                ? "El certificado {$certificado->codigo} del equipo {$equipoCodigo} venció hace " . abs($diasRestantes) . " días."
                                : "El certificado {$certificado->codigo} del equipo {$equipoCodigo} vence en {$diasRestantes} días.",
                            'tipo' => $estaVencido ? 'danger' : 'warning',
                            'modulo' => 'equipos_certificados',
                            'referencia_id' => $certificado->id,
                            'url_accion' => "/equipos/certificados/{$certificado->id}",
                            'leida' => false,
                        ]);

                        $totalAlertas++;

                        // Enviar email si está configurado
                        if ($notificarEmail && $usuario->email) {
                            try {
                                Mail::to($usuario->email)->queue(
                                    new AlertaCertificadoMailable([
                                        'id' => $certificado->id,
                                        'codigo' => $certificado->codigo,
                                        'nombre' => $equipoNombre,
                                        'equipo_codigo' => $equipoCodigo,
                                        'fecha_vencimiento' => $certificado->fecha_vencimiento,
                                    ], $estaVencido, abs($diasRestantes))
                                );
                            } catch (\Exception $e) {
                                $this->warn("  ⚠️  Error al enviar email a {$usuario->email}: {$e->getMessage()}");
                            }
                        }
                    }
                }
            });

            // Registrar en auditoría
            try {
                $this->auditoria->registrar(
                    modulo: 'equipos_certificados',
                    accion: 'generar_alertas',
                    valorNuevo: [
                        'empresa_id' => $empresa->id,
                        'certificados_procesados' => $certificados->count(),
                        'alertas_generadas' => $totalAlertas,
                        'estados_actualizados' => $totalActualizados,
                    ]
                );
            } catch (\Exception $e) {
                $this->warn("  ⚠️  Error al registrar auditoría: {$e->getMessage()}");
            }
        }

        $this->info("✅ Proceso completado:");
        $this->line("   - {$totalAlertas} notificaciones creadas");
        $this->line("   - {$totalActualizados} estados actualizados");

        return self::SUCCESS;
    }
}
