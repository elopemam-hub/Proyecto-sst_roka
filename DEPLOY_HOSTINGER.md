# Guía de Despliegue — SST ROKA en Hostinger

## Requisitos del plan Hostinger
- PHP **8.2** o superior (verificar en hPanel → Configuración PHP)
- MySQL 5.7+ / MariaDB
- **mod_rewrite** habilitado (está activo por defecto en Hostinger)
- Acceso SSH o terminal (recomendado: plan Business+)

---

## Estructura final en el servidor

```
/home/TU_USUARIO/
│
├── sst_roka_backend/          ← Laravel (FUERA de public_html)
│   ├── app/
│   ├── bootstrap/
│   ├── config/
│   ├── database/
│   ├── routes/
│   ├── storage/
│   ├── vendor/
│   └── .env
│
└── domains/TUDOMINIO.COM/
    └── public_html/           ← Raíz web pública
        ├── index.html         ← React SPA
        ├── assets/            ← JS, CSS compilados
        ├── sw.js              ← Service Worker PWA
        ├── .htaccess          ← Routing React + API
        │
        └── api/               ← API Laravel
            ├── index.php      ← Entrada de Laravel (modificada)
            └── .htaccess      ← Routing Laravel
```

---

## PASO 1 — Subir el backend Laravel

### 1.1 Conectar por FTP o usar el Administrador de archivos de hPanel

Sube la carpeta `laravel-app/` al servidor **fuera de public_html**:
```
Destino: /home/TU_USUARIO/sst_roka_backend/
```

Sube **todo el contenido** de `laravel-app/`:
- `app/`, `bootstrap/`, `config/`, `database/`, `routes/`, `resources/`, `storage/`, `vendor/`
- `artisan`, `composer.json`, `composer.lock`

> ⚠️ La carpeta `vendor/` puede ser muy grande. Alternativamente puedes subirla sin vendor y ejecutar `composer install` por SSH.

### 1.2 Configurar el .env de producción

1. Copia el archivo `deploy/hostinger/env_produccion` al servidor como:
   ```
   /home/TU_USUARIO/sst_roka_backend/.env
   ```

2. Edita el archivo y reemplaza **TODOS** los valores en MAYÚSCULAS:
   - `TUDOMINIO.COM` → tu dominio real (ej: `sst-roka.com`)
   - `NOMBRE_DE_TU_BD` → nombre de la base de datos creada en hPanel
   - `USUARIO_DE_TU_BD` → usuario MySQL de Hostinger
   - `CONTRASENA_DE_TU_BD` → contraseña MySQL de Hostinger

### 1.3 Permisos de storage

Por SSH o terminal de hPanel:
```bash
chmod -R 775 /home/TU_USUARIO/sst_roka_backend/storage
chmod -R 775 /home/TU_USUARIO/sst_roka_backend/bootstrap/cache
```

---

## PASO 2 — Base de datos

### 2.1 Crear la base de datos en hPanel

1. Ir a **hPanel → Bases de datos → MySQL**
2. Crear nueva base de datos (anotad el nombre, usuario y contraseña)

### 2.2 Importar el esquema SQL

En hPanel → **phpMyAdmin**, selecciona la base de datos y:

Importa en este orden:
1. `sst_roka_database.sql`
2. `sst_roka_epps_v2.sql`
3. `sst_roka_inspecciones_v2.sql`

> Si el archivo es mayor a 50MB, usa SSH: `mysql -u USUARIO -p NOMBRE_BD < sst_roka_database.sql`

---

## PASO 3 — Subir el frontend React

### 3.1 Subir el build

Sube **el contenido** de la carpeta `frontend/dist/` directamente a `public_html/`:

```
frontend/dist/index.html        → public_html/index.html
frontend/dist/assets/           → public_html/assets/
frontend/dist/sw.js             → public_html/sw.js
frontend/dist/workbox-*.js      → public_html/workbox-*.js
frontend/dist/registerSW.js     → public_html/registerSW.js
frontend/dist/manifest.webmanifest → public_html/manifest.webmanifest
frontend/dist/favicon.png       → public_html/favicon.png
frontend/dist/logo-*.png        → public_html/logo-*.png
```

### 3.2 Subir el .htaccess del frontend

```
deploy/hostinger/htaccess_public_html → public_html/.htaccess
```
(renombrar a `.htaccess`)

---

## PASO 4 — Configurar la carpeta API

### 4.1 Crear la carpeta api/

En public_html, crea la carpeta `api/`

### 4.2 Subir el index.php modificado

1. Abre `deploy/hostinger/api_index.php`
2. Edita la línea:
   ```php
   $laravelRoot = '/home/TU_USUARIO_HOSTINGER/sst_roka_backend';
   ```
   Reemplaza `TU_USUARIO_HOSTINGER` con tu usuario real de Hostinger.

3. Sube el archivo:
   ```
   deploy/hostinger/api_index.php → public_html/api/index.php
   ```

### 4.3 Subir el .htaccess de API

```
deploy/hostinger/htaccess_api → public_html/api/.htaccess
```
(renombrar a `.htaccess`)

---

## PASO 5 — Optimizar Laravel (por SSH)

Conecta por SSH a tu servidor Hostinger y ejecuta:

```bash
cd /home/TU_USUARIO/sst_roka_backend

# Instalar dependencias (si no subiste vendor/)
composer install --no-dev --optimize-autoloader

# Optimizar configuración
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Enlace de storage público (para archivos subidos)
php artisan storage:link

# (Opcional) Migrar si no importaste el SQL
# php artisan migrate --force
```

---

## PASO 6 — Verificar el despliegue

1. Abre `https://TUDOMINIO.COM` en el navegador
2. Debes ver la pantalla de login de SST ROKA
3. Prueba el login con tus credenciales
4. Verifica que el módulo IPERC carga correctamente

### Diagnóstico de errores comunes

| Problema | Solución |
|----------|----------|
| Pantalla en blanco | Verificar .htaccess en public_html/ |
| Error 500 en /api/* | Verificar ruta en api/index.php y permisos de storage/ |
| Error de BD | Verificar credenciales en .env |
| Login no funciona | Verificar `SANCTUM_STATEFUL_DOMAINS` en .env |
| Assets 404 | Verificar que la carpeta assets/ se subió a public_html/assets/ |
| CORS error | Solo aplica si usas dominios distintos; en mismo dominio no hay CORS |

---

## Resumen de archivos a modificar antes de subir

| Archivo | Qué cambiar |
|---------|------------|
| `deploy/hostinger/env_produccion` → `.env` | Dominio, BD, credenciales |
| `deploy/hostinger/api_index.php` | Ruta a `sst_roka_backend` |

---

## Versión de PHP en Hostinger

En **hPanel → Sitios Web → PHP** verifica que sea PHP **8.2** o **8.3**.

Extensiones PHP requeridas (normalmente ya activas en Hostinger):
- `pdo_mysql`, `mbstring`, `openssl`, `tokenizer`, `xml`, `ctype`, `json`, `bcmath`, `fileinfo`
