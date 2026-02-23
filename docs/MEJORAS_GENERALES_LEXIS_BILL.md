# Mejoras generales – Lexis Bill

Resumen de **qué se puede mejorar** en la aplicación (páginas, flujos, técnica y UX). Sirve como hoja de ruta y checklist.

---

## Crítico (estabilidad y negocio)

| Mejora | Descripción |
|--------|-------------|
| **Redirect post-login** | Si el usuario entra a una ruta protegida (ej. `/nueva-factura`) y se le manda a login, tras iniciar sesión debe volver a esa ruta, no siempre al dashboard. Hoy el login no usa `?redirect=`. |
| **Webhooks PayPal ↔ MongoDB** | Los webhooks de PayPal no están conectados a la BD real; usan estado en memoria. Un pago aprobado no activa la suscripción en la base de datos. |
| **Referencia de pago LEX-XXXX** | Solo 9.000 valores posibles; riesgo de colisión. Usar más dígitos o formato con más entropía y garantizar unicidad en BD. |
| **Sesión y 401** | Centralizar llamadas API en un cliente que ante 401 redirija a login con mensaje claro; evitar que queden `fetch` directos sin manejo de sesión expirada. |

---

## Por página / módulo

### Landing y registro
- Mensaje claro de valor (qué es Lexis Bill, para quién, beneficio fiscal).
- Prueba social o casos de uso (ej. “Factura en menos de 2 minutos”).
- Registro: ya hay checkbox de políticas; asegurar que el flujo de aceptar políticas al actualizar esté visible si aplica.

### Login
- Leer `?redirect=` y redirigir ahí tras login (sanitizado).
- Opción “Recordarme” / persistencia de sesión configurable.
- Enlace visible a “¿Olvidaste tu contraseña?”.

### Dashboard
- **Carga:** Hoy se piden hasta 200 facturas para calcular todo; con muchos datos se vuelve lento. Crear endpoint de estadísticas (agregaciones en BD) y dejar la lista “recientes” paginada (ej. 20).
- Errores de carga: mostrar mensaje al usuario y botón “Reintentar”, no solo `console.error`.
- Tarjetas y KPIs que dependan de datos reales (no estáticos).
- Bloque “Facturar a cliente frecuente” ya implementado; mantener y revisar si conviene más de 5.

### Nueva factura
- Errores al cargar clientes/plantillas: toast o mensaje en UI + Reintentar.
- Evitar doble envío: botón deshabilitado + “Procesando…” mientras se emite.
- Posible atajo “Duplicar última factura” desde el listado (ya existe clonar desde dashboard).
- Guardado de borrador: ya existe; asegurar que no se pierda al cerrar por error.

### Clientes
- Banner y orden por última factura ya implementados.
- Filtros por “con factura en el mes” o “sin facturar hace X tiempo” (opcional).
- Exportar lista a CSV (complementa la importación).

### Gastos 606
- Ver **docs/MEJORAS_GASTOS_606.md** (forma de pago, validación y suplidores frecuentes ya hechos).
- Pendiente: filtros por periodo/categoría, editar gasto, guardar comprobante, tarjetas con datos reales, importación masiva.

### Reportes (606/607)
- En `loadSummary` y descargas: si falla la API, mostrar mensaje y “Reintentar” (no solo en consola).
- Recordatorio por email ya existe; opcional: recordatorio in-app (“Te queda presentar el 606 de febrero”).
- Breve texto de ayuda: “Sube este archivo en la Oficina Virtual DGII” con enlace a DGII si aplica.

### Pagos
- Errores al cargar estado de suscripción/pagos: toast + Reintentar.
- Dejar claro qué pasa tras “He realizado el pago” (revisión manual, tiempo estimado).
- Si se integra Stripe: mismo flujo de estados y mensajes claros (pendiente, aprobado, fallido).

### Configuración
- Bloqueo con “Modificar” ya implementado (logo, sello, NCF, datos).
- Opcional: vista previa del comprobante con los datos actuales (nombre fiscal, logo).
- Enlace a “Documentos legales” y ayuda contextual donde aplique.

### Ayuda y documentos
- Manual PDF y Centro de Ayuda ya existen.
- Enlace único desde el menú o footer a “Ayuda” y “Términos / Privacidad”.

---

## UX general

- **Loaders:** Donde haya acción que tarde (guardar factura, guardar gasto, descargar 606), botón en estado de carga (spinner + “Procesando…”) y deshabilitado para evitar doble clic.
- **Toasts:** Usar toast para éxito y también para error en acciones (guardar, enviar, descargar). En cargas iniciales, estado de error en pantalla + “Reintentar”.
- **Confirmaciones:** En acciones destructivas (eliminar gasto, anular factura) mantener confirmación explícita.
- **Móvil:** Revisar que formularios largos (nueva factura, gastos) se usen bien en pantalla pequeña (scroll, teclado, botones accesibles).
- **Accesibilidad:** Labels en inputs, contraste, y que los flujos principales se puedan usar con teclado.

---

## Técnico y seguridad

- **Transacciones:** Toda creación de factura (y flujos que toquen NCF + Invoice + Customer) dentro de una transacción en BD.
- **Webhooks:** Conectar PayPal (y en el futuro Stripe) a los modelos reales (MongoDB); validar firma del webhook.
- **Logging:** En backend, en `catch` importantes usar logger con contexto (sin datos fiscales en claro). En front, errores críticos a Sentry (o similar).
- **Validación y sanitización:** Mantener sanitización en todos los body que toquen BD o envío de correo; revisar que no quede ningún POST/PUT/DELETE sensible sin `verifyToken`.
- **Estados de pago:** Documentar en código o en un doc el flujo: pending → under_review → approved/rejected y cómo se mapea a Subscription (TRIAL, ACTIVE, SUSPENDED, etc.).

---

## Quick wins (poco esfuerzo, buen impacto)

1. **Redirect post-login:** Leer `?redirect=` en login y redirigir ahí tras éxito (ruta interna sanitizada).
2. **Toasts en errores de carga:** En pagos, reportes y dashboard, en el `catch` de las cargas mostrar `toast.error("No pudimos cargar. Reintenta.")` y botón Reintentar en UI.
3. **Referencia LEX-XXXX:** Aumentar entropía (6–8 dígitos o formato con timestamp) e índice único en BD.
4. **Documentar estados de pago:** Un comentario o doc corto con el grafo de estados (pago y suscripción) para el equipo y para soporte.
5. **Filtros en Gastos 606:** Hacer que el botón “Filtros” permita filtrar por mes/año y por categoría DGII.

---

## Resumen por prioridad

| Prioridad | Enfoque |
|-----------|---------|
| **Alta** | Redirect login, webhooks PayPal con BD, referencias de pago únicas, errores visibles (toast/UI) en cargas críticas. |
| **Media** | Dashboard con stats por API (no 200 facturas), filtros en gastos, editar gasto, guardar comprobante en gastos, paginación en listas. |
| **Baja** | Exportar clientes CSV, recordatorio in-app 606/607, colas para emails, documentación interna de estados. |

---

*Documento de referencia. Para detalles por módulo: ver también AUDITORIA_TECNICA_LEXIS_BILL.md y MEJORAS_GASTOS_606.md.*
