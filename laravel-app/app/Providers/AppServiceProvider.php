<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Models\EppInventario;
use App\Observers\EppInventarioObserver;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Registrar Observer de EPP Inventario para trazabilidad automática
        EppInventario::observe(EppInventarioObserver::class);
    }
}
