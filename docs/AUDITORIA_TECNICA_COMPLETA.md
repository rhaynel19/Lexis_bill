# Auditoría técnica completa — Lexis Bill

**Fecha:** 2025  
**Objetivo:** Estabilidad, seguridad, rendimiento y preparación para clientes reales.

---

## Resumen ejecutivo

| Área           | Estado   | Observaciones principales |
|----------------|----------|---------------------------|
| Compilación    | ✅ OK    | Build correcto; aviso middleware Next.js y tamaño chunk PWA |
| Errores runtime| ⚠️ Menor | 1 catch vacío; varios .catch() silenciosos en promesas |
| Seguridad      | ✅ Bueno | Auth/roles/verifyClient; sanitización; CRON_SECRET debe forzarse en prod |
| Base de datos  | ✅ Bueno | Índices definidos; relaciones coherentes |
| Rendimiento   | ✅ Aceptable | Algunos .catch() sin await; lazy load ya usado donde aplica |
| UX            | ✅ Aceptable | Estados de carga/error presentes; onboarding ya rediseñado |
| Código muerto | ⚠️ Menor | SmartTutorial sin usar; algunos console.log en dev |

**Nivel estimado del proyecto:** **Beta** — Listo para captar usuarios con supervisión; aplicar recomendaciones antes de considerar producción plena.

---

## FASE 1 — Detección de errores

### 1.1 Errores de compilación o runtime
- **Build:** `npm run build` termina correctamente.
- **TypeScript:** Sin errores de tipos en el build.
- **Avisos:** Middleware deprecated (Next.js 16 sugiere "proxy"); chunk PWA >2MB no precacheado.

### 1.2 Variables indefinidas
- No detectadas en rutas críticas. Uso de optional chaining y valores por defecto en API y componentes.

### 1.3 Imports incorrectos o no utilizados
- **SmartTutorial:** Componente ya no importado en dashboard (sustituido por FirstTimeGuide). El archivo existe pero no se usa → código muerto.

### 1.4 Dependencias
- **package.json:** Next 16, React 19, Mongoose 9, Express 5. Sin conflictos evidentes. Recomendación: ejecutar `npm audit` y actualizar parches.

### 1.5 Errores silenciosos (try/catch vacíos)
- **configuracion/page.tsx (línea ~45):** `catch {}` al parsear JSON de localStorage. Si el contenido está corrupto, no se informa. **Corrección:** Registrar fallo o mostrar estado por defecto.
- **reportes/page.tsx:** `api.sendReportReminder().catch(() => {})` — silencioso; aceptable para “recordatorio opcional”, pero se podría mostrar toast en error.
- **nueva-factura:** `api.saveInvoiceDraft(draft).catch(() => {})` y `api.deleteInvoiceDraft().catch(() => {})` — intencional para no bloquear UI; aceptable.
- **registro, aceptar-politicas, PolicyView, TrialHeaderBadge, LexisBusinessCopilot:** Varios `.catch()` que ignoran o solo setean estado; revisar si conviene feedback al usuario en casos críticos.

### 1.6 Tipado (TypeScript)
- Proyecto tipado; ningún error de compilación. Algunos `any` en handlers de error (p. ej. `error: any`); recomendación: usar `unknown` y type guards donde sea posible.

### 1.7 Funciones que nunca se ejecutan
- No detectadas. SmartTutorial no se invoca pero el módulo existe; no es “función muerta” sino componente no usado.

### 1.8 Código duplicado
- Lógica de “validar RNC” y “obtener nombre fiscal” repetida en onboarding y nueva-factura; se podría extraer a un hook o utilidad compartida (mejora menor).
- Constantes de env (p. ej. `NEXT_PUBLIC_APP_URL`) repetidas en API; considerar objeto de config centralizado.

### 1.9 Promesas sin await
- Uso de `.then()/.catch()` en varios sitios (reportes, registro, nueva-cotizacion, SubscriptionAlert, etc.). No hay promesas “flotantes” que provoquen errores no manejados; el patrón es intencional (fire-and-forget en guardado de borrador, recordatorios). Recomendación: en flujos críticos preferir async/await para claridad.

### 1.10 Posibles memory leaks
- **useEffect con cleanup:** En nueva-factura el `setTimeout` para saveInvoiceDraft se limpia con `return () => clearTimeout(timer)`. Correcto.
- No se detectaron suscripciones o listeners sin limpieza en los archivos revisados. Recomendación: revisar cualquier `addEventListener` o suscripción externa en componentes que se desmontan.

---

## FASE 2 — Flujo y lógica

### 2.1 Navegación y redirecciones
- **Middleware:** Protege rutas por cookie; no distingue rol (la distinción se hace en layouts).
- **Login:** Redirección por rol (cliente → /dashboard, partner → /partner/dashboard) implementada.
- **Redirect post-login:** Lista de prefijos permitidos (ALLOWED_REDIRECT_PREFIXES) evita open redirect.
- **Onboarding:** Redirect a /onboarding si `onboardingCompleted === false`; tras completar, va a configuración. Coherente.

### 2.2 Loops infinitos
- No detectados. Dependencias de useEffect revisadas en flujos principales; no hay setState en render que provoque ciclo.

### 2.3 Validación de formularios
- **API:** validatePassword, sanitizeString, sanitizeEmail, sanitizeItems, isValidObjectId. Registro y login validan y sanitizan.
- **Frontend:** Formularios críticos (login, registro, factura, NCF) tienen validación y feedback (toast, estados de error). Algunos formularios largos podrían beneficiarse de validación por campo en tiempo real (mejora UX).

### 2.4 Estados inconsistentes
- **Auth:** Usuario se obtiene por getMe(); se guarda en AuthContext. Coherencia entre cookie y estado.
- **Partner vs cliente:** Layouts redirigen por rol; no se mezclan dashboards.
- **Suscripción:** Backend (Subscription, verifyToken con accessLevel) es fuente de verdad; frontend muestra badges y alertas según API.

### 2.5 Estados globales
- **AuthContext:** user, loading, refresh, logout. Uso correcto.
- **PreferencesContext:** mode, profession, showTips, isOnboarded. Persistido en localStorage; uso acotado.
- No hay abuso de estado global; las páginas usan estado local donde basta.

### 2.6 Login, tokens y sesiones
- **Cookie HttpOnly:** lexis_auth; no se expone a JS.
- **Backend:** verifyToken valida JWT, carga User y Subscription; bloquea si user.blocked o suscripción en estado bloqueado.
- **Frontend:** secureFetch con credentials: 'include'; 401 redirige a login con redirect; 403 por suscripción redirige a /pagos.
- **Logout:** POST /api/auth/logout limpia cookie. Correcto.

---

## FASE 3 — Seguridad

### 3.1 Autenticación en backend
- Endpoints sensibles usan verifyToken. getMe, políticas, onboarding, perfil, partners, membership, pagos, NCF, clientes, facturas, reportes, gastos, cotizaciones, documentos, alertas, business-copilot, etc. están protegidos.
- **Excepciones intencionales (públicas):** health, register, login, forgot-password, reset-password, verify-email, logout, policies/current y policies/:slug, referral/validate e invite, membership/plans, validate-rnc, rnc/:number, status, webhooks/paypal.

### 3.2 Protección por roles
- **verifyClient:** Impide que role === 'partner' acceda a endpoints de facturación/NCF/reportes/clientes/documentos/membership/pagos/etc.
- **verifyPartner:** Solo partners activos en /api/partners/me y /api/partners/dashboard.
- **verifyAdmin:** Todos los /api/admin/* exigen admin.
- **Cron:** /api/cron/reconcile exige header o body con CRON_SECRET. **Riesgo:** Si en producción no se define CRON_SECRET, el default es 'change-me-in-production'. **Corrección:** En producción, exigir CRON_SECRET definido y distinto del default (fail-fast al arranque).

### 3.3 Vulnerabilidades
- **Datos sensibles:** JWT en cookie HttpOnly; contraseñas hasheadas con bcrypt. No se exponen secretos en respuestas.
- **Endpoints sin protección:** Solo los listados como públicos; el resto requiere verifyToken y, donde aplica, verifyClient/verifyPartner/verifyAdmin.
- **Manipulación de parámetros:** IDs de recurso (userId, invoiceId, etc.) se validan con isValidObjectId y se comprueba que el recurso pertenezca al usuario (req.userId). No se detectó IDOR obvio en las rutas revisadas.
- **RNC/validate-rnc:** Públicos; podrían ser objetivo de abuso (consultas masivas). Recomendación: aplicar rate limit específico (p. ej. 30 req/min por IP).

### 3.4 Sanitización de inputs
- **API:** sanitizeString, sanitizeEmail, sanitizeItems, validatePassword. Uso en registro, login, facturas, cotizaciones, clientes, etc. Previene inyección básica y operadores MongoDB en strings.
- **ObjectIds:** isValidObjectId antes de findById/findOne.

### 3.5 Variables de entorno
- **Fail-fast al inicio:** JWT_SECRET (mínimo 32 caracteres), MONGODB_URI, y en producción NEXT_PUBLIC_SENTRY_DSN. Correcto.
- **CRON_SECRET:** Debe exigirse en producción (ver 3.2).
- **CORS:** En producción se usa CORS_ORIGIN si está definido; en dev se permite todo con credentials. Aceptable.
- **Cookies:** secure en producción, sameSite: 'strict'. Correcto para CSRF.
- No se exponen secretos en el frontend; NEXT_PUBLIC_* solo para valores no sensibles (APP_URL, Sentry DSN, WhatsApp, etc.).

---

## FASE 4 — Base de datos

### 4.1 Relaciones
- **User:** Referenciado por Invoice, Customer, NCFSettings, Expense, Quote, Subscription, Partner, PaymentRequest, etc. Coherente.
- **Partner → PartnerReferral, PartnerCommission, PartnerInvite.** PartnerReferral tiene userId (único); PartnerCommission por partnerId y mes.
- **Subscription:** userId único; referencias desde billing y pagos. Índices en status, currentPeriodEnd, graceUntil.
- No se detectaron relaciones mal definidas.

### 4.2 Consultas innecesarias
- getMe y flujos de layout cargan usuario una vez; no hay N+1 evidente en listados revisados (invoices, customers por userId).
- Algunos endpoints podrían proyectar solo campos necesarios (.select()) para reducir payload; mejora menor.

### 4.3 Índices
- **Invoice:** userId + date, ncfSequence, tipoPago, estadoPago, clientRnc+date.
- **Customer:** userId + rnc (unique).
- **Expense, InvoiceDraft, UserServices, UserDocument, FiscalAuditLog:** userId y/o fechas.
- **PolicyAcceptance, Partner, PartnerReferral, PartnerCommission, PartnerInvite, Subscription, BillingEvent, PaymentRequest, etc.:** Índices acordes a consultas por usuario, estado, fechas.
- **TTL:** passwordResetSchema expireAfterSeconds en expiresAt. Correcto.
- Índices suficientes para el uso actual.

### 4.4 Integridad referencial
- Mongoose no fuerza FK a nivel de motor; las referencias son por ObjectId. Las rutas aseguran que los recursos pertenezcan al usuario (req.userId). No hay cascadas automáticas; eliminaciones manuales (p. ej. cliente) coherentes.

### 4.5 Condiciones de carrera
- **PaymentRequest:** Índice único parcial para un solo pending/under_review por usuario; evita doble envío.
- **Invoice:** Creación de NCF y actualización de secuencia en transacción o con findOneAndUpdate atómico (revisar en código de creación de factura). Si hay concurrencia alta, considerar bloqueos optimistas o colas para NCF.
- PartnerCommission por partnerId+month unique; evita duplicados por mes.

---

## FASE 5 — Rendimiento

### 5.1 Renders innecesarios
- Componentes grandes (dashboard, nueva-factura) tienen mucho estado; podrían dividirse o usar useMemo/useCallback donde se identifiquen dependencias costosas. No se detectó patrón claro de re-renders en cadena; recomendación: perfilar con React DevTools si hay quejas de fluidez.

### 5.2 useEffect
- Algunos useEffect con muchas dependencias (nueva-factura guardado de draft); el cleanup del timeout está bien. Dependencias de arrays en hooks de datos (dashboard, reportes) correctas en general.
- sendReportReminder en reportes se dispara al montar con []; aceptable (una vez por visita).

### 5.3 Cálculos pesados en render
- No se detectaron cálculos muy pesados en el render path sin memoización. Gráficos y tablas usan datos ya cargados; recomendación: si hay listas muy grandes, considerar virtualización (mejora futura).

### 5.4 Queries
- Listados con paginación (invoices, etc.) en API; límites razonables. Índices apoyan filtros por userId y fecha.
- **Lazy loading:** Uso de dynamic import y lazy donde aplica; API con fetch bajo demanda. Aceptable.

### 5.5 Lazy loading
- next/dynamic y import() usados en componentes pesados (manual PDF, etc.). Aceptable.

---

## FASE 6 — Experiencia de usuario

### 6.1 Componentes rotos
- Build y rutas generadas correctamente; no se reportan páginas en blanco. Onboarding y guía de primer uso rediseñados (modal, 4 pasos, responsive).

### 6.2 Responsive
- Tailwind y breakpoints en layouts; onboarding y partner dashboard con diseño mobile-first. Ajustes recientes en OnboardingWizard (altura flexible, barra de progreso en móvil).

### 6.3 Superposición de elementos
- Guía de inicio pasó a modal con overlay; ya no compite con el layout. Z-index del Dialog y header/sidebar coherentes.

### 6.4 Estados de carga y error
- Páginas principales (dashboard, facturas, reportes, clientes, configuración, etc.) muestran loading (spinner o skeleton) y mensajes de error (toast o inline). Aceptable.

---

## FASE 7 — Limpieza y mejoras

### 7.1 Código muerto
- **SmartTutorial.tsx:** No importado; sustituido por FirstTimeGuide. Recomendación: eliminar el archivo o dejarlo comentado como referencia.
- **console.log/console.warn/console.error:** Varios archivos (dashboard, api, lib, components). En producción conviene que los logs vayan a Sentry o logger; console.error en catch puede mantenerse si Sentry los captura. Recomendación: no dejar console.log en rutas de producción críticas.

### 7.2 Funciones grandes
- **api/index.js:** Archivo muy largo (>5000 líneas). Recomendación estratégica: dividir en módulos por dominio (auth, invoices, customers, reports, admin, partners, cron, etc.) y montar rutas con express.Router. Mejora mantenibilidad y pruebas.

### 7.3 Responsabilidades
- **Frontend:** Páginas mezclan carga de datos, formularios y lógica; aceptable para el tamaño actual. Para escalar, considerar hooks personalizados (useInvoices, useCustomers) y servicios/clients por dominio.
- **Backend:** Toda la API en un solo archivo; separar por dominio mejoraría claridad.

### 7.4 Nombres de variables
- En general descriptivos (req.userId, invoiceId, etc.). Algunos nombres genéricos (e, err, error) en catch; aceptable.

### 7.5 Comentarios técnicos
- API tiene comentarios en sanitización, niveles de acceso, rate limit, cron. Recomendación: documentar decisiones de negocio (por qué verifyClient, flujo de suscripción, etc.) en README o docs internos.

### 7.6 Arquitectura
- **Fortalezas:** Auth por cookie, roles en backend, sanitización, índices en MongoDB, rate limit en rutas sensibles, fail-fast con env.
- **Debilidades:** Monolito API en un solo archivo; algún catch vacío y promesas silenciosas; CRON_SECRET con default peligroso en prod; endpoints RNC públicos sin rate limit.
- **Recomendación:** Mantener stack actual; priorizar: (1) CRON_SECRET obligatorio en prod, (2) rate limit RNC, (3) sustituir catch vacío en configuración, (4) plan de modularización del API a medio plazo.

---

## Correcciones aplicadas (en código)

1. **configuracion/page.tsx:** Catch vacío al parsear localStorage sustituido por validación `data && typeof data === "object"` y comentario explicativo; se evita propagar datos corruptos y fallos silenciosos.
2. **api/index.js:** En producción, fail-fast al arranque si `CRON_SECRET` no está definido o es `'change-me-in-production'`, evitando que el cron de reconciliación quede protegido con el valor por defecto. En desarrollo el servidor puede arrancar sin definir `CRON_SECRET`.
3. **api/index.js:** Rate limit `rncLimiter` (60 req/min por IP) aplicado a `GET /api/rnc/:number` y `POST /api/validate-rnc` para limitar abuso de consultas RNC públicas.

---

## Recomendaciones estratégicas antes de producción

1. **Seguridad:** Definir CRON_SECRET en producción y no usar default. Revisar que ningún otro secret use valor por defecto en prod.
2. **Observabilidad:** Configurar Sentry (ya referenciado); asegurar que 4xx/5xx y excepciones no capturadas se reporten. Revisar logs (pino en API) y rotación.
3. **Backups:** Tener backups automáticos de MongoDB y procedimiento de restauración probado.
4. **Rate limits:** Revisar límites globales y por ruta; añadir limitación a endpoints públicos sensibles (RNC, políticas si se abusa).
5. **Tests:** Aumentar cobertura E2E en flujos críticos (login, crear factura, reportes, pagos). Ejecutar test suite en CI antes de deploy.
6. **Modularización API:** Plan para dividir api/index.js en routers por dominio en una siguiente iteración.
7. **Código muerto:** Eliminar o archivar SmartTutorial.tsx y limpiar console.log en rutas de producción.
8. **Documentación:** Mantener AUDITORIA_TECNICA_COMPLETA.md y AUDITORIA_SEPARACION_CLIENTE_PARTNER.md actualizados; documentar variables de entorno necesarias en README o .env.example.

---

## Nivel del proyecto

**Beta.**  
El sistema es estable, con autenticación y autorización sólidas, datos sanitizados, índices adecuados y flujos de usuario coherentes. Es adecuado para captar clientes reales con supervisión y monitoreo. Para considerarlo **Producción** plena: aplicar las correcciones y recomendaciones anteriores, en especial CRON_SECRET, rate limit en RNC, eliminación de catch vacío y plan de modularización y pruebas.
