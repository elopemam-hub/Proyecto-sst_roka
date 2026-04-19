# Plan — Mejora Módulo Inspecciones (Fase 10)

## Contexto

El módulo de inspecciones existe con funcionalidad básica pero le faltan 6 características
del prompt SST_ROKA_Prompt_Mejorado.md. Además, las 3 páginas usan el tema dark (`slate-*`)
antiguo; el resto del sistema ya migró al tema light (`gray-*` + `roka-*`).

### Estado actual
- `InspeccionListPage.jsx` — lista con KPIs y filtros ✅, tema dark ❌
- `InspeccionFormPage.jsx` — formulario con ítems manuales ✅, banco de preguntas ❌, tema dark ❌
- `InspeccionDetailPage.jsx` — detalle + ejecución modal + hallazgos ✅, foto evidencia ❌, tema dark ❌
- `InspeccionController.php` — CRUD + ejecutar + registrarHallazgo + cerrar + estadisticas ✅

### Qué falta
| Requerimiento | Estado |
|---------------|--------|
| Lista con tabs Pendientes / En ejecución / Cerradas | ❌ |
| Banco de preguntas por tipo de inspección | ❌ |
| Evidencia fotográfica por hallazgo | ❌ |
| Agregar hallazgo directamente desde detalle (sin pasar por ejecutar) | ❌ |
| Dashboard de cumplimiento (gráfico/visualización) | ❌ |
| Exportar reporte (SUNAFIL / interno) CSV | ❌ |
| Tema visual actualizado a light | ❌ |

---

## Archivos a modificar

### 1. `frontend/src/pages/inspecciones/InspeccionListPage.jsx` (REWRITE)
- Tema light: `bg-white`, `border-gray-200`, `text-gray-*`
- Tabs de estado rápidos: `Todas | Pendientes | En ejecución | Cerradas`
  - "Pendientes" = estados `programada`
  - "En ejecución" = `en_ejecucion` + `con_hallazgos`
  - "Cerradas" = `cerrada`
- Botón "Exportar CSV" (client-side, igual patrón que AuditoriaLogPage)
- KPI cards con fondo blanco + borde

### 2. `frontend/src/pages/inspecciones/InspeccionFormPage.jsx` (REWRITE)
- Tema light
- **Banco de preguntas por tipo**: al seleccionar tipo, mostrar botón
  "Cargar plantilla" que rellena `items[]` con preguntas predefinidas.
  Plantillas hardcoded en el frontend (no requiere endpoint nuevo):
  ```js
  const PLANTILLAS = {
    equipos:         [{ categoria: 'Estado general', descripcion: '¿El equipo está en buen estado y sin daños visibles?', es_critico: false }, ...],
    epps:            [...],
    emergencias:     [...],
    orden_limpieza:  [...],
    infraestructura: [...],
    higiene:         [...],
  }
  ```
  Cada plantilla tiene 6–8 preguntas representativas.
  Al cargar: reemplaza los items actuales si están vacíos, o pregunta si reemplazar.

### 3. `frontend/src/pages/inspecciones/InspeccionDetailPage.jsx` (REWRITE)
- Tema light
- **Modal "Registrar Hallazgo"** (independiente del flujo ejecutar):
  - Campos: descripción, tipo (no_conformidad/observacion/oportunidad_mejora), criticidad (leve/moderado/critico), responsable_id, fecha_limite_correccion, generar_seguimiento toggle
  - **Foto evidencia**: `<input type="file" accept="image/*">` → convierte a base64 → envía como `foto_base64`
  - Preview de imagen antes de enviar
- **Dashboard cumplimiento** (nueva sección en detalle):
  - Barra de progreso por categoría (% ítems conformes por categoría)
  - Resumen: Conformes / No conformes / Observaciones / No aplica
- **Botón Exportar** hallazgos como CSV (client-side Blob)
- Hallazgos: mostrar miniatura foto si existe

### 4. `backend/app/Http/Controllers/Api/InspeccionController.php` (actualizar)
- En `registrarHallazgo()`: aceptar `foto_base64`, guardar como archivo en
  `storage/app/public/inspecciones/hallazgos/{id}.jpg`, retornar `foto_url`
- Agregar endpoint `GET /api/inspecciones/{id}/reporte` → JSON estructurado para export
  (datos de la inspección + ítems + hallazgos para generar CSV/PDF en frontend)

### 5. `backend/routes/api.php` (1 línea)
```php
Route::get('/{id}/reporte', [InspeccionController::class, 'reporte']);
// dentro del prefix('inspecciones') existente
```

### 6. `backend/app/Models/InspeccionHallazgo.php` (verificar campo foto_url)
- Agregar `foto_url` a `$fillable` si no está

---

## Banco de preguntas (plantillas frontend)

```js
const PLANTILLAS = {
  equipos: [
    { categoria: 'Estado general',    descripcion: '¿El equipo está operativo y sin daños visibles?',            es_critico: true,  puntaje_maximo: 2 },
    { categoria: 'Estado general',    descripcion: '¿El equipo tiene sus guardas de seguridad instaladas?',       es_critico: true,  puntaje_maximo: 2 },
    { categoria: 'Mantenimiento',     descripcion: '¿El equipo cuenta con registro de mantenimiento al día?',     es_critico: false, puntaje_maximo: 1 },
    { categoria: 'Mantenimiento',     descripcion: '¿El equipo tiene su tarjeta de inspección visible?',          es_critico: false, puntaje_maximo: 1 },
    { categoria: 'Operación',         descripcion: '¿El operador cuenta con EPPs adecuados para el equipo?',      es_critico: true,  puntaje_maximo: 2 },
    { categoria: 'Operación',         descripcion: '¿El operador conoce el procedimiento de operación segura?',   es_critico: false, puntaje_maximo: 1 },
  ],
  epps: [
    { categoria: 'Dotación',          descripcion: '¿El personal cuenta con todos los EPPs requeridos para su puesto?', es_critico: true, puntaje_maximo: 2 },
    { categoria: 'Estado',            descripcion: '¿Los EPPs están en buen estado (sin rotura, desgaste excesivo)?',   es_critico: true, puntaje_maximo: 2 },
    { categoria: 'Uso correcto',      descripcion: '¿El personal usa correctamente los EPPs durante la jornada?',       es_critico: true, puntaje_maximo: 2 },
    { categoria: 'Almacenamiento',    descripcion: '¿Los EPPs se almacenan correctamente cuando no se usan?',           es_critico: false, puntaje_maximo: 1 },
    { categoria: 'Vigencia',          descripcion: '¿Los EPPs están dentro de su vida útil o fecha de vencimiento?',   es_critico: false, puntaje_maximo: 1 },
    { categoria: 'Capacitación',      descripcion: '¿El personal ha sido capacitado en el uso correcto de EPPs?',       es_critico: false, puntaje_maximo: 1 },
  ],
  emergencias: [
    { categoria: 'Extintores',        descripcion: '¿Los extintores están en sus ubicaciones señalizadas?',             es_critico: true,  puntaje_maximo: 2 },
    { categoria: 'Extintores',        descripcion: '¿Los extintores tienen vigente su fecha de recarga?',               es_critico: true,  puntaje_maximo: 2 },
    { categoria: 'Señalización',      descripcion: '¿Las vías de evacuación están correctamente señalizadas?',          es_critico: true,  puntaje_maximo: 2 },
    { categoria: 'Señalización',      descripcion: '¿Las salidas de emergencia están libres de obstáculos?',            es_critico: true,  puntaje_maximo: 2 },
    { categoria: 'Botiquín',          descripcion: '¿El botiquín de primeros auxilios está completo y accesible?',      es_critico: false, puntaje_maximo: 1 },
    { categoria: 'Brigada',           descripcion: '¿El personal conoce el plan de emergencia y punto de reunión?',     es_critico: false, puntaje_maximo: 1 },
  ],
  orden_limpieza: [
    { categoria: 'Orden',             descripcion: '¿Las áreas de trabajo están ordenadas y libres de materiales innecesarios?', es_critico: false, puntaje_maximo: 1 },
    { categoria: 'Orden',             descripcion: '¿Los pasillos y vías de tránsito están despejados?',                es_critico: true,  puntaje_maximo: 2 },
    { categoria: 'Limpieza',          descripcion: '¿Las superficies de trabajo están limpias y sin derrames?',         es_critico: false, puntaje_maximo: 1 },
    { categoria: 'Residuos',          descripcion: '¿Los residuos se clasifican y depositan en contenedores adecuados?', es_critico: false, puntaje_maximo: 1 },
    { categoria: 'Almacenamiento',    descripcion: '¿Los materiales están almacenados de forma segura y etiquetada?',   es_critico: false, puntaje_maximo: 1 },
    { categoria: 'Iluminación',       descripcion: '¿La iluminación del área es adecuada para las tareas realizadas?',  es_critico: false, puntaje_maximo: 1 },
  ],
  infraestructura: [
    { categoria: 'Pisos',             descripcion: '¿Los pisos están en buen estado, sin grietas ni superficies resbaladizas?',  es_critico: true,  puntaje_maximo: 2 },
    { categoria: 'Techos/Paredes',    descripcion: '¿Techos y paredes no presentan daños estructurales ni filtraciones?',       es_critico: true,  puntaje_maximo: 2 },
    { categoria: 'Escaleras',         descripcion: '¿Las escaleras tienen pasamanos y antideslizantes en buen estado?',         es_critico: true,  puntaje_maximo: 2 },
    { categoria: 'Eléctrico',         descripcion: '¿Los tableros eléctricos están cerrados, señalizados y sin cables sueltos?', es_critico: true,  puntaje_maximo: 2 },
    { categoria: 'Ventilación',       descripcion: '¿La ventilación del área es adecuada para la actividad que se realiza?',    es_critico: false, puntaje_maximo: 1 },
    { categoria: 'Señalización',      descripcion: '¿La señalización de seguridad está visible, actualizada y en buen estado?', es_critico: false, puntaje_maximo: 1 },
  ],
  higiene: [
    { categoria: 'Servicios',         descripcion: '¿Los servicios higiénicos están limpios y operativos?',             es_critico: false, puntaje_maximo: 1 },
    { categoria: 'Agua potable',      descripcion: '¿El personal tiene acceso a agua potable en el área de trabajo?',   es_critico: true,  puntaje_maximo: 2 },
    { categoria: 'Ruido',             descripcion: '¿Los niveles de ruido están dentro de los límites permisibles?',    es_critico: true,  puntaje_maximo: 2 },
    { categoria: 'Temperatura',       descripcion: '¿La temperatura del ambiente es adecuada para el trabajo?',         es_critico: false, puntaje_maximo: 1 },
    { categoria: 'Residuos peligrosos', descripcion: '¿Los residuos peligrosos se almacenan y eliminan correctamente?', es_critico: true, puntaje_maximo: 2 },
    { categoria: 'Comedor',           descripcion: '¿Las áreas de comedor/descanso están limpias y habilitadas?',       es_critico: false, puntaje_maximo: 1 },
  ],
  general: [
    { categoria: 'Seguridad general', descripcion: '¿El área cuenta con señalización de seguridad adecuada?',          es_critico: false, puntaje_maximo: 1 },
    { categoria: 'Seguridad general', descripcion: '¿Los trabajadores usan sus EPPs básicos (casco, zapatos de seguridad)?', es_critico: true, puntaje_maximo: 2 },
    { categoria: 'Documentación',     descripcion: '¿El área tiene visible el reglamento interno de SST?',             es_critico: false, puntaje_maximo: 1 },
    { categoria: 'Emergencias',       descripcion: '¿Existen extintores vigentes y accesibles en el área?',            es_critico: true,  puntaje_maximo: 2 },
    { categoria: 'Orden',             descripcion: '¿El área de trabajo se mantiene ordenada y limpia?',               es_critico: false, puntaje_maximo: 1 },
  ],
}
```

---

## Foto evidencia — flujo

1. Usuario hace clic en "📷 Adjuntar foto" en modal hallazgo
2. `<input type="file" accept="image/*">` abre selector de archivos
3. Se muestra preview (`URL.createObjectURL`)
4. Al guardar: `FileReader.readAsDataURL()` → base64 string → enviar como `foto_base64` en JSON
5. Backend: `base64_decode` → `Storage::put("inspecciones/hallazgos/{id}.jpg", $decoded)` → retorna URL pública
6. Frontend: muestra miniatura en fila de hallazgo

Alternativa simple si base64 da problemas: usar `FormData` multipart.

---

## Export CSV (client-side)

```js
function exportarInspeccion(insp) {
  const rows = insp.hallazgos.map(h => [h.numero_hallazgo, h.descripcion, h.criticidad, h.tipo, h.estado])
  const csv  = [['N°','Descripción','Criticidad','Tipo','Estado'], ...rows]
    .map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
  a.download = `inspeccion_${insp.codigo}_hallazgos.csv`; a.click()
}
```

---

## Orden de implementación

1. `InspeccionHallazgo.php` — verificar `$fillable` incluye `foto_url`
2. `InspeccionController.php` — actualizar `registrarHallazgo` con foto + agregar `reporte()`
3. `routes/api.php` — agregar ruta reporte
4. `InspeccionListPage.jsx` — rewrite con tema light + tabs
5. `InspeccionFormPage.jsx` — rewrite con tema light + banco de preguntas
6. `InspeccionDetailPage.jsx` — rewrite con tema light + modal hallazgo + foto + dashboard

---

## Verificación

- Crear inspección tipo "EPPs" → botón "Cargar plantilla" carga 6 preguntas
- Ejecutar inspección → marcar ítems → ver % cumplimiento por categoría en detalle
- Registrar hallazgo → adjuntar foto → aparece miniatura en tabla de hallazgos
- Botón "Exportar" descarga CSV con hallazgos
- Tabs "Pendientes", "En ejecución", "Cerradas" filtran correctamente
- Tema visual: fondo blanco, textos grises, bordes `border-gray-200`
