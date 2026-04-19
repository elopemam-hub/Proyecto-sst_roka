# SST ROKA — Fase 4: Gestión Humana + EPPs + Salud/EMO

## Resumen

La Fase 4 implementa los módulos de **Gestión Humana (Personal)**, **EPPs** y **Salud/EMO** sobre la base de las fases 1–3 (Auth, IPERC, ATS, Firmas, Inspecciones, Accidentes, Seguimiento).

---

## Módulos implementados

### 1. Gestión Humana — Personal

Registro y seguimiento del personal de la empresa conforme a la Ley 29783.

| Ruta | Descripción |
|------|-------------|
| `GET /personal` | Lista paginada con filtros (search, area_id, estado) |
| `POST /personal` | Registrar nuevo trabajador |
| `GET /personal/{id}` | Detalle del trabajador |
| `PUT /personal/{id}` | Actualizar datos |
| `DELETE /personal/{id}` | Eliminar |
| `GET /personal/{id}/historial-sst` | Historial de EMO, EPPs y restricciones |

**Campos clave:** nombres, apellidos, dni, fecha_nacimiento, sexo, celular, email, area_id, cargo, fecha_ingreso, tipo_contrato, estado.

---

### 2. EPPs — Equipos de Protección Personal

Inventario y control de entregas de EPPs conforme al Art. 61 de la Ley 29783.

#### Inventario

| Ruta | Descripción |
|------|-------------|
| `GET /epps` | Lista inventario (filtros: categoria_id, stock_critico, activo, search) |
| `POST /epps` | Registrar nuevo EPP |
| `GET /epps/{id}` | Detalle con últimas 20 entregas |
| `PUT /epps/{id}` | Actualizar |
| `DELETE /epps/{id}` | Soft delete |
| `GET /epps/categorias` | Categorías activas de la empresa |
| `GET /epps/estadisticas` | Stock crítico, entregas del mes, por categoría |

#### Entregas

| Ruta | Descripción |
|------|-------------|
| `POST /epps/entregas` | Registrar entrega (valida stock, transacción DB) |
| `POST /epps/entregas/{id}/devolucion` | Registrar devolución o pérdida |
| `GET /epps/{id}/entregas` | Historial de entregas de un ítem |

**Motivos de entrega:** ingreso, reposicion, deterioro, talla, perdida.

---

### 3. Salud / EMO

Exámenes médicos ocupacionales conforme al Art. 49 de la Ley 29783.

#### EMO

| Ruta | Descripción |
|------|-------------|
| `GET /salud` | Lista EMO (filtros: personal_id, tipo, resultado, vencidas, proximas) |
| `POST /salud` | Registrar nuevo EMO |
| `GET /salud/{id}` | Detalle con restricciones |
| `PUT /salud/{id}` | Actualizar |
| `DELETE /salud/{id}` | Eliminar |
| `GET /salud/estadisticas` | Vencidos, próximos 30d, por resultado, por tipo, con restricciones |

#### Restricciones y Atenciones

| Ruta | Descripción |
|------|-------------|
| `GET /salud/personal/{personalId}/restricciones` | Restricciones activas del trabajador |
| `POST /salud/restricciones` | Registrar restricción médica |
| `GET /salud/atenciones` | Lista de atenciones (filtros: personal_id, tipo, baja_laboral) |
| `POST /salud/atenciones` | Registrar atención médica |

**Tipos de EMO:** pre_ocupacional, periodico, retiro, por_cambio_ocupacional.  
**Resultados:** apto, apto_con_restricciones, no_apto.

---

## Base de datos

### Tablas nuevas — Migración `2024_04_01_000002_create_salud_tables.php`

```
salud_emo
├── empresa_id, personal_id
├── tipo (enum), fecha_examen, fecha_vencimiento
├── clinica, medico
├── resultado (enum: apto | apto_con_restricciones | no_apto)
├── restricciones (text), observaciones, archivo_path
└── notificado (bool)

salud_restricciones
├── empresa_id, personal_id, emo_id (FK nullable), area_id (FK nullable)
├── descripcion, tipo_restriccion
├── fecha_inicio, fecha_fin (nullable)
└── activa (bool default true)

salud_atenciones
├── empresa_id, personal_id
├── fecha (datetime), tipo (enum)
├── descripcion, tratamiento, derivado_a
├── baja_laboral (bool), dias_descanso (int)
└── atendido_por
```

### Tablas existentes — Migración `2024_04_01_000001_create_epps_tables.php`

```
epps_categorias       — nombre, descripcion, requiere_talla, activa
epps_inventario       — categoria_id, nombre, marca, modelo, codigo_interno, talla,
                        stock_total, stock_disponible, stock_minimo, unidad,
                        costo_unitario, proveedor, activo (SoftDeletes)
epps_entregas         — personal_id, inventario_id, cantidad, fecha_entrega,
                        fecha_vencimiento, motivo_entrega, estado, entregado_por,
                        fecha_devolucion
```

---

## Modelos

| Modelo | Tabla | Accessor |
|--------|-------|----------|
| `EppCategoria` | epps_categorias | — |
| `EppInventario` | epps_inventario | `stock_critico` (bool) |
| `EppEntrega` | epps_entregas | `esta_vencida` (bool) |
| `Emo` | salud_emo | `esta_vencida`, `dias_para_vencer` |
| `SaludRestriccion` | salud_restricciones | — |
| `SaludAtencion` | salud_atenciones | — |

---

## Frontend

### Páginas

| Ruta | Página | Descripción |
|------|--------|-------------|
| `/personal` | `PersonalListPage` | Tabla + KPIs + filtros |
| `/personal/nuevo` | `PersonalFormPage` | Registro nuevo trabajador |
| `/personal/:id` | `PersonalDetailPage` | Perfil + EPPs + último EMO |
| `/personal/:id/editar` | `PersonalFormPage` | Edición |
| `/epps` | `EppListPage` | Inventario (stock crítico en rojo) + tab entregas |
| `/epps/nuevo` | `EppFormPage` | Clasificación + stock + proveedor |
| `/epps/:id/editar` | `EppFormPage` | Edición |
| `/epps/entrega` | `EppEntregaPage` | Registro de dotación con validación de stock |
| `/salud` | `SaludListPage` | Tabs: EMO / Atenciones / Restricciones |
| `/salud/nuevo` | `SaludFormPage` | Registro EMO + fecha_vencimiento auto (+1 año) |
| `/salud/:id` | `SaludDetailPage` | Detalle EMO + modal atención rápida |
| `/salud/:id/editar` | `SaludFormPage` | Edición |

### Componentes reutilizados

- Sistema de diseño: `bg-slate-950/900/800`, `border-slate-700`, `text-roka-*`
- Badges de estado: color-coded por resultado/estado
- Búsqueda de personal inline con dropdown (componente patrón en EppEntregaPage y SaludFormPage)
- Paginación estándar con meta `last_page / from / to / total`

---

## Cómo ejecutar

### Backend (Laravel)

```bash
cd backend
php artisan migrate          # crea las 3 tablas salud_* (EPPs ya existen)
php artisan serve            # http://localhost:8000
```

Verificar rutas:
```bash
php artisan route:list | grep -E "epps|salud|personal"
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

- [ ] `php artisan migrate` — sin errores, 3 tablas nuevas en salud_*
- [ ] Menú lateral muestra Gestión Humana, EPPs y Salud/EMO habilitados (sin badge Fase)
- [ ] Versión en sidebar: `v1.0 · Fase 4`
- [ ] `/personal` — página carga sin errores
- [ ] `/personal/nuevo` — formulario guarda correctamente
- [ ] `/epps` — inventario muestra filas rojas para stock crítico
- [ ] `/epps/entrega` — warning aparece si cantidad > stock disponible
- [ ] `/salud` — tabs EMO / Atenciones funcionan
- [ ] `/salud/nuevo` — botón "auto +1 año" calcula fecha_vencimiento
- [ ] `/salud/:id` — modal "Registrar Atención" abre y guarda

---

## Fases del proyecto

| Fase | Módulos | Estado |
|------|---------|--------|
| 1 | Auth, Dashboard, Datos Maestros | ✅ Completa |
| 2 | IPERC, ATS, Firmas Digitales | ✅ Completa |
| 3 | Inspecciones, Accidentes, Seguimiento | ✅ Completa |
| **4** | **Personal, EPPs, Salud/EMO** | **✅ Completa** |
| 5 | Capacitaciones, Simulacros, Auditorías | ⬜ Pendiente |
| 6 | Formatos, Documentos | ⬜ Pendiente |
| 7 | Reportes MINTRA | ⬜ Pendiente |
