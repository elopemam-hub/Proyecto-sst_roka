# SST ROKA — Fase 5: Capacitaciones + Simulacros + Auditorías

## Resumen

La Fase 5 implementa los módulos de **Capacitaciones**, **Simulacros de Emergencia** y **Auditorías SST** sobre la base de las fases 1–4, completando el ciclo de gestión de seguridad conforme a la Ley 29783 y DS 005-2012-TR.

---

## Módulos implementados

### 1. Capacitaciones — Art. 35 Ley 29783

Programa de capacitación con registro de asistencia y evaluación.

| Ruta | Descripción |
|------|-------------|
| `GET /capacitaciones` | Lista paginada con filtros (estado, tipo, area_id, search) |
| `POST /capacitaciones` | Registrar nueva capacitación |
| `GET /capacitaciones/{id}` | Detalle con asistentes y evaluación |
| `PUT /capacitaciones/{id}` | Actualizar |
| `DELETE /capacitaciones/{id}` | Eliminar |
| `GET /capacitaciones/estadisticas` | KPIs: ejecutadas, programadas, cumplimiento %, horas, asistencia |
| `POST /capacitaciones/{id}/asistencia` | Registro masivo de asistencia (batch) |
| `POST /capacitaciones/{id}/ejecutar` | Cambiar estado a ejecutada |

**Tipos:** inducción, específica, general, sensibilización.
**Modalidad:** presencial, virtual, mixto.
**Evaluación:** Nota sobre 20, aprobación automática ≥14.

---

### 2. Simulacros de Emergencia — Art. 74 DS 005-2012-TR

Planificación, ejecución y evaluación de simulacros.

| Ruta | Descripción |
|------|-------------|
| `GET /simulacros` | Lista paginada con filtros |
| `POST /simulacros` | Crear simulacro |
| `GET /simulacros/{id}` | Detalle con participantes y evaluación |
| `PUT /simulacros/{id}` | Actualizar |
| `DELETE /simulacros/{id}` | Eliminar |
| `GET /simulacros/estadisticas` | KPIs: ejecutados, promedio evaluación, tiempo respuesta, próximo |
| `POST /simulacros/{id}/ejecutar` | Registrar ejecución (tiempo respuesta, personas evacuadas, participantes) |
| `POST /simulacros/{id}/evaluacion` | Registrar criterios de evaluación (1-5 estrellas) |

**Tipos de emergencia:** sismo, incendio, derrame, evacuación, primeros auxilios, otro.
**Roles de participante:** participante, observador, brigadista, coordinador.
**Criterios de evaluación:** 8 criterios predefinidos calificables de 1 a 5.

---

### 3. Auditorías SST — Art. 43 Ley 29783

Programa de auditorías internas/externas con hallazgos y seguimiento.

| Ruta | Descripción |
|------|-------------|
| `GET /auditorias` | Lista paginada con hallazgos count |
| `POST /auditorias` | Programar auditoría |
| `GET /auditorias/{id}` | Detalle con hallazgos y timeline de seguimiento |
| `PUT /auditorias/{id}` | Actualizar |
| `DELETE /auditorias/{id}` | Eliminar |
| `GET /auditorias/estadisticas` | KPIs: completadas, hallazgos abiertos/vencidos, por tipo |
| `POST /auditorias/{id}/hallazgos` | Registrar hallazgo |
| `POST /auditorias/hallazgos/{id}/seguimiento` | Registrar seguimiento (auto-cierre si conforme) |

**Tipos hallazgo:** no conformidad mayor, no conformidad menor, observación, oportunidad de mejora.
**Estados hallazgo:** abierto → en_proceso → cerrado (automático al registrar seguimiento "conforme").
**Detección de vencidos:** hallazgos con fecha_limite pasada se marcan con alerta visual.

---

## Base de datos

### Tablas nuevas — 3 migraciones

```
capacitaciones                   — empresa, área, tipo, modalidad, fecha, expositor, estado
capacitacion_asistentes          — FK capacitacion + personal, asistió, nota, aprobado, firma
capacitacion_evaluaciones        — FK capacitacion, preguntas JSON, nota mínima

simulacros                       — empresa, área, coordinador, tipo emergencia, fecha, estado
simulacro_participantes          — FK simulacro + personal, rol, asistió
simulacro_evaluacion             — FK simulacro, criterio, calificación 1-5

auditorias                       — empresa, área, tipo, norma, auditor, equipo JSON, estado
auditoria_hallazgos              — FK auditoria, tipo hallazgo, cláusula, responsable, fecha_limite
auditoria_seguimiento            — FK hallazgo, fecha, descripción, resultado (conforme/no/parcial)
```

---

## Modelos

| Modelo | Tabla | Accessors |
|--------|-------|-----------|
| `Capacitacion` | capacitaciones | `porcentaje_asistencia`, `total_asistentes` |
| `CapacitacionAsistente` | capacitacion_asistentes | — |
| `CapacitacionEvaluacion` | capacitacion_evaluaciones | — |
| `Simulacro` | simulacros | `duracion_minutos`, `promedio_evaluacion` |
| `SimulacroParticipante` | simulacro_participantes | — |
| `SimulacroEvaluacion` | simulacro_evaluacion | — |
| `AuditoriaInterna` | auditorias | `hallazgos_abiertos_count` |
| `AuditoriaHallazgo` | auditoria_hallazgos | `esta_vencido`, `dias_restantes` |
| `AuditoriaSeguimiento` | auditoria_seguimiento | — |

---

## Frontend

### Páginas

| Ruta | Página | Descripción |
|------|--------|-------------|
| `/capacitaciones` | `CapacitacionListPage` | Tabla + KPIs + filtros (5 indicadores) |
| `/capacitaciones/nueva` | `CapacitacionFormPage` | Formulario con área, expositor, modalidad |
| `/capacitaciones/:id` | `CapacitacionDetailPage` | Detalle + registro masivo asistencia + notas + botón ejecutar |
| `/simulacros` | `SimulacroListPage` | Tabla con emojis de tipo + próximo simulacro + KPIs |
| `/simulacros/nuevo` | `SimulacroFormPage` | Formulario con tipo emergencia, coordinador, horarios |
| `/simulacros/:id` | `SimulacroDetailPage` | Detalle + modal ejecución + modal evaluación estrellas |
| `/auditorias` | `AuditoriaListPage` | Tabla + mini-barras hallazgos + KPIs con vencidos en rojo |
| `/auditorias/nueva` | `AuditoriaFormPage` | Formulario con equipo auditor multi-tag + alcance/objetivo |
| `/auditorias/:id` | `AuditoriaDetailPage` | Acordeón de hallazgos + timeline seguimiento + modales |

---

## Cómo ejecutar

### Backend (Laravel)

```bash
cd backend
php artisan migrate          # crea 9 tablas nuevas
php artisan serve            # http://localhost:8000
```

Verificar rutas:
```bash
php artisan route:list | grep -E "capacitaciones|simulacros|auditorias"
```

### Frontend (React + Vite)

```bash
cd frontend
npm install
npx vite --port 3001         # http://localhost:3001
```

Credenciales demo: `admin@sstroka.pe` / `Admin@2024`

---

## Checklist de verificación

- [ ] `php artisan migrate` — sin errores, 9 tablas nuevas
- [ ] Menú lateral muestra Capacitaciones, Simulacros y Auditorías habilitados (sin badge Fase)
- [ ] Versión en sidebar: `v1.0 · Fase 5`
- [ ] `/capacitaciones` — lista carga con KPIs
- [ ] `/capacitaciones/nueva` — formulario guarda correctamente
- [ ] `/capacitaciones/:id` — registro de asistencia funciona (agregar personal, toggle, guardar batch)
- [ ] `/capacitaciones/:id` — botón "Ejecutar" cambia estado
- [ ] `/simulacros` — lista con emojis y próximo simulacro
- [ ] `/simulacros/nuevo` — formulario con tipo de emergencia
- [ ] `/simulacros/:id` — modal ejecución y evaluación por estrellas
- [ ] `/auditorias` — lista con barras de hallazgos por tipo
- [ ] `/auditorias/nueva` — equipo auditor tag chips funciona
- [ ] `/auditorias/:id` — acordeón de hallazgos expandible
- [ ] `/auditorias/:id` — agregar hallazgo y seguimiento funciona
- [ ] Seguimiento con resultado "conforme" cierra hallazgo automáticamente

---

## Fases del proyecto

| Fase | Módulos | Estado |
|------|---------|--------|
| 1 | Auth, Dashboard, Datos Maestros | ✅ Completa |
| 2 | IPERC, ATS, Firmas Digitales | ✅ Completa |
| 3 | Inspecciones, Accidentes, Seguimiento | ✅ Completa |
| 4 | Personal, EPPs, Salud/EMO | ✅ Completa |
| **5** | **Capacitaciones, Simulacros, Auditorías** | **✅ Completa** |
| 6 | Formatos, Documentos | ⬜ Pendiente |
| 7 | Reportes MINTRA | ⬜ Pendiente |
| 8 | Optimización + PWA | ⬜ Pendiente |
