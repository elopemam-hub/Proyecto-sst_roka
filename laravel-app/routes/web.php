<?php

use Illuminate\Support\Facades\Route;

// Servir el frontend React para todas las rutas (SPA)
Route::get('/{any}', function () {
    return file_get_contents(public_path('index.html'));
})->where('any', '.*');
