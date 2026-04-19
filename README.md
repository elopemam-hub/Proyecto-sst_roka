# SST ROKA — Sistema ERP de Gestión SST

> Sistema completo de Seguridad y Salud en el Trabajo alineado a Ley 29783, DS 005-2012-TR, RM 050-2013-TR e ISO 45001:2018

---

## 🚀 Inicio rápido

```bash
# 1. Clonar y entrar al proyecto
git clone <repo>
cd sst-roka

# 2. Copiar variables de entorno
cp backend/.env.example backend/.env

# 3. Levantar todos los servicios
docker-compose up -d

# 4. Instalar dependencias backend
docker-compose exec app composer install
docker-compose exec app php artisan key:generate
docker-compose exec app php artisan migrate --seed

# 5. El frontend se levanta automáticamente en http://localhost:3000
```

**Usuario demo:**
- Email: `admin@sstroka.pe`
- Password: `Admin@2024`

---

## 📋 Estado de fases

| Fase | Módulos                                      | Estado       |
|------|----------------------------------------------|--------------|
| ✅ 1 | Auth + Datos Maestros + Dashboard            | **Completo** |
| ✅ 2 | IPERC + ATS + Firmas                         | **Completo** |
| ✅ 3 | Inspecciones + Accidentes + Seguimiento      | **Completo** |
| ✅ 4 | Gestión Humana + EPPs + Salud/EMO            | **Completo** |
| ✅ 5 | Capacitaciones + Simulacros + Auditorías     | **Completo** |
| ✅ 6 | Formatos + Documentos + Control documental   | **Completo** |
| ✅ 7 | Reportes legales MINTRA + Dashboard completo | **Completo** |
| ✅ 8 | Optimización + Seguridad + PWA offline       | **Completo** |

---

## 🗂️ Estructura del proyecto

```
sst-roka/
├── docker-compose.yml
├── backend/                          # Laravel PHP 8.2
│   ├── app/
│   │   ├── Http/Controllers/Api/
│   │   │   ├── AuthController.php
│   │   │   └── DashboardController.php
│   │   ├── Models/
│   │   │   ├── Empresa.php
│   │   │   ├── Usuario.php
│   │   │   └── Personal.php
│   │   └── Services/
│   │       └── AuditoriaService.php
│   ├── database/
│   │   ├── migrations/               # 4 migraciones base
│   │   └── seeders/
│   │       └── DatabaseSeeder.php
│   └── routes/api.php
└── frontend/                         # React 18 + Vite + Tailwind
    └── src/
        ├── App.jsx                   # Router principal
        ├── store/                    # Redux Toolkit
        │   └── slices/
        │       ├── authSlice.js
        │       ├── uiSlice.js
        │       └── dashboardSlice.js
        ├── components/
        │   ├── layout/AppLayout.jsx  # Sidebar + Header
        │   └── dashboard/KpiCard.jsx
        ├── pages/
        │   ├── auth/LoginPage.jsx
        │   └── dashboard/DashboardPage.jsx
        └── services/api.js           # Axios + interceptors
```

---

## 🔌 API Endpoints (Fase 1)

```
POST   /api/auth/login           # Iniciar sesión
POST   /api/auth/logout          # Cerrar sesión (auth)
GET    /api/auth/me              # Usuario actual (auth)
POST   /api/auth/refresh         # Refrescar token (auth)

GET    /api/dashboard/kpis       # KPIs principales (auth)
GET    /api/dashboard/accidentabilidad  # Gráfico mensual (auth)
GET    /api/dashboard/por-area   # Estado por área (auth)

GET    /api/empresas             # CRUD empresas (auth)
GET    /api/personal             # CRUD personal (auth)
GET    /api/usuarios             # CRUD usuarios (auth)
GET    /api/areas                # CRUD áreas (auth)
```

---

## 🗄️ Tablas de base de datos

| Tabla                         | Descripción                          |
|-------------------------------|--------------------------------------|
| `empresas`                    | Datos de la empresa                  |
| `sedes`                       | Plantas/sedes de la empresa          |
| `areas`                       | Áreas operativas                     |
| `cargos`                      | Puestos de trabajo                   |
| `personal`                    | Trabajadores                         |
| `usuarios`                    | Cuentas de acceso al sistema         |
| `personal_access_tokens`      | Tokens Sanctum                       |
| `vehiculos`                   | Flota vehicular                      |
| `equipos`                     | Maquinaria y equipos                 |
| `epps_tipos`                  | Catálogo de tipos de EPP             |
| `epps_inventario`             | Stock de EPPs por talla/marca        |
| `auditoria_log`               | Log inmutable de acciones            |
| `notificaciones`              | Notificaciones in-app                |
| `alertas_config`              | Configuración de alertas automáticas |
| `programa_sst`                | Programa SST anual                   |
| `programa_sst_actividades`    | Actividades del programa             |

---

## 🔐 Roles y permisos

| Rol             | Acceso                                              |
|-----------------|-----------------------------------------------------|
| administrador   | Todo el sistema                                     |
| supervisor_sst  | Dashboard, inspecciones, IPERC, ATS, reportes       |
| tecnico_sst     | Dashboard, inspecciones, IPERC, ATS, seguimiento    |
| operativo       | Dashboard, ver inspecciones, ATS                    |
| vigilante       | Dashboard, ver inspecciones                         |
| solo_lectura    | Solo dashboard                                      |

---

## 📐 Normativa implementada

- **Ley 29783** — Ley de Seguridad y Salud en el Trabajo
- **DS 005-2012-TR** — Reglamento de la Ley 29783
- **DS 016-2016-TR** — Modificatoria del reglamento
- **RM 050-2013-TR** — Formatos referenciales (Registros 01–10)
- **ISO 45001:2018** — Sistema de gestión SST
- **SUNAFIL** — Fiscalización laboral

---

*SST ROKA — Desarrollado para operaciones industriales en Perú*
