# SST ROKA — Fase 9: Módulos Completos

## Resumen

Fase 9 cierra el sistema con los módulos de activos, planificación, configuración y sistema.
Total: **22 módulos funcionales**, backend Laravel + frontend React.

---

## Nuevos módulos en Fase 9

| Módulo | Ruta frontend | Endpoints API |
|--------|--------------|---------------|
| Empresa | `/configuracion/empresa` | `GET/PUT /api/empresas/{id}` |
| Áreas y Cargos | `/configuracion/areas` | `CRUD /api/areas`, `CRUD /api/cargos` |
| Usuarios | `/configuracion/usuarios` | `CRUD /api/usuarios`, toggle-activo, reset-password |
| Vehículos | `/vehiculos` | `CRUD /api/vehiculos`, `GET /api/vehiculos/estadisticas` |
| Equipos | `/equipos` | `CRUD /api/equipos`, `GET /api/equipos/estadisticas` |
| Programa SST | `/programa` | `CRUD /api/programa`, actividades, avance |
| Notificaciones | `/notificaciones` | `GET /api/notificaciones`, conteo, marcar leída |
| Auditoría Log | `/auditoria` | `GET /api/auditoria-log` (solo lectura) |

---

## Instalación local (XAMPP)

### 1. Base de datos

1. Abrir `http://localhost/phpmyadmin`
2. Ir a **Importar** → seleccionar `sst_roka_database.sql`
3. Ejecutar

El script crea la base `sst_roka` con todas las tablas y datos iniciales.

**Credencial de acceso inicial:**
- Email: `admin@roka.pe`
- Contraseña: `Admin123!`

### 2. Backend (Laravel)

```bash
cd backend
cp .env.example .env      # si no existe aún
```

Editar `.env`:
```env
APP_NAME="SST ROKA"
APP_URL=http://localhost/sst_roka/backend/public

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=sst_roka
DB_USERNAME=root
DB_PASSWORD=
```

```bash
composer install
php artisan key:generate
php artisan config:clear
```

Para servir vía Apache (XAMPP), acceder a:
`http://localhost/sst_roka/backend/public/api/...`

### 3. Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

Acceder a `http://localhost:5173`

Verificar que `frontend/src/services/api.js` apunte a:
```js
baseURL: 'http://localhost/sst_roka/backend/public/api'
```

---

## Estructura de archivos Fase 9

```
backend/
├── app/
│   ├── Models/
│   │   ├── Vehiculo.php
│   │   ├── Equipo.php
│   │   ├── ProgramaSst.php
│   │   ├── ProgramaSstActividad.php
│   │   ├── Notificacion.php
│   │   └── AuditoriaLog.php
│   └── Http/Controllers/Api/
│       ├── VehiculoController.php
│       ├── EquipoController.php
│       ├── ProgramaSstController.php
│       ├── NotificacionController.php
│       └── AuditoriaLogController.php
└── routes/
    └── api.php           ← rutas Fase 9 al final del archivo

frontend/src/pages/
├── configuracion/
│   ├── EmpresaPage.jsx
│   ├── AreasPage.jsx
│   └── UsuariosPage.jsx
├── vehiculos/
│   ├── VehiculoListPage.jsx
│   └── VehiculoFormPage.jsx
├── equipos/
│   ├── EquipoListPage.jsx
│   └── EquipoFormPage.jsx
├── programa/
│   ├── ProgramaListPage.jsx
│   ├── ProgramaDetailPage.jsx
│   └── ProgramaFormPage.jsx
├── notificaciones/
│   └── NotificacionesPage.jsx
└── auditoria/
    └── AuditoriaLogPage.jsx
```

---

## Verificación rápida

```bash
# Confirmar rutas registradas
php artisan route:list | grep -E "vehicul|equip|programa|notific|auditoria-log"
```

Debe mostrar al menos 15 rutas nuevas.

**Checklist UI:**
- [ ] Menú lateral muestra grupos: Activos, Planeación, Configuración, Sistema
- [ ] `/vehiculos` carga lista con KPIs (Total, Activos, SOAT vencido)
- [ ] `/equipos` carga lista con filtros tipo/área/estado
- [ ] `/programa` muestra barras de progreso por año
- [ ] `/notificaciones` agrupa por Hoy / Ayer / Esta semana
- [ ] `/auditoria` permite expandir filas para ver JSON diff
- [ ] Badge del bell en header muestra count de no leídas
- [ ] Badge de firmas pendientes en header funciona

---

## Módulos completos del sistema (22 total)

| # | Módulo | Grupo | Estado |
|---|--------|-------|--------|
| 1 | Dashboard | Principal | ✅ |
| 2 | IPERC | Operativo | ✅ |
| 3 | ATS | Operativo | ✅ |
| 4 | Inspecciones | Operativo | ✅ |
| 5 | Accidentes | Operativo | ✅ |
| 6 | Seguimiento | Operativo | ✅ |
| 7 | Gestión Humana | Gestión | ✅ |
| 8 | EPPs | Gestión | ✅ |
| 9 | Salud / EMO | Gestión | ✅ |
| 10 | Capacitaciones | Gestión | ✅ |
| 11 | Simulacros | Gestión | ✅ |
| 12 | Auditorías | Gestión | ✅ |
| 13 | Formatos RM 050 | Documental | ✅ |
| 14 | Documentos SST | Documental | ✅ |
| 15 | Reportes MINTRA | Documental | ✅ |
| 16 | Vehículos | Activos | ✅ Fase 9 |
| 17 | Equipos | Activos | ✅ Fase 9 |
| 18 | Programa SST | Planeación | ✅ Fase 9 |
| 19 | Empresa | Configuración | ✅ Fase 9 |
| 20 | Áreas y Cargos | Configuración | ✅ Fase 9 |
| 21 | Usuarios | Configuración | ✅ Fase 9 |
| 22 | Notificaciones | Sistema | ✅ Fase 9 |
| 23 | Auditoría Log | Sistema | ✅ Fase 9 |
