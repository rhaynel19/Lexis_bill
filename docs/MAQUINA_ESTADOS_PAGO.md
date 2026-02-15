# Máquina de estados – Pagos y suscripción

Documentación del flujo de estados para evitar ambigüedades y garantizar una única fuente de verdad (MongoDB).

---

## PaymentRequest (solicitud de pago)

Flujo lineal: el usuario sube comprobante o elige PayPal; admin revisa y aprueba o rechaza.

```
pending  →  under_review  →  approved  |  rejected
   ↑              ↑
   |              └── Admin abre la solicitud (opcional, según implementación)
   └── Usuario envía comprobante o confirma PayPal (POST /api/membership/request-payment)
```

- **pending:** Solicitud creada; esperando revisión del admin.
- **under_review:** (Opcional) Admin está validando el comprobante.
- **approved:** Pago aceptado; dispara activación de suscripción (Subscription → ACTIVE).
- **rejected:** Pago rechazado; el usuario puede crear una nueva solicitud.

**Quién cambia el estado:**
- `pending`: front al llamar `request-payment`.
- `under_review` / `approved` / `rejected`: solo admin (approve-payment, reject-payment).

---

## Subscription (estado de la suscripción del usuario)

Fuente de verdad: colección `Subscription` en MongoDB. Sincronización legacy con `User.subscription` y `User.expiryDate` al activar desde pago.

```
TRIAL  →  PENDING_PAYMENT  →  ACTIVE  →  GRACE_PERIOD  →  SUSPENDED
   |             |              |             |                |
   |             |              |             |                └── Bloqueado (sin acceso)
   |             |              |             └── Venció; X días de gracia
   |             |              └── Plan activo (currentPeriodEnd vigente)
   |             └── Usuario creó solicitud de pago (pending/under_review)
   └── Recién registrado; 15 días de trial
```

- **TRIAL:** Usuario nuevo; 15 días de trial.
- **PENDING_PAYMENT:** Usuario tiene una solicitud de pago (PaymentRequest) en `pending` o `under_review`.
- **ACTIVE:** Pago aprobado o webhook PayPal; plan activo hasta `currentPeriodEnd`.
- **GRACE_PERIOD:** Pasó `currentPeriodEnd`; se da un período de gracia (ej. 5 días) antes de suspender.
- **SUSPENDED:** Sin acceso hasta que regularice (nuevo pago aprobado o admin).

**Quién cambia el estado:**
- **TRIAL → PENDING_PAYMENT:** al crear `PaymentRequest` (request-payment).
- **PENDING_PAYMENT → ACTIVE:** admin aprueba pago (`approve-payment`) o webhook PayPal (`/api/webhooks/paypal`).
- **ACTIVE → GRACE_PERIOD:** cron o job cuando `currentPeriodEnd` pasó (si aplica lógica de gracia).
- **ACTIVE / GRACE_PERIOD → SUSPENDED:** cron o admin cuando se agota la gracia o por política.
- **CANCELLED / EXPIRED:** webhook PayPal (suscripción cancelada o expirada).

---

## Referencias

- **API:** `api/index.js` — `PaymentRequest`, `Subscription`, `getOrCreateSubscription`, `updateSubscriptionStatus`, `activateSubscriptionFromPayment`.
- **Webhooks:** `POST /api/webhooks/paypal` — actualiza solo MongoDB (Subscription); no usa servicio en memoria.
- **Front:** Estado de suscripción vía `GET /api/subscription/status` (cache invalidable).
