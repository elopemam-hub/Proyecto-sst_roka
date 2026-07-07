# SST ROKA — Guía de subida a Hostinger
# Subdominio: sst.roka50safety.online
# Actualizado: 2026-07-03 — Módulo Formatos RM-050 + correcciones equipos/documentos

## Configuración del servidor ✅
- Dominio: `sst.roka50safety.online`
- Base de datos: `u248634042_sst_roka`
- Usuario BD: `u248634042_sst_user`
- Ruta backend: `/home/u248634042/sst_roka_backend`

---

## Estructura en el servidor (cómo debe quedar)

```
/home/u248634042/
│
├── sst_roka_backend/              ← Subir aquí (fuera de public_html)
│   ├── app/
│   ├── bootstrap/
│   ├── config/
│   ├── routes/
│   ├── storage/
│   ├── vendor/
│   └── .env  ← ya está configurado
│
└── domains/
    └── sst.roka50safety.online/
        └── public_html/           ← Subir aquí el contenido de public_html/
            ├── .htaccess
            ├── index.html
            ├── assets/
            ├── sw.js
            └── api/
                ├── .htaccess
                └── index.php
```

---

## PASOS PARA PRIMERA INSTALACIÓN

### PASO 1 — Crear el subdominio en hPanel
1. Ir a **hPanel → Dominios → Subdominios**
2. Crear: `sst.roka50safety.online`
3. Hostinger creará automáticamente la carpeta:
   `domains/sst.roka50safety.online/public_html/`

### PASO 2 — Crear base de datos
> Si aún no la creaste:
1. **hPanel → Bases de datos → MySQL**
2. Crear base de datos con:
   - Nombre: `sst_roka` → quedará como `u248634042_sst_roka`
   - Usuario: `sst_user` → quedará como `u248634042_sst_user`
   - Contraseña: `Juliaca2026.`

### PASO 3 — Importar SQL base
1. **hPanel → phpMyAdmin** → seleccionar `u248634042_sst_roka`
2. Importar en este orden:
   - `sst_roka_database.sql`
   - `sst_roka_epps_v2.sql`
   - `sst_roka_inspecciones_v2.sql`

### PASO 4 — Subir `sst_roka_backend/`
- Destino en servidor: `/home/u248634042/sst_roka_backend/`
- Al mismo nivel que `public_html`, NO dentro de él
- Conectar por FTP → ir UN NIVEL ARRIBA de public_html → subir la carpeta
- **NO subir la carpeta `vendor/`** (se instala por SSH en el siguiente paso)

### PASO 5 — Subir `public_html/`
- Destino: `domains/sst.roka50safety.online/public_html/`
- Subir TODO el contenido (incluyendo archivos ocultos como `.htaccess`)

### PASO 6 — Instalar dependencias y configurar por SSH
```bash
cd ~/sst_roka_backend
composer install --no-dev --optimize-autoloader
php artisan config:cache
php artisan route:cache
php artisan storage:link
chmod -R 775 storage bootstrap/cache
```

### PASO 7 — Ejecutar migraciones nuevas (MUY IMPORTANTE)
> Después de importar el SQL base, hay 30 migraciones adicionales que crean
> tablas y columnas nuevas de los módulos añadidos en 2026.

```bash
cd ~/sst_roka_backend
php artisan migrate --force
```

Esto creará/actualizará las siguientes tablas:
- `epps_requeridos` en tabla ats (nueva columna)
- `ats_peligros`, `ats_controles` (tablas nuevas)
- `firmas_log` (tabla nueva)
- `checklist_preguntas` (tabla nueva)
- Tipos de inspecciones faltantes (ALTER)
- `inspecciones.equipo_id` (nueva columna)
- `opls`, `opl_contents`, `training_records` (tablas nuevas)
- `epps_inventario.consumo_anual` (nueva columna)
- `equipos_certificados_operatividad` (tabla nueva)
- `epps_movimientos` (tabla nueva)
- `epps_proveedores` (tabla nueva)
- `personal_tallas` (tabla nueva)
- `qr_scans` (tabla nueva)
- `frecuencia` en `checklist_preguntas` y `equipos_catalogo`
- `tipo_trabajador`, `foto_*` en `personal`
- Reestructura `equipos` (tipos, pivot)
- `inspecciones_programadas` (tabla nueva)
- `tipo_inspeccion` y columnas en submodulos
- `sede_id` nullable + `empresa_id` en `areas`
- Roles `trabajador`/`tercero` en módulo de permisos
- `foto_inicio` en `inspecciones`
- `equipo_asignaciones` (tabla nueva — checklist diario por turno/usuario)
- `equipo_asignacion_reglas` (tabla nueva — reglas de generación automática)

### PASO 8 — Verificar PHP 8.2
- **hPanel → Sitios Web → PHP** → seleccionar PHP 8.2

---

## PASOS PARA ACTUALIZACIÓN (servidor ya instalado)
> Si el servidor ya tiene una versión anterior funcionando, solo necesitas:

1. **Reemplazar** `sst_roka_backend/` en el servidor con el contenido de esta carpeta
   (mantener el `.env` que ya está en el servidor)
2. **Reemplazar** el contenido de `public_html/` (assets, index.html, sw.js)
   — la carpeta `api/` no cambia
3. Conectar por SSH y ejecutar:
   ```bash
   cd ~/sst_roka_backend
   composer install --no-dev --optimize-autoloader
   php artisan migrate --force
   php artisan config:cache
   php artisan route:cache
   ```

---

## CAMBIOS EN ESTA VERSIÓN (2026-07-03)

### Backend — Nuevas rutas/métodos (sin migraciones nuevas)
| Archivo | Cambio |
|---------|--------|
| `routes/api.php` | + `GET /capacitaciones/{id}/formato-rm050` |
| `routes/api.php` | + `GET /formato-archivos/{id}/ver` |
| `routes/api.php` | + `GET /equipos-certificados/{id}/documento` |
| `routes/api.php` | + `GET /documentos/{id}/ver` |
| `CapacitacionController.php` | + método `formatoRM050()` — datos para impresión RM-050 |
| `FormatoArchivoController.php` | + método `ver()` — sirve archivo inline (blob) |
| `FormatoController.php` | Fix: columnas incorrectas en simulacros (`tipo_emergencia`→`tipo`, `fecha_ejecucion`→`fecha_ejecutada`, `duracion_minutos`→`tiempo_respuesta_min`) |
| `EquipoCertificadoController.php` | + método `documento()` — sirve certificado inline |
| `DocumentoController.php` | + método `ver()` — sirve documento SST inline |

### Frontend — Mejoras funcionales
| Módulo | Mejora |
|--------|--------|
| **Equipos → Certificados** | Visor de PDF en modal (blob URL, funciona sin storage symlink) |
| **Equipos → Lista** | Botón "Imprimir Etiquetas" arreglado (ahora usa blob URL autenticado) |
| **Documentos SST** | Columna "Adjunto" con badge de tipo + botón eliminar por fila |
| **Formatos → Lista** | KPIs con íconos, tipos con color, botón eliminar borrador |
| **Formatos → Detalle** | Botón eliminar para borradores |
| **Formatos → Biblioteca** | Visor de archivos en modal (blob URL) |
| **Formatos → Capacitación** | **NUEVO**: Formulario RM-050 imprimible (`/formatos/capacitacion/{id}/imprimir`) |
| **Capacitaciones → Detalle** | Botón "Formato RM-050" enlaza al formulario imprimible |

### Sin migraciones nuevas
> Esta versión **NO requiere** `php artisan migrate` si ya tienes la versión anterior.
> Solo actualiza los archivos PHP del backend y los assets del frontend.

---

## Verificación final
Abre: **https://sst.roka50safety.online**
- Pantalla de login de SST ROKA visible (sin bloque de credenciales demo)
- Login funciona
- Módulo Equipos muestra: tabs "Programa", "Tipos de equipo", "Plantillas checklist", botón "QR"
- Módulo Sustancias Peligrosas disponible en el menú
- Módulo EPPs muestra movimientos y proveedores
- Menú lateral grupo **Activos** muestra:
  - "Mis equipos hoy" (visible para operativo, técnico, supervisor, admin)
  - "Asignaciones checklist" (visible para técnico, supervisor, admin)
  - "Config. asignaciones" (visible solo para admin)

---

## Errores comunes

| Error | Causa | Solución |
|-------|-------|---------|
| Pantalla en blanco | `.htaccess` no se subió | Activar "mostrar archivos ocultos" en FTP y subir |
| Error 500 `/api/*` | Ruta incorrecta en `api/index.php` | Verificar `/home/u248634042/sst_roka_backend` |
| "No encontrado" al recargar | `.htaccess` falta o mod_rewrite desactivado | Verificar .htaccess en public_html/ |
| Error de base de datos | Credenciales incorrectas | Verificar .env |
| PHP version error | PHP < 8.2 | Cambiar PHP en hPanel |
| Error 500 en módulos nuevos | Migraciones no ejecutadas | Conectar SSH y ejecutar `php artisan migrate --force` |
| "Class not found" en API | vendor/ no instalado | Ejecutar `composer install --no-dev` por SSH |
| Middleware error (permisos) | bootstrap/app.php viejo | Ya corregido en esta versión |
