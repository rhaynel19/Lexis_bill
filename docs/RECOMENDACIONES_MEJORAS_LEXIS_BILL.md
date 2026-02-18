# Recomendaciones: qué más agregar o mejorar — Lexis Bill

Resumen de lo **ya resuelto** en auditorías recientes y lista priorizada de **próximas mejoras** (seguridad, UX, escalabilidad, producto, observabilidad).

---

## ✅ Ya implementado (no repetir)

- Redirect post-login (`?redirect=` sanitizado en login).
- Referencia LEX con más entropía y reintento ante 11000.
- Webhook PayPal con body raw y verificación de firma (producción).
- payment-info protegido con `verifyToken`.
- Condición de suscripción en facturas (SUSPENDED/CANCELLED/PAST_DUE).
- Rechazo de pago en `pending` y `under_review`.
- Doble `res.json()` en approve-payment corregido.
- Resumen ITBIS con modal; datos bancarios profesionales; badge "Suscripción activa".
- Pagos y dashboard con toast de error y botón Reintentar.

---

## 1. Seguridad y sesión

| Prioridad | Qué hacer | Por qué |
|-----------|-----------|---------|
| **Media** | Validar expiración del JWT en el middleware (Next) | Evitar “flash” de página protegida cuando la cookie existe pero el token ya expiró. Opcional: decodificar solo `exp` (sin verificar firma en edge) y redirigir a login antes de servir HTML. |
| **Baja** | Revisar que **todas** las llamadas API autenticadas usen `secureFetch` | Evitar 401 sin redirección si alguna pantalla usa `fetch` directo. Búsqueda: `fetch\s*\(\s*['\`]/api` fuera de `secure-fetch` / `api-service`. |
| **Baja** | Rate limit en `GET /api/membership/plans` si es público | Evitar abuso o scraping masivo de planes (riesgo bajo). |

---

## 2. UX y confianza

| Prioridad | Qué hacer | Por qué |
|-----------|-----------|---------|
| **Alta** | Loaders y anti doble envío en acciones críticas | En "Confirmar y emitir", "He realizado el pago", aprobar/rechazar pago en admin: botón `disabled` + texto "Procesando…" o spinner mientras corre la petición. Evita doble submit y da feedback claro. |
| **Alta** | Reintentar sin recargar toda la página (dashboard) | En la pantalla de error del dashboard, el botón "Reintentar" hace `window.location.reload()`. Mejor: llamar de nuevo a `loadDashboardData()` y limpiar `error` para no perder el resto del estado. |
| **Media** | Mensaje explícito tras aprobar pago (admin) | Confirmar en UI que la suscripción se activó (ya devuelve el backend el estado). En el listado de pendientes, quitar el pago aprobado y opcionalmente mostrar toast "Pago aprobado; suscripción activada". |
| **Media** | Onboarding y tono de mensajes | Revisar textos de onboarding, toasts y pantallas de pago para que sean profesionales y refuercen confianza (evitar mensajes genéricos o informales). |
| **Baja** | Tooltips en botones 606/607 y Resumen ITBIS | Explicar en una línea qué hace cada uno ("Descargar archivo para DGII", "Ver resumen de ITBIS del periodo") para usuarios nuevos. |

---

## 3. Escalabilidad y rendimiento

| Prioridad | Qué hacer | Por qué |
|-----------|-----------|---------|
| **Alta** | Endpoint de stats del dashboard por agregación | Evitar `getInvoices(1, 200)` para solo calcular totales. Nuevo endpoint tipo `GET /api/dashboard/stats` que devuelva ingresos del mes, facturas del mes, pendientes, clientes únicos, etc., con `aggregate` en MongoDB. El dashboard llama a este endpoint en lugar de cargar 200 facturas. |
| **Alta** | Paginación real en listas | Facturas, gastos, cotizaciones, historial de pagos: límite por página (ej. 20) y "Cargar más" o paginación. En admin: usuarios y pagos con paginación para no cargar miles de documentos. |
| **Media** | Cache de estado de suscripción (Redis) | `GET /api/subscription/status` se llama a menudo. Cache por `userId` con TTL corto (1–2 min) reduce carga en MongoDB. Invalidar cache al aprobar/rechazar pago y en webhooks. |
| **Media** | Cola de jobs para emails y tareas pesadas | Envío de correos (factura emitida, pago aprobado, recordatorio 606/607) y generación de reportes 606/607 en cola (Bull/BullMQ + Redis u otro). La API responde rápido y el trabajo se procesa en background. |
| **Baja** | Índices adicionales en MongoDB | Asegurar índices por `userId`, `requestedAt`, `status` en PaymentRequest; por `userId`, `date` en Invoice; por `userId`, `status` en Subscription. Revisar con `explain()` las consultas más usadas. |

---

## 4. Producto y facturación dominicana

| Prioridad | Qué hacer | Por qué |
|-----------|-----------|---------|
| **Media** | Pre-validación 606/607 más visible | Antes de descargar, mostrar en UI un resumen de errores/advertencias (campos obligatorios, NCF inválidos, etc.) usando los endpoints de validate existentes. Así el usuario corrige antes de presentar a DGII. |
| **Media** | Recordatorio automático 606/607 | Ya existe lógica de recordatorio por email; asegurar que se dispare (cron o al entrar a Reportes) y que el usuario reciba un recordatorio claro por periodo. |
| **Baja** | Centralizar validación de RNC/cédula | Un solo helper que valide formato y dígito verificador; usarlo en creación/edición de clientes y en facturas para evitar datos inválidos que rechace la DGII. |
| **Baja** | Documentar flujo NCF y tipos | En `docs/` o en la UI (tooltip/ayuda): qué tipo de NCF usar según cliente (B01/E31 empresas, B02/E32 consumidor, B14 educación, etc.) para reducir errores. |

---

## 5. Observabilidad y mantenimiento

| Prioridad | Qué hacer | Por qué |
|-----------|-----------|---------|
| **Media** | Request-id / trace-id en logs | En cada request asignar un `req.id` (UUID) y pasarlo a los logs (pino child o campo en cada log). Permite seguir un pago o una factura de punta a punta en soporte o debugging. |
| **Media** | Alertas en producción | Sentry ya está requerido en prod; asegurar que errores 5xx y excepciones no capturadas se reporten. Opcional: alertas por tasa de error o latencia (Better Stack, UptimeRobot, etc.). |
| **Baja** | Refactor del API a módulos | Dividir `api/index.js` en rutas por dominio (`auth`, `invoices`, `admin`, `webhooks`, `reports`, etc.) y shared (modelos, middleware, helpers). Facilita onboarding y reduce riesgo de regresiones. |
| **Baja** | Documentar estados de pago en repo | Un `docs/MAQUINA_ESTADOS_PAGO.md` breve ya existe; enlazarlo desde el README o desde el código (comentario en approve-payment/reject-payment) para que cualquier dev entienda el flujo. |

---

## 6. Mejoras opcionales (cuando haya tiempo)

- **Pago automático (Stripe / PayPal Checkout):** Reducir fricción y tiempo de activación frente a transferencia manual.
- **2FA (MFA):** Segundo factor para cuentas admin o para usuarios que lo soliciten.
- **Exportación de datos (GDPR-style):** Permitir al usuario descargar sus facturas, clientes y datos en un formato estándar.
- **Modo offline / PWA:** Reforzar la PWA para que listas y formularios básicos funcionen sin red y se sincronicen al reconectar.
- **Tests automatizados:** Al menos tests de integración para flujos críticos: login, crear factura, aprobar pago, generar 607.

---

## Orden sugerido de implementación

1. **Corto plazo (1–2 sprints)**  
   - Loaders y anti doble envío en acciones críticas.  
   - Reintentar en dashboard sin `location.reload`.  
   - Endpoint de stats del dashboard por agregación + usarlo en el dashboard.  
   - Paginación real en facturas (y luego en gastos/cotizaciones).

2. **Mediano plazo**  
   - Cache de `/api/subscription/status` (Redis o en memoria con TTL).  
   - Cola de jobs para emails y reportes.  
   - Request-id en logs.  
   - Pre-validación 606/607 más visible en la UI.

3. **Largo plazo**  
   - Refactor del API en módulos.  
   - Validación JWT exp en middleware (si se quiere eliminar el flash).  
   - Considerar pago automático y 2FA según demanda.

---

## Resumen en una frase

Priorizar **feedback claro en acciones críticas** (loaders, reintentar sin recargar) y **no cargar 200 facturas para el dashboard** (stats por agregación + paginación); después, cache de suscripción, colas y observabilidad (request-id, alertas).
