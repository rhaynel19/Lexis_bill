# Arquitectura del Sistema de Billing — Lexis Bill

## 🎯 Objetivo

Sistema de billing:
- ✅ Resistente a fallos
- ✅ Sin desincronizaciones
- ✅ Automático
- ✅ Auditable
- ✅ Fácil de escalar
- ✅ Difícil de romper

---

## 🔵 1. MODELO MENTAL (MUY IMPORTANTE)

### ❌ NO pensar:
"¿Pagó el usuario?"

### ✅ SÍ pensar:
"¿Cuál es el estado financiero REAL del cliente?"

### 🔥 Entidad Principal: `Subscription`

**La suscripción es la fuente de verdad.** Nunca derivar la suscripción desde pagos.

**Estados profesionales:**
- `TRIAL` - Período de prueba (15 días)
- `ACTIVE` - Activa y pagada
- `GRACE_PERIOD` - Período de gracia (5 días después de vencimiento)
- `PAST_DUE` - Vencida sin gracia
- `PENDING_PAYMENT` - Esperando pago
- `UNDER_REVIEW` - Pago en revisión
- `SUSPENDED` - Suspendida (bloqueada)
- `CANCELLED` - Cancelada

---

## 🔵 2. Estructura de Base de Datos

### Tabla: `subscriptions` (Fuente de Verdad)

```javascript
{
    userId: ObjectId (unique),
    plan: 'free' | 'pro' | 'premium',
    status: 'TRIAL' | 'ACTIVE' | 'GRACE_PERIOD' | 'PAST_DUE' | 'PENDING_PAYMENT' | 'UNDER_REVIEW' | 'SUSPENDED' | 'CANCELLED',
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    graceUntil: Date | null,
    createdAt: Date,
    updatedAt: Date
}
```

**Índices:**
- `userId` (unique)
- `status`
- `currentPeriodEnd`
- `graceUntil`

### Tabla: `payments` (PaymentRequest)

```javascript
{
    userId: ObjectId,
    subscriptionId: ObjectId (opcional),
    plan: 'free' | 'pro' | 'premium',
    billingCycle: 'monthly' | 'annual',
    paymentMethod: 'transferencia' | 'paypal',
    status: 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'FAILED',
    reference: String,
    comprobanteImage: String (opcional),
    createdAt: Date,
    processedAt: Date,
    processedBy: ObjectId
}
```

**Estados:**
- `PENDING` - Pendiente de revisión
- `UNDER_REVIEW` - En revisión por admin
- `APPROVED` - Aprobado (activa suscripción)
- `REJECTED` - Rechazado
- `FAILED` - Fallido

### Tabla CRÍTICA: `billing_events` 🔥

**Esta tabla permite reconstruir TODO si algo falla.**

```javascript
{
    type: String, // subscription_created, payment_approved, subscription_activated, etc.
    userId: ObjectId,
    subscriptionId: ObjectId (opcional),
    paymentId: ObjectId (opcional),
    payload: Mixed, // Datos completos del evento
    createdAt: Date
}
```

**Tipos de eventos:**
- `subscription_created`
- `subscription_activated`
- `subscription_grace_started`
- `subscription_suspended`
- `subscription_cancelled`
- `payment_uploaded`
- `payment_approved`
- `payment_rejected`
- `payment_failed`
- `period_renewed`
- `plan_changed`
- `reconciliation_performed`

**Índices:**
- `userId` + `createdAt` (desc)
- `type` + `createdAt` (desc)
- `subscriptionId`
- `paymentId`

---

## 🔴 3. La Regla de Oro

### ❗ NUNCA ACTUALICES MUCHAS COSAS A LA VEZ

**Usa eventos desacoplados.**

### ❌ NO hacer esto:
```javascript
// Actualizar todo manualmente
update subscription
update counters
update UI
send email
```

### ✅ SÍ hacer esto:
```javascript
// Emitir evento
await billingEventEmitter.emit('payment_approved', payload);

// Los listeners manejan el resto automáticamente:
→ activate_subscription
→ send_invoice
→ update_metrics
→ log_event
```

**Sistema desacoplado = sistema estable.**

---

## 🔵 4. Motor Automático (Jobs)

### Job 1 — Grace Manager
**Frecuencia:** Cada hora (ejecutado en `/api/cron/reconcile`)

```javascript
if now > currentPeriodEnd && status === 'ACTIVE'
→ status = 'GRACE_PERIOD'
→ graceUntil = now + 5 días
```

### Job 2 — Suspension Guard
**Frecuencia:** Cada hora (ejecutado en `/api/cron/reconcile`)

```javascript
if now > graceUntil && status === 'GRACE_PERIOD'
→ status = 'SUSPENDED'
```

### Job 3 — Payment Reconciler 🔥
**Frecuencia:** Cada 15 minutos (ejecutado en `/api/cron/reconcile`)

```javascript
if payment.status === 'APPROVED' && subscription.status !== 'ACTIVE'
→ reparar()
→ activateSubscriptionFromPayment()
```

**Este job te salva de TODO.** Detecta y corrige inconsistencias automáticamente.

---

## 🔵 5. Middleware Inteligente (Anti-Errores)

### NO redirigir de forma agresiva. Usar niveles de acceso.

#### FULL ACCESS:
- `ACTIVE`
- `TRIAL`

**Puede hacer todo:** Emitir facturas, crear clientes, generar reportes.

#### LIMITED ACCESS:
- `GRACE_PERIOD`
- `UNDER_REVIEW`
- `PENDING_PAYMENT`

**Puede ver facturas existentes, pero NO emitir nuevas.**

#### BLOCKED:
- `SUSPENDED`
- `CANCELLED`
- `PAST_DUE`

**Solo redirige aquí.** Acceso completamente bloqueado.

### Implementación:

```javascript
// Middleware verifica acceso y agrega req.accessLevel
verifyToken → req.accessLevel = 'FULL' | 'LIMITED' | 'BLOCKED'

// Endpoints pueden requerir acceso completo
requireFullAccess → solo permite 'FULL'
```

---

## 🔵 6. El Error MÁS común que debes evitar

### ❌ Depender del frontend para estados

**El backend debe decidir TODO.** El frontend solo muestra.

**Siempre consultar `/api/subscription/status` antes de tomar decisiones críticas.**

---

## 🔥 7. Anti Desincronización (Nivel PRO)

### Endpoint interno de reparación:

```
POST /api/admin/repair-user-billing/:userId
```

**Hace:**
1. Recalcular suscripción desde fuente de verdad
2. Buscar pagos aprobados
3. Reparar estado si hay inconsistencia
4. Limpiar cache
5. Regenerar permisos

**Esto te evita horas de soporte.**

---

## 🔵 8. UX que Reduce Cancelaciones (esto es dinero 💰)

### En vez de bloquear brutalmente:

**Mostrar mensajes claros:**

- **GRACE_PERIOD:** "Tu plan venció, pero tienes X días para regularizarlo sin perder tu información."
- **PENDING_PAYMENT:** "Tu pago está siendo revisado. Tendrás acceso completo una vez aprobado."
- **SUSPENDED:** "Tu cuenta está suspendida. Regulariza tu pago para continuar."

**El miedo cancela. La calma paga.**

---

## 🔥 9. ALERTAS AUTOMÁTICAS (Muy SaaS)

### Debes saber cuando algo se rompe ANTES que el cliente.

**Triggers de alertas:**

1. **Pago aprobado sin activar suscripción**
   - Tipo: `payment_approved_no_activation`
   - Severidad: `critical`

2. **Usuario suspendido con pago reciente**
   - Tipo: `suspended_with_recent_payment`
   - Severidad: `warning`

3. **Gracia expirada**
   - Tipo: `grace_period_expired`
   - Severidad: `warning`

4. **Contador ≠ query real**
   - Ya implementado en `/api/admin/alerts`

### Endpoint:
```
GET /api/admin/billing-alerts
```

---

## 🔵 10. Métrica que debes mirar siempre

### 💡 Billing Health Score

**Fórmula:**
```
Health Score = (Pagos consistentes / Pagos aprobados) * 100
```

**Si baja de 98% → INVESTIGAR.**

### Endpoint:
```
GET /api/admin/billing-health
```

**Retorna:**
- `healthScore`: Porcentaje (0-100)
- `isHealthy`: Boolean (>= 98%)
- `metrics`: Detalles de pagos
- `alerts`: Cantidad de alertas activas
- `recommendation`: Mensaje de recomendación

---

## 📋 Endpoints Principales

### Usuario:
- `GET /api/subscription/status` - Estado de suscripción (fuente de verdad)
- `POST /api/payment/request` - Crear solicitud de pago

### Admin:
- `POST /api/admin/reconcile` - Reconciliación manual (ejecuta todos los jobs)
- `POST /api/admin/repair-user-billing/:userId` - Reparar billing de usuario específico
- `GET /api/admin/billing-alerts` - Obtener alertas automáticas
- `GET /api/admin/billing-health` - Health score del sistema

### Cron:
- `POST /api/cron/reconcile` - Ejecución automática (cada 15 minutos)
  - Requiere header: `x-cron-secret` o body: `{ secret: CRON_SECRET }`

---

## 🔄 Flujo de Aprobación de Pago

1. **Usuario sube pago:**
   ```
   POST /api/payment/request
   → Crea PaymentRequest (status: 'pending')
   → Actualiza Subscription (status: 'PENDING_PAYMENT')
   → Emite evento: 'payment_uploaded'
   ```

2. **Admin aprueba:**
   ```
   POST /api/admin/approve-payment/:id
   → Actualiza PaymentRequest (status: 'approved')
   → Emite evento: 'payment_approved'
   ```

3. **Listener automático:**
   ```
   'payment_approved' listener
   → activateSubscriptionFromPayment()
   → Actualiza Subscription (status: 'ACTIVE')
   → Emite evento: 'subscription_activated'
   ```

4. **Listener de activación:**
   ```
   'subscription_activated' listener
   → Envía email de confirmación (si configurado)
   ```

**Todo desacoplado. Si algo falla, los eventos permiten reconstruir el estado.**

---

## 🛠️ Migración Automática

El sistema crea automáticamente una `Subscription` si no existe cuando:
- Se consulta `/api/subscription/status`
- Se ejecuta `getOrCreateSubscription(userId)`

**Esto permite migración gradual sin downtime.**

---

## 🔐 Variables de Entorno Requeridas

```env
CRON_SECRET=change-me-in-production  # Para proteger /api/cron/reconcile
MONGODB_URI=mongodb://...
JWT_SECRET=...
```

---

## 📊 Monitoreo Recomendado

1. **Health Score:** Revisar diariamente
2. **Alertas:** Revisar cada hora
3. **Billing Events:** Revisar semanalmente para detectar patrones
4. **Reconciliación:** Ejecutar manualmente si hay sospechas

---

## 🚀 Próximos Pasos

1. ✅ Implementar sistema de eventos
2. ✅ Crear jobs automáticos
3. ✅ Middleware con niveles de acceso
4. ✅ Sistema de alertas
5. ✅ Health score
6. ⏳ Dashboard de métricas en admin
7. ⏳ Notificaciones push para alertas críticas
8. ⏳ Exportación de eventos para análisis

---

**Última actualización:** 2026-02-08
