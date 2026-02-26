# Auditoría final pre-clientes reales — Lexis Bill

**Fecha:** 2025  
**Nivel:** Producción seria  
**Capas:** Seguridad, Estabilidad, Financiero, Legal, Escalabilidad

---

## 1. SEGURIDAD CRÍTICA

### 1.1 Rate limiting

| Ruta | Límite | Estado |
|------|--------|--------|
| `/api/auth/login` | 5 intentos / 10 min por IP | OK (express-rate-limit + proxy reenvía X-Forwarded-For desde Next) |
| `/api/auth/register` | 5 / 10 min | OK |
| `/api/auth/forgot-password` | 3 / hora | OK (resetPasswordLimiter) |
| `/api/auth/reset-password` | 3 / hora | OK |
| `/api/rnc/:number`, `/api/validate-rnc` | 30 / min | OK (rncLimiter) |

- **Trust proxy:** `app.set('trust proxy', 1)` para que la IP del cliente se tome de `X-Forwarded-For` (Vercel).
- **Proxy login:** `app/api/login/route.ts` reenvía `X-Forwarded-For` al backend para que el rate limit por IP funcione cuando el cliente llama a `/api/login`.

### 1.2 Hash de contraseña

- **Implementación:** `bcryptjs` con 12 rounds.
- **Uso:** registro (`bcrypt.hash`), login (`bcrypt.compare`), reset password (`bcrypt.hash`).
- **Estado:** OK — no se usa crypto simple ni SHA manual.

### 1.3 JWT y cookies

- **Expiración:** 1 hora (`expiresIn: 3600`).
- **Cookie:** `lexis_auth` con `httpOnly: true`, `secure` en producción, `sameSite: 'strict'` en producción.
- **Almacenamiento:** JWT solo en cookie, no en localStorage.
- **Estado:** OK.

### 1.4 Validación de inputs

- **Actual:** Sanitización manual en backend: `sanitizeString`, `sanitizeEmail`, `validatePassword`, `sanitizeItems`, `isValidObjectId`, validación de RNC/Cédula.
- **Recomendación:** Para endurecer aún más, añadir esquemas con **Zod** o **Joi** en rutas críticas (login, factura, cotización, nota de crédito, creación de usuario). No implementado en esta auditoría; se deja como mejora futura.

---

## 2. INTEGRIDAD FINANCIERA

### 2.1 Montos calculados en backend

- **Problema resuelto:** Los montos (subtotal, itbis, total) **no** se confían del frontend.
- **Implementación:** Función `computeAmountsFromItems(items)` con ITBIS 18% (RD). Se usa en:
  - `POST /api/invoices` — factura nueva (solo items del body, montos recalculados).
  - Nota de crédito — montos recalculados desde `original.items`.
  - `POST /api/quotes/:id/convert` — montos recalculados desde `quote.items`.
- **Estado:** OK — un cliente no puede manipular total/subtotal/itbis desde DevTools.

### 2.2 Numeración de facturas (NCF)

- **Mecánica:** `getNextNcf()` usa `NCFSettings` con `findOneAndUpdate` y `$inc: { currentValue: 1 }` en transacción (session).
- **Sin** “última factura + 1”: se usa contador atómico por lote (initialNumber–finalNumber).
- **Estado:** OK — evita duplicados y condiciones de carrera.

---

## 3. GENERACIÓN DE PDF

- **Situación actual:** Los PDF de facturas y cotizaciones se generan en el **cliente** con **jsPDF** (`lib/pdf-generator.ts`).
- **Riesgo:** Los datos del PDF dependen del frontend (no de una fuente única en backend). Para documentos ya guardados, los datos vienen del API; para proformas, del estado del cliente.
- **Recomendación:** Para máxima integridad en producción, valorar generación de PDF en backend (p. ej. Puppeteer o similar) para facturas oficiales, usando solo datos del API. No implementado en esta auditoría.

---

## 4. HEADERS Y SEGURIDAD WEB

- **Helmet:** Añadido `app.use(helmet({ contentSecurityPolicy: false }))` para no romper cargas de scripts/estilos existentes. Helmet aplica por defecto, entre otros:
  - `X-Frame-Options`
  - `X-Content-Type-Options`
  - HSTS (en producción según config)
- **CSP:** Desactivado para no bloquear la app actual; se puede endurecer más adelante con una política explícita.

---

## 5. CORS

- **Producción:** `CORS_ORIGIN` (lista de orígenes permitidos). No hay `cors()` abierto sin restricción.
- **Desarrollo:** `origin: true` para facilitar credenciales.
- **Estado:** OK para mismo dominio y orígenes configurados.

---

## 6. ERRORES EN PRODUCCIÓN

- **Función:** `safeErrorMessage(err)` — en producción devuelve siempre `"Error interno del servidor"`; en desarrollo devuelve `err.message`.
- **Uso:** Respuestas 500 del API usan `res.status(500).json({ message: safeErrorMessage(e) })` (o equivalente con `error`/`err`).
- **Manejador global:** `app.use((err, req, res, next) => ...)` registra el error y responde con mensaje seguro.
- **Estado:** No se envían stack traces ni mensajes internos al cliente en producción.

---

## 7. BACKUPS

- **Script:** `scripts/backup-mongodb.js` (y `restore-mongodb.js`).
- **Pregunta crítica:** ¿Hay backup automático de MongoDB (Atlas o cron)?
- **Acción recomendada:** Configurar backups automáticos en MongoDB Atlas y/o cron que ejecute `npm run backup` y suba a almacenamiento seguro (S3/R2, etc.).

---

## 8. ESCALABILIDAD

- **Conexión MongoDB:** Singleton reutilizable (`connectDB`, `cachedDb`); no se crea una conexión por request.
- **Pool:** `maxPoolSize: 25` en opciones de Mongoose.
- **Uso de async/await:** Correcto en los flujos revisados.
- **Estado:** OK para crecimiento moderado (p. ej. 100 clientes); monitorear bajo carga real.

---

## 9. PRUEBAS MANUALES ANTES DE CLIENTES REALES

Checklist obligatorio:

- [ ] **Manipular total desde DevTools:** Enviar factura con total modificado en el payload; verificar que el total guardado sea el recalculado por el backend (según items).
- [ ] **Total negativo:** Enviar factura con total negativo o 0; el backend debe rechazar o recalcular; no guardar total negativo.
- [ ] **20 logins incorrectos seguidos:** Comprobar que tras 5 intentos (por IP) se devuelva 429 y mensaje de límite.
- [ ] **Cambiar ID de factura en URL:** Acceder a `/api/invoices/<id_otro_usuario>`; debe devolver 404 o 403 (verifyClient).
- [ ] **Acceder factura de otra empresa:** Mismo usuario no debe ver facturas de otro `userId`; todas las rutas de facturas filtran por `req.userId`.
- [ ] **Reset password:** Más de 3 solicitudes por hora desde la misma IP; debe aplicarse límite.
- [ ] **RNC:** Más de 30 consultas por minuto; debe aplicarse rncLimiter.

---

## 10. RESUMEN DE CAMBIOS APLICADOS EN ESTA AUDITORÍA

| Área | Cambio |
|------|--------|
| Rate limit | Login/register 5/10 min; forgot/reset 3/hora; RNC 30/min; trust proxy; reenvío de X-Forwarded-For en proxy de login. |
| JWT | Expiración 1 h; cookie 1 h. |
| Montos | `computeAmountsFromItems()` en factura, nota de crédito y conversión cotización→factura. |
| NCF | Ya atómico; sin cambios. |
| Helmet | Añadido (CSP desactivado). |
| Errores | `safeErrorMessage()` y reemplazo de respuestas 500 que exponían `error.message`; manejador global de errores. |
| Dependencia | `helmet` añadida al proyecto. |

---

## 11. NIVEL DE RIESGO TRAS AUDITORÍA

| Aspecto | Estado |
|---------|--------|
| Arquitectura / Vercel / Base URL | OK |
| Rate limiting | OK |
| Hash y JWT | OK |
| Integridad financiera (montos + NCF) | OK |
| Headers (Helmet) | OK |
| CORS | OK |
| Errores en producción | OK |
| Validación con esquemas (Zod/Joi) | Pendiente (recomendado) |
| PDF en backend | Pendiente (recomendado) |
| Backups automáticos | Verificar y documentar |

**Conclusión:** El proyecto queda en estado adecuado para clientes reales en los aspectos críticos de seguridad, integridad financiera y estabilidad. Las mejoras opcionales (Zod/Joi, PDF en backend, backups automáticos) se pueden planificar en siguientes iteraciones.
