<?php
/**
 * SST ROKA — Punto de entrada de Laravel para Hostinger
 *
 * Este archivo va en: public_html/api/index.php
 *
 * IMPORTANTE: Edita la variable $laravelRoot para que apunte
 * a la carpeta donde subiste el laravel-app en el servidor.
 *
 * Ejemplo Hostinger:
 *   Si subiste laravel-app a /home/u123456789/sst_roka_backend/
 *   entonces pon: $laravelRoot = '/home/u123456789/sst_roka_backend';
 */

// ┌─────────────────────────────────────────────────────────────┐
// │  CONFIGURA ESTA RUTA antes de subir el archivo              │
// └─────────────────────────────────────────────────────────────┘
$laravelRoot = '/home/u248634042/domains/roka50safety.online/sst_roka_backend';
// ─────────────────────────────────────────────────────────────

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

// Modo mantenimiento
if (file_exists($maintenance = $laravelRoot . '/storage/framework/maintenance.php')) {
    require $maintenance;
}

// Autoloader de Composer
require $laravelRoot . '/vendor/autoload.php';

// Corregir SCRIPT_NAME para que Symfony calcule bien el path base
// (sin esto, Laravel recibe /auth/login en vez de /api/auth/login)
$_SERVER['SCRIPT_NAME'] = '/index.php';
$_SERVER['PHP_SELF']    = '/index.php';

// Arrancar Laravel y procesar la petición
/** @var Application $app */
$app = require_once $laravelRoot . '/bootstrap/app.php';

$app->handleRequest(Request::capture());
