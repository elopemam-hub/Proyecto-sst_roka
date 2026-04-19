# SST ROKA — Fase 2

**Módulos**: IPERC · ATS · Firmas digitales

Esta fase se instala **sobre la Fase 1**. Copia los archivos respetando la estructura y ejecuta las migraciones nuevas.

---

## 📦 Contenido

### Backend

**Migraciones** (`database/migrations/`)
- `2024_02_01_000001_create_iperc_tables.php` — 5 tablas IPERC
- `2024_02_01_000002_create_ats_tables.php` — 6 tablas ATS + permisos de trabajo
- `2024_02_01_000003_create_firmas_tables.php` — 5 tablas firmas (inmutables)

**Modelos** (`app/Models/`)
- `Iperc.php`, `IpercPeligro.php` (con cálculo automático IP × IS)
- `Ats.php` (con generador de código correlativo)
- `Firma.php` (inmutable — bloquea `update` y `delete`)

**Servicio** (`app/Services/`)
- `FirmaService.php` — módulo transversal. Crea solicitudes, registra firmas con hash SHA-256, geolocalización y device fingerprint

**Controladores API** (`app/Http/Controllers/Api/`)
- `IpercController.php` — CRUD + matriz de riesgos + envío a firma
- `AtsController.php` — CRUD + solicitud de firmas + cierre
- `FirmaController.php` — pendientes, firmar, rechazar, verificar integridad

**Rutas** (`routes/api_fase2.php`)
- Agregar el contenido a `routes/api.php` dentro del middleware `auth:sanctum`

**Seeder** (`database/seeders/`)
- `FlujosFirmaSeeder.php` — crea flujos IPERC (3 niveles) y ATS (dinámico)

### Frontend

**Componentes** (`src/components/firmas/`)
- `SignatureCanvas.jsx` — canvas DPI-aware con soporte touch + mouse
- `FirmaModal.jsx` — modal transversal de firma con geolocalización

**Páginas IPERC** (`src/pages/iperc/`)
- `IpercListPage.jsx` — listado + matriz de riesgos por categoría
- `IpercFormPage.jsx` — formulario con procesos → peligros → controles (cálculo en vivo IP × IS)
- `IpercDetailPage.jsx` — vista detalle con firmas

**Páginas ATS** (`src/pages/ats/`)
- `AtsListPage.jsx` — listado con filtros por estado
- `AtsFormPage.jsx` — formulario con tareas, peligros, EPPs, participantes, permisos de trabajo
- `AtsDetailPage.jsx` — vista detalle con estado de firmas de todos los participantes

**Página Firmas** (`src/pages/firmas/`)
- `FirmasPendientesPage.jsx` — bandeja del usuario con routing polimórfico

**Archivos actualizados**
- `src/App.jsx` — incluye todas las rutas Fase 2
- `src/components/layout/AppLayout.jsx` — badge de firmas pendientes en top bar

---

## 🚀 Instalación sobre Fase 1

```bash
# 1. Desde la raíz del proyecto Fase 1
cd sst-roka

# 2. Copiar archivos Fase 2
unzip ../sst-roka-fase2.zip -d .

# 3. Ejecutar nuevas migraciones
docker-compose exec app php artisan migrate

# 4. Agregar rutas al api.php
#    Copiar el contenido de routes/api_fase2.php dentro del grupo auth:sanctum de routes/api.php

# 5. Ejecutar seeder de flujos de firma
docker-compose exec app php artisan db:seed --class=FlujosFirmaSeeder

# 6. Reconstruir frontend
docker-compose exec frontend npm run build
# o en desarrollo:
docker-compose exec frontend npm run dev
```

---

## 🔐 Sistema de firmas digitales

Las firmas cumplen con la **Ley Nº 29783** y su reglamento. Cada firma registra:

| Campo | Descripción |
|-------|-------------|
| `firmante_usuario_id` | Usuario autenticado que firma |
| `firmante_personal_id` | Personal relacionado |
| `imagen_firma` | Base64 PNG de la firma manuscrita |
| `hash_documento` | SHA-256 del documento al momento de firmar |
| `hash_firma` | SHA-256 de la firma |
| `geolocalizacion` | Lat/lng si el dispositivo lo permite |
| `ip_address` | IP del firmante |
| `user_agent` | Device fingerprint |
| `firmado_en` | Timestamp inmutable |

**Reglas críticas**:
- Las firmas NO se pueden editar ni eliminar (enforced en el modelo Eloquent)
- El hash del documento permite detectar si el documento fue modificado después de firmarse
- El log `firmas_log` es append-only (auditoría)

---

## 📋 Metodología IPERC

Cálculo de nivel de riesgo siguiendo **RM 050-2013-TR**:

```
Nivel Probabilidad (IP) = Personas expuestas + Procedimientos + Capacitación + Exposición
Nivel Severidad (IS)    = Por tipo de lesión potencial
Nivel Riesgo (NR)       = IP × IS
```

**Clasificación**:
- 4 — Trivial
- 5-8 — Tolerable
- 9-16 — Moderado
- 17-24 — Importante
- 25-36 — Intolerable

El formulario calcula todo esto en tiempo real conforme el usuario ingresa valores.

---

## 🎯 Flujo de trabajo típico

**IPERC**
1. Técnico SST crea IPERC (estado: `borrador`)
2. Agrega procesos → peligros → controles → EPPs
3. Envía a firma → se crean 3 solicitudes (elaborador, revisor, aprobador)
4. Cada firmante recibe notificación y firma en `/firmas/pendientes`
5. Al completarse todas las firmas, el IPERC pasa a estado `aprobado`

**ATS**
1. Supervisor crea ATS antes del trabajo (estado: `borrador`)
2. Define tareas, peligros por tarea, EPPs y participantes
3. Marca si requiere permiso de trabajo (PETAR) — hasta 8 tipos
4. Envía a firmas → todos los participantes deben firmar
5. Al completar firmas → estado `autorizado`, puede iniciar trabajo
6. Supervisor cierra ATS al finalizar → estado `cerrado`

---

## ✅ Próxima fase

**Fase 3**: Inspecciones + Accidentes + Seguimiento de acciones correctivas
