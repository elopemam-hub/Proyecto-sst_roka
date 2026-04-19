# Fase 8 — Optimización, Seguridad y PWA Offline

## Resumen

La Fase 8 cierra el ciclo de desarrollo de SST ROKA con mejoras transversales de rendimiento, resiliencia y seguridad. No agrega módulos nuevos sino que fortalece la plataforma completa.

---

## 1. Code Splitting y Lazy Loading

**Problema:** El bundle inicial llegaba a ~1.1 MB, bloqueando la carga en conexiones lentas.

**Solución:**

### `frontend/src/App.jsx`
Todas las páginas se importan con `React.lazy()`. Solo `LoginPage` se mantiene como import estático (ruta crítica sin autenticación).

```jsx
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'))
const IpercListPage  = lazy(() => import('./pages/iperc/IpercListPage'))
// … todos los módulos
```

Las rutas se envuelven en `<Suspense fallback={<PageLoader />}>` con un spinner animado.

### `frontend/vite.config.js` — `manualChunks`
Los vendors se dividen en chunks separados para maximizar el cache del navegador:

| Chunk | Contenido | Peso aprox. |
|-------|-----------|-------------|
| `vendor-react` | react + react-dom | ~140 KB |
| `vendor-state` | @reduxjs/toolkit + react-redux + react-router | ~80 KB |
| `vendor-charts` | recharts + d3-* | ~450 KB |
| `vendor-dates` | date-fns | ~75 KB |
| `vendor-icons` | lucide-react | ~35 KB |
| `vendor-misc` | resto de node_modules | variable |

Resultado: ningún chunk supera los 600 KB; el bundle inicial (código de la app) baja a <200 KB.

---

## 2. ErrorBoundary Global

**Archivo:** `frontend/src/components/ErrorBoundary.jsx`

Componente de clase que captura errores de render en cualquier hijo del árbol. Al activarse muestra un mensaje amigable y un botón "Volver al Dashboard" que resetea el estado y navega a `/dashboard`.

Wrappea la app completa en `App.jsx`:

```jsx
<ErrorBoundary>
  <RouterProvider router={router} />
</ErrorBoundary>
```

---

## 3. Soporte Offline

### Hook `useOnlineStatus`
**Archivo:** `frontend/src/hooks/useOnlineStatus.js`

Detecta cambios en `navigator.onLine` vía eventos `online`/`offline` del `window`. Retorna el estado en tiempo real.

### Componente `OfflineBanner`
**Archivo:** `frontend/src/components/OfflineBanner.jsx`

Banner ámbar visible en la parte superior del layout cuando el usuario pierde conectividad. Se oculta automáticamente al recuperarla. Integrado en `AppLayout.jsx`.

---

## 4. PWA Update Prompt

### Hook `useServiceWorker`
**Archivo:** `frontend/src/hooks/useServiceWorker.js`

Monitorea el ciclo de vida del Service Worker:
1. Detecta cuando hay una nueva versión instalada en espera (`waiting`)
2. Expone `updateAvailable: boolean` y `applyUpdate()` al componente

`applyUpdate()` envía el mensaje `SKIP_WAITING` al SW y recarga la página.

### Cambio en `vite.config.js`
```js
registerType: 'prompt'  // era 'autoUpdate'
```

Con `'prompt'` el SW no se activa solo; el banner de actualización en `AppLayout` le da control al usuario.

### Banner en AppLayout
Cuando `updateAvailable === true` aparece un banner con botón "Actualizar" que llama a `applyUpdate()`.

---

## 5. Caché PWA mejorada

**Archivo:** `frontend/vite.config.js`

```js
runtimeCaching: [
  {
    urlPattern: /\/api\//,          // NetworkFirst, TTL 24h, max 300 entradas
    handler: 'NetworkFirst',
    ...
  },
  {
    urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com/,
    handler: 'CacheFirst',         // Fonts en caché permanente (1 año)
    ...
  },
]
```

El patrón `/\/api\//` (antes `^https://`) cubre tanto localhost como producción HTTPS.

---

## 6. Seguridad Backend

### Rate Limiting en Login
**Archivo:** `backend/routes/api.php`

```php
Route::prefix('auth')->middleware('throttle:10,1')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
});
```

Máximo 10 intentos por minuto por IP. Previene ataques de fuerza bruta.

### `SecurityHeadersMiddleware`
**Archivo:** `backend/app/Http/Middleware/SecurityHeadersMiddleware.php`

Headers de seguridad añadidos a todas las respuestas:

| Header | Valor |
|--------|-------|
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `X-XSS-Protection` | `1; mode=block` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |

También remueve `X-Powered-By` y `Server` para no revelar info del servidor.

### `SanitizeInputMiddleware`
**Archivo:** `backend/app/Http/Middleware/SanitizeInputMiddleware.php`

Aplica `trim()` + `strip_tags()` a todos los campos string del request.  
Campos excluidos: `password`, `password_confirmation`, `token`, `datos_json`.

### Registro de middlewares (pendiente manual)

Los dos middlewares están creados pero requieren registro en `bootstrap/app.php` cuando se complete la estructura de Bootstrap de Laravel:

```php
->withMiddleware(function (Middleware $middleware) {
    $middleware->append(\App\Http\Middleware\SecurityHeadersMiddleware::class);
    $middleware->append(\App\Http\Middleware\SanitizeInputMiddleware::class);
})
```

---

## Archivos modificados / creados

### Frontend
| Archivo | Acción |
|---------|--------|
| `src/App.jsx` | Reescrito con React.lazy + Suspense + ErrorBoundary |
| `src/components/ErrorBoundary.jsx` | Nuevo |
| `src/components/OfflineBanner.jsx` | Nuevo |
| `src/hooks/useOnlineStatus.js` | Nuevo |
| `src/hooks/useServiceWorker.js` | Nuevo |
| `vite.config.js` | manualChunks, registerType:'prompt', cache patterns |
| `src/components/layout/AppLayout.jsx` | OfflineBanner + SW update banner + v1.0 Fase 8 |

### Backend
| Archivo | Acción |
|---------|--------|
| `app/Http/Middleware/SecurityHeadersMiddleware.php` | Nuevo |
| `app/Http/Middleware/SanitizeInputMiddleware.php` | Nuevo |
| `routes/api.php` | throttle:10,1 en ruta login |

---

## Estado del proyecto

```
✅ Fase 1 — Autenticación, Dashboard base, Personal
✅ Fase 2 — IPERC, ATS, Inspecciones  
✅ Fase 3 — Accidentes, Seguimiento, Firmas digitales
✅ Fase 4 — Gestión Humana, EPPs, Salud/EMO
✅ Fase 5 — Capacitaciones, Simulacros, Auditorías
✅ Fase 6 — Formatos RM 050-2013-TR, Documentos SST
✅ Fase 7 — Reportes MINTRA (7 reportes + Sunafil)
✅ Fase 8 — Optimización, Seguridad, PWA offline
```
