# Auditoría TOTAL Lexis Bill — Prompts 1, 2, 3 + Definitive

**Rol:** CTO fintech / Auditor técnico. Objetivo: evitar colapso de confianza, pagos y datos fiscales al escalar.

**Acciones ya realizadas (resumen):**
- **PROMPT 1:** Botón "Resumen ITBIS" en Reportes Fiscales ahora abre un modal con ITBIS cobrado, subtotal neto y comprobantes (ya no es botón muerto).
- **PROMPT 2:** Datos bancarios en pagos: título "Datos bancarios para tu pago", bloque Banco / Titular / Documento (RNC/Cédula) / Cuenta, caja de referencia única con aviso, botón "Copiar datos", mensaje "Tu pago será validado por nuestro equipo financiero. La activación del plan puede tardar hasta 24 horas."
- **PROMPT 3:** Badge post-pago: usuarios con plan activo (pro/premium) ven badge verde "Suscripción activa" con tooltip "Tu cuenta está completamente habilitada. Ya puedes operar sin interrupciones." (ya no "Plan Free – XX días").

---

## ERRORES QUE PUEDEN MATAR EL SaaS

### 1. Webhooks PayPal no conectados a la fuente de verdad (MongoDB)

**Qué pasa:** Los webhooks usan un servicio en memoria; la API usa MongoDB. Pagos por PayPal no activan la suscripción en BD. El usuario paga y sigue viendo trial o "Pendiente de pago".

**Impacto:** Pérdida de confianza inmediata, soporte saturado, chargebacks.

**Solución:** Montar webhooks en `api/index.js`; que los handlers usen los mismos modelos `Subscription` y `PaymentRequest` y funciones `activateSubscriptionFromPayment`; eliminar estado en memoria como fuente de verdad. Validar firma PayPal.

---

### 2. Redirect post-login ignorado

**Qué pasa:** Tras login, el usuario siempre va a Dashboard aunque hubiera llegado desde una ruta como `/nueva-factura` (guardada en `?redirect=`). Pierde contexto.

**Impacto:** Percepción de inestabilidad, abandono de flujos.

**Solución:** En la página de login, leer `searchParams.get("redirect")`, sanitizar (solo path interno) y hacer `router.push(redirect || "/dashboard")` tras login exitoso.

---

### 3. Botón "Resumen ITBIS" sin acción (CORREGIDO)

**Estado:** **Resuelto.** El botón en Reportes Fiscales abre un modal con resumen del periodo (ITBIS cobrado, subtotal neto, comprobantes). Si en el futuro se desactiva la funcionalidad, se debe deshabilitar el botón o mostrar "Próximamente" / tooltip; nunca dejar un botón muerto.

---

### 4. Referencia de pago LEX-XXXX con colisión posible

**Qué pasa:** Referencias de 4 dígitos (9.000 valores); con volumen, dos usuarios o reintentos pueden compartir la misma referencia.

**Impacto:** Aprobación del pago equivocado, confusión operativa.

**Solución:** Aumentar entropía (ej. LEX- + 6–8 dígitos o timestamp/random). Índice único en `PaymentRequest.reference` y reintentar hasta éxito.

---

## ERRORES GRAVES

### 5. Sesión expirada: doble capa sin política clara

**Qué pasa:** Middleware solo comprueba existencia de cookie; no valida JWT. Si alguna llamada no usa `secureFetch`, un 401 puede no redirigir a login y dejar la UI incoherente.

**Solución:** Centralizar llamadas autenticadas en `secureFetch`; opcionalmente en middleware validar JWT (exp) para evitar flash de contenido protegido.

---

### 6. Estados de pago ambiguos para el usuario

**Qué pasa:** Varios estados (pending, under_review, approved) y suscripción (TRIAL, PENDING_PAYMENT, ACTIVE, GRACE_PERIOD, SUSPENDED). Si la UI no refresca tras aprobación, el usuario sigue viendo "Pendiente" o "Plan Free".

**Solución:** Documentar máquina de estados (ya existe `docs/MAQUINA_ESTADOS_PAGO.md`). Tras aprobar pago en admin, disparar invalidación de caché y que el front de pagos y el badge (TrialHeaderBadge) refresquen; ya se escucha `subscription-updated` y `focus` para refrescar.

---

### 7. Mostrar "Plan Free – XX días" después de pagar (CORREGIDO)

**Estado:** **Resuelto.** Usuarios con plan activo ven badge verde "Suscripción activa" con mensaje de confianza. Revisar que el backend devuelva correctamente `plan: "pro"` o `"premium"` y `status` coherente para no mostrar trial por caché o demora.

---

### 8. Errores silenciosos en carga de datos

**Qué pasa:** En pagos y otras pantallas, el `catch` de `loadData` solo hace `console.error`; el usuario no ve mensaje ni opción de reintentar.

**Solución:** En cargas críticas, en `catch` setear estado de error y mostrar en UI mensaje + "Reintentar"; usar toast para errores de acción (guardar, enviar).

---

## MEJORAS DE ESCALABILIDAD

### 9. Dashboard: 200 facturas en memoria

**Qué pasa:** `api.getInvoices(1, 200)` para estadísticas; con 1.000+ facturas por usuario, tiempo y memoria suben.

**Solución:** Endpoint de "stats del dashboard" con agregaciones en BD; lista reciente con paginación real (ej. 20 por página) y "Cargar más".

---

### 10. Concurrencia NCF y facturas

**Qué pasa:** `getNextNcf` usa transacción; hay que asegurar que no existan otros paths que creen facturas sin transacción y que no haya duplicados de NCF.

**Solución:** Revisar que toda creación de factura use la misma transacción (reserva NCF + creación Invoice). Índices únicos donde aplique.

---

### 11. Colas para jobs pesados

**Qué pasa:** Emails, reportes 606/607, procesamiento de webhooks en el mismo proceso; un pico puede saturar.

**Solución:** Cola (Bull/BullMQ con Redis o equivalente) para envío de correos y procesamiento pesado; no bloquear la respuesta HTTP.

---

### 12. ¿Se rompería con 1.000 clientes?

**Dónde puede colapsar primero:**
- **Base de datos:** Dashboard sin agregaciones; listas sin paginación (facturas, pagos admin, usuarios).
- **Backend:** Un solo proceso Node; jobs pesados en el mismo proceso.
- **Storage:** Comprobantes de pago e imágenes; revisar límites y política de retención.
- **Reportes 606/607:** Generación síncrona de archivos grandes por usuario/mes; considerar cola o workers.

**Acciones:** Stats por agregación; paginación real; índices por `userId`, `requestedAt`, `status`; colas para emails y reportes; cache (Redis) para `/api/subscription/status` con TTL corto (ej. 1 min).

---

## QUICK WINS

1. **Redirect post-login:** Leer `?redirect=` en login y redirigir (sanitizado). Alto impacto en fluidez.
2. **Toast en errores de carga:** En pagos y dashboard, en `catch` de `loadData` mostrar `toast.error("No pudimos cargar los datos. Reintenta.")` y botón Reintentar.
3. **Referencia LEX:** Pasar a 6–8 dígitos o formato con más entropía; índice único en referencia. Bajo esfuerzo, evita colisiones.
4. **Webhook PayPal:** Conectar `api/routes/webhooks.js` a MongoDB (mismos modelos que el resto del API); cuando actives PayPal en producción, ya estará alineado.

---

## Auditoría de botones y acciones (resumen)

- **Resumen ITBIS:** Corregido; abre modal con datos del periodo.
- **607 / 606:** Botones de descarga con flujo de pre-validación y descarga; verificar que no haya loaders infinitos ni doble clic sin feedback.
- **Regla:** Cada click debe provocar algo visible (navegación, modal, descarga, toast). Si una acción no está lista: deshabilitar botón o mostrar "Próximamente" / tooltip.

---

## Auditoría de facturación dominicana (resumen)

- **Formatos 606 y 607:** Endpoints de validación y descarga existen; se usa `dgii-validator` para formato. Riesgo: rechazo contable si datos de gastos o facturas están incompletos o mal formateados.
- **ITBIS:** Cálculo en factura y en resumen del periodo; Resumen ITBIS en UI ya operativo.
- **NCF:** Secuencias por usuario y tipo; validación de tipo (B01/E31, B02/E32, etc.); transacción en asignación. Alertas de NCF bajo y por vencer.
- **Recomendación:** Revisar que todos los campos obligatorios para 606/607 estén siempre presentes y que la pre-validación se muestre clara al usuario antes de descargar.

---

## Auditoría de arquitectura de pagos (resumen)

- **Estados:** PaymentRequest (pending → under_review → approved | rejected); Subscription (TRIAL, PENDING_PAYMENT, ACTIVE, GRACE_PERIOD, SUSPENDED). Ver `docs/MAQUINA_ESTADOS_PAGO.md`.
- **Riesgos:** Webhooks no conectados a MongoDB; referencias con poca entropía; posible retraso o caché mostrando "Plan Free" tras pago (mitigado con badge "Suscripción activa" y eventos de actualización).
- **Datos bancarios:** Flujo de transferencia con referencia única, titular y documento; mensaje de validación por equipo (sin prometer automatización inexistente). Opción PayPal presente en UI; backend debe alinear webhooks con BD.

---

## Riesgo de apariencia "software pequeño"

- **Badge post-pago:** Corregido; se muestra "Suscripción activa" (verde) en lugar de "Plan Free – XX días".
- **Datos bancarios:** Rediseño con título formal, layout Banco/Titular/Documento/Cuenta, referencia en caja destacada y mensaje de confianza.
- **Textos y mensajes:** Revisar tono en toasts, errores y pantallas de pago para mantener lenguaje profesional.
- **Onboarding:** Evaluar que la primera experiencia refuerce confianza (no mensajes genéricos o informales).

---

## Seguridad mínima fintech

- **Endpoints:** Los que modifican datos usan `verifyToken`; admin con `verifyAdmin`. Revisar que no quede POST/PUT/DELETE sensible sin `verifyToken`.
- **Validación:** Sanitización en backend (sanitizeString, etc.) en bodies que toquen BD o envío de correo.
- **Webhooks:** Validar firma PayPal antes de procesar; no confiar en payload sin verificación.
- **Roles:** Comprobar que `verifyAdmin` aplique en todas las rutas bajo `/api/admin/*` sin bypass por query/param.

---

## Resumen ejecutivo

- **Crítico (ya hecho o pendiente):** Botón Resumen ITBIS (hecho); badge "Suscripción activa" (hecho); datos bancarios profesionales (hecho). Pendiente: redirect post-login, webhooks PayPal en MongoDB, referencias LEX con más entropía.
- **Grave:** Política clara de sesión (secureFetch + opcional validación JWT en middleware); feedback de errores en cargas; asegurar actualización de estado post-pago en toda la UI.
- **Escalabilidad:** Stats por agregación; paginación; colas para jobs pesados; cache de estado de suscripción.
- **Quick wins:** Redirect login, toasts de error en cargas, referencia LEX, conectar webhooks a BD.

Prioridad: **estabilidad y confianza** (redirect, pagos, feedback, percepción premium) antes de añadir más funcionalidades.
