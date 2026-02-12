# Rediseño del flujo de confirmación de pago (Lexis Bill)

## Objetivo

Flujo **event-driven** con **confirmación inmediata** para que el usuario sienta: *"El sistema registró mi pago inmediatamente"*, no *"¿Será que esto se envió?"*.

---

## Cambios implementados

### 1. Trigger inteligente ("He realizado el pago")

- Al hacer clic se ejecuta: `upload_proof → create_payment_event → update_user_ui → notify_admin → lock_action`.
- El botón **desaparece** tras el éxito y se reemplaza por un **estado informativo**: "Pago reportado • En validación" (sin doble envío).

### 2. Feedback visual inmediato

- **Pantalla de tranquilidad**: tarjeta verde "✔ Pago reportado correctamente. Nuestro equipo lo validará en menos de 24 horas."
- Micro-animación de entrada (`animate-in fade-in`).
- El botón de acción se sustituye por el estado informativo (no se puede volver a enviar).

### 3. Historial actualizado al instante

- **API** `GET /api/payments/history`: devuelve todos los pagos del usuario (pendientes + aprobados) con `id`, `reference`, `amount`, `date`, `status`.
- Tras reportar el pago, se invalida la caché de historial y la página de pagos vuelve a cargar datos.
- En la tabla aparece de inmediato una **nueva fila** con estado **"Pendiente de validación"** (badge ámbar). Los aprobados siguen como "COMPLETADO".

### 4. Admin: nuevas solicitudes sin refrescar

- **Polling cada 20 segundos** en el panel de "Pagos Pendientes": las nuevas solicitudes aparecen en la lista sin que el admin tenga que refrescar.
- Mejora futura: WebSockets / Firebase / Supabase Realtime para actualización en tiempo real.

### 5. FAB oculto en pantallas de pago

- En la ruta **/pagos** se oculta el botón flotante (+) en móvil para no competir con "He realizado el pago" (modo concentración).

### 6. Claridad de estados en la UI

- Eliminada la contradicción "Comprobante cargado" + "Debes subir el comprobante": el mensaje obligatorio solo se muestra cuando aún no hay comprobante.
- Estados claros: **Pendiente de validación** vs **COMPLETADO**.

---

## Flujo de estados (backend)

Los estados de `PaymentRequest` se mantienen: `pending` → `approved` o `rejected`.  
La UI traduce:

- `pending` / `under_review` → "Pendiente de validación" (usuario y admin).
- `approved` → "COMPLETADO" (usuario) / procesado (admin).

---

## Eventos de backend

- Al crear la solicitud: `billingEventEmitter.emit('payment_uploaded', { userId, paymentId, ... })`.
- Opcional PRO: listener de `payment_uploaded` para notificación al admin (push/email): "New Payment Reported – User X, Plan Pro, RD$ 9,500".

---

## Mejoras PRO (recomendadas, no implementadas aún)

1. **Validación semi-automática con IA**  
   OCR sobre el comprobante para detectar monto, banco y referencia. Si coinciden con el plan, marcar como "Alta probabilidad de validación".

2. **Payment Intelligence en el Copilot**  
   Mensaje tipo: "Detectamos que reportaste un pago. Generalmente validamos en menos de 6 horas."

3. **Tiempo real en admin**  
   Sustituir polling por WebSockets o Supabase Realtime para que "Solicitudes pendientes" se actualice al instante.

---

## Corrección: pagos que no aparecían en admin

**Problema:** En admin, "Solicitudes pendientes de validación" podía mostrar "No hay pagos pendientes" aunque el usuario hubiera reportado un pago.

**Causa:** La consulta de `GET /api/admin/pending-payments` filtraba por comprobante válido (`$regex`, `$type: 'string'`) o PayPal. Cualquier caso límite (imagen muy grande, formato, etc.) hacía que el pago no apareciera.

**Solución:** La consulta se simplificó: se listan **todas** las solicitudes con `status` en `['pending', 'under_review']` y `requestedAt` en los últimos 90 días, sin filtrar por comprobante. Así toda solicitud creada con "He realizado el pago" aparece en el panel. La misma lógica se aplicó a alertas, stats y metrics de admin.

---

## Archivos tocados

- `api/index.js`: nuevo `GET /api/payments/history`; request-payment con log de creación; consultas de admin pending-payments/alerts/stats/metrics simplificadas (sin filtro por comprobante).
- `lib/api-service.ts`: `invalidatePaymentHistoryCache()` y su uso tras `requestMembershipPayment`.
- `components/MembershipConfig.tsx`: estado `paymentReportedState`, pantalla de tranquilidad, estado "Pago reportado • En validación", callback `onPaymentReported`, mensajes condicionados a comprobante/PayPal.
- `app/(protected)/pagos/page.tsx`: `onPaymentReported={loadData}`, historial con badge por estado, texto del empty state y de "Tu suscripción está segura".
- `app/(protected)/layout.tsx`: FAB oculto cuando `pathname === "/pagos"`.
- `app/admin/page.tsx`: polling cada 20 s para `fetchPayments()`.
