<?php

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => [
        // Desarrollo local
        'http://localhost:3000',
        'http://localhost:5173',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5173',
        // Producción — Hostinger (se lee también desde APP_URL en .env)
        env('APP_URL', 'https://TUDOMINIO.COM'),
        env('FRONTEND_URL', 'https://TUDOMINIO.COM'),
    ],

    'allowed_origins_patterns' => [
        // Permite todos los subdominios del dominio principal en producción
        '#^https://(.+\.)?TUDOMINIO\.COM$#',
    ],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => false,
];
