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
$laravelRoot = '/home/u248634042/sst_roka_backend';
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
$_SERVER['SCRIPT_NAME'] = '/index.php';
$_SERVER['PHP_SELF']    = '/index.php';

// Restaurar REQUEST_URI original si LiteSpeed lo cambió durante el rewrite
// LiteSpeed guarda la URL original en REDIRECT_URL al hacer rewrite interno
foreach (['REDIRECT_URL', 'REDIRECT_URI'] as $key) {
    if (!empty($_SERVER[$key]) && strpos($_SERVER[$key], 'index.php') === false) {
        $qs = !empty($_SERVER['QUERY_STRING']) ? '?' . $_SERVER['QUERY_STRING'] : '';
        $_SERVER['REQUEST_URI'] = $_SERVER[$key] . $qs;
        break;
    }
}

// Recuperar el header Authorization que Apache/LiteSpeed renombra al reescribir
if (empty($_SERVER['HTTP_AUTHORIZATION'])) {
    if (!empty($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        $_SERVER['HTTP_AUTHORIZATION'] = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    } elseif (function_exists('apache_request_headers')) {
        $hdrs = apache_request_headers();
        if (!empty($hdrs['Authorization'])) {
            $_SERVER['HTTP_AUTHORIZATION'] = $hdrs['Authorization'];
        }
    }
}

// Arrancar Laravel y procesar la petición
/** @var Application $app */
$app = require_once $laravelRoot . '/bootstrap/app.php';

$app->handleRequest(Request::capture());
