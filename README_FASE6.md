# SST ROKA — Fase 6: Formatos RM 050-2013-TR + Documentos SST

## Resumen

La Fase 6 implementa los módulos de **Formatos RM 050-2013-TR** y **Gestión Documental SST** sobre la base de las fases 1–5, completando el grupo "documental" del sistema. Permite generar los 10 registros legales obligatorios exigidos por MINTRA (algunos auto-poblados desde los datos ya existentes en el sistema) y gestionar los documentos SST con versionado, ciclo de vida y control de aprobaciones, conforme a la Ley 29783 y RM 050-2013-TR.

---

## Módulos implementados

### 1. Formatos RM 050-2013-TR

Los 10 registros oficiales obligatorios. Siete de ellos se generan automáticamente extrayendo datos del sistema (accidentes, inspecciones, auditorías, capacitaciones, simulacros); los tres restantes se llenan manualmente.

| Registro | Descripción | Fuente automática |
|----------|-------------|-------------------|
| Reg. 01 | Accidentes de Trabajo | ✅ Módulo Accidentes (tipos mortal, incapacitante, leve) |
| Reg. 02 | Enfermedades Ocupacionales | — Manual |
| Reg. 03 | Incidentes Peligrosos e Incidentes | ✅ Módulo Accidentes (tipos incidente_peligroso, incidente) |
| Reg. 04 | Investigación de Accidentes e Incidentes | ✅ Módulo Accidentes (con investigación cargada) |
| Reg. 05 | Monitoreo de Agentes Ocupacionales | — Manual |
| Reg. 06 | Inspecciones Internas de SST | ✅ Módulo Inspecciones |
| Reg. 07 | Equipos de Atención de Emergencias | — Manual |
| Reg. 08 | Auditorías | ✅ Módulo Auditorías |
| Reg. 09 | Capacitaciones, Inducciones y Simulacros | ✅ Módulos Capacitaciones + Simulacros |
| Reg. 10 | Estadísticas de Seguridad y Salud | ✅ Cálculo automático IF, IG, ISAL, TA |

**Flujo de estados:** `borrador` → `vigente` (aprobar) / `anulado`

#### Indicadores calculados — Reg. 10

| Indicador | Fórmula | Descripción |
|-----------|---------|-------------|
| IF | Accidentes × 10⁶ / HHT | Índice de Frecuencia |
| IG | Días perdidos × 10⁶ / HHT | Índice de Gravedad |
| ISAL | IG / IF | Índice de Accidentabilidad |
| TA | Mortales × 10⁶ / HHT | Tasa de Accidentabilidad |

#### Rutas API

| Ruta | Descripción |
|------|-------------|
| `GET /formatos` | Lista paginada con filtros (tipo_registro, estado, periodo_anio, search) |
| `POST /formatos` | Crear registro manual (estado inicial: borrador) |
| `GET /formatos/{id}` | Detalle con datos_json expandido |
| `PUT /formatos/{id}` | Actualizar (solo si estado=borrador) |
| `DELETE /formatos/{id}` | Eliminar (solo si estado=borrador) |
| `GET /formatos/estadisticas` | KPIs: vigentes, borradores, total año, tipos con registro vigente |
| `POST /formatos/generar/{tipo}` | Generar automáticamente desde datos del sistema |
| `POST /formatos/{id}/aprobar` | Cambiar estado a vigente |
| `POST /formatos/{id}/anular` | Anular registro |

**Correlativos auto-generados:** `REG01-YYYYMM-00001`, `REG06-YYYYMM-00001`, etc.

---

### 2. Documentos SST — Control Documental

Gestión del ciclo de vida completo de documentos SST con versionado y aprobación.

**Tipos de documentos:** política, procedimiento, instructivo, registro, plan, programa, otro.

**Flujo de estados:** `borrador` → `en_revision` → `aprobado` → `obsoleto`

**Versionado:** cada reemplazo de archivo genera una nueva versión (menor: 1.0→1.1, mayor: 1.0→2.0) con historial completo.

#### Rutas API

| Ruta | Descripción |
|------|-------------|
| `GET /documentos` | Lista paginada con filtros (tipo, estado, area_id, search) |
| `POST /documentos` | Crear documento con upload de archivo (PDF/Word/Excel, máx. 20 MB) |
| `GET /documentos/{id}` | Detalle con historial de versiones |
| `PUT /documentos/{id}` | Actualizar metadata o reemplazar archivo (nueva versión) |
| `DELETE /documentos/{id}` | Eliminar + eliminar archivos físicos |
| `GET /documentos/estadisticas` | KPIs: total, aprobados, en revisión, obsoletos, próximos a vencer |
| `POST /documentos/{id}/aprobar` | Cambiar estado a aprobado, registra aprobado_por y fecha |
| `POST /documentos/{id}/obsoleto` | Marcar como obsoleto |
| `GET /documentos/{id}/versiones` | Historial de versiones del documento |
| `GET /documentos/{id}/descargar` | Descarga del archivo actual |

**Códigos auto-generados:** `DOC-YYYYMM-00001`, `DOC-YYYYMM-00002`, etc.

**Almacenamiento:** `storage/app/documentos/{empresa_id}/` (Laravel Storage local).

**Alerta de revisión:** documentos aprobados con `fecha_revision` ≤ 30 días aparecen resaltados.

---

## Base de datos

### Tablas nuevas — 2 migraciones

```
formatos_registros
  id, empresa_id (FK), tipo_registro (enum reg_01..reg_10), correlativo (unique),
  titulo, periodo_anio, periodo_mes, estado (enum), datos_json (JSON),
  origen_tipo, origen_id, creado_por (FK), observaciones, timestamps
  índices: (empresa_id, tipo_registro), (empresa_id, estado), (empresa_id, periodo_anio)

documentos
  id, empresa_id (FK), area_id (FK nullable), codigo (unique),
  titulo, descripcion, tipo (enum), version_actual, estado (enum),
  archivo_path, archivo_nombre, creado_por (FK), aprobado_por (FK nullable),
  fecha_aprobacion, fecha_revision, observaciones, timestamps
  índices: (empresa_id, tipo), (empresa_id, estado)

documentos_versiones
  id, documento_id (FK cascade), version, archivo_path, cambios, creado_por (FK), timestamps
  índice: (documento_id)
```

---

## Modelos

| Modelo | Tabla | Accessors / Scopes |
|--------|-------|--------------------|
| `FormatoRegistro` | formatos_registros | `tipo_label`, `getTiposLabels()`, `scopeVigentes()`, `scopePorTipo()` |
| `Documento` | documentos | `archivo_url`, `scopeAprobados()`, `scopePorTipo()` |
| `DocumentoVersion` | documentos_versiones | — |

---

## Frontend

### Páginas

| Ruta | Página | Descripción |
|------|--------|-------------|
| `/formatos` | `FormatoListPage` | Tabla + KPIs (vigentes, borradores, tipos con registro) + dropdown "Generar" |
| `/formatos/nuevo` | `FormatoFormPage` | Formulario manual con selector de tipo y periodo |
| `/formatos/:id` | `FormatoDetailPage` | Detalle + datos_json renderizados por tipo + botones Aprobar/Anular + impresión CSS |
| `/formatos/:id/editar` | `FormatoFormPage` | Edición (solo borradores) |
| `/documentos` | `DocumentoListPage` | Tabla con badges de tipo/estado + KPIs + filtros + link de acción |
| `/documentos/nuevo` | `DocumentoFormPage` | Upload drag-and-drop, tipo, área, fecha de revisión |
| `/documentos/:id` | `DocumentoDetailPage` | Metadata + botón descargar + historial de versiones con timeline |
| `/documentos/:id/editar` | `DocumentoFormPage` | Editar metadata + reemplazar archivo con tipo de cambio menor/mayor |

### Componentes destacados

- **Dropdown "Generar"** con selector de año: genera automáticamente cualquiera de los 10 registros y navega al detalle.
- **DatosRegistro** (componente interno): renderiza el `datos_json` de forma tabular específica por tipo_registro (accidentes, inspecciones, auditorías, capacitaciones/simulacros, estadísticas).
- **Estilos de impresión**: `FormatoDetailPage` incluye clases `print:` de Tailwind para imprimir directamente desde el navegador.
- **Upload con versionado**: `DocumentoFormPage` detecta si es nuevo archivo en edición y muestra selector de tipo de cambio (menor/mayor) + campo de descripción del cambio.

---

## Cómo ejecutar

### Backend (Laravel)

```bash
cd backend
php artisan migrate          # crea tablas: formatos_registros, documentos, documentos_versiones
php artisan serve            # http://localhost:8000
```

Verificar rutas:
```bash
php artisan route:list | grep -E "formatos|documentos"
```

Verificar almacenamiento (necesario para uploads):
```bash
php artisan storage:link     # solo si usa disco public
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

- [ ] `php artisan migrate` — sin errores, 3 tablas nuevas
- [ ] Menú lateral muestra **Formatos** y **Documentos** habilitados (sin badge "F6")
- [ ] Versión en sidebar: `v1.0 · Fase 6`

**Formatos:**
- [ ] `/formatos` — lista carga con KPIs (vigentes, borradores, tipos con registro)
- [ ] Botón "Generar → Reg. 06 (Inspecciones)" genera registro con datos reales del sistema
- [ ] Registro generado aparece en estado `borrador` con correlativo `REG06-YYYYMM-00001`
- [ ] `/formatos/:id` — muestra tabla de datos auto-generados correctamente
- [ ] Botón "Aprobar" cambia estado a `vigente` (badge verde)
- [ ] Registro vigente muestra botón "Anular" en lugar de "Aprobar"
- [ ] `/formatos/nuevo` — formulario manual guarda en estado borrador
- [ ] Editar formato (solo borradores) funciona; intentar editar vigente devuelve error 422
- [ ] Generar `reg_10` → muestra indicadores IF, IG, ISAL, TA calculados
- [ ] Botón "Imprimir" abre diálogo de impresión con layout limpio

**Documentos:**
- [ ] `/documentos` — lista carga con KPIs (total, aprobados, en revisión, próximos a vencer)
- [ ] `/documentos/nuevo` — crear documento sin archivo guarda en borrador con código `DOC-YYYYMM-00001`
- [ ] `/documentos/nuevo` — crear documento con PDF sube archivo a `storage/app/documentos/{id}/`
- [ ] `/documentos/:id` — botón "Descargar" descarga el archivo correctamente
- [ ] `/documentos/:id` — historial de versiones muestra versión `1.0` con "Versión inicial"
- [ ] `/documentos/:id/editar` — reemplazar archivo crea versión `1.1` (cambio menor) en historial
- [ ] Botón "Aprobar" registra `aprobado_por` y `fecha_aprobacion` correctamente
- [ ] Documento con `fecha_revision` próxima aparece con alerta en el detalle
- [ ] Botón "Marcar Obsoleto" solo disponible en documentos aprobados
- [ ] Auditoría: acciones crear/generar/aprobar registradas en `auditoria_log`

---

## Fases del proyecto

| Fase | Módulos | Estado |
|------|---------|--------|
| 1 | Auth, Dashboard, Datos Maestros | ✅ Completa |
| 2 | IPERC, ATS, Firmas Digitales | ✅ Completa |
| 3 | Inspecciones, Accidentes, Seguimiento | ✅ Completa |
| 4 | Personal, EPPs, Salud/EMO | ✅ Completa |
| 5 | Capacitaciones, Simulacros, Auditorías | ✅ Completa |
| **6** | **Formatos RM 050-2013-TR, Documentos SST** | **✅ Completa** |
| 7 | Reportes MINTRA + Dashboard estratégico | ⬜ Pendiente |
| 8 | Optimización + PWA offline | ⬜ Pendiente |
