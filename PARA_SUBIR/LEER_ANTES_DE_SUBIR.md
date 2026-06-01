# SST ROKA — Guía de subida a Hostinger
# Subdominio: sst.roka50safety.online

## Todo ya está configurado ✅
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

## PASOS

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

### PASO 3 — Importar SQL
1. **hPanel → phpMyAdmin** → seleccionar `u248634042_sst_roka`
2. Importar en este orden:
   - `sst_roka_database.sql`
   - `sst_roka_epps_v2.sql`
   - `sst_roka_inspecciones_v2.sql`

### PASO 4 — Subir `sst_roka_backend/`
- Destino en servidor: `/home/u248634042/sst_roka_backend/`
- Es decir: al mismo nivel que `public_html`, NO dentro de él
- Conectar por FTP → ir UN NIVEL ARRIBA de public_html → subir la carpeta

### PASO 5 — Subir `public_html/`
- Destino: `domains/sst.roka50safety.online/public_html/`
- Subir TODO el contenido (incluyendo archivos ocultos como `.htaccess`)

### PASO 6 — Instalar vendor/ por SSH (si no lo subiste)
```bash
cd ~/sst_roka_backend
composer install --no-dev --optimize-autoloader
php artisan config:cache
php artisan route:cache
php artisan storage:link
chmod -R 775 storage bootstrap/cache
```

### PASO 7 — Verificar PHP 8.2
- **hPanel → Sitios Web → PHP** → seleccionar PHP 8.2

---

## Verificación final
Abre: **https://sst.roka50safety.online**
- ✅ Aparece la pantalla de login de SST ROKA
- ✅ El login funciona
- ✅ Los módulos cargan

---

## Errores comunes

| Error | Causa | Solución |
|-------|-------|---------|
| Pantalla en blanco | `.htaccess` no se subió | Activar "mostrar archivos ocultos" en FTP y subir |
| Error 500 `/api/*` | Ruta incorrecta en `api/index.php` | Verificar `/home/u248634042/sst_roka_backend` |
| "No encontrado" al recargar página | `.htaccess` falta o mod_rewrite desactivado | Verificar .htaccess en public_html/ |
| Error de base de datos | Credenciales incorrectas | Verificar .env |
| PHP version error | PHP < 8.2 | Cambiar PHP en hPanel |
