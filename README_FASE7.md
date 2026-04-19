# SST ROKA — Fase 7: Reportes MINTRA + Dashboard Estratégico

## Resumen

La Fase 7 implementa el módulo de **Reportes legales MINTRA** con indicadores de accidentabilidad (IF, IG, ISAL), gráficos de tendencia con Recharts y un resumen ejecutivo preparado para inspección SUNAFIL. Cierra el ciclo de gestión SST integrando datos de todos los módulos anteriores (Fases 1–6).

---

## Módulo implementado: Reportes MINTRA

### Endpoint raíz: `GET /api/reportes/{reporte}`

Todos los endpoints requieren autenticación (Bearer Token Sanctum) y filtran por `empresa_id` del usuario autenticado.

| Ruta | Descripción |
|------|-------------|
| `GET /api/reportes/consolidado` | Dashboard ejecutivo: KPIs de todos los módulos para el año |
| `GET /api/reportes/accidentabilidad` | IF, IG, ISAL por mes + acumulados + serie mensual |
| `GET /api/reportes/inspecciones` | Cumplimiento, hallazgos por estado, por tipo mensual |
| `GET /api/reportes/capacitaciones` | Horas, asistencia %, ejecutadas vs. programadas por mes |
| `GET /api/reportes/salud` | EMO por mes/resultado, atenciones, bajas laborales |
| `GET /api/reportes/epps` | Entregas mensuales, stock por categoría, stock crítico |
| `GET /api/reportes/sunafil` | Resumen completo para inspección SUNAFIL |

**Parámetro común:** `?anio=2025` (default: año actual).

---

## Indicadores calculados

### Fórmulas RM 050-2013-TR / DS 005-2012-TR

| Indicador | Fórmula | Descripción |
|-----------|---------|-------------|
| **IF** | Accidentes × 10⁶ / HHT | Índice de Frecuencia |
| **IG** | Días perdidos × 10⁶ / HHT | Índice de Gravedad |
| **ISAL** | IG / IF | Índice de Accidentabilidad |
| **TA** | Mortales × 10⁶ / HHT | Tasa de Accidentabilidad (en consolidado) |

**HHT estimado:** total_personal_activo × 8h × 22 días × 12 meses (anual) ó × 1 mes (mensual).

---

## Backend

**Archivo:** `backend/app/Http/Controllers/Api/ReporteController.php`

| Método | Tablas consultadas |
|--------|--------------------|
| `consolidado()` | personal, accidentes, inspecciones, inspecciones_hallazgos, capacitaciones, salud_emo, epps_inventario, epps_entregas, auditoria_hallazgos |
| `accidentabilidad()` | personal, accidentes |
| `inspecciones()` | inspecciones, inspecciones_hallazgos |
| `capacitaciones()` | capacitaciones, capacitaciones_asistentes |
| `salud()` | salud_emo, salud_atenciones, salud_restricciones |
| `epps()` | epps_entregas, epps_inventario, epps_categorias |
| `sunafil()` | empresas + todas las anteriores |

---

## Frontend

### Página: `/reportes`

**Archivo:** `frontend/src/pages/reportes/ReportesPage.jsx`

Página única con **7 tabs** y selector de año:

| Tab | Contenido |
|-----|-----------|
| **Consolidado** | KPIs ejecutivos de todos los módulos + tabla resumen con semáforo OK/Atención |
| **Accidentabilidad** | KPIs IF/IG/ISAL + BarChart (accidentes/incidentes por mes) + LineChart (IF/IG mensual) + tabla mensual detallada |
| **Inspecciones** | KPIs cumplimiento + BarChart mensual + PieChart por tipo |
| **Capacitaciones** | KPIs horas/asistencia + BarChart dual (ejecutadas + horas) + PieChart por modalidad |
| **Salud/EMO** | KPIs + BarChart (EMO/atenciones/bajas) + PieChart por resultado |
| **EPPs** | KPIs entregas/stock + BarChart mensual + BarChart horizontal por categoría |
| **SUNAFIL** | Resumen ejecutivo imprimible: empresa, HHT, accidentabilidad completa, gestión SST |

### Biblioteca de gráficos

`recharts ^2.12.0` (ya instalada). Componentes usados:
- `BarChart` / `Bar` — series mensuales, comparaciones
- `LineChart` / `Line` — tendencias IF/IG
- `PieChart` / `Pie` — distribuciones (tipo, modalidad, resultado)
- `ResponsiveContainer` — responsivo en todos los layouts

### Botón "Imprimir"

`window.print()` — usa estilos nativos del navegador. El tab SUNAFIL está optimizado para impresión con clases `print:`.

---

## Rutas API agregadas

```php
// backend/routes/api.php
Route::prefix('reportes')->group(function () {
    Route::get('/consolidado',       [ReporteController::class, 'consolidado']);
    Route::get('/accidentabilidad',  [ReporteController::class, 'accidentabilidad']);
    Route::get('/inspecciones',      [ReporteController::class, 'inspecciones']);
    Route::get('/capacitaciones',    [ReporteController::class, 'capacitaciones']);
    Route::get('/salud',             [ReporteController::class, 'salud']);
    Route::get('/epps',              [ReporteController::class, 'epps']);
    Route::get('/sunafil',           [ReporteController::class, 'sunafil']);
});
```

---

## Cómo ejecutar

### Backend (Laravel)

```bash
cd backend
php artisan serve          # No requiere migraciones nuevas — solo lee tablas existentes
```

Verificar rutas:
```bash
php artisan route:list | grep reportes
```

### Frontend (React + Vite)

```bash
cd frontend
npx vite --port 3001       # http://localhost:3001
```

Credenciales demo: `admin@sstroka.pe` / `Admin@2024`

---

## Checklist de verificación

- [ ] Menú lateral: **Reportes MINTRA** habilitado (sin badge "F7")
- [ ] Versión en sidebar: `v1.0 · Fase 7`
- [ ] `/reportes` — página carga sin errores, tabs visibles
- [ ] Tab **Consolidado** — KPIs aparecen (0 si no hay datos en demo mode)
- [ ] Tab **Accidentabilidad** — gráficos BarChart y LineChart renderizan
- [ ] Selector de año cambia → todos los tabs recargan datos del año seleccionado
- [ ] Tab **SUNAFIL** — muestra nombre de empresa y RUC (demo: Empresa Demo SAC)
- [ ] Botón **Imprimir** abre diálogo de impresión del navegador
- [ ] Con backend activo: `GET /api/reportes/consolidado?anio=2025` retorna JSON con estructura completa
- [ ] Con backend activo: `GET /api/reportes/accidentabilidad` retorna `serie` con 12 meses

---

## Fases del proyecto

| Fase | Módulos | Estado |
|------|---------|--------|
| 1 | Auth, Dashboard, Datos Maestros | ✅ Completa |
| 2 | IPERC, ATS, Firmas Digitales | ✅ Completa |
| 3 | Inspecciones, Accidentes, Seguimiento | ✅ Completa |
| 4 | Personal, EPPs, Salud/EMO | ✅ Completa |
| 5 | Capacitaciones, Simulacros, Auditorías | ✅ Completa |
| 6 | Formatos RM 050-2013-TR, Documentos SST | ✅ Completa |
| **7** | **Reportes MINTRA + Dashboard estratégico** | **✅ Completa** |
| 8 | Optimización + PWA offline | ⬜ Pendiente |
