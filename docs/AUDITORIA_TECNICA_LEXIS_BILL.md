# Auditoría técnica – Lexis Bill (SaaS financiero)

**Enfoque:** Estabilidad, flujo de usuario, facturación, retención y confianza.  
**Rol:** Software Architect Senior / CTO evitando colapso en producción.

---

## 🔴 Errores críticos (rompen el negocio)

### 1. Redirect post-login ignorado

**Causa:** El middleware guarda `?redirect=/nueva-factura` (o la ruta protegida) al enviar al login, pero la página de login **nunca lee ese parámetro**. Tras el login siempre hace `router.push("/dashboard")`.

**Riesgo:** Usuario en “Nueva factura” → expira sesión → va a login → tras iniciar sesión termina en Dashboard y pierde contexto. Mala experiencia y percepción de inestabilidad.

**Solución concreta:**
- En `app/(public)/login/page.tsx`, leer `searchParams.get("redirect")` (usar `useSearchParams()`).
- En `handleBiometricDecision` (y cualquier flujo que redirija tras login exitoso), hacer:
  `router.push(redirect && redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : "/dashboard");`
- Sanitizar `redirect` para que solo sea path interno (evitar open redirect).

---

### 2. Webhooks de PayPal no integrados con la fuente de verdad

**Causa:** `api/routes/webhooks.js` usa `subscription-service.js`, que mantiene suscripciones en **memoria** (`let subscriptions = []`) y `saveToStorage()`/`loadFromStorage()` están vacíos. La API principal usa **MongoDB** (modelo `Subscription`, `PaymentRequest`). Los webhooks **no están montados** en `api/index.js`, y si se montaran, actualizarían un estado en memoria que nadie lee.

**Riesgo:** Pagos por PayPal no activan la suscripción en BD. Usuario paga y sigue en trial/bloqueado. Pérdida de confianza y soporte saturado.

**Solución concreta:**
- Montar en `api/index.js`: `app.use('/api/webhooks', require('./routes/webhooks'));` (o la ruta que expongas a PayPal).
- Reescribir los handlers de webhook para usar **los mismos** `Subscription`, `PaymentRequest` y funciones `activateSubscriptionFromPayment`, `getOrCreateSubscription`, etc. que ya existen en `api/index.js`.
- Eliminar o deprecar el `subscription-service.js` en memoria; la única fuente de verdad debe ser MongoDB.
- En webhook, extraer `userId` de forma fiable (custom_id o resource links), nunca `'user-demo'`.
- Validar firma del webhook PayPal antes de procesar (evitar falsificaciones).

---

### 3. Referencia de pago LEX-XXXX con espacio de colisión bajo

**Causa:** `generateUniquePaymentReference()` usa `LEX-` + 4 dígitos (1000–9999) → 9.000 valores. Con 20 intentos aleatorios, en escala la colisión es posible.

**Riesgo:** Dos usuarios (o reintentos) con la misma referencia; confusión en admin y riesgo de aprobar el pago equivocado.

**Solución concreta:**
- Aumentar entropía: por ejemplo `LEX-` + 6–8 dígitos, o incluir timestamp/random (ej. `LEX-${Date.now().toString(36).toUpperCase().slice(-6)}-${random4}`).
- Mantener unicidad en BD con índice único en `PaymentRequest.reference` (si no existe) y reintentar hasta éxito.

---

### 4. Sesión expirada: doble capa sin política clara

**Causa:** El middleware solo comprueba existencia de cookie `lexis_auth`; no valida que el JWT sea válido o no expirado. El layout protegido hace `refresh()` (getMe) y si falla redirige a login. `secure-fetch` en 401 hace `window.location.href = /login?redirect=...` (correcto). Si alguna llamada usa `fetch` sin `secureFetch`, un 401 puede no redirigir y dejar la UI en estado incoherente.

**Riesgo:** Usuario ve contenido “protegido” con sesión ya inválida; acciones fallan con 401 sin mensaje claro o sin redirección consistente.

**Solución concreta:**
- Centralizar todas las llamadas API de autenticado en `secureFetch` (o un wrapper que en 401/403 aplique la misma política).
- Asegurar que **todas** las rutas que requieren auth usen ese cliente. Revisar que no queden `fetch` directos a `/api/*` sin manejo de 401.
- Opcional: en middleware, si hay cookie, validar JWT (decode + exp) para redirigir a login antes de servir HTML; así se evita “flash” de contenido protegido.

---

## 🟠 Errores importantes (no rompen hoy, sí al escalar)

### 5. Pagos: estados y flujo

**Problema:** Hay varios estados (`pending`, `under_review`, `approved`, etc.) y lógica repartida entre Subscription (TRIAL, ACTIVE, GRACE_PERIOD, SUSPENDED, PENDING_PAYMENT) y PaymentRequest. No hay una máquina de estados documentada y explícita; estados “under_review” vs “pending” pueden ser ambiguos para el usuario.

**Recomendación – máquina de estados de pago:**
- PaymentRequest: `pending` → `under_review` → `approved` | `rejected`. Sin estados intermedios extra.
- Subscription (respecto a pago): `TRIAL` | `PENDING_PAYMENT` (esperando comprobante o aprobación) → `ACTIVE` (pago aprobado) → `GRACE_PERIOD` (venció, X días) → `SUSPENDED` (bloqueado). Transiciones solo desde admin o webhook.
- Documentar en código (comentario o doc) el grafo de transiciones y quién (admin, webhook, cron) puede cambiar cada estado.

---

### 6. Concurrencia en NCF y facturas

**Problema:** `getNextNcf` usa `findOneAndUpdate` con `$inc` en una sesión de transacción, lo cual es correcto. Pero si hubiera varios workers o instancias sin transacción en otros flujos, podría haber condiciones de carrera.

**Recomendación:**
- Revisar que **toda** creación de factura (y cualquier path que asigne NCF) use una única transacción que incluya: reserva de NCF, creación de Invoice y actualización de Customer. Ya lo haces en create invoice y quote-to-invoice; asegurar que no existan otros endpoints que creen facturas sin transacción.
- Índice único en `Invoice.ncfSequence` (y en NCFSettings donde aplique) para garantizar integridad ante race conditions.

---

### 7. Dashboard: carga de 200 facturas en memoria

**Problema:** `api.getInvoices(1, 200)` carga hasta 200 facturas para estadísticas y lista. Con 1.000+ facturas por usuario, el tiempo de respuesta y memoria suben.

**Recomendación:**
- Endpoint dedicado de “stats del dashboard” (totales del mes, pendientes, clientes únicos) que use agregaciones en BD (MongoDB `aggregate`) sin devolver todas las facturas.
- Lista “recientes” con paginación real (ej. 20 por página) y lazy load o “cargar más”.

---

### 8. Errores silenciosos en carga de datos

**Problema:** En `pagos/page.tsx`, `loadData` en catch solo hace `console.error`; el usuario no ve mensaje. En `nueva-factura`, varios `catch` solo hacen `console.error` (ej. carga de clientes, plantillas) sin toast ni estado de error en UI.

**Recomendación:**
- En toda carga crítica (pagos, facturas, clientes): en `catch`, setear estado de error (ej. `setError(msg)`) y mostrar en UI (mensaje + “Reintentar”).
- Usar toast para errores de acción (guardar, enviar); no solo para éxito.

---

## 🟡 Mejoras recomendadas

### 9. Consistencia de base de datos

- **Transacciones:** Ya usas sesiones en creación de factura y conversión cotización→factura. Revisar cualquier otro flujo que escriba en varias colecciones (User + Subscription, PaymentRequest + Subscription) y envolver en transacción.
- **Registros huérfanos:** Definir políticas: al eliminar User, qué pasa con Invoices, PaymentRequests (soft-delete o bloqueo por userId). No es crítico al inicio pero evita inconsistencias futuras.
- **Colas:** Para envío de emails, notificaciones o procesamiento de webhooks pesados, valorar una cola (Bull/BullMQ con Redis, o equivalente) para reintentos y no bloquear la respuesta HTTP.

---

### 10. Logging y observabilidad

- **Backend:** Ya tienes `api/logger.js` (pino) y redacción de datos sensibles. Asegurar que todos los `catch` importantes llamen `log.error` o `log.warn` con contexto (sin RNC/montos en claro).
- **Frontend:** Errores críticos (fallo al crear factura, al pagar) deberían reportarse a Sentry (o similar) con contexto acotado (tipo de acción, no datos fiscales).
- **Trazabilidad:** En API, correlación request (request-id / trace-id) en logs para seguir un pago o una factura de punta a punta.

---

### 11. Seguridad

- **Endpoints protegidos:** Los que modifican datos (facturas, pagos, usuarios) usan `verifyToken` y donde aplica `verifyAdmin`. Revisar que no quede ningún POST/PUT/DELETE sensible sin `verifyToken`.
- **Validación:** Sanitización de inputs en backend (sanitizeString, sanitizeItems, etc.) está presente; mantenerla en todos los body que toquen BD o envío de correo.
- **Roles:** Comprobar que `verifyAdmin` se use en todas las rutas bajo `/api/admin/*` y que no haya bypass por query/param.

---

### 12. UX y confianza

- **Loaders:** Donde haya `isLoading`/`isGenerating`, asegurar que el botón muestre estado (disabled + “Procesando…” o spinner) y que no se pueda doble-submit.
- **Confirmación visual:** Tras “Confirmar y emitir”, ya hay modal de éxito y descarga de PDF; mantener este patrón en “He realizado el pago” y en aprobación/rechazo de pago en admin.
- **Datos que no cambian:** Tras aprobar un pago, el front de pagos debe refrescar estado (ya tienes `invalidateSubscriptionCache` y `loadData`); asegurar que la página de usuario actualice también la suscripción (badge, fecha de vencimiento) sin tener que recargar a mano.

---

## ⭐ Quick wins

1. **Redirect post-login:** Leer `?redirect=` en login y redirigir ahí tras éxito (sanitizado). Impacto alto en percepción de fluidez.
2. **Toast en errores de carga:** En pagos y dashboard, en `catch` de `loadData` mostrar `toast.error("No pudimos cargar los datos. Reintenta.")` y botón Reintentar.
3. **Referencia LEX-XXXX:** Cambiar a 6–8 dígitos o formato con más entropía y mantener índice único; bajo esfuerzo, evita colisiones.
4. **Documentar estados de pago:** Un comentario o pequeño doc en repo con el grafo pending → under_review → approved/rejected y cómo se mapea a Subscription. Ayuda a onboarding y a evitar estados ambiguos.
5. **Webhook PayPal:** Aunque no uses aún PayPal en producción, conectar `api/routes/webhooks.js` a MongoDB (mismos modelos y funciones que el resto del API) y quitar dependencia del servicio en memoria; cuando actives PayPal, ya estará correcto.

---

## 🔥 Escalabilidad (100 → 1.000 → 10.000 clientes)

### 100 clientes
- **Dónde puede fallar primero:** Referencia LEX-XXXX (colisiones), y si algún flujo no usa transacción al crear factura (NCF duplicado). También redirección post-login (frustración).
- **Acción:** Arreglar redirect, referencias y asegurar transacciones en todos los paths de factura.

### 1.000 clientes
- **Dónde se rompe:** Dashboard cargando 200 facturas por usuario; tiempo de respuesta y carga de BD. Admins listando muchos pagos/usuarios sin paginación.
- **Acción:** Stats por agregación; paginación real en listas (facturas, pagos, usuarios admin). Índices en MongoDB por `userId`, `requestedAt`, `status`.

### 10.000 clientes
- **Dónde se rompe:** Un solo proceso Node (api/index.js) y una sola instancia de MongoDB; jobs pesados (emails, reportes 606/607) bloqueando requests. Sin colas, un pico de webhooks o reportes puede saturar.
- **Acción:** Cola de jobs para envío de correos y procesamiento pesado; escalar horizontalmente la API (varias instancias detrás de load balancer); considerar lectura secundaria en MongoDB para reportes; cache (Redis) para `/api/subscription/status` por usuario con TTL corto (ej. 1 min) para reducir carga en BD.

---

## Resumen ejecutivo

- **Crítico:** Arreglar redirect post-login, alinear webhooks de pago con MongoDB y eliminar estado en memoria, y endurecer generación de referencia de pago.
- **Importante:** Definir y documentar máquina de estados de pago, evitar errores silenciosos en UI y preparar dashboard (agregaciones + paginación).
- **Quick wins:** Redirect, toasts de error en cargas, referencias únicas y documentación de estados.

Prioridad: **estabilidad y confianza** (redirect, pagos, feedback de errores) antes de añadir más funcionalidades.
