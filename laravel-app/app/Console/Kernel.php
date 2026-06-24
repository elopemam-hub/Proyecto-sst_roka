<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    /**
     * Comandos personalizados de Artisan
     */
    protected $commands = [
        Commands\GenerarAlertasCertificadosCommand::class,
        Commands\GenerarAlertasEppsCommand::class,
        Commands\AlertasStockMinimoCommand::class,
    ];

    /**
     * Programación de tareas automáticas
     */
    protected function schedule(Schedule $schedule): void
    {
        // Generar alertas de certificados diariamente a las 8:00 AM
        $schedule->command('certificados:generar-alertas')
            ->dailyAt('08:00')
            ->withoutOverlapping()
            ->runInBackground()
            ->appendOutputTo(storage_path('logs/alertas-certificados.log'));

        // Generar alertas de EPPs vencidos o por vencer (diario 8:15 AM)
        $schedule->command('epps:generar-alertas')
            ->dailyAt('08:15')
            ->withoutOverlapping()
            ->runInBackground()
            ->appendOutputTo(storage_path('logs/alertas-epps.log'));

        // Generar alertas de stock bajo/crítico de EPPs (diario 7:00 AM)
        $schedule->command('epps:alertas-stock')
            ->dailyAt('07:00')
            ->withoutOverlapping()
            ->runInBackground()
            ->appendOutputTo(storage_path('logs/alertas-stock-epps.log'));

        // Limpiar notificaciones leídas antiguas (cada domingo a las 2 AM)
        $schedule->call(function () {
            \DB::table('notificaciones')
                ->where('leida', true)
                ->where('leida_en', '<', now()->subMonths(3))
                ->delete();
        })->weekly()->sundays()->at('02:00');
    }

    /**
     * Registrar comandos de Closure
     */
    protected function commands(): void
    {
        $this->load(__DIR__.'/Commands');

        require base_path('routes/console.php');
    }
}
