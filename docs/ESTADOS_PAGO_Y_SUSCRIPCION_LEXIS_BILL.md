# Estados de pago y suscripción – Lexis Bill

Documentación del flujo de estados para soporte y desarrollo.

---

## PaymentRequest (solicitud de pago)

| Estado | Descripción |
|--------|-------------|
| **pending** | El usuario subió comprobante (transferencia) o indicó pago PayPal. Espera revisión. |
| **under_review** | Un admin está validando el comprobante. |
| **approved** | Pago aprobado; la suscripción se activa (status → ACTIVE). |
| **rejected** | Pago rechazado; el usuario puede crear una nueva solicitud. |

**Transiciones:**
- Usuario crea solicitud → `pending`.
- Admin abre revisión → puede quedar `under_review` (opcional).
- Admin aprueba → `approved` → se llama `activateSubscriptionFromPayment` y la suscripción pasa a ACTIVE.
- Admin rechaza → `rejected`.

---

## Subscription (suscripción del usuario)

| Estado | Descripción |
|--------|-------------|
| **TRIAL** | Período de prueba (días restantes). |
| **PENDING_PAYMENT** | Usuario tiene una solicitud de pago pendiente o en revisión. Esperando aprobación. |
| **ACTIVE** | Plan activo (Pro/Premium). Puede emitir facturas. |
| **GRACE_PERIOD** | Venció el periodo; se permite uso X días más (si aplica). |
| **SUSPENDED** | Bloqueado (ej. impago, cancelación). |
| **CANCELLED** | Cancelado (ej. por PayPal o admin). |

**Transiciones:**
- Usuario se registra → TRIAL.
- Usuario crea PaymentRequest (transferencia o PayPal) → PENDING_PAYMENT (si no había ya una pendiente).
- Admin aprueba pago → ACTIVE (y se actualiza currentPeriodEnd).
- Webhook PayPal BILLING.SUBSCRIPTION.ACTIVATED o PAYMENT.SALE.COMPLETED → ACTIVE.
- Webhook PayPal CANCELLED/EXPIRED → CANCELLED.
- Webhook PayPal SUSPENDED → SUSPENDED.
- Cron o lógica de vencimiento → GRACE_PERIOD y luego SUSPENDED si no renueva.

---

## Quién puede cambiar cada estado

| Acción | Quién |
|--------|--------|
| Crear PaymentRequest (pending) | Usuario (front) vía `POST /api/membership/request-payment`. |
| Aprobar / Rechazar pago | Admin (panel admin) vía endpoints de aprobación. |
| Activar suscripción tras pago | Backend (`activateSubscriptionFromPayment`) al aprobar o al recibir webhook PayPal. |
| Cancelar / Suspender por PayPal | Webhook `POST /api/webhooks/paypal` (BILLING.SUBSCRIPTION.CANCELLED, etc.). |

---

## Fuente de verdad

- **MongoDB:** modelos `PaymentRequest` y `Subscription`. Toda actualización debe hacerse en la API (nunca estado en memoria).
- **Webhooks PayPal:** ya conectados a MongoDB en `api/index.js` (verifyPayPalWebhook + paypalWebhookHandler). Usan `getOrCreateSubscription`, `activateSubscriptionFromPayment`, `updateSubscriptionStatus`.
