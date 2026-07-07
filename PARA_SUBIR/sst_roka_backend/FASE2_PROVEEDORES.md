# 📋 FASE 2: Sistema Profesional de Proveedores

## 🎯 Objetivo
Migrar de sistema simple (tabla personal extendida) a sistema robusto con gestión completa de empresas proveedoras.

---

## 🏗️ Arquitectura Propuesta

### Nueva tabla: `empresas_proveedoras`

```sql
CREATE TABLE empresas_proveedoras (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    ruc VARCHAR(11) NOT NULL UNIQUE,
    razon_social VARCHAR(255) NOT NULL,
    nombre_comercial VARCHAR(255),
    
    -- Contacto
    contacto_nombre VARCHAR(255),
    contacto_telefono VARCHAR(20),
    contacto_email VARCHAR(255),
    direccion VARCHAR(255),
    
    -- Contrato
    fecha_inicio_contrato DATE,
    fecha_fin_contrato DATE,
    tipo_servicio ENUM('mantenimiento', 'inspeccion', 'certificacion', 'capacitacion', 'otro'),
    estado ENUM('activo', 'suspendido', 'finalizado') DEFAULT 'activo',
    
    -- Documentos
    contrato_path VARCHAR(500),
    certificaciones JSON COMMENT 'Certificados de la empresa (ISO, OHSAS, etc)',
    
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP NULL
);
```

### Modificar tabla `personal`

```sql
-- Agregar relación a proveedores
ALTER TABLE personal 
ADD COLUMN proveedor_id BIGINT UNSIGNED NULL 
AFTER empresa_id;

ALTER TABLE personal 
ADD FOREIGN KEY (proveedor_id) 
REFERENCES empresas_proveedoras(id) 
ON DELETE SET NULL;

-- Los campos tipo_trabajador, empresa_tercera ya existen (Fase 1)
-- Se mantienen para compatibilidad durante migración
```

---

## 📦 Migración de Datos (Fase 1 → Fase 2)

### Script de migración:

```php
<?php
// database/migrations/XXXX_migrar_terceros_a_proveedores.php

public function up()
{
    // 1. Crear tabla empresas_proveedoras
    Schema::create('empresas_proveedoras', function (Blueprint $table) {
        // ... (estructura arriba)
    });
    
    // 2. Migrar trabajadores terceros a proveedores
    $terceros = DB::table('personal')
        ->where('tipo_trabajador', 'tercero')
        ->whereNotNull('empresa_tercera')
        ->get()
        ->groupBy('empresa_tercera');
    
    foreach ($terceros as $nombreEmpresa => $trabajadores) {
        // Crear empresa proveedora
        $proveedorId = DB::table('empresas_proveedoras')->insertGetId([
            'ruc' => '00000000000', // Pendiente de completar
            'razon_social' => $nombreEmpresa,
            'nombre_comercial' => $nombreEmpresa,
            'tipo_servicio' => 'inspeccion',
            'estado' => 'activo',
            'activo' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        
        // Actualizar personal con proveedor_id
        DB::table('personal')
            ->where('empresa_tercera', $nombreEmpresa)
            ->update(['proveedor_id' => $proveedorId]);
    }
}
```

---

## 🖥️ Frontend - Nuevos Módulos

### 1. Lista de Proveedores (`/proveedores`)

```jsx
// frontend/src/pages/proveedores/ProveedorListPage.jsx

function ProveedorListPage() {
  const [proveedores, setProveedores] = useState([])
  
  useEffect(() => {
    api.get('/proveedores').then(({ data }) => setProveedores(data))
  }, [])
  
  return (
    <div>
      <h1>Empresas Proveedoras</h1>
      <table>
        <thead>
          <tr>
            <th>RUC</th>
            <th>Razón Social</th>
            <th>Servicio</th>
            <th>Contrato</th>
            <th>Personal</th>
          </tr>
        </thead>
        <tbody>
          {proveedores.map(p => (
            <tr key={p.id}>
              <td>{p.ruc}</td>
              <td>{p.razon_social}</td>
              <td>{p.tipo_servicio}</td>
              <td>
                {p.fecha_fin_contrato && isAfter(new Date(p.fecha_fin_contrato), new Date())
                  ? <span className="badge-success">Vigente</span>
                  : <span className="badge-danger">Vencido</span>
                }
              </td>
              <td>{p.personal_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

### 2. Formulario de Proveedor

```jsx
function ProveedorFormPage() {
  const [form, setForm] = useState({
    ruc: '',
    razon_social: '',
    nombre_comercial: '',
    contacto_nombre: '',
    contacto_telefono: '',
    contacto_email: '',
    tipo_servicio: 'inspeccion',
    fecha_inicio_contrato: '',
    fecha_fin_contrato: '',
    certificaciones: [],
  })
  
  // Formulario completo con todos los campos
}
```

---

## 📊 Reportes Nuevos

### 1. Inspecciones por Proveedor

```sql
SELECT 
  ep.razon_social,
  COUNT(i.id) as total_inspecciones,
  COUNT(CASE WHEN i.estado IN ('ejecutada', 'cerrada') THEN 1 END) as completadas,
  AVG(i.porcentaje_cumplimiento) as promedio_cumplimiento
FROM empresas_proveedoras ep
JOIN personal p ON p.proveedor_id = ep.id
JOIN inspecciones i ON i.inspector_id = p.id
WHERE i.created_at >= DATE_SUB(NOW(), INTERVAL 3 MONTH)
GROUP BY ep.id
ORDER BY total_inspecciones DESC;
```

### 2. Alertas de Vencimientos

```sql
-- Contratos por vencer en 30 días
SELECT 
  razon_social,
  fecha_fin_contrato,
  DATEDIFF(fecha_fin_contrato, CURDATE()) as dias_restantes
FROM empresas_proveedoras
WHERE fecha_fin_contrato BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
  AND estado = 'activo';
```

---

## 🔄 Cambios en Controladores

### ProveedorController (Nuevo)

```php
class ProveedorController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $proveedores = EmpresaProveedora::withCount('personal')
            ->where('empresa_id', $request->user()->empresa_id)
            ->get();
        
        return response()->json($proveedores);
    }
    
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ruc' => 'required|string|size:11|unique:empresas_proveedoras',
            'razon_social' => 'required|string|max:255',
            'tipo_servicio' => 'required|in:mantenimiento,inspeccion,certificacion,capacitacion,otro',
            'fecha_fin_contrato' => 'nullable|date|after:today',
            // ... más validaciones
        ]);
        
        $proveedor = EmpresaProveedora::create($validated + [
            'empresa_id' => $request->user()->empresa_id
        ]);
        
        return response()->json($proveedor, 201);
    }
}
```

---

## ⚙️ Configuración de Rutas

```php
// routes/api.php

Route::middleware('auth:sanctum')->group(function () {
    Route::prefix('proveedores')->group(function () {
        Route::get('/', [ProveedorController::class, 'index']);
        Route::post('/', [ProveedorController::class, 'store']);
        Route::get('/{id}', [ProveedorController::class, 'show']);
        Route::put('/{id}', [ProveedorController::class, 'update']);
        Route::delete('/{id}', [ProveedorController::class, 'destroy']);
        
        // Personal del proveedor
        Route::get('/{id}/personal', [ProveedorController::class, 'personal']);
        Route::post('/{id}/personal', [ProveedorController::class, 'agregarPersonal']);
    });
});
```

---

## 📅 Estimación de Implementación

| Tarea | Tiempo estimado |
|-------|-----------------|
| Migración de BD | 1 hora |
| Modelo + Relaciones | 30 min |
| ProveedorController | 1 hora |
| Frontend - Lista proveedores | 1 hora |
| Frontend - Formulario | 1.5 horas |
| Reportes y alertas | 1 hora |
| Testing y ajustes | 1 hora |
| **TOTAL** | **7 horas** |

---

## ✅ Beneficios de Fase 2

- ✅ Control total de empresas proveedoras
- ✅ Gestión de contratos con alertas de vencimiento
- ✅ Trazabilidad completa de inspecciones por proveedor
- ✅ Reportes diferenciados (interno vs externo)
- ✅ Cumplimiento normativo (auditorías SUNAFIL)
- ✅ Certificaciones con validación de vigencia
- ✅ Historial de servicios por proveedor

---

## 🔗 Compatibilidad

El sistema Fase 2 es **100% compatible** con Fase 1:
- Los campos `tipo_trabajador`, `empresa_tercera` se mantienen
- Durante migración, ambos sistemas coexisten
- Los trabajadores terceros existentes se vinculan automáticamente
- No hay pérdida de datos

---

**Fecha de creación:** 2026-06-18  
**Estado:** Documentación para implementación futura  
**Prioridad:** Media (implementar cuando se tengan > 3 proveedores)
