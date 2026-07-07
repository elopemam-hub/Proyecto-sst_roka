# Scripts de Gestión de EPPs

## 📝 Descripción

Sistema de inspección de EPPs con dos enfoques:

1. **Por Trabajador**: Cada trabajador tiene su equipo virtual de EPPs (EPP-XX-01)
2. **Por Área**: Cada área tiene un equipo de EPPs general (EPP-AREA-XXX)

---

## 🔄 Sincronizar EPPs con Nuevos Trabajadores

Cuando se agreguen nuevos trabajadores al sistema, ejecutar:

```bash
cd laravel-app
php sincronizar_epps_trabajadores.php
```

**Este script:**
- Crea equipos EPP virtuales para trabajadores activos nuevos
- Excluye usuarios administrativos (Admin SST ROKA)
- No duplica equipos existentes
- Asigna código: `EPP-{INICIALES}-{ID}` (ej: EPP-JC-05)

---

## 📋 Checklist de EPPs

Cada inspección verifica **5 elementos:**

1. ✓ Casco de seguridad
2. ✓ Lentes de seguridad
3. ✓ Guantes
4. ✓ Chaleco reflectante
5. ✓ Zapatos de seguridad

**Tipo de respuesta:** Conforme / No conforme / Observación  
**Permite:** Notas y fotos adjuntas

---

## 🗂️ Catálogos Configurados

| Código | Nombre | Equipos | Frecuencia |
|--------|--------|---------|------------|
| EQ-013-TRAB | EPPs - Por Trabajador | 18 trabajadores activos | Mensual |
| EQ-013-AREA | EPPs - Por Área | 9 áreas operativas | Mensual |
| ~~EQ-013~~ | ~~EPPs (antiguo)~~ | Desactivado | - |

### Áreas configuradas para inspección:

1. **Almacén** (`EPP-AREA-AREA9`)
2. **Taller Mecánico** (`EPP-AREA-AREA3`)
3. **Limpieza y Sanidad** (`EPP-AREA-AREA5`)
4. **Distribución** (`EPP-AREA-AREA14`)
5. **BO** (Back Office) (`EPP-AREA-AREA16`)
6. **Administrativo** (`EPP-AREA-AREA15`)
7. **Vigilancia** (`EPP-AREA-AREA6`)
8. **Picking** (`EPP-AREA-PICK`)
9. **Sorting** (`EPP-AREA-SORT`)

---

## ⚠️ Notas Importantes

- **No eliminar equipos con inspecciones:** Los equipos con historial de inspecciones deben mantenerse
- **Trabajadores inactivos:** Al desactivar un trabajador, su equipo EPP permanece pero no se debe inspeccionar
- **Nuevas áreas:** Al crear una nueva área, agregar manualmente su equipo EPP-AREA o ejecutar script similar

---

## 📄 Sistema de Etiquetas QR

### **Generar etiqueta individual:**
1. Ir a **Equipos** → Clic en botón **"QR"** del equipo
2. En el modal, clic en **"Imprimir"**
3. Se abre vista de impresión optimizada (10x10 cm)
4. Usar "Imprimir a PDF" o imprimir directamente

### **Generar etiquetas masivas:**
1. Ir a **Equipos**
2. Clic en botón **"Imprimir Etiquetas"** (header)
3. Se generan todas las etiquetas (4 por página, formato 2x2)
4. Imprimir en papel adhesivo

### **Formato de etiqueta:**
```
┌─────────────────────────────┐
│  SST ROKA                   │
│  ─────────────────────────  │
│                             │
│  ┌───────────────┐          │
│  │               │          │
│  │   [QR CODE]   │          │
│  │               │          │
│  └───────────────┘          │
│  📱 Escanea para inspeccionar│
│                             │
│  Código: GAT-TAL-02         │
│  Equipo: Gata Hidráulica    │
│  Área: Taller Mecánico      │
│  Inspección: Mensual        │
│  ─────────────────────────  │
│  12/06/2026 15:30           │
└─────────────────────────────┘
```

### **Recomendaciones de impresión:**
- **Papel:** Adhesivo blanco brillante
- **Tamaño:** 10x10 cm (etiqueta individual) o A4 (batch)
- **Calidad:** Alta resolución para QR legible
- **Protección:** Laminar o usar etiqueta resistente al agua

---

## 🛠️ Mantenimiento

### Ver trabajadores con equipos EPP:

```sql
SELECT e.codigo, e.nombre, p.nombres, p.apellidos, p.estado
FROM equipos e
JOIN equipos_catalogo ec ON e.equipo_catalogo_id = ec.id
LEFT JOIN personal p ON CONCAT('EPP-', UPPER(SUBSTR(p.nombres,1,1)), UPPER(SUBSTR(p.apellidos,1,1)), '-', LPAD(p.id,2,'0')) = e.codigo
WHERE ec.codigo = 'EQ-013-TRAB'
ORDER BY e.codigo;
```

### Eliminar equipo EPP sin inspecciones:

```sql
DELETE FROM equipos 
WHERE codigo = 'EPP-XX-01' 
AND equipo_catalogo_id = (SELECT id FROM equipos_catalogo WHERE codigo = 'EQ-013-TRAB')
AND id NOT IN (SELECT DISTINCT equipo_id FROM inspecciones WHERE equipo_id IS NOT NULL);
```
