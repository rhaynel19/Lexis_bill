# Auditoría y Plan de Arquitectura — Lexis Bill

**Objetivo:** Elevar el sistema de 6.4/10 a 10/10 en arquitectura, seguridad, integridad financiera, escalabilidad y preparación enterprise.

**Reglas aplicadas:** Sin cambios de comportamiento injustificados, sin romper compatibilidad con BD, sin eliminar endpoints sin plan de migración, sin relajar seguridad, prioridad a robustez.

---

## FASE 1 — AUDITORÍA PROFUNDA

### 1.1 Arquitectura general

- **Patrón actual:** API monolítica en un único archivo `api/index.js` (~6.000 líneas, ~100 rutas).
- **Stack:** Express, Mongoose, JWT en cookie `lexis_auth`, rate limiting por ruta, sanitización propia, pino para logs.
- **Despliegue:** Compatible con Vercel serverless (conexión MongoDB singleton por instancia).
- **Rutas externas:** `api/routes/subscriptions.js` y `api/routes/webhooks.js` **no están montadas**; el webhook PayPal activo es el manejador inline en `index.js` (`paypalWebhookHandler`).

**Conclusión:** Monolito claro, sin separación por dominios ni capas (routes/controllers/services). Código en `routes/` es efectivamente muerto para subscriptions; el webhook PayPal sí está activo pero implementado en el monolito.

---

### 1.2 Separación de responsabilidades

- **Routes:** Todas definidas con `app.get/post/put/patch/delete` en `index.js`.
- **Lógica de negocio:** Mezclada en los handlers (auth, facturas, cotizaciones, gastos, admin, partners, reportes 606/607, pagos, NCF).
- **Cálculo financiero:** Una sola función `computeAmountsFromItems(items)` en backend (ITBIS 18%, redondeo a 2 decimales). Bien ubicada conceptualmente pero no extraída a módulo reutilizable.
- **Validación/sanitización:** Funciones `sanitizeString`, `sanitizeEmail`, `sanitizeItems`, `validatePassword`, `isValidObjectId` en cabeza del archivo; no hay capa de validadores por dominio ni esquemas compartidos (ej. Joi/Zod) entre front y back.

**Conclusión:** Separación insuficiente; dominio financiero, auth y admin comparten el mismo archivo sin módulos por dominio.

---

### 1.3 Código muerto / no utilizado

| Elemento | Estado | Acción sugerida |
|----------|--------|------------------|
| `api/routes/subscriptions.js` | No montado | Decidir: montar bajo `/api/subscriptions` o deprecar y documentar. |
| `api/routes/webhooks.js` | No montado; webhook real en `index.js` | No montar sin unificar lógica; evitar dos implementaciones del mismo webhook. |
| `api/services/subscription-service.js` | Usado solo por rutas no montadas | Revisar si la lógica debe integrarse en el flujo actual de pagos/transferencia. |
| Referencias a `getUserSubscription` (modelo legacy user) | Coexisten con `Subscription` | Mantener durante migración; no eliminar hasta unificar fuente de verdad. |

---

### 1.4 Duplicación lógica (cálculos financieros)

- **Backend:** `computeAmountsFromItems` es la única fuente de verdad para facturas (creación y nota de crédito). ITBIS fijo 18%, redondeo por línea y total.
- **Cotizaciones:** En **POST** y **PUT** `/api/quotes` los totales se aceptan desde el body (`req.body.subtotal`, `itbis`, `total`) y solo se acotan con `Math.max(0, Math.min(..., 999999999))`. No se recalcula desde `items`. Hay duplicación lógica y riesgo de inconsistencia con facturas.
- **Frontend:** En `nueva-factura/page.tsx` y `nueva-cotizacion/page.tsx` se repite el cálculo (subtotal, base imponible, ITBIS 18%, total). Solo el envío de factura usa el recálculo del backend; el front muestra y envía totales que el backend ignora correctamente en facturas pero no en cotizaciones.

**Conclusión:** Duplicación front/back aceptable solo para UX (preview); en backend, facturas están bien (recalculo obligatorio). Cotizaciones son el punto débil: no hay recálculo obligatorio desde items.

---

### 1.5 Validaciones inconsistentes

- **ObjectId:** Uso correcto de `isValidObjectId()` en la mayoría de rutas que reciben `:id`; revisar que no quede ninguna ruta con `req.params.id` sin validar antes de `findById`.
- **RNC/Cédula:** `validateTaxId` (algoritmo DGII) existe; no se aplica en todos los puntos donde se registra RNC (p. ej. cliente en factura/cotización). Consistencia recomendada.
- **ITBIS:** En backend solo se usa 18% en `computeAmountsFromItems`. No hay validación explícita “solo 18%” contra posibles campos enviados (el backend no confía en totales en facturas; en gastos/cotizaciones sí se aceptan montos).
- **NCF:** `validateNcfForClient(ncfType, clientRnc)` antes de `getNextNcf`; tipos y longitudes RNC alineados con DGII. Bien.
- **Cotizaciones:** Si se envían `items` y a la vez `subtotal/itbis/total` distintos del recálculo desde items, se guardan los del body. Inconsistencia con el principio “recalcular en backend”.

---

### 1.6 Riesgos de inyección NoSQL

- **Uso de `req.query`/`req.body`:** No se construyen filtros de Mongoose con objetos enteros provenientes del usuario (ej. `find(req.query)`). Los filtros se arman con campos concretos y valores sanitizados o whitelist.
- **Admin listado usuarios:** `q` se usa en `new RegExp(q, 'i')` para nombre/email/rnc. Riesgo: **ReDoS** si `q` es muy largo o con patrones costosos. Mitigación: limitar longitud de `q` (ej. 100 caracteres) y/o escapar caracteres especiales de regex.
- **Otros listados:** `page`, `limit`, `sortBy`, `sortOrder` acotados o con whitelist. No se observa inyección de operadores `$where`, `$regex` desde input crudo.

**Conclusión:** Inyección NoSQL clásica bien contenida. Único punto a endurecer: uso de `q` en RegExp (longitud y posible escape).

---

### 1.7 Manejo de errores

- **Patrón:** `try/catch` en handlers; `safeErrorMessage(err)` en producción oculta mensaje y stack al cliente (correcto).
- **Transacciones:** En creación de factura, nota de crédito y conversión cotización→factura se usa `session.startTransaction()` con `commitTransaction`/`abortTransaction` y `session.endSession()`. Correcto.
- **Inconsistencia:** Algunos endpoints devuelven `message`, otros `error`; no hay código de error estándar (más allá de `code: 'SUBSCRIPTION_SUSPENDED'`, etc.). Recomendable estandarizar formato de error (p. ej. `{ error: { code, message } }`).

---

### 1.8 Logging en producción

- **Logger:** `api/logger.js` con pino, `redact` para `password`, `token`, `authorization`, `cookie`, `*.rnc`, `*.amount`, `*.total`, `*.itbis`. Adecuado para no filtrar datos sensibles.
- **Riesgo:** En otros archivos (p. ej. `routes/webhooks.js` si se montara) hay `console.log` con payload completo; política debe ser: no loguear cuerpos completos de webhooks ni montos/RNC en claro. El handler inline en `index.js` no se ha revisado línea a línea; conviene asegurar que no se loguee body crudo con datos sensibles.

---

### 1.9 Uso de transacciones

- **Factura:** Creación con NCF + Invoice + actualización Customer en una transacción. Bien.
- **Nota de crédito:** NCF + nueva factura NC + anulación factura original en una transacción. Bien.
- **Convertir cotización a factura:** NCF + Invoice + actualizar Quote + Customer en una transacción. Bien.
- **Pagos/suscripciones:** Cambios de estado de PaymentRequest y Subscription sin transacción multi-documento. El índice único parcial en PaymentRequest (un solo pending/under_review por usuario) evita duplicados; para consistencia fuerte entre PaymentRequest y Subscription en aprobación/rechazo, considerar transacción.

---

### 1.10 Gestión de concurrencia

- **NCF:** `getNextNcf` usa `findOneAndUpdate` atómico con `$inc: { currentValue: 1 }` dentro de sesión; luego se comprueba unicidad de `ncfSequence` en Invoice. Índice unique en `Invoice.ncfSequence` protege contra duplicados. Adecuado.
- **PaymentRequest:** Índice único parcial por `userId` con `status in ['pending','under_review']` evita doble solicitud activa. Bien.
- **Doble emisión de factura:** Un usuario podría enviar dos POST casi simultáneos; cada uno obtiene su NCF distinto. No hay “idempotency key”; para alta concurrencia, opcional implementar clave de idempotencia por usuario/session para evitar duplicados de intención.

---

### 1.11 Posible fuga de datos sensibles en logs

- Pino con `redact` reduce riesgo. Revisar que ningún `log.info/warn/error` pase objetos que contengan `req.body` completo, `req.cookies`, o respuestas con tokens/montos. Búsqueda recomendada: `log.*(req\.|res\.|body|cookie)` y asegurar que solo se pasen campos no sensibles.

---

### 1.12 Carga innecesaria en DB por request

- **connectDB:** Se llama en middleware en cada request; internamente usa singleton (`cachedDb` / `mongoose.connection.readyState`). En serverless es aceptable; en proceso largo evita conexiones duplicadas.
- **verifyToken:** En cada ruta protegida hace `User.findById`, `Subscription.findOne` y posiblemente `getOrCreateSubscription`. Dos lecturas (o más) por request autenticado. A medio plazo: cache de sesión (ej. userId + plan/status) con TTL corto para reducir lecturas.
- **Listados:** Uso de `.lean()` en listados; bueno. Algunos endpoints podrían abusar de `countDocuments` en listas muy grandes; paginación con límites está aplicada.

---

### 1.13 Lista priorizada de riesgos

| Nivel | Riesgo | Impacto técnico | Impacto financiero | Escalabilidad |
|-------|--------|-----------------|--------------------|---------------|
| **Crítico** | Cotizaciones aceptan subtotal/itbis/total del body sin recálculo desde items | Inconsistencia fiscal y con facturas; posibles discrepancias en reportes | Errores en base imponible/ITBIS y riesgo en auditoría DGII | Bajo impacto directo en escala |
| **Crítico** | Código muerto (subscriptions/webhooks en routes/) y posible doble implementación webhook | Confusión, bugs si alguien monta rutas sin unificar | Bajo si no se monta; alto si se monta y diverge del flujo real | N/A |
| **Alto** | JWT solo 1h, sin refresh ni rotación | Re-login frecuente o tokens largos; si se alarga expiración sin refresh, ventana de robo mayor | Bajo directo; indirecto por soporte/UX | Bajo |
| **Alto** | Admin listado: `RegExp(q, 'i')` sin límite de longitud | ReDoS, bloqueo del evento de Node | Posible caída del panel admin | Un solo request puede consumir CPU |
| **Alto** | Sin CSRF explícito (dependencia de SameSite) | Riesgo en escenarios de integración o navegadores antiguos | Posible manipulación de acciones en nombre del usuario | Bajo |
| **Medio** | Monolito único archivo ~6k líneas | Mantenibilidad, riesgo de regresiones, onboarding lento | Coste de cambios y bugs | Escalar equipo y features se vuelve cuello de botella |
| **Medio** | Gastos: amount/itbis aceptados del body sin validación cruzada | Posible manipulación de montos en 606 | Errores en reportes fiscales | Bajo |
| **Medio** | Helmet con `contentSecurityPolicy: false` | CSP desactivado; menos defensa frente a XSS | Bajo si el front no refleja input sin sanitizar | Bajo |
| **Medio** | Rate limiting por ruta, sin global | Un atacante puede saturar otras rutas no limitadas | Abuso de ancho de banda o DB | Alta carga por IP en rutas sin límite |
| **Bajo** | Respuestas de error no estandarizadas | Integraciones y front deben manejar varios formatos | Bajo | Bajo |
| **Bajo** | verifyToken hace 2+ lecturas DB por request | Más latencia y carga en MongoDB | Bajo | A más usuarios, más lecturas |

---

## FASE 2 — PLAN DE REARQUITECTURA

### 2.1 Modularización por dominios

Objetivo: separar por dominio sin reescribir todo, manteniendo un solo `api/index.js` como orquestador que monte rutas.

- **auth:** registro, login, logout, forgot/reset password, confirmación email, confirmación nombre fiscal, perfil.
- **invoices:** CRUD facturas, nota de crédito, listados, PDF, integración con NCF.
- **quotes:** CRUD cotizaciones, convert to invoice.
- **partners:** apply, me, dashboard, invitaciones (admin).
- **admin:** usuarios, pagos pendientes, aprobar/rechazar pago, audit, partners, alertas.
- **subscriptions:** estado de suscripción, payment-info, prepare-transfer, request-payment; opcionalmente planes (si se monta `routes/subscriptions.js` con cuidado).
- **reports:** 606, 607, validación, descargas.
- **customers / documents / expenses / drafts / templates / services:** por recurso.

Cada dominio puede tener: `routes/<dominio>.js`, `controllers/<dominio>.js`, `services/<dominio>.js`, y opcionalmente `validators/<dominio>.js`, `middlewares/auth.js` compartido.

### 2.2 Separación routes / controllers / services / middlewares / validators

- **routes:** Solo definición de rutas y asignación a controladores (y middlewares). Sin lógica de negocio.
- **controllers:** Reciben `req`/`res`, extraen input, llaman a servicios, formatean respuesta y errores. Sin acceso directo a modelos en lo posible (delegar en services).
- **services:** Lógica de negocio, acceso a Mongoose, transacciones, llamadas externas (DGII, email). Reutilizables desde varios controladores.
- **middlewares:** `verifyToken`, `verifyAdmin`, `verifyClient`, `requireFullAccess`, rate limiters (o referencia a ellos), y en el futuro un middleware de validación por ruta (schema).
- **validators:** Esquemas (Joi o Zod) y/o funciones de validación por recurso (auth, invoice, quote, expense). Objetivo: una sola definición de “forma válida” que pueda compartirse con el front (p. ej. tipos TypeScript o esquemas exportados).

### 2.3 Capa centralizada de cálculo financiero

- Crear módulo único, por ejemplo `api/services/financial.js` (o `lib/financial.js` si se quiere compartir con otro runtime).
- Exportar:
  - `computeAmountsFromItems(items, options?)` — opciones: tasa ITBIS (por defecto 0.18), redondeo.
  - Constante `ITBIS_RATE = 0.18` y cualquier otra constante fiscal.
- Reemplazar en `index.js` la función actual por el import de este módulo.
- Usar **siempre** este módulo para: creación/actualización de facturas, notas de crédito, y **cotizaciones** (tanto POST como PUT). En cotizaciones: si se envían `items`, recalcular y sobrescribir subtotal/itbis/total; si no se envían items, rechazar o mantener comportamiento actual documentado (solo para casos sin ítems).

### 2.4 Capa centralizada de validación y sanitización

- Crear `api/validators/sanitize.js` (o dentro de `validators/`) con: `sanitizeString`, `sanitizeEmail`, `sanitizeItems`, `isValidObjectId`, `validatePassword`.
- Crear validadores por recurso que devuelvan `{ value, error }` (o lancen) para que los controladores no dupliquen reglas. Ejemplos: `validateInvoiceBody`, `validateQuoteBody`, `validateExpenseBody`, `validateLoginBody`.
- En listados que usen `q` en RegExp: validar longitud máxima (ej. 100) y considerar escape de caracteres especiales de regex o uso de búsqueda literal.

### 2.5 Estrategia para evitar duplicación frontend/backend

- **Backend:** Siempre recalcular totales desde items en facturas y cotizaciones; no confiar en totales enviados para persistencia.
- **Frontend:** Mantener cálculo local para preview y UX; al enviar, enviar solo `items` (y metadatos); el backend devuelve los totales calculados. Opcional: compartir constante ITBIS (ej. desde API o constante en paquete compartido) para que el front muestre el mismo 18%.
- **Contratos:** Documentar en OpenAPI o similar que los totales en respuesta son los que se guardaron (calculados en backend). En TypeScript, tipos compartidos para request/response de factura y cotización.

### 2.6 Estructura de carpetas ideal (incremental)

```
api/
  index.js                 # Solo: config Express, CORS, Helmet, connectDB, montar rutas, health, error handler global
  config/
    db.js
    constants.js           # MEMBERSHIP_PLANS, ITBIS_RATE, etc.
  middlewares/
    auth.js                # verifyToken, verifyAdmin, verifyClient, requireFullAccess
    rateLimit.js           # instancias de rateLimit por ruta
    errorHandler.js
  validators/
    sanitize.js
    auth.js
    invoice.js
    quote.js
    expense.js
  services/
    financial.js          # computeAmountsFromItems, constantes fiscales
    ncf.js                # getNextNcf, validateNcfForClient
    subscription.js        # getOrCreateSubscription, updateSubscriptionStatus (actual + migrado desde index)
    auth.js
    invoice.js
    quote.js
    ...
  routes/
    auth.js
    invoices.js
    quotes.js
    admin.js
    partners.js
    reports.js
    ...
  controllers/            # opcional si se quiere capa explícita; si no, los handlers pueden vivir en routes llamando a services
    auth.js
    invoices.js
    ...
  models/                 # opcional: mover schemas a archivos por modelo (User, Invoice, Quote, ...)
```
No es obligatorio mover todos los modelos a la vez; puede hacerse por fases (primero rutas y servicios, luego modelos).

### 2.7 Orden de migración sin downtime

1. **Sin tocar rutas ni URLs:** Extraer a módulos: `financial.js`, `sanitize.js`, `auth` middlewares, y reemplazar en `index.js` por `require()`.
2. Crear `routes/auth.js` y mover solo las rutas de auth; en `index.js` hacer `app.use('/api/auth', authRoutes)` (o `/api`, según prefijo actual). Comprobar que no cambie ninguna URL.
3. Repetir por dominio: invoices, quotes, admin, partners, reports, etc. Cada PR con pruebas de humo (login, crear factura, crear cotización, convert, reportes, admin).
4. Opcional: extraer controladores a `controllers/<dominio>.js` y que las rutas solo llamen a controladores.
5. Mover modelos a `models/` cuando sea cómodo; mantener nombres de modelos y colecciones para no romper BD.

### 2.8 Estrategia incremental segura

- Una rama por dominio; despliegues tras cada dominio migrado.
- Mantener los mismos middlewares (verifyToken, etc.) y las mismas respuestas JSON para no romper el front.
- Tests de integración (o al menos scripts de peticiones) para los flujos críticos antes y después de cada migración.

---

## FASE 3 — BLINDAJE FINANCIERO

### 3.1 Recalculo obligatorio en backend

- **Facturas:** Ya implementado: `computeAmountsFromItems(items)` y se persisten esos valores. Mantener.
- **Cotizaciones:** Cambiar POST y PUT para que, cuando existan `items` en el body, se calcule siempre `subtotal`, `itbis`, `total` con la misma función que facturas (módulo compartido) y se ignoren los valores enviados. Si no hay items, definir política: rechazar o permitir solo borrador sin ítems (y sin totales).
- **Nota de crédito:** Ya usa recálculo desde ítems de la factura original. Mantener.

### 3.2 Recalculo obligatorio en cotizaciones (detalle)

- En `POST /api/quotes`: después de `sanitizeItems(req.body.items)`, si `items.length > 0`, llamar a `computeAmountsFromItems(items)` y usar ese resultado para `subtotal`, `itbis`, `total`. No leer del body.
- En `PUT /api/quotes/:id`: si `req.body.items !== undefined`, recalcular con `computeAmountsFromItems(sanitizeItems(req.body.items))` y asignar los tres campos; si solo se envían `subtotal`/`itbis`/`total` sin items, rechazar con 400 (o documentar que solo se permite cuando no hay ítems y es un borrador especial).

### 3.3 Protección contra manipulación de montos

- Facturas: ya protegido (recalculo).
- Cotizaciones: corregir como arriba.
- Gastos: hoy se aceptan `amount` e `itbis` del body. Opciones: (a) Dejar como está y documentar que son informativos; (b) Si en el futuro se calcula itbis a partir de categoría/monto, calcular en backend. Por ahora, al menos validar rangos (ya se hace con Math.min/max).

### 3.4 Validación estricta de ITBIS (18%)

- En el módulo financiero, usar constante `ITBIS_RATE = 0.18` y no aceptar otro valor desde el cliente para facturación RD.
- Opcional: en respuesta de factura/cotización incluir `itbisRate: 0.18` para que el front pueda mostrar “ITBIS 18%”.

### 3.5 Validación de NCF concurrente

- Ya se usa transacción y `findOneAndUpdate` atómico; índice unique en `Invoice.ncfSequence`. Añadir en tests: dos requests simultáneos que crean factura y comprobar que no se duplique NCF y que una de las dos falle o reintente correctamente.

### 3.6 Protección contra doble emisión en concurrencia alta

- Idempotencia: opcional `Idempotency-Key` en `POST /api/invoices` (y en convert quote). Si la clave se repite para el mismo usuario en ventana corta (ej. 24h), devolver la misma respuesta (201 con la factura ya creada) en lugar de crear otra.
- Cotización→factura: ya se marca `quote.status = 'converted'` y `invoiceId` en la misma transacción; doble clic puede dar error “ya facturada”. Opcional: clave de idempotencia también aquí.

### 3.7 Tests unitarios críticos

- `computeAmountsFromItems`: items vacíos; un item exento; varios ítems mixtos; redondeo a 2 decimales; total = subtotal + itbis.
- `validateNcfForClient`: RNC 9 dígitos + tipo 31; RNC 11 + tipo 32; tipo 04/34 sin restricción de cliente; combinaciones inválidas.
- `sanitizeItems`: array con strings, negativos, NaN; límite 100 ítems; descripción vacía filtrada.

### 3.8 Tests de integración financiera

- Crear factura con items → leer factura → comprobar subtotal, itbis, total coinciden con recálculo local.
- Crear cotización con items → PUT con mismos items → GET → totales iguales al recálculo.
- Crear cotización → convert to invoice → comprobar que totales de la factura coinciden con los de la cotización (recalculados).
- Nota de crédito: total = total factura original, estado factura original cancelled.

### 3.9 Casos de ataque simulados

- Enviar en factura `items` con precios/quantity manipulados y además `subtotal/itbis/total` distintos: comprobar que se persisten los calculados.
- Enviar en cotización PUT `subtotal/itbis/total` distintos a los de `items`: comprobar que se ignoran y se recalculan (tras implementar el cambio).
- Dos clientes (o dos requests en paralelo) creando factura al mismo tiempo: comprobar unicidad de NCF y que no haya duplicados en BD.

---

## FASE 4 — HARDENING DE SEGURIDAD

### 4.1 Cookies (SameSite, Secure)

- **Actual:** `httpOnly: true`, `secure: NODE_ENV === 'production'`, `sameSite: 'strict'` en producción. Correcto.
- Mejora: Asegurar que en producción `COOKIE_DOMAIN` esté definido si se usan subdominios, y que no se use `sameSite: 'none'` sin necesidad.

### 4.2 JWT: expiración y rotación

- **Actual:** `expiresIn: 3600` (1 hora). No hay refresh token.
- Mejora: Introducir refresh token (opaque, almacenado en BD o Redis con TTL, por usuario) y endpoint `POST /api/auth/refresh` que devuelva un nuevo access JWT. Cookie de acceso 15–60 min; refresh 7 días. En logout, invalidar refresh. Rotación: al usar refresh, emitir nuevo refresh y opcionalmente invalidar el anterior (rotation).

Ejemplo mínimo de flujo:

```js
// En login: además del access token, crear refresh token (random, guardar en RefreshToken model con userId, expiresAt)
// Cookie lexis_auth = access (1h); cookie lexis_refresh = refresh (httpOnly, 7d)
// GET /api/auth/me o middleware: si access expirado pero refresh válido, en middleware o endpoint refresh devolver nuevo access
// POST /api/auth/refresh: body o cookie lexis_refresh → verificar → nuevo access (+ opcional nuevo refresh)
```

### 4.3 Protección CSRF

- **Actual:** Dependencia de SameSite en cookie. Para formularios same-origin es suficiente en navegadores modernos.
- Mejora para integraciones o si se relaja SameSite: token CSRF en header (ej. `X-CSRF-Token`) generado en sesión o en cookie (Double Submit Cookie). El front envía el mismo valor en header; el backend lo compara. No necesario si toda la app es same-origin y SameSite strict.

### 4.4 Rate limiting granular

- **Actual:** Por ruta: login/register 5/10min, reset 3/hora, invoices 50/min, reports 20/min, upload 20/min, RNC 30/min.
- Mejora: Añadir rate limit global por IP (ej. 200 req/min) para evitar saturación en rutas no limitadas. Mantener los límites específicos más estrictos.

Ejemplo (express-rate-limit):

```js
const globalLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 200,
    message: { message: 'Demasiadas solicitudes. Intenta en 1 minuto.' },
    standardHeaders: true,
    legacyHeaders: false
});
app.use('/api/', globalLimiter);
// Luego los limiters específicos (auth, etc.) siguen aplicándose
```

### 4.5 Protección contra brute force distribuido

- Límites por IP ya ayudan. Si hay muchos IPs (botnet), considerar:
  - Límite por email (ej. 5 intentos fallidos por email en 15 min, almacenado en Redis o MongoDB con TTL).
  - Captcha en login tras N fallos (integrar con servicio externo).
  - Bloqueo temporal de cuenta tras M fallos (campo en User, desbloqueo manual o por tiempo).

### 4.6 Sanitización profunda de queries Mongo

- No pasar objetos arbitrarios del usuario a `find()`, `findOne()`, `updateOne()`.
- En listado admin, limitar `q` a longitud (ej. 100) y considerar no usar RegExp o escapar:

```js
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
const q = (req.query.q || '').trim().slice(0, 100);
if (q) {
    const safe = escapeRegex(q);
    conditions.push({
        $or: [
            { name: new RegExp(safe, 'i') },
            { email: new RegExp(safe, 'i') },
            { rnc: new RegExp(safe, 'i') }
        ]
    });
}
```

### 4.7 Helmet configuración estricta

- **Actual:** `helmet({ contentSecurityPolicy: false })`.
- Mejora: Activar CSP con política mínima que no rompa el front (permisos para scripts y estilos del mismo origen y de CDN que uses). Ejemplo base:

```js
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],  // Ajustar si usas 'unsafe-inline' o dominios
            styleSrc: ["'self'", "'unsafe-inline'"],  // Ajustar según tu UI
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            frameAncestors: ["'none'"]
        }
    }
}));
```

Ajustar según Next/UI; probar en staging antes de producción.

### 4.8 Política de logs sin datos sensibles

- Mantener redact en pino: password, token, authorization, cookie, *.rnc, *.amount, *.total, *.itbis.
- No loguear `req.body` completo en webhooks ni en login/register. Si se loguea algo, solo tipo de evento o ids.
- Revisar que en `log.error` no se pasen objetos que contengan `req` o `res` completos.

### 4.9 Auditoría de permisos por rol

- **user:** Facturas, cotizaciones, clientes, gastos, reportes propios, perfil, suscripción, pagos (solicitud).
- **admin:** Todo lo anterior + usuarios, pagos pendientes, aprobar/rechazar, audit, partners, alertas.
- **partner:** Panel partner; no acceso a facturación (verifyClient bloquea). Comprobar que no exista ruta que permita a partner acceder a datos de facturación de otros o a admin sin verifyAdmin.

Recomendación: matriz de permisos en documento y tests que comprueben que cada rol solo puede acceder a sus rutas (403 en el resto).

---

## FASE 5 — PREPARACIÓN ENTERPRISE

### 5.1 Escalado horizontal

- La API es stateless; escalar añadiendo más instancias detrás de un balanceador. En Vercel ya es automático por función. En VM/containers: varias instancias de Node y un reverse proxy (Nginx/Cloud Load Balancer).

### 5.2 Clustering o PM2

- Si se despliega en un solo servidor (no serverless), usar PM2 en modo cluster: `pm2 start api/index.js -i max` (o un número fijo de instancias). Así se aprovechan varios núcleos. Conexión MongoDB: una por proceso (Mongoose maneja pool por proceso).

### 5.3 Manejo de conexiones Mongo

- **Actual:** Singleton por proceso, `maxPoolSize: 25`. Adecuado.
- En cluster: cada worker tiene su pool. No compartir la misma conexión entre procesos. En serverless, conexión por invocación/cold start; mantener el patrón actual.

### 5.4 Índices necesarios

- Ya existen índices en esquemas: User (email unique), Invoice (userId+date, userId+ncfSequence, ncfSequence unique), Quote, PaymentRequest (status+requestedAt, reference, único parcial userId+status), Subscription (userId unique, status, currentPeriodEnd), NCFSettings, etc.
- Revisar con `explain()` las consultas más frecuentes (listado facturas por usuario, listado admin usuarios con filtros, reportes 606/607 por periodo). Añadir índices compuestos si faltan (ej. userId+date+status para facturas).

### 5.5 Estrategia de caché

- **Sesión:** Cachear resultado de verifyToken (userId, role, subscription.status) en Redis o en memoria con TTL corto (ej. 1–5 min) para reducir lecturas a User y Subscription. Invalidar en logout y al cambiar suscripción.
- **RNC externo:** Cachear respuestas de DGII/proveedor por RNC con TTL (ej. 24h) para no repetir llamadas.
- **Listados:** No cachear por defecto (datos dinámicos); si hay reportes pesados, considerar caché de resultado agregado por periodo (invalidar al crear/editar factura/gasto).

### 5.6 Separación futura en microservicios

- No obligatorio a corto plazo. Si se hace: candidatos a servicio separado: (1) generación de reportes 606/607 (CPU/heavy), (2) envío de emails, (3) webhooks externos (PayPal). La API principal seguiría siendo el único punto de entrada para el front; internamente llamaría a esos servicios vía HTTP o cola. Mantener BD única al principio para no introducir consistencia distribuida.

### 5.7 Observabilidad (logs estructurados, métricas)

- **Logs:** Pino ya da JSON. Añadir campos comunes: `requestId` (middleware que asigne uuid por request), `userId` (si autenticado), `path`, `method`, `statusCode`, `durationMs`. En producción enviar a agregador (Datadog, Logtail, CloudWatch, etc.).
- **Métricas:** Contadores por ruta (requests, 4xx, 5xx), latencia (p50, p95), uso de DB (conexiones, queries lentas). Herramientas: Prometheus + Grafana, o solución managed (Datadog, New Relic). Health check ya existe (`/api/health`); añadir comprobación de Redis si se usa.

### 5.8 Plan de backup y recuperación

- **MongoDB Atlas:** Habilitar backups continuos y restores puntuales; probar un restore en entorno de staging.
- **Documentar RTO/RPO:** Objetivo de tiempo de recuperación y de pérdida de datos aceptable.
- **Secrets:** JWT_SECRET, MONGODB_URI, CRON_SECRET, etc., en gestor de secretos (Vercel, AWS Secrets Manager). Rotación de JWT_SECRET implica invalidar todos los tokens (forzar re-login o refresh).

---

## FASE 6 — PLAN DE IMPLEMENTACIÓN

### 6.1 Roadmap en 4 semanas

| Semana | Foco | Entregables |
|--------|------|-------------|
| **1** | Blindaje financiero + seguridad crítica | Recalculo obligatorio en cotizaciones; validación longitud/escape en admin `q`; tests unitarios financial + integración factura/cotización; política de logs revisada |
| **2** | Extracción de módulos y primera modularización | Módulo `financial.js`, `validators/sanitize.js`, middlewares en `middlewares/auth.js`; montar `routes/auth.js` sin cambiar URLs; rate limit global opcional |
| **3** | Rutas por dominio y hardening | Montar rutas invoices, quotes, admin (o al menos invoices y quotes); Helmet CSP básico; JWT refresh opcional (diseño + endpoint) |
| **4** | Estabilidad y observabilidad | Tests de concurrencia NCF y doble factura; documentación de permisos por rol; requestId en logs; revisión de índices; plan de backup documentado |

### 6.2 Orden correcto de cambios

1. Cambios que no alteran contrato (extracción de funciones a módulos, recálculo en cotizaciones manteniendo la misma forma de request/response).
2. Cambios que alteran solo respuesta (ej. añadir campo `itbisRate` en factura) de forma compatible.
3. Nuevos endpoints (refresh token) o nuevos headers (Idempotency-Key) opcionales.
4. Cambios de URL: no hacer hasta tener plan de redirección o versión de API.

### 6.3 Qué puede romper producción

- Cambiar la semántica de cotizaciones (recalcular siempre) puede romper clientes que envían solo totales sin items; hay que documentar y, si es posible, soportar temporalmente ambos comportamientos (si hay items, recalcular; si no hay, rechazar o permitir solo en draft).
- Montar rutas desde archivos con un path distinto (ej. `/api/v1/auth` vs `/api/auth`) rompe el front si no se actualiza.
- Activar CSP estricto sin probar puede romper el front si carga scripts externos o inline.
- Cambiar formato de error (message vs error) puede romper clientes que parsean el cuerpo; hacerlo con versión de API o manteniendo compatibilidad (ej. enviar ambos campos).

### 6.4 Cómo evitar downtime

- Despliegues con feature flags si es posible (ej. “usar recálculo en cotizaciones”).
- Migración de rutas: desplegar con las mismas rutas en `index.js` pero delegando a los nuevos módulos; luego eliminar código duplicado. No cambiar orden de middlewares (cookie, json, cors, helmet, rate limit, connectDB, rutas).
- Base de datos: no cambiar nombres de colecciones ni de campos requeridos sin migración previa y compatibilidad hacia atrás.

### 6.5 Cómo validar cada mejora antes de deploy

- Tests unitarios para financial y validadores; tests de integración para flujos críticos (crear factura, cotización, convertir, nota de crédito).
- Pruebas manuales o E2E: login, crear factura, crear cotización, editar cotización, convertir, reporte 606/607, admin listado y filtros.
- Staging con copia de datos anonimizados o subset; ejecutar suite de tests y humo tras cada despliegue.

---

## RESULTADO FINAL

### Nueva puntuación estimada tras mejoras

- **Arquitectura:** 5.5 → 8 (modularización, capas claras, sin código muerto confuso).
- **Seguridad:** 7 → 9 (JWT refresh, rate limit global, CSP, sanitización RegExp, política de logs).
- **Integridad financiera:** 8 → 9.5 (recalculo obligatorio en cotizaciones, tests, idempotencia opcional).
- **Escalabilidad:** 6 → 8 (modularización, caché de sesión, índices revisados, observabilidad).
- **Preparación enterprise:** 6 → 8 (backup, logs estructurados, permisos documentados, hardening).

**Promedio estimado:** ~8.5/10 (desde 6.4/10).

### Nivel alcanzado

- **Con Fase 1–3 completas:** Startup sólido (financiero blindado, seguridad básica reforzada).
- **Con Fase 1–5 completas:** SaaS escalable (modular, observable, preparado para más usuarios y equipos).
- **Con Fase 6 y despliegue estable:** Enterprise-ready en el sentido de procesos claros, auditoría y recuperación; para “enterprise” completo faltarían SLA, soporte 24/7 y acuerdos contractuales.

### Riesgos residuales

- Dependencia de un único proveedor (Vercel/Mongo Atlas) si no hay plan de multi-región o failover.
- Sin 2FA ni OAuth: riesgo de phishing o robo de credenciales; mitigar con buenas prácticas y en el futuro 2FA.
- Reportes 606/607: lógica compleja; mantener tests y revisión ante cambios normativos DGII.

### Recomendación final de lanzamiento masivo

- **No lanzar masivo** hasta tener al menos: recálculo obligatorio en cotizaciones (Fase 3), endurecimiento de admin `q` (Fase 4), y tests de integración financiera (Fase 3). Con eso se reduce riesgo fiscal y de estabilidad.
- **Lanzamiento masivo razonable** cuando además esté: modularización de auth e invoices (Fase 2), rate limit global (Fase 4), logs sin datos sensibles y health/observabilidad básica (Fase 5). Opcional: JWT refresh para mejor UX y seguridad.
- **Enterprise / grandes volúmenes:** Completar Fases 2–5 y plan de backup y recuperación; revisar índices bajo carga; considerar caché de sesión y monitoreo de latencia y errores.

---

*Documento generado a partir de auditoría aplicada al código de Lexis Bill (api/index.js, logger, rutas, frontend de factura y cotización). No sustituye una auditoría legal o fiscal externa.*
