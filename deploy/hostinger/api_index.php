<?php
/**
 * SST ROKA — Punto de entrada de Laravel para Hostinger
 * Ubicación en servidor: public_html/sst/api/index.php
 */

$laravelRoot = '/home/u248634042/sst_roka_backend';

// Fix SCRIPT_NAME: evita que Laravel recorte /api/ del REQUEST_URI.
// Sin esto, Laravel ve /auth/login en vez de /api/auth/login y la ruta
// web GET /{any} intercepta las peticiones antes que las rutas API.
$_SERVER['SCRIPT_NAME']     = '/index.php';
$_SERVER['PHP_SELF']        = '/index.php';
$_SERVER['SCRIPT_FILENAME'] = $laravelRoot . '/public/index.php';

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

if (file_exists($maintenance = $laravelRoot . '/storage/framework/maintenance.php')) {
    require $maintenance;
}

require $laravelRoot . '/vendor/autoload.php';

/** @var Application $app */
$app = require_once $laravelRoot . '/bootstrap/app.php';

$app->handleRequest(Request::capture());
