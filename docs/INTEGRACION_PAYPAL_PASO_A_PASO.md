# Integración de la API de PayPal — Lexis Bill (paso a paso)

Esta guía explica cómo conectar tu aplicación Lexis Bill con la API de PayPal para **verificar webhooks** (y, opcionalmente, para pagos automáticos en el futuro).

---

## Qué tienes ya en el proyecto

- **Backend:** Endpoint `POST /api/webhooks/paypal` que recibe notificaciones de PayPal y activa suscripciones en MongoDB. Verificación de firma en producción.
- **Variables que usa:** `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID`, opcionalmente `PAYPAL_API_BASE` y `PAYPAL_MODE`.
- **Frontend:** Opción PayPal con enlace PayPal.Me y confirmación manual (“He realizado el pago”). El admin aprueba y se activa la suscripción.

Para que los **webhooks** funcionen (cuando uses suscripciones o pagos vía API de PayPal), debes completar los pasos siguientes.

---

## Paso 1: Crear cuenta y app en PayPal Developer

1. Entra en **https://developer.paypal.com** e inicia sesión con tu cuenta PayPal (o crea una).
2. Ve a **Dashboard** → **My Apps & Credentials** (o **Apps & Credentials**).
3. Elige el entorno:
   - **Sandbox:** para pruebas (no se mueve dinero real).
   - **Live:** para producción (pagos reales).
4. En **REST API apps**, pulsa **Create App**.
5. Pon un nombre (ej. `Lexis Bill`) y elige tipo **Merchant** (o el que aplique). Crear.
6. En la ficha de la app verás:
   - **Client ID**
   - **Secret** (pulsa **Show** para verlo).

Guarda ambos; los usarás en el **Paso 2**.

---

## Paso 2: Variables de entorno en tu proyecto

En el archivo donde cargas variables de entorno (por ejemplo `.env.local` o `.env` en la raíz del proyecto), añade o edita:

```env
# --- PayPal (Sandbox para pruebas) ---
PAYPAL_MODE=sandbox
PAYPAL_CLIENT_ID=tu_client_id_sandbox
PAYPAL_CLIENT_SECRET=tu_secret_sandbox

# Opcional: solo si usas otro dominio para la API
# PAYPAL_API_BASE=https://api-m.sandbox.paypal.com
```

- En **Sandbox** no hace falta `PAYPAL_API_BASE`; el código usa por defecto `https://api-m.paypal.com` (en producción) y para sandbox deberías usar `https://api-m.sandbox.paypal.com`. Revisa en tu código: si hay un solo `PAYPAL_API_BASE` para el webhook, en sandbox la verificación de firma apunta a la API de sandbox. En `api/index.js` la verificación usa `process.env.PAYPAL_API_BASE || 'https://api-m.paypal.com'`, así que para **Sandbox** conviene definir:

```env
PAYPAL_API_BASE=https://api-m.sandbox.paypal.com
```

- Para **producción** (Live), más adelante cambiarás a:

```env
PAYPAL_MODE=production
PAYPAL_CLIENT_ID=tu_client_id_live
PAYPAL_CLIENT_SECRET=tu_secret_live
# PAYPAL_API_BASE=https://api-m.paypal.com   (o no definirlo)
```

No pongas el **Secret** en el frontend ni lo subas a Git. El `.env` suele estar en `.gitignore`.

---

## Paso 3: Configurar el Webhook en PayPal

El webhook es la URL que PayPal llama cuando ocurre un evento (pago completado, suscripción activada, etc.). Lexis Bill ya tiene la ruta; solo falta registrarla en PayPal.

1. En **developer.paypal.com** → **Dashboard** → **My Apps & Credentials**.
2. Elige la app que creaste (Sandbox o Live).
3. Busca la sección **Webhooks** (o **Webhooks** en el menú lateral).
4. Pulsa **Add Webhook** (o **Add**).
5. **Webhook URL:** debe ser una URL pública que apunte a tu backend, por ejemplo:
   - Producción: `https://tu-dominio.com/api/webhooks/paypal`
   - Pruebas locales: usa un túnel (ngrok, Cloudflare Tunnel, etc.), ej. `https://abc123.ngrok.io/api/webhooks/paypal`.
6. **Event types:** marca al menos:
   - `PAYMENT.SALE.COMPLETED`
   - `BILLING.SUBSCRIPTION.ACTIVATED`
   - `BILLING.SUBSCRIPTION.CANCELLED`
   - `BILLING.SUBSCRIPTION.EXPIRED`
   - `BILLING.SUBSCRIPTION.SUSPENDED`
7. Guarda. PayPal te mostrará un **Webhook ID** (algo como `8XXXXXXXXXX`).

Añade ese valor a tu `.env`:

```env
PAYPAL_WEBHOOK_ID=8XXXXXXXXXX
```

Sin este ID, en **producción** tu API rechazará los webhooks (por seguridad). En desarrollo, si no está definido, el código puede aceptarlos igual (según tu implementación).

---

## Paso 4: Probar en Sandbox

1. **Reinicia** el servidor de la API para que cargue las nuevas variables.
2. En PayPal Developer → **Sandbox** → **Accounts**: usa (o crea) una cuenta “Personal” para simular el pagador.
3. Flujo actual con **PayPal.Me + confirmación manual:**
   - El usuario elige PayPal, abre el enlace PayPal.Me (en Live sería tu enlace real; en Sandbox puedes usar una cuenta Sandbox).
   - Marca “He realizado el pago” y envía. Un admin aprueba en Lexis Bill y la suscripción se activa.
4. Si más adelante implementas **pagos con la API de PayPal** (botón “Pagar con PayPal” que crea una orden o suscripción):
   - PayPal enviará un evento al webhook.
   - Tu backend recibirá `PAYMENT.SALE.COMPLETED` o `BILLING.SUBSCRIPTION.ACTIVATED` con un `custom_id` que debe ser el `userId` (ObjectId) del usuario en MongoDB.
   - El handler en `api/index.js` activa la suscripción con ese `userId`.

Para probar solo el webhook sin UI de pago, puedes usar **Webhook Simulator** en developer.paypal.com (simula envíos a tu URL).

---

## Paso 5: Pasar a Producción (Live)

1. En **My Apps & Credentials**, cambia a **Live**.
2. Crea una app Live (o usa la que tengas) y copia **Client ID** y **Secret** de Live.
3. En **Webhooks** (Live), añade la misma URL de producción: `https://tu-dominio.com/api/webhooks/paypal` y los mismos eventos. Anota el **Webhook ID** de Live.
4. En el servidor de producción (Vercel, Railway, etc.) configura:

```env
PAYPAL_MODE=production
PAYPAL_CLIENT_ID=tu_client_id_live
PAYPAL_CLIENT_SECRET=tu_secret_live
PAYPAL_WEBHOOK_ID=webhook_id_live
```

5. No definas `PAYPAL_API_BASE` en Live (o pon `https://api-m.paypal.com`) para que la verificación de firma use la API real.
6. Reinicia o redespliega la API.

---

## Resumen de variables

| Variable              | Obligatoria | Descripción |
|-----------------------|------------|-------------|
| `PAYPAL_CLIENT_ID`    | Sí         | Client ID de la app (Sandbox o Live). |
| `PAYPAL_CLIENT_SECRET`| Sí         | Secret de la app. |
| `PAYPAL_WEBHOOK_ID`   | Sí (prod)  | ID del webhook creado en el dashboard. |
| `PAYPAL_MODE`         | Recomendada| `sandbox` o `production`. |
| `PAYPAL_API_BASE`     | Opcional   | En Sandbox: `https://api-m.sandbox.paypal.com`. En Live no suele hacer falta. |

---

## Flujo actual vs. pago automático

- **Ahora:** El usuario paga por PayPal.Me (o transferencia), confirma en Lexis Bill y un admin aprueba. El webhook de PayPal **no** se usa en este flujo manual; solo tendría sentido si en el futuro el pago se hace desde tu app con la API de PayPal.
- **Futuro (pago automático):** Podrías integrar **PayPal Checkout** (Orders API) o **Subscriptions API**: tu backend crea la orden/suscripción con `custom_id = userId`, el usuario paga en la ventana de PayPal y, al completar, PayPal envía el evento al webhook; tu backend activa la suscripción sin intervención del admin. Eso requiere nuevos endpoints (crear orden, capturar) y un botón “Pagar con PayPal” en el front que abra el flujo de PayPal.

Si quieres, el siguiente paso puede ser esbozar esos endpoints y el flujo de “Pagar con PayPal” en Lexis Bill (Orders API paso a paso en tu código).
