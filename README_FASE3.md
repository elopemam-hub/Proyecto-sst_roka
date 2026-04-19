# SST ROKA — Fase 3

**Módulos**: Inspecciones · Accidentes e Incidentes · Seguimiento de acciones

Esta fase se instala **sobre la Fase 2**. Copia los archivos respetando la estructura y ejecuta las migraciones nuevas.

---

## 📦 Contenido

### Backend

**Migraciones** (`database/migrations/`)
- `2024_03_01_000001_create_inspecciones_tables.php` — 3 tablas: `inspecciones`, `inspecciones_items`, `inspecciones_hallazgos`
- `2024_03_01_000002_create_accidentes_tables.php` — 3 tablas: `accidentes`, `accidentes_investigacion`, `accidentes_acciones`
- `2024_03_01_000003_create_acciones_seguimiento_table.php` — tabla `acciones_seguimiento`

**Modelos** (`app/Models/`)
- `Inspeccion.php` — con generador de código correlativo y cálculo automático de puntaje y % cumplimiento
- `InspeccionItem.php` — ítems del checklist con resultado y evidencia
- `InspeccionHallazgo.php` — hallazgos con criticidad, responsable y estado
- `Accidente.php` — clasificación según Ley 29783, generación de código por tipo, control de notificación MINTRA
- `AccidenteInvestigacion.php` — metodologías árbol de causas, 5 porqués, Ishikawa
- `AccidenteAccion.php` — acciones correctivas derivadas de la investigación
- `AccionSeguimiento.php` — gestión centralizada de todas las acciones del sistema con generador de código y control de vencimiento

**Controladores API** (`app/Http/Controllers/Api/`)
- `InspeccionController.php` — CRUD + ejecutar checklist + registrar hallazgos + cerrar + estadísticas
- `AccidenteController.php` — CRUD + registro inmediato + investigación + acciones correctivas + estadísticas
- `SeguimientoController.php` — CRUD + actualizar avance + validar + resumen KPIs

**Rutas** — integradas en `routes/api.php` dentro del middleware `auth:sanctum`:

```
GET|POST        /api/inspecciones
GET|PUT|DELETE  /api/inspecciones/{id}
GET             /api/inspecciones/estadisticas
POST            /api/inspecciones/{id}/ejecutar
POST            /api/inspecciones/{id}/hallazgos
POST            /api/inspecciones/{id}/cerrar

GET|POST        /api/accidentes
GET|PUT|DELETE  /api/accidentes/{id}
GET             /api/accidentes/estadisticas
POST            /api/accidentes/{id}/investigacion
POST            /api/accidentes/{id}/acciones

GET|POST        /api/seguimiento
GET|PUT|DELETE  /api/seguimiento/{id}
GET             /api/seguimiento/resumen
POST            /api/seguimiento/{id}/validar
```

### Frontend

**Páginas Inspecciones** (`src/pages/inspecciones/`)
- `InspeccionListPage.jsx` — listado con filtros por estado y tipo, KPIs de cumplimiento y hallazgos
- `InspeccionFormPage.jsx` — formulario con checklist dinámico (ítems, categorías, criticidad)
- `InspeccionDetailPage.jsx` — detalle con ejecución en campo (selección de resultados por ítem), registro de hallazgos y cierre

**Páginas Accidentes** (`src/pages/accidentes/`)
- `AccidenteListPage.jsx` — listado con indicadores de notificación MINTRA pendiente y estadísticas por tipo
- `AccidenteFormPage.jsx` — registro inmediato con alerta de plazo MINTRA según tipo de evento
- `AccidenteDetailPage.jsx` — detalle con investigación, acciones correctivas, costos y control de notificación

**Páginas Seguimiento** (`src/pages/seguimiento/`)
- `SeguimientoListPage.jsx` — listado centralizado con barra de avance, filtros por prioridad y origen, resaltado de vencidas
- `SeguimientoFormPage.jsx` — formulario de acción con tipo, prioridad, plazos y asignación
- `SeguimientoDetailPage.jsx` — detalle con slider de avance, marcado como completada y validación por supervisor

**Archivos actualizados**
- `src/App.jsx` — incluye todas las rutas Fase 3 (12 rutas nuevas)
- `src/components/layout/AppLayout.jsx` — Inspecciones, Accidentes y Seguimiento habilitados en el menú lateral

---

## 🚀 Instalación sobre Fase 2

```bash
# 1. Ejecutar nuevas migraciones (9 tablas nuevas)
docker-compose exec app php artisan migrate

# 2. Reconstruir frontend
docker-compose exec frontend npm run build
# o en desarrollo:
docker-compose exec frontend npm run dev
```

No se requieren seeders adicionales. Las tablas se crean vacías y listos para operar.

---

## 🗄️ Tablas nuevas

| Tabla | Descripción |
|-------|-------------|
| `inspecciones` | Cabecera de cada inspección (código, tipo, estado, puntaje) |
| `inspecciones_items` | Ítems del checklist con resultado y puntaje |
| `inspecciones_hallazgos` | Hallazgos por ítem con criticidad y responsable |
| `accidentes` | Registro del evento (tipo, accidentado, lugar, costos) |
| `accidentes_investigacion` | Metodología y causas (solo 1 por accidente) |
| `accidentes_acciones` | Acciones correctivas derivadas de la investigación |
| `acciones_seguimiento` | Gestión centralizada de acciones de todos los módulos |

---

## 🔍 Módulo Inspecciones

Alineado a **RM-050-2013-TR Registro 06** y **Ley 29783 Art. 32**.

**Tipos disponibles**: equipos, infraestructura, emergencias, EPPs, orden y limpieza, higiene, general.

**Flujo de trabajo**:
1. Técnico SST crea la inspección con el checklist de ítems (estado: `programada`)
2. En campo, ejecuta la inspección marcando cada ítem como `conforme`, `no_conforme`, `observación` o `no aplica`
3. El sistema calcula automáticamente el **% de cumplimiento** = puntaje obtenido / puntaje total
4. Si hay ítems no conformes, el estado cambia a `con_hallazgos`
5. Por cada hallazgo se puede generar automáticamente una **acción de seguimiento**
6. Supervisor cierra la inspección (estado: `cerrada`)

**Cálculo de puntaje**:
```
% Cumplimiento = (Σ puntaje_obtenido / Σ puntaje_maximo) × 100
```
Solo se consideran ítems marcados como `aplica = true`.

---

## 🚨 Módulo Accidentes

Alineado a **Ley 29783 Arts. 82-88** y **RM-050-2013-TR Registros 01-03**.

**Tipos y plazos de notificación MINTRA**:

| Tipo | Plazo MINTRA |
|------|-------------|
| Accidente mortal | 24 horas |
| Incidente peligroso | 24 horas |
| Accidente incapacitante | 48 horas |
| Accidente leve | No obligatorio |
| Incidente | No obligatorio |

El sistema muestra alerta automática al registrar eventos que requieren notificación.

**Flujo de trabajo**:
1. Registrar el evento de inmediato (estado: `registrado`)
2. Notificar a MINTRA si aplica (registrar número de notificación)
3. Iniciar investigación con metodología elegida
4. Registrar causas inmediatas, causas básicas y lecciones aprendidas
5. Crear acciones correctivas con responsable y fecha límite
6. Cerrar el caso (estado: `cerrado`)

**Metodologías de investigación disponibles**:
- Árbol de causas
- 5 Porqués
- Ishikawa (Causa-Efecto)
- Combinado

**Código automático por tipo**:
```
ACC-2024-ACM-0001  ← Mortal
ACC-2024-ACI-0001  ← Incapacitante
ACC-2024-ACL-0001  ← Leve
ACC-2024-INP-0001  ← Incidente peligroso
ACC-2024-INC-0001  ← Incidente
```

---

## 📊 Módulo Seguimiento

Gestión centralizada de todas las acciones correctivas, preventivas y de mejora generadas por cualquier módulo.

**Orígenes posibles**: Inspección · Accidente · Auditoría · IPERC · ATS · Otro

**Estados del ciclo de vida**:

```
pendiente → en_proceso → completada → validada
                    ↓
                 vencida
```

**Prioridades**: baja · media · alta · crítica

**Alertas automáticas**:
- Las acciones con `fecha_limite < now()` y estado `pendiente` o `en_proceso` se marcan automáticamente como `vencida` al consultar el listado
- El resumen KPIs expone el conteo de acciones próximas a vencer (7 días)

**Flujo de validación**:
1. Responsable actualiza el avance (0–100%)
2. Al alcanzar 100%, puede marcar como `completada`
3. Supervisor revisa evidencias y valida con observaciones
4. Estado final: `validada` — no puede modificarse

---

## 🔗 Integraciones entre módulos

```
Inspección con hallazgos → genera automáticamente → AccionSeguimiento (correctiva)
Accidente registrado     → genera                 → AccidenteAccion (interna)
AccidenteAccion          → puede vincularse a      → AccionSeguimiento (trazabilidad)
InspeccionHallazgo       → referencia a            → AccionSeguimiento.accion_seguimiento_id
AccionSeguimiento        → registra origen en      → origen_tipo + origen_id (polimórfico)
```

---

## 📐 Normas aplicadas

| Norma | Módulo |
|-------|--------|
| Ley 29783 Art. 32 | Inspecciones obligatorias |
| Ley 29783 Arts. 82-88 | Registro y notificación de accidentes |
| DS 005-2012-TR Art. 110 | Investigación de accidentes |
| RM-050-2013-TR Registro 01 | Accidentes de trabajo |
| RM-050-2013-TR Registro 02 | Enfermedades ocupacionales |
| RM-050-2013-TR Registro 03 | Incidentes peligrosos |
| RM-050-2013-TR Registro 06 | Inspecciones internas |

---

## ✅ Próxima fase

**Fase 4**: Gestión Humana + EPPs + Salud / EMO
