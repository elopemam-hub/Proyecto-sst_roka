<?php

use App\Http\Controllers\Api\IpercController;
use App\Http\Controllers\Api\AtsController;
use App\Http\Controllers\Api\FirmaController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Rutas API — Fase 2: IPERC + ATS + Firmas
|--------------------------------------------------------------------------
| Agregar estas rutas al archivo routes/api.php existente,
| dentro del grupo middleware('auth:sanctum')
*/

Route::middleware('auth:sanctum')->group(function () {

    // ─── IPERC ─────────────────────────────────────────────────────
    Route::prefix('iperc')->group(function () {
        Route::get('/matriz-riesgos',      [IpercController::class, 'matrizRiesgos']);
        Route::post('/{id}/enviar-a-firma', [IpercController::class, 'enviarAFirma']);
    });
    Route::apiResource('iperc', IpercController::class);

    // ─── ATS ───────────────────────────────────────────────────────
    Route::prefix('ats')->group(function () {
        Route::post('/{id}/solicitar-firmas', [AtsController::class, 'solicitarFirmas']);
        Route::post('/{id}/cerrar',           [AtsController::class, 'cerrar']);
    });
    Route::apiResource('ats', AtsController::class);

    // ─── FIRMAS DIGITALES (módulo transversal) ────────────────────
    Route::prefix('firmas')->group(function () {
        Route::get('/pendientes',              [FirmaController::class, 'pendientes']);
        Route::get('/solicitud/{id}',          [FirmaController::class, 'showSolicitud']);
        Route::post('/firmar',                 [FirmaController::class, 'firmar']);
        Route::post('/rechazar',               [FirmaController::class, 'rechazar']);
        Route::get('/documento/{tipo}/{id}',   [FirmaController::class, 'firmasDocumento']);
        Route::get('/{id}/verificar',          [FirmaController::class, 'verificar']);
        Route::get('/log',                     [FirmaController::class, 'log']);
    });

});
