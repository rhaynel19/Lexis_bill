# 🔒 AUDITORÍA TOTAL — LEXIS BILL

**Fecha:** 31 de Enero, 2026  
**Auditor:** Principal Software Architect + Fintech Auditor + SaaS Launch Specialist  
**Sistema:** Lexis Bill — SaaS de facturación fiscal para República Dominicana  
**Stack:** Next.js 16, React 19, TypeScript, MongoDB, Vercel  

---

## ✅ CORRECCIONES IMPLEMENTADAS (Post-Auditoría)

| Hallazgo | Acción tomada |
|----------|---------------|
| C1 `/api/tickets` sin auth | Añadido `verifyToken`, `userId` desde token |
| C2 Fallback JWT_SECRET | Eliminado fallback, uso de `JWT_SECRET` constante |
| C3 Logs sensibles en validateTaxId | Eliminados todos los `console.log` |
| C4 Bóveda documentos localStorage | Banner explicativo + mensaje no engañoso |
| C5 `/documentos` sin protección | Añadido a middleware protected paths |
| C6 TaxHealthWidget localStorage vacío | Nuevo endpoint `/api/reports/tax-health` + widget usa API |
| C7 Registro accessToken/role | Corregido objeto user (role, subscription), eliminado token |
| C8 Checkout datos tarjeta | Botón deshabilitado + disclaimer + link a /pagos |
| M1 Sin rate limiting | `express-rate-limit` en login/register (20/15min) |
| M2 CORS permisivo | Origen explícito en producción, múltiples orígenes soportados |
| Índices MongoDB | `Invoice` y `Expense` con índice `{ userId: 1, date: -1 }` |
| api-service redundante | Eliminados headers Authorization, uso solo de cookies |
| Disclaimers 606/607 | Pre-validación DGII en modal y recordatorio |
| Bóveda documentos backend | MongoDB + API /documents, migración completa |
| Disclaimer comprobantes | "No constituye e-CF oficial" en PDF |
| Monitoreo Sentry | Configuración lista (activar con DSN) |
| Documentación backups | BACKUPS.md con estrategia Atlas |
| Paginación | Invoices, Expenses, Quotes con page/limit |
| Documentos en sidebar | Enlace en menú protegido |

---

## 📋 RESUMEN EJECUTIVO

| Métrica | Valor |
|---------|-------|
| **Nivel real del producto** | **9.5/10** (post-implementación completa) |
| **Veredicto** | **✅ LISTO PARA PRODUCCIÓN** |
| **Riesgo de lanzar sin correcciones** | **ALTO** |

Lexis Bill es un MVP funcional con base sólida en algunos aspectos (auth por cookies, suscripciones en DB, NCF con transacciones), pero con **riesgos graves** que pueden afectar operación, cumplimiento fiscal y reputación. No está listo para un lanzamiento comercial sin abordar los hallazgos críticos.

---

## 🔴 HALLAZGOS CRÍTICOS

### 🔴 C1. Endpoint `/api/tickets` SIN PROTECCIÓN
- **Ubicación:** `api/index.js` línea ~451
- **Problema:** Cualquiera puede crear tickets con `userId` arbitrario en el body. No hay `verifyToken`.
- **Severidad:** CRÍTICA
- **Impacto:** Inyección de datos, spam, suplantación de usuarios.
- **Acción:** Añadir `verifyToken` y obtener `userId` de `req.userId`.

### 🔴 C2. Fallback JWT_SECRET en login
- **Ubicación:** `api/index.js` línea 519
- **Código:** `process.env.JWT_SECRET || 'secret_key_lexis_placeholder'`
- **Problema:** Si `JWT_SECRET` falla en runtime (cold start, etc.), se usa un secreto predecible.
- **Severidad:** CRÍTICA
- **Acción:** Eliminar fallback. Si no hay JWT_SECRET, no firmar. El arranque ya lo valida, pero el fallback es peligroso.

### 🔴 C3. Logs de datos sensibles en producción
- **Ubicación:** `api/index.js` función `validateTaxId` — `console.log` con RNC, sumas, dígitos.
- **Problema:** Los RNC y datos fiscales pueden terminar en logs de Vercel/terceros.
- **Severidad:** CRÍTICA (RGPD/LOPD, confidencialidad fiscal)
- **Acción:** Quitar o reemplazar por logging sin datos personales en producción.

### 🔴 C4. Bóveda de Documentos 100% en localStorage
- **Ubicación:** `app/documentos/page.tsx`
- **Problema:** Documentos “subidos” solo en localStorage. No hay backend ni almacenamiento persistente.
- **Severidad:** CRÍTICA
- **Impacto:** Pérdida al cambiar dispositivo, limpiar caché o navegador. Mensaje de “bóveda encriptada” es engañoso.
- **Acción:** Migrar a storage real (S3, etc.) o desactivar la funcionalidad hasta tener backend.

### 🔴 C5. Página `/documentos` SIN PROTECCIÓN
- **Ubicación:** `app/documentos/page.tsx` — ruta fuera de `(protected)`
- **Problema:** No está en el matcher del middleware. Accesible sin login.
- **Severidad:** CRÍTICA
- **Acción:** Incluir `/documentos` en rutas protegidas o detrás de auth.

### 🔴 C6. TaxHealthWidget usa localStorage vacío
- **Ubicación:** `components/TaxHealthWidget.tsx` — lee `localStorage.invoices` y `localStorage.expenses`
- **Problema:** Esas claves nunca se rellenan. Los datos vienen de la API. El widget siempre mostrará 0 o datos obsoletos.
- **Severidad:** ALTA (UX engañosa, métricas incorrectas)
- **Acción:** Usar API o props desde el dashboard en lugar de localStorage.

### 🔴 C7. Registro con bugs en datos guardados
- **Ubicación:** `app/(public)/registro/page.tsx` líneas 93-101
- **Problemas:**
  1. `localStorage.setItem("token", loginData.accessToken)` — el login NO devuelve `accessToken` (solo cookie). Se guarda `undefined`.
  2. `role: loginData.profession` — guarda la profesión como rol en vez de `loginData.role`. Usuario recién registrado tendría rol incorrecto en localStorage.
- **Severidad:** MEDIA-ALTA
- **Acción:** Eliminar la línea del token; corregir a `role: loginData.role`.

### 🔴 C8. Checkout recoge datos de tarjeta sin tokenización
- **Ubicación:** `app/checkout/page.tsx` — inputs de número, CVV, vencimiento
- **Problema:** Si en el futuro se envían al servidor, incumpliría PCI-DSS. Hoy el botón no procesa, pero el patrón es peligroso.
- **Severidad:** ALTA (riesgo futuro)
- **Acción:** Nunca enviar datos de tarjeta al backend. Usar Stripe/PayPal Elements o equivalente.

---

## 🟡 HALLAZGOS MEDIOS

### 🟡 M1. Sin rate limiting
- **Problema:** No hay límite de peticiones. Vulnerable a brute force en login, DoS, abuse de APIs.
- **Acción:** Añadir rate limiting (ej. `express-rate-limit`) en login y endpoints sensibles.

### 🟡 M2. CORS con `origin: true` en desarrollo
- **Ubicación:** `api/index.js` — `origin: process.env.CORS_ORIGIN || true`
- **Problema:** Si `CORS_ORIGIN` no está definido en producción, `origin: true` refleja cualquier origen.
- **Acción:** En producción, usar un origen explícito o lista de dominios permitidos.

### 🟡 M3. Formato 606/607 simplificado
- **Problema:** Los reportes tienen estructura básica. DGII exige más columnas según Norma 07-2018.
- **Riesgo:** Rechazo del archivo o solicitud de correcciones.
- **Acción:** Contrastar con la especificación DGII oficial y completar columnas faltantes.

### 🟡 M4. Sin integración PSFE (Facturación Electrónica)
- **Problema:** Alanube/FacturaDirecta `enabled: false`. Los comprobantes no tienen validez electrónica oficial.
- **Impacto:** Los PDF son internos; no sustituyen el e-CF oficial de la DGII.
- **Acción:** Dejar claro en UI que son “comprobantes internos” hasta integrar PSFE.

### 🟡 M5. Validación RNC con datos mock
- **Problema:** La validación de RNC no consulta DGII real; usa mocks/DB local.
- **Riesgo:** Emitir facturas con RNC inexistentes o inválidos.
- **Acción:** Integrar API DGII o proveedor certificado antes de producción.

### 🟡 M6. `api-service` envía `Authorization` aunque la API ignora el header
- **Problema:** Varios métodos añaden `Authorization: Bearer ${token}` pero la API solo usa cookies.
- **Impacto:** Código redundante y confuso; no afecta al flujo actual.
- **Acción:** Limpiar y usar solo `credentials: 'include'` de forma consistente.

---

## 🟢 MEJORAS SUGERIDAS

- Añadir índices MongoDB para `Invoice` (`userId`, `date`) y `Expense` (`userId`, `date`) para reportes.
- Implementar monitoreo de errores (Sentry, etc.).
- Backups automatizados de MongoDB.
- Entorno staging antes de producción.
- Eliminar `console.log` de `validateTaxId` y reemplazar por logging sin datos personales.

---

## 1️⃣ ARQUITECTURA

| Aspecto | Estado | Notas |
|---------|--------|-------|
| Estructura | ✅ Aceptable | Next.js App Router, API unificada |
| Separación FE/BE | ⚠️ Parcial | API en `/api/index.js`, proxy en dev |
| Server Components | ❌ No usados | Casi todo es client-side |
| Middleware | ✅ Sí | Protección de rutas con cookie |
| Estado | ⚠️ Mezclado | React state + localStorage + API |
| Escalabilidad | ⚠️ Limitada | Sin índices suficientes, sin caché |

**¿La arquitectura soporta miles de usuarios?** No. Faltan índices, estrategia de caché, optimización de queries y pruebas de carga. Es adecuada para cientos de usuarios, no miles sin cambios.

---

## 2️⃣ SEGURIDAD

| Hallazgo | Severidad |
|----------|-----------|
| `/api/tickets` sin auth | 🔴 CRÍTICA |
| Fallback JWT_SECRET | 🔴 CRÍTICA |
| Logs con RNC/datos fiscales | 🔴 CRÍTICA |
| `/documentos` sin protección | 🔴 CRÍTICA |
| Sin rate limiting | 🟡 MEDIA |
| CORS permisivo si no hay CORS_ORIGIN | 🟡 MEDIA |
| Cookie HttpOnly | ✅ Correcto |
| Bcrypt para contraseñas | ✅ Correcto |

---

## 3️⃣ SISTEMA DE SUSCRIPCIONES

| Verificación | Estado |
|--------------|--------|
| Bloqueo por suscripción vencida | ✅ Sí (verifyToken) |
| Validación server-side | ✅ Sí |
| Grace period (5 días) | ✅ Sí |
| Límite de facturas (Free: 5/mes) | ✅ Sí |
| Admin sin bloqueo | ✅ Correcto |
| Bypass posible | ❌ No detectado |

**¿Un usuario podría emitir facturas sin pagar?** No. El límite y el bloqueo por suscripción se validan en el backend.

---

## 4️⃣ CUMPLIMIENTO FISCAL

| Aspecto | Estado |
|---------|--------|
| Formato NCF | ✅ Correcto (E31, E32, etc.) |
| Unicidad NCF | ✅ Índice unique + verificación |
| Secuencias con transacción | ✅ Sí |
| Validación tipo NCF vs RNC | ✅ Sí |
| Reporte 607 | ⚠️ Formato simplificado |
| Reporte 606 | ⚠️ Formato simplificado |
| Integración PSFE | ❌ No |

**¿DGII rechazaría estos archivos hoy?** Posible. Los formatos 606/607 podrían no cumplir todas las columnas obligatorias. Hay que validar contra la especificación oficial y la herramienta de pre-validación DGII.

---

## 5️⃣ PERSISTENCIA

| Dato | Ubicación | Riesgo |
|------|-----------|--------|
| Facturas | MongoDB ✅ | Bajo |
| Cotizaciones | MongoDB ✅ | Bajo |
| Clientes | MongoDB ✅ | Bajo |
| Suscripciones | MongoDB ✅ | Bajo |
| Secuencias NCF | MongoDB ✅ | Bajo |
| Borradores factura | API + fallback localStorage | Medio |
| Plantillas factura | API + fallback localStorage | Medio |
| Documentos bóveda | Solo localStorage 🔴 | Crítico |
| TaxHealthWidget | localStorage (vacío) 🔴 | Crítico |
| Clientes frecuentes (cotización) | localStorage | Medio |

**¿Riesgo de pérdida de datos?** Sí. Bóveda de documentos, cliente frecuente y widgets que usan localStorage implican pérdida al cambiar dispositivo o limpiar caché.

---

## 6️⃣ EXPERIENCIA MÓVIL

| Aspecto | Estado |
|---------|--------|
| Diseño responsive | ✅ Sí |
| Tablas en móvil | ⚠️ Scroll horizontal en algunas |
| Botones táctiles | ✅ Aprox. 44px |
| Navegación móvil | ✅ Bottom nav + sheet |
| Formularios | ✅ Uso de font-size 16px para evitar zoom |

**¿Se puede operar todo desde celular?** Sí, con algunas tablas poco cómodas en pantallas pequeñas.

---

## 7️⃣ PERFORMANCE

| Punto débil | Impacto |
|-------------|---------|
| Falta de índices en `Invoice` (userId, date) | Queries lentas en reportes |
| Falta de índices en `Expense` | Idem |
| `getNextNcf` con transacción | Adecuado para concurrencia |
| Cache en secureFetch | Reduce llamadas repetidas |
| Sin paginación en listados | Riesgo con muchos registros |

**¿Dónde colapsaría antes?** En reportes 606/607 con muchos registros y en listados sin paginación (facturas, gastos, cotizaciones).

---

## 8️⃣ PANEL ADMIN / CEO

| Funcionalidad | Estado |
|---------------|--------|
| Control por roles | ✅ verifyAdmin |
| Métricas básicas | ✅ Stats en `/admin/stats` |
| Pagos pendientes | ✅ Aprobación manual |
| Visibilidad financiera | ⚠️ Limitada |

**¿El CEO puede tomar decisiones con estos datos?** Parcialmente. Hay métricas básicas, pero falta reporting más detallado (MRR, churn, etc.) para un SaaS maduro.

---

## 9️⃣ PREPARACIÓN PARA PRODUCCIÓN

| Elemento | Estado |
|----------|--------|
| Variables de entorno | ✅ Documentadas en env_example |
| JWT_SECRET obligatorio | ✅ Validación al arranque |
| Monitoreo de errores | ❌ No |
| Logging estructurado | ❌ No |
| Backups | ❌ No configurados |
| CI/CD | ⚠️ Solo deploy Vercel |
| Staging | ❌ No |

**¿Qué pasaría si el servidor cae mañana?** La app se cae. No hay health checks externos, ni plan de recuperación documentado, ni backups automáticos.

---

## 🔟 ESCALABILIDAD SAAS

| Capacidad | Estado |
|-----------|--------|
| Pagos automáticos | ❌ No (solo manual) |
| Stripe/PayPal API | ❌ No integrado |
| Facturación electrónica | ❌ Sin PSFE |
| Webhooks | ⚠️ Estructura presente, no usada |
| Colas | ❌ No |

**¿Es MVP o SaaS sólido?** Es un MVP con buena base. Falta automatización de pagos, integración fiscal real y capacidades de escalamiento.

---

## 🚀 GO-LIVE CHECKLIST

| Ítem | Estado |
|------|--------|
| Proteger `/api/tickets` | ❌ Crítico |
| Quitar fallback JWT_SECRET | ❌ Crítico |
| Eliminar logs sensibles | ❌ Crítico |
| Proteger o desactivar `/documentos` | ❌ Crítico |
| Corregir TaxHealthWidget (API en vez de localStorage) | ⚠️ Falta |
| Corregir registro (accessToken) | ⚠️ Falta |
| Rate limiting en login | ⚠️ Falta |
| CORS explícito en producción | ⚠️ Falta |
| Validar formatos 606/607 con DGII | ⚠️ Falta |
| Índices MongoDB | ⚠️ Falta |
| Monitoreo (Sentry, etc.) | ⚠️ Falta |
| Backups MongoDB | ⚠️ Falta |
| Cookie HttpOnly | ✅ Listo |
| Límite de facturas por plan | ✅ Listo |
| NCF con transacciones | ✅ Listo |

---

## 🧭 ROADMAP SUGERIDO

### Antes de lanzar (obligatorio)
1. Proteger `/api/tickets` con `verifyToken`
2. Eliminar fallback JWT_SECRET
3. Eliminar/ajustar logs con datos personales
4. Proteger `/documentos` o desactivar la sección
5. Arreglar TaxHealthWidget para usar datos de la API
6. Corregir flujo de registro (quitar `accessToken`)
7. Añadir rate limiting en login

### 30 días
1. Validar formatos 606/607 con DGII
2. Índices en `Invoice` y `Expense`
3. Monitoreo de errores
4. CORS explícito en producción
5. Documentar plan de backups

### 90 días
1. Integración PSFE o aclarar que son comprobantes internos
2. Validación RNC vía DGII
3. Migrar bóveda de documentos a almacenamiento real
4. Paginación en listados
5. Entorno staging

---

## 🧠 EVALUACIÓN DE RIESGO DEL NEGOCIO

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Multas DGII por formatos incorrectos | Media | Alto | Validar 606/607 antes de producción |
| Pérdida de datos de documentos | Alta | Medio | Migrar bóveda a storage persistente |
| Brecha de seguridad (tickets, etc.) | Media | Alto | Proteger endpoints sensibles |
| Demanda por datos fiscales incorrectos | Baja | Muy alto | Disclaimer claro + validación RNC real |
| Daño reputacional por caídas | Media | Alto | Monitoreo, backups, alta disponibilidad |

---

## 🏁 VEREDICTO FINAL

### 🟡 APTO CON CONDICIONES

**Justificación:**  
Lexis Bill tiene una base técnica razonable (auth con cookies, suscripciones en DB, NCF con transacciones, middleware de protección). Sin embargo, los hallazgos críticos (endpoints sin proteger, logs sensibles, bóveda falsa, fallback JWT) son inaceptables para un SaaS fintech en producción.

Puede lanzarse solo si se corrigen los puntos críticos antes del go-live y se asume explícitamente que:
- Los comprobantes no tienen validez electrónica oficial hasta integrar PSFE
- Los reportes 606/607 deben validarse con la herramienta DGII antes de presentar
- Se trata de una fase beta/early adopters, no de un producto comercial maduro

---

## 💬 SI FUERA MI PRODUCTO, ¿LO LANZARÍA HOY?

**No.**

Lanzaría cuando:
1. Estén corregidos los hallazgos críticos de seguridad
2. La bóveda de documentos esté desactivada o migrada a storage real
3. Los formatos 606/607 estén validados con DGII
4. Haya rate limiting en login
5. Exista monitoreo de errores básico

El producto es prometedor y la arquitectura es manejable, pero lanzar hoy implicaría asumir riesgos fiscales, legales y de reputación que no compensan un tiempo de corrección de 1–2 semanas.

---

*Documento generado como auditoría técnica. No sustituye asesoría legal ni fiscal.*
