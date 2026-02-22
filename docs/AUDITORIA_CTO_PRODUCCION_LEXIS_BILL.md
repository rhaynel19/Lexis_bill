# Auditoría CTO — Lexis Bill (listo para producción)

**Fecha:** 2026  
**Alcance:** Código completo (API, app, components, lib).  
**Objetivo:** Decidir si el sistema puede salir al mercado sin dañar la reputación del producto.

---

## 🔥 Errores críticos que debían corregirse (y se corrigieron)

| # | Problema | Riesgo | Corrección aplicada |
|---|----------|--------|----------------------|
| 1 | **POST /api/tickets sin autenticación** — Aceptaba `userId` en body; cualquiera podía crear tickets a nombre de cualquier usuario. | 🔴 Crítico: suplantación, spam, abuso. | Añadido `verifyToken`; `userId` = `req.userId`; sanitización de `rnc`, `type`, `description`; validación mínima de descripción (≥10 caracteres). |
| 2 | **GET /api/expenses y GET /api/quotes sin paginación por defecto** — Sin `page`/`limit` devolvían toda la colección. | 🔴 Crítico: tiempo de respuesta y memoria con muchos registros. | Siempre paginado: `page` default 1, `limit` default 100 (max 500). Frontend actualizado para consumir `{ data, total, page, limit, pages }` (api-service devuelve `data` para compatibilidad). |
| 3 | **GET /api/documents y GET /api/customers sin límite** — Podían devolver miles de documentos/clientes. | 🟠 Alto: escalabilidad y latencia. | Documents: `.limit(limit)` con default 100 (max 500). Customers: `.limit(limit)` con default 500 (max 2000). |
| 4 | **POST /api/expenses sin sanitización** — `supplierName`, `supplierRnc`, `ncf`, `category` sin sanitizar; posible inyección o datos corruptos. | 🟠 Alto: integridad y seguridad. | Sanitización con `sanitizeString`; números acotados; validación de requeridos; fecha parseada de forma segura. |

---

## ⚠️ Problemas importantes antes de lanzar

### Seguridad

- **Roles y permisos:** Los endpoints `/api/admin/*` usan `verifyAdmin`; asegurar que la lista de admins (o el flag `isAdmin`) sea la fuente de verdad y no manipulable desde el cliente.
- **Sensibles en respuestas:** Revisar que en ningún endpoint se devuelva `password` o `hashedPassword` del usuario. La auditoría no encontró fugas; conviene una búsqueda explícita antes de lanzar.
- **Webhooks (PayPal):** Verificación de firma implementada; mantener `PAYPAL_WEBHOOK_ID` y secret configurados en producción.

### Flujo de usuario

- **“Registrar pago” en el listado de facturas:** Solo muestra toast “próximamente”. Si no se va a implementar en el corto plazo, considerar ocultar el botón o sustituirlo por un CTA a “Pagar” (suscripción) para no dar sensación de incompleto.
- **Plan Premium / Pago con tarjeta:** Marcados como “Próximamente”. Aceptable si el lanzamiento es solo con planes Free/Pro y PayPal; si se anuncia tarjeta, debe estar listo o no mostrarse.

### Base de datos y consistencia

- **Transacciones:** Factura, nota de crédito y duplicate ya usan transacciones MongoDB. Gastos, cotizaciones y clientes no; riesgo bajo pero recomendable usarlas si en el futuro se encadenan varias escrituras.
- **Idempotencia:** POST /api/invoices no usa idempotency-key. Con doble clic mitigado en front (disabled + isGenerating) y transacción en back el riesgo es bajo; para cobros o pagos futuros conviene idempotency-key.

---

## 🛠 Mejoras recomendadas (no bloqueantes)

1. **Logging en producción:** Sustituir `console.log` / `console.error` en rutas y componentes por el logger ya existente en API (`log.info`, `log.error`) y, en front, por un servicio que en producción envíe a Sentry o similar sin volcar detalles sensibles al cliente.
2. **Tipado TypeScript:** Reducir `any` en `api-service`, `nueva-factura/page`, componentes de facturación y admin; definir interfaces para respuestas de API y props. Mejora mantenibilidad y detección de errores.
3. **Paginación en UI:** Gastos y cotizaciones ya reciben datos paginados; las pantallas podrían mostrar “Cargar más” o paginador cuando `total > limit` para no cargar todo de golpe.
4. **Validación de cliente en duplicate:** El endpoint “Facturar de nuevo” comprueba que exista Customer o `clientName` en la factura; si el CRM se vuelve la fuente de verdad, podría exigirse que el cliente siga existiendo en Customer.
5. **Sanitización centralizada:** Mantener y reutilizar `sanitizeString`, `sanitizeEmail`, `sanitizeItems` en todos los endpoints que reciban input de usuario.

---

## 💎 Quick wins (percepción premium)

- **Errores amigables:** En pantallas críticas (login, emitir factura, pagos), mostrar mensajes claros y sugerencias (ej. “¿Olvidaste tu contraseña?” o “Revisa tu conexión”) en lugar de solo “Error”.
- **Loading y estados:** Ya hay buenos usos de `isGenerating` / `isLoading`; revisar que en “Facturar de nuevo”, “Anular”, “Descargar PDF” y “Enviar WhatsApp” el usuario vea siempre un estado de carga o deshabilitado mientras se procesa.
- **Empty states:** En listados vacíos (facturas, gastos, cotizaciones, clientes), mensajes y CTAs claros (“Crea tu primera factura”, “Añade un gasto”) mejoran la sensación de producto acabado.
- **Banner “Facturar de nuevo”:** Ya implementado; refuerza confianza al dejar claro que se está reutilizando una factura y que se asignará nuevo NCF.

---

## 🏗 Arquitectura y escalabilidad

- **¿Se rompería con 100 clientes?** No. Con índices por `userId`, transacciones en NCF/factura/nota de crédito y paginación por defecto en listados, el sistema aguanta bien.
- **¿Se rompería con 1.000?** Depende del uso por usuario. Los cuellos de botella probables son: (1) listados sin techo (ya mitigado con límites), (2) GET /api/invoices con `limit` 500 por página, (3) carga del dashboard (varias agregaciones). Recomendación: mantener límites, monitorear tiempos de respuesta de agregaciones y, si crece el volumen, considerar caché de resúmenes (p. ej. dashboard).
- **Dónde colapsaría primero:** Agregaciones pesadas en dashboard o reportes 606/607 con rangos de fechas muy grandes; y, si muchos usuarios suben documentos grandes, almacenamiento y ancho de banda. No se detectaron queries sin índice en filtros por usuario.

---

## 🔐 Seguridad mínima obligatoria (resumen)

| Aspecto | Estado | Clasificación |
|---------|--------|----------------|
| POST /api/tickets sin auth | Corregido (verifyToken + userId del token) | Antes 🔴 Crítico |
| Endpoints de negocio sin verifyToken | Ninguno (salvo health, webhooks, auth, RNC, planes, cron con CRON_SECRET) | ✅ |
| Ownership (userId en queries) | Revisado; recursos de usuario siempre filtrados por `req.userId` | ✅ |
| Sanitización de inputs | Aplicada en registro, login, facturas, cotizaciones, tickets, gastos; reforzar en cualquier endpoint nuevo | 🟡 Medio si se añaden rutas sin sanitizar |
| Inyección / NoSQL | Uso de Mongoose y sanitización reduce riesgo; no hay concatenación cruda de input en queries | ✅ |
| Roles admin | verifyAdmin en /api/admin/*; asegurar que isAdmin no sea editable por el cliente | 🟡 Medio |

---

## 📈 Experiencia de usuario antes de lanzar

- **Profesionalismo:** Diseño y flujos coherentes; documentación interna (auditorías, procesos) ayuda a mantener estándares.
- **Confianza:** Mensajes claros en facturación (NCF, nota de crédito, “Facturar de nuevo”), validaciones y avisos fiscales refuerzan confianza.
- **Estabilidad:** Manejo de errores con toast, estados de carga y transacciones en operaciones críticas reducen sorpresas.
- **Incompleto / amateur:** Puntos a vigilar: botón “Registrar pago” sin implementar, “Próximamente” en Premium/tarjeta, y `console.*` en producción. No son bloqueantes si el lanzamiento es acotado (Free/Pro + PayPal) y se planifica la evolución.

---

## 🏁 Veredicto final

### ¿Está listo para producción?

**Sí, con condiciones.**  
El sistema puede recibir clientes si:

- El lanzamiento se limita a los flujos ya implementados (registro, login, facturación e-CF, gastos 606, cotizaciones, suscripción/pago con PayPal, notas de crédito, “Facturar de nuevo”, documentos, configuración).
- No se anuncia como disponible: “Registrar pago” por factura, plan Premium, o pago con tarjeta, hasta que estén implementados.
- En producción se usan variables de entorno correctas (JWT, MongoDB, PayPal, webhooks), sin credenciales en el código.

### Si no se hubieran aplicado las correcciones, las 5 cosas que había que arreglar antes:

1. **POST /api/tickets** — Añadir autenticación y no confiar en `userId` del body.  
2. **Paginación por defecto** — En expenses, quotes, documents y customers para evitar listas ilimitadas.  
3. **POST /api/expenses** — Sanitizar y validar inputs.  
4. **Límites en documents y customers** — Evitar devolver miles de registros sin tope.  
5. **Revisión de todos los endpoints** — Confirmar que no quede ningún otro sin auth o sin validación de ownership.

### Quick wins que más aumentarían la percepción premium

- Sustituir `console.*` por logger/Sentry en producción.  
- Empty states y mensajes de error amigables en pantallas clave.  
- Ocultar o reemplazar el botón “Registrar pago” por un CTA claro (“Gestionar suscripción” o “Pagar”) hasta que exista la funcionalidad.

### Qué parte del sistema preocupa más como CTO

- **Cumplimiento fiscal y unicidad NCF:** La lógica de NCF (getNextNcf, transacciones, índices únicos) es crítica; cualquier bug puede generar duplicados o saltos. Mantener tests o comprobaciones periódicas de unicidad y rangos.  
- **Pagos y webhooks:** Flujo de PayPal y reconciliación con suscripciones; asegurar que los estados (ACTIVE, PAST_DUE, etc.) y el bloqueo de facturación estén alineados con la documentación y que no se permita facturar con cuenta suspendida.  
- **Escalabilidad del dashboard:** Con muchos usuarios y muchas facturas, las agregaciones pueden volverse lentas; planificar métricas y, si hace falta, caché o pre-agregados.

---

*Auditoría realizada sobre el código actual; correcciones aplicadas en api/index.js y lib/api-service.ts según se detalla en la sección de errores críticos.*
