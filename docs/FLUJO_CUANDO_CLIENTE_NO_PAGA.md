# ¿Qué pasa en la cuenta cuando el cliente no paga?

Resumen del flujo automático de la suscripción cuando el cliente **no renueva** o **no paga**.

---

## 1. Estados de la suscripción (orden del flujo)

| Estado            | Significado |
|-------------------|-------------|
| **TRIAL**         | Prueba inicial (plan gratis con límites). |
| **ACTIVE**        | Plan Pro activo; tiene acceso completo. |
| **GRACE_PERIOD**  | Período pagado ya venció; tiene **5 días de gracia** con acceso limitado. |
| **PAST_DUE**      | Pasó la gracia sin pagar; cuenta vencida. |
| **SUSPENDED**     | Cuenta suspendida por falta de pago (después de la gracia). |
| **PENDING_PAYMENT** | Reportó pago y está esperando validación (acceso limitado). |

---

## 2. Flujo cuando el cliente NO paga

1. **Plan Pro activo (ACTIVE)**  
   - El cliente usa la app con normalidad hasta que llega la fecha de fin de período (`currentPeriodEnd`).

2. **Se vence el período (no hay renovación)**  
   - Un **job automático (Grace Manager)** corre cada hora.  
   - Busca suscripciones con estado `ACTIVE` y `currentPeriodEnd` ya pasado.  
   - Las pasa a **GRACE_PERIOD** y les asigna **5 días de gracia** (`graceUntil` = hoy + 5 días).  
   - En la app el cliente ve un aviso tipo: *“Suscripción vencida. Tienes X días de gracia antes del bloqueo. Tienes acceso limitado hasta completar el pago.”*  
   - Sigue pudiendo entrar (acceso limitado) y se le invita a ir a **Pagar** (/pagos).

3. **Pasan los 5 días de gracia y no paga**  
   - Otro **job (Suspension Guard)** corre cada hora.  
   - Busca suscripciones en **GRACE_PERIOD** con `graceUntil` ya pasado.  
   - Las pasa a **SUSPENDED**.  
   - A partir de aquí:
     - **API:** Cualquier petición a rutas protegidas recibe **403** con el mensaje: *“Tu suscripción está suspendida. Regulariza tu pago para continuar.”*
     - **Front:** En el dashboard, si el estado indica `shouldRedirect === true` (SUSPENDED o PAST_DUE), se redirige al cliente a **/pagos** para que regularice.

4. **Qué ve el cliente con cuenta suspendida**  
   - Banner/aviso: *“Tu cuenta está suspendida. Contacta a soporte.”* o *“Acceso bloqueado por falta de pago.”*  
   - Redirección a **/pagos** al entrar al dashboard.  
   - No puede usar las funciones protegidas (el backend responde 403).

---

## 3. Resumen en una frase

**Cuando el cliente no paga:**  
Primero se vence el período → entran **5 días de gracia** (acceso limitado, avisos para pagar) → si no paga en ese tiempo, la cuenta pasa a **SUSPENDED** → el backend bloquea el acceso (403) y el front redirige a **/pagos** para que regularice.

---

## 4. Dónde está implementado

- **Grace Manager (pasar a gracia):** `api/index.js` → `graceManagerJob()` (ejecutado por `/api/admin/reconcile` y por `/api/cron/reconcile`).
- **Suspension Guard (pasar a suspendido):** `api/index.js` → `suspensionGuardJob()`.
- **Niveles de acceso (FULL / LIMITED / BLOCKED):** `api/index.js` → middleware `verifyToken` (líneas ~955–976).
- **Redirección y avisos en la app:** `app/(protected)/dashboard/page.tsx` (redirect a /pagos), `components/SubscriptionAlert.tsx` (mensajes por estado).

---

## 5. Cómo volver a tener acceso

El cliente debe:

1. Entrar a **/pagos** (o llegar ahí por la redirección).
2. Elegir plan, subir comprobante o confirmar PayPal y pulsar **“He realizado el pago”**.
3. Esperar a que un admin **apruebe** el pago en **Admin → Pagos pendientes**.
4. Tras la aprobación, la suscripción vuelve a **ACTIVE** y recupera el acceso completo.
