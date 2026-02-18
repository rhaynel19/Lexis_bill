# Auditoría técnica de código para producción — Lexis Bill

**Enfoque:** Producción. Riesgos reales que afectan negocio, seguridad, estabilidad y escalabilidad.  
**Alcance:** API (`api/index.js`), middleware, `secure-fetch`, login, flujos de pago y facturación.

---

## 🔴 Crítico

### 1. Doble `res.json()` en aprobación de pago (CORREGIDO)

**Problema:** En `POST /api/admin/approve-payment/:id` se llamaba a `res.json()` dos veces: una con el payload completo (líneas ~2005-2019) y otra después del mailer (línea ~2034). En Express, la segunda llamada lanza *"Cannot set headers after they are sent"* y puede dejar el proceso en estado inconsistente o generar errores no manejados.

**Riesgo:** Crash o log de error en cada aprobación de pago; en entornos con monitoreo puede disparar alertas; en el peor caso, comportamiento impredecible del worker.

**Solución aplicada:** Se reordenó el flujo: primero PartnerReferral, mailer y luego una única `res.json()` con el mensaje y datos de suscripción. El cliente recibe una sola respuesta coherente.

---

### 2. Webhook PayPal sin verificación de firma

**Problema:** `POST /api/webhooks/paypal` acepta cualquier POST. No se valida la firma con el client secret de PayPal (`PAYPAL_WEBHOOK_ID` / verificación según documentación de PayPal). Cualquier actor que conozca o adivine un `userId` (ObjectId) podría enviar un payload falso con `custom_id: <userId>` y activar suscripción para ese usuario.

**Riesgo:** Activación indebida de planes, fraude, pérdida de confianza y posible responsabilidad legal.

**Solución:** Implementar verificación de firma del webhook PayPal antes de procesar:

```javascript
// Ejemplo conceptual (usar SDK oficial de PayPal para verificación)
const crypto = require('crypto');
function verifyPayPalWebhook(req, body, webhookId) {
    const signature = req.headers['paypal-transmission-sig'];
    const certUrl = req.headers['paypal-cert-url'];
    const transmissionId = req.headers['paypal-transmission-id'];
    const timestamp = req.headers['paypal-transmission-time'];
    if (!signature || !certUrl || !transmissionId || !timestamp) return false;
    // Verificar con clave pública de PayPal (ver doc PayPal)
    return true; // solo si la firma es válida
}
app.post('/api/webhooks/paypal', async (req, res) => {
    const rawBody = req.rawBody || JSON.stringify(req.body); // Express debe guardar raw body para firma
    if (!verifyPayPalWebhook(req, rawBody, process.env.PAYPAL_WEBHOOK_ID)) {
        log.warn('Webhook PayPal con firma inválida');
        return res.status(401).send('Invalid signature');
    }
    // ... resto del handler
});
```

Además: no confiar en `req.body` si el middleware ya parseó JSON; para firma PayPal suele necesitarse el cuerpo crudo. Configurar `express.raw()` para esa ruta o leer el body sin parsear.

---

### 3. Referencia de pago LEX-XXXX: colisión posible

**Problema:** `generateUniquePaymentReference()` usa `LEX-` + 6 dígitos (100000–999999) → 900.000 valores. Con 25 intentos aleatorios, en alta concurrencia la probabilidad de colisión existe. El índice único en `PaymentRequest.reference` evita guardar duplicados pero devuelve error 11000; el endpoint de `request-payment` devuelve 500 con `e.message` y no distingue bien el código 11000 para dar un mensaje amigable (sí hay un `if (e.code === 11000)` pero solo en request-payment; prepare-transfer no crea registro, pero quien crea es request-payment).

**Riesgo:** Con muchas solicitudes simultáneas, varias pueden generar la misma referencia; una se guarda y las demás fallan. El usuario ve error genérico. En escalas altas, colisiones más frecuentes.

**Solución:** Aumentar entropía y tratar 11000 en todos los flujos que crean referencia:

```javascript
async function generateUniquePaymentReference() {
    for (let attempt = 0; attempt < 30; attempt++) {
        const part = Date.now().toString(36).toUpperCase().slice(-5);
        const num = Math.floor(100000 + Math.random() * 900000);
        const ref = `LEX-${part}-${num}`;
        const exists = await PaymentRequest.findOne({ reference: ref });
        if (!exists) return ref;
    }
    const fallback = `LEX-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    return fallback;
}
```

Y en `request-payment`, ante `e.code === 11000`, reintentar una vez o devolver mensaje claro: "La referencia ya está en uso; intenta de nuevo."

---

### 4. Middleware no valida expiración del JWT

**Problema:** El middleware de Next (`middleware.ts`) solo comprueba la existencia de la cookie `lexis_auth`. No decodifica el JWT ni comprueba `exp`. El usuario puede tener cookie presente pero ya expirada; la primera llamada API que use ese token recibirá 401 y `secureFetch` redirige a login. Eso está bien, pero la página protegida puede cargarse un instante (HTML) antes de que el primer fetch devuelva 401, generando un “flash” de contenido protegido.

**Riesgo:** Pequeño impacto en UX y en percepción de seguridad (breve visualización de layout protegido). No es un bypass de autorización porque la API sí valida el token.

**Solución (opcional):** En middleware, si hay cookie, decodificar JWT sin verificar firma (solo `exp`) para redirigir a login antes de servir HTML cuando el token esté expirado. Si no quieres incluir una lib JWT en el edge, se puede dejar como está y confiar en el 401 + redirect del cliente.

---

## 🟠 Alto

### 5. Creación de facturas: chequeo `sub.status === 'expired'` inefectivo

**Problema:** En `POST /api/invoices` se hace `if (sub.status === 'expired') return 403...`. El modelo `Subscription` usa estados `TRIAL`, `ACTIVE`, `GRACE_PERIOD`, `PAST_DUE`, `PENDING_PAYMENT`, `UNDER_REVIEW`, `SUSPENDED`, `CANCELLED`. No existe el valor `'expired'`. Por tanto, esa condición nunca se cumple cuando `sub` viene de `req.subscription` (fuente de verdad).

**Riesgo:** La lógica “membresía expirada” no bloquea por ese camino. La protección real está en `verifyToken` (bloquea SUSPENDED, etc.). Si en el futuro se relaja verifyToken para esa ruta, un usuario vencido podría emitir facturas.

**Solución:** Alinear la condición con la fuente de verdad, por ejemplo:

```javascript
const blockedStatuses = ['SUSPENDED', 'CANCELLED', 'PAST_DUE'];
if (blockedStatuses.includes(sub.status) || (sub.currentPeriodEnd && new Date() > sub.currentPeriodEnd && !sub.graceUntil)) {
    return res.status(403).json({
        message: 'Tu membresía ha expirado o está suspendida. Actualiza tu plan en Pagos.',
        code: 'SUBSCRIPTION_EXPIRED'
    });
}
```

O reutilizar la misma lógica que en `getSubscriptionStatus` para “shouldRedirect” / bloqueo.

---

### 6. Rechazo de pago solo en estado `pending`

**Problema:** En `POST /api/admin/reject-payment/:id` se exige `pr.status === 'pending'`. Si un pago está en `under_review`, no se puede rechazar por esta ruta.

**Riesgo:** Flujo de admin incompleto: hay que permitir rechazar también cuando el estado es `under_review`, o documentar que “en revisión” no es rechazable (decisión de producto).

**Solución:** Aceptar ambos estados para rechazo:

```javascript
if (!pr || !['pending', 'under_review'].includes(pr.status)) {
    return res.status(404).json({ message: 'Solicitud no encontrada o ya procesada.' });
}
```

---

### 7. Errores silenciosos en cargas críticas

**Problema:** En varios `catch` de la API y del front (p. ej. `loadData` en pagos o dashboard) solo se hace `console.error`; el usuario no ve mensaje ni opción de reintentar.

**Riesgo:** El usuario cree que la app está colgada o que no hay datos; abandono y percepción de inestabilidad.

**Solución:** En endpoints críticos, devolver 4xx/5xx con mensaje claro. En el front, en el `catch` de `loadData` setear estado de error y mostrar en UI un mensaje + botón “Reintentar”; opcionalmente `toast.error(...)`.

---

### 8. GET `/api/membership/payment-info` sin autenticación

**Problema:** El endpoint es público (sin `verifyToken`). Devuelve datos bancarios y email PayPal. No es un secreto crítico pero expone datos de negocio a cualquiera.

**Riesgo:** Bajo si solo son datos de transferencia para pagar; medio si se considera que no debería ser público por política. Escalación de scraping o uso indebido.

**Solución:** Si solo debe verse tras login, proteger con `verifyToken`. Si debe ser público para la página de precios/checkout sin sesión, mantenerlo pero no devolver datos sensibles extra; documentar la decisión.

---

## 🟡 Medio

### 9. `billingEventEmitter.emit` es async; no se espera en approve-payment

**Problema:** En approve-payment se hace `await billingEventEmitter.emit('payment_approved', {...})`. El `emit` recorre los listeners y hace `await handler(payload)`, así que sí se espera. El fallback que comprueba `updatedSub.status !== 'ACTIVE'` y llama a `activateSubscriptionFromPayment` está bien. No hay bug aquí si los listeners están registrados de forma síncrona al arranque.

**Riesgo:** Bajo. Si en el futuro se añaden listeners que no devuelven Promise o que fallan, el `emit` podría resolver antes de que terminen. Mantener todos los handlers async y con try/catch interno (como ahora).

---

### 10. Índice único parcial en PaymentRequest

**Problema:** Existe `partialFilterExpression: { status: { $in: ['pending', 'under_review'] } }` con `unique: true` en `userId`. Eso impide dos pagos pendientes/revisión por usuario, lo cual es correcto. La referencia tiene `unique: true, sparse: true`; está bien.

**Riesgo:** Ninguno; es una buena práctica. Solo asegurar que en alta concurrencia el mensaje ante 11000 sea claro (reintentar o “Ya tienes una solicitud en curso”).

---

### 11. Código duplicado y archivo monolítico

**Problema:** `api/index.js` tiene miles de líneas; modelos, helpers, rutas y lógica están en un solo archivo. Hay duplicación de patrones (sanitización, validación de ObjectId, respuestas de error).

**Riesgo:** Mantenibilidad, más riesgo de regresiones y más difícil onboarding.

**Solución:** Ir extrayendo por dominios: `routes/auth.js`, `routes/invoices.js`, `routes/admin.js`, `routes/webhooks.js`, `models/`, `middleware/verifyToken.js`, etc. Mantener un único punto de configuración de Express y montar rutas.

---

### 12. Validación de RNC/Cédula y NCF

**Problema:** `validateTaxId` existe y se usa en algunos flujos; hay que asegurar que toda creación de factura/cliente que use RNC pase por una validación consistente (formato + dígito verificador). La validación de NCF por tipo de cliente (`validateNcfForClient`) está bien; la lógica de gobierno con `cleanRnc.length === 11` es simplificada (cédula vs RNC gubernamental).

**Riesgo:** Facturas con RNC inválido pueden generarse si algún path no valida; rechazo contable o problemas con DGII.

**Solución:** Centralizar validación de RNC/cédula en un helper y usarlo en todos los endpoints que crean/actualizan clientes o facturas. Revisar reglas DGII para 11 dígitos (cédula vs gubernamental) y documentar.

---

## 🟢 Mejora

### 13. Timeout y límites en `connectDB`

**Problema:** `connectDB` usa `serverSelectionTimeoutMS: 15000` y `maxPoolSize: 25`. Para serverless (Vercel) el pool por instancia es efímero; está bien. Para un proceso largo, revisar que el pool no se sature bajo picos.

**Solución:** Monitorear conexiones y tiempos de respuesta de MongoDB. Considerar límites por ruta (rate limit ya aplicado en auth e invoices).

---

### 14. Logs y trazabilidad

**Problema:** Se usa `log` (pino) pero no hay `request-id` o `trace-id` en cada request para seguir un pago o factura de punta a punta.

**Solución:** Middleware que asigne `req.id = crypto.randomUUID()` y lo inyecte en `log` child o en cada llamada; incluir en respuestas de error (solo en no-prod si no quieres exponer IDs).

---

### 15. Dependencias

**Problema:** No se revisó `package.json` en profundidad; es buena práctica auditar dependencias (npm audit, renovate) y fijar versiones en producción.

**Solución:** `npm audit`, revisar dependencias opcionales y fijar versiones en `package.json` (sin `^`/`~` en prod si la política es máxima estabilidad).

---

## Edge cases y escalabilidad

- **NCF:** `getNextNcf` usa transacción y `findOneAndUpdate` con `$inc`; evita condiciones de carrera en una misma instancia. Con múltiples instancias y mismo MongoDB, la transacción sigue siendo suficiente. Índice único en `Invoice.ncfSequence` protege ante duplicados.
- **Dashboard con 200 facturas:** Ya identificado en otras auditorías: endpoint de estadísticas por agregación y paginación real evitan cargar 200 documentos en memoria por usuario.
- **Webhook PayPal:** Sin firma, un atacante puede activar cuentas. Con firma y body crudo, el riesgo baja a nivel aceptable para fintech.

---

## Qué corregir primero (prioridad CTO)

1. **Webhook PayPal:** Verificación de firma y, si hace falta, body crudo para esa ruta.
2. **Doble `res.json()`:** Ya corregido en approve-payment.
3. **Referencia LEX:** Más entropía y manejo explícito de 11000 (reintento o mensaje claro).
4. **Condición de suscripción en facturas:** Sustituir `sub.status === 'expired'` por estados reales (SUSPENDED, CANCELLED, PAST_DUE o lógica de periodo).
5. **Rechazo de pago:** Permitir rechazar cuando `under_review`.
6. **Errores en UI:** Feedback en cargas críticas (pagos, dashboard) con mensaje y reintentar.

---

## Veredicto

**¿Este código está listo para producción?**

- **Sí, con condiciones.** La base es sólida: fail-fast con JWT y MongoDB, sanitización, rate limiting, transacciones en facturas y NCF, uso de Subscription como fuente de verdad, redirect post-login seguro, y manejo 401 en `secureFetch`.  
- **No se debe considerar listo sin:**
  1. Verificación de firma en el webhook PayPal (riesgo de fraude/activación indebida).
  2. Eliminación del doble `res.json()` (ya aplicada en esta auditoría).
  3. Mejora de referencia de pago (entropía + manejo 11000) y corrección de la condición de “expirado” en creación de facturas.

**Resumen:** Corregir webhook PayPal, referencia LEX y lógica de suscripción en facturas; después, rechazo en `under_review`, feedback de errores en front y refactor del monolito a medio plazo. Con eso, el sistema es adecuado para producción con monitoreo y despliegue gradual.
