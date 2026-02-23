# Puntos a trabajar – Lexis Bill en su punto óptimo

Lista priorizada de tareas para dejar la aplicación estable, confiable y escalable. Marcar conforme se complete.

---

## Fase 1: Crítico (estabilidad y confianza)

- [x] **1. Redirect post-login**  
  En `app/(public)/login/page.tsx`: leer `searchParams.get("redirect")`, sanitizar (solo rutas internas) y después del login exitoso redirigir a esa ruta en lugar de siempre a `/dashboard`.

- [x] **2. Errores de carga visibles**  
  En **Pagos**, **Reportes** y **Dashboard**: en el `catch` de las funciones que cargan datos, hacer `toast.error("No pudimos cargar. Reintenta.")` y mostrar en UI un mensaje + botón **Reintentar** (no solo `console.error`).

- [x] **3. Referencia de pago única**  
  Cambiar la generación de referencia tipo `LEX-XXXX` a más entropía (ej. 6–8 dígitos o `LEX-` + timestamp/random). Asegurar índice único en `PaymentRequest.reference` y reintentar si hay colisión.

- [ ] **4. Webhooks PayPal ↔ MongoDB**  
  Conectar los webhooks de PayPal a la API principal: usar los mismos modelos `Subscription` y `PaymentRequest` de MongoDB (no estado en memoria). Validar firma del webhook y extraer `userId` de forma fiable. Si aún no usas PayPal en producción, dejarlo listo para cuando lo actives.

- [x] **5. Sesión y 401**  
  Revisar que todas las llamadas a `/api/*` desde el front usen el cliente que maneja 401 (ej. `secureFetch`). Ante 401, redirigir a login con `?redirect=` y mensaje claro. No dejar `fetch` directos sin manejo de sesión expirada.

---

## Fase 2: Importante (UX y datos)

- [ ] **6. Dashboard: estadísticas sin cargar 200 facturas** *(ya usa getDashboardStats y 50 facturas; paginación opcional)*  
  Crear endpoint (ej. `GET /api/dashboard/stats`) que devuelva totales del mes, pendientes, clientes únicos, etc. usando agregaciones en MongoDB. En el dashboard, usar ese endpoint para las tarjetas y cargar la lista de facturas recientes paginada (ej. 20 por página).

- [x] **7. Evitar doble envío en acciones críticas**  
  En **Nueva factura** (Confirmar y emitir), **Gastos** (Guardar), **Pagos** (He realizado el pago): botón en estado de carga (spinner + "Procesando…") y `disabled` hasta que termine la petición.

- [x] **8. Gastos 606: filtros funcionales**  
  El botón "Filtros" debe abrir opciones para filtrar por **mes/año** y por **categoría DGII**. Aplicar filtros a la lista y al total mostrado.

- [x] **9. Gastos 606: editar gasto**  
  Permitir editar un gasto ya guardado (modal o inline): suplidor, RNC, NCF, monto, ITBIS, categoría, fecha, forma de pago. Endpoint `PATCH /api/expenses/:id` y botón "Editar" en cada fila.

- [x] **10. Documentar estados de pago**  
  Doc corto (o comentarios en código) con el flujo: PaymentRequest (pending → under_review → approved/rejected) y Subscription (TRIAL, PENDING_PAYMENT, ACTIVE, GRACE_PERIOD, SUSPENDED). Qué transición hace el admin y qué el webhook.

---

## Fase 3: Mejoras que redondean

- [ ] **11. Gastos 606: guardar comprobante** *(pendiente: enviar imagen al backend)*  
  Al guardar un gasto, si el usuario subió foto/PDF en el modal, enviarla al backend (ej. base64 o almacenamiento) y guardar la referencia en el modelo (ej. `imageUrl` o documento asociado).

- [ ] **12. Gastos 606: tarjetas con datos reales**  
  "Salud Fiscal" y "Reporte 606 Pendiente" con datos reales: p. ej. % de gastos con datos completos, último periodo generado, enlace a descargar 606 de ese periodo.

- [x] **13. Reportes: mensaje si falla carga**  
  En la página de Reportes, si `loadSummary` o la descarga 606/607 fallan, mostrar mensaje en UI y botón Reintentar (además de toast si aplica).

- [ ] **14. Pagos: mensaje tras "He realizado el pago"**  
  Dejar claro que el pago será revisado manualmente y el tiempo aproximado de activación (ej. "En 24–48 h laborables").

- [x] **15. Logging y errores en backend**  
  En los `catch` importantes del API, usar el logger (p. ej. `log.error` / `log.warn`) con contexto, sin datos fiscales en claro. Opcional: reportar errores críticos del front a Sentry (o similar) con contexto acotado.

---

## Resumen por fases

| Fase   | Enfoque                          | Puntos      |
|--------|----------------------------------|-------------|
| **1**  | Estabilidad, login, pagos, 401  | 1 – 5       |
| **2**  | UX, datos, dashboard, gastos     | 6 – 10      |
| **3**  | Pulido, comprobantes, mensajes  | 11 – 15     |

---

## Orden sugerido de trabajo

1. **1** (redirect login) – rápido y muy visible.  
2. **2** (errores de carga) – en las 3 páginas indicadas.  
3. **3** (referencia pago) – evita colisiones.  
4. **6** (dashboard stats) – evita cuellos de botella con muchos datos.  
5. **4** (webhooks PayPal) – si vas a usar PayPal pronto.  
6. **5** (401 centralizado) – revisión de llamadas API.  
7. **7, 8, 9** (doble envío, filtros gastos, editar gasto).  
8. **10** (documentar estados).  
9. Resto según prioridad de negocio (11–15).

Cuando todos los puntos de Fase 1 y 2 estén hechos, Lexis Bill quedará en **punto óptimo** para uso serio y crecimiento. La Fase 3 refina experiencia y operación.
