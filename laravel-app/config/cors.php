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
        env('APP_URL', 'https://sst.roka50safety.online'),
        env('FRONTEND_URL', 'https://sst.roka50safety.online'),
        'https://sst.roka50safety.online',
        'https://roka50safety.online',
    ],

    'allowed_origins_patterns' => [
        '#^https://(.+\.)?roka50safety\.online$#',
    ],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => false,
];
