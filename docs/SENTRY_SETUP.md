# Configurar Sentry en Lexis Bill

Guía paso a paso para activar el monitoreo de errores con Sentry (cliente, servidor y edge).

---

## 1. Crear cuenta y proyecto en Sentry

1. Entra en **[sentry.io](https://sentry.io)** e inicia sesión (o crea una cuenta gratuita).
2. Crea una **organización** si aún no tienes (ej: `lexis-bill`).
3. Crea un **proyecto**:
   - **Platform:** elige **Next.js**.
   - **Nombre del proyecto:** por ejemplo `lexis-bill` o `lexisbill-frontend`.
   - Sentry te mostrará el **DSN** (Client Key) al finalizar.

---

## 2. Obtener las variables necesarias

| Variable | Dónde obtenerla |
|----------|------------------|
| **NEXT_PUBLIC_SENTRY_DSN** | Sentry → Tu proyecto → **Settings** → **Client Keys (DSN)**. Formato: `https://xxx@o123456.ingest.sentry.io/7890123` |
| **SENTRY_ORG** | Slug de tu organización (ej: `lexis-bill`). Lo ves en la URL: `sentry.io/organizations/lexis-bill/` |
| **SENTRY_PROJECT** | Slug del proyecto (ej: `lexis-bill` o `javascript-nextjs`). Lo ves en **Settings** del proyecto |

Opcional (para source maps en producción):

| Variable | Dónde obtenerla |
|----------|------------------|
| **SENTRY_AUTH_TOKEN** | Sentry → **Settings** → **Auth Tokens** → Create New Token (scope: `project:releases`) |

---

## 3. Configurar variables en local

1. Copia el archivo de ejemplo si no tienes `.env.local`:
   ```bash
   cp env_example .env.local
   ```

2. Edita **`.env.local`** y rellena (o actualiza) estas líneas:

   ```env
   # Sentry - Monitoreo de errores
   NEXT_PUBLIC_SENTRY_DSN=https://TU_PUBLIC_KEY@oXXXXXX.ingest.sentry.io/XXXXXX
   SENTRY_ORG=tu-organizacion
   SENTRY_PROJECT=tu-proyecto
   # Opcional: para subir source maps y ver stack traces legibles en producción
   # SENTRY_AUTH_TOKEN=sntrys_xxx
   ```

3. **Reinicia el servidor** para que Next.js cargue las variables:
   ```bash
   npm run dev
   ```

---

## 4. Configurar variables en Vercel (producción)

1. En el dashboard de **Vercel** → tu proyecto → **Settings** → **Environment Variables**.
2. Añade las mismas variables (marca **Production**, **Preview** y **Development** si quieres):
   - `NEXT_PUBLIC_SENTRY_DSN`
   - `SENTRY_ORG`
   - `SENTRY_PROJECT`
   - (Opcional) `SENTRY_AUTH_TOKEN`
3. **Redeploy** el proyecto para que el build use Sentry.

---

## 5. Probar que Sentry funciona

1. Con el servidor en marcha (`npm run dev`), abre en el navegador:
   ```
   http://localhost:3000/sentry-example-page
   ```
2. **Desactiva bloqueadores** (uBlock, AdBlock, Brave Shields) en esa pestaña; pueden bloquear el envío a Sentry.
3. Haz clic en **"Disparar error de prueba"**.
4. En **Sentry** → **Issues** deberías ver el error en unos segundos.

Si no aparece:
- Comprueba que `NEXT_PUBLIC_SENTRY_DSN` está en `.env.local` y que reiniciaste `npm run dev`.
- Abre la consola del navegador (F12); con `debug: true` en desarrollo verás logs de Sentry.

---

## 6. Archivos que ya usan Sentry en el proyecto

| Archivo | Uso |
|---------|-----|
| `instrumentation.ts` | Carga configs de server y edge; exporta `onRequestError` |
| `instrumentation-client.ts` | Inicializa Sentry en el navegador (DSN, tunnel `/monitoring`) |
| `sentry.server.config.ts` | Config para Node (API routes, Server Components) |
| `sentry.edge.config.ts` | Config para Edge (middleware) |
| `app/global-error.tsx` | Captura errores de React y los envía a Sentry |
| `app/error.tsx` | Página de error "Algo salió mal"; también envía el error a Sentry |
| `next.config.js` | Integra `withSentryConfig` y túnel `/monitoring` cuando hay DSN |

Los eventos del cliente se envían por el túnel **`/monitoring`** para evitar bloqueadores; no hace falta crear esa ruta a mano, el SDK de Sentry la gestiona.

---

## 7. Solución de problemas

### El error no llega a Sentry
- Desactiva bloqueadores de anuncios o prueba en ventana de incógnito sin extensiones.
- Comprueba que `NEXT_PUBLIC_SENTRY_DSN` está definido y que reiniciaste el servidor tras cambiar `.env.local`.
- En producción, revisa que la variable está en Vercel y que hiciste redeploy.

### El build falla con Sentry
- Asegúrate de tener **SENTRY_ORG** y **SENTRY_PROJECT** en el entorno de build (Vercel o local).
- Si no quieres usar Sentry en un entorno: deja **NEXT_PUBLIC_SENTRY_DSN** vacío; el build no aplicará Sentry y seguirá compilando.

### Quiero desactivar Sentry en desarrollo
- No definas `NEXT_PUBLIC_SENTRY_DSN` en `.env.local`, o déjalo vacío. Sentry solo se activa cuando el DSN está presente.

---

## Resumen rápido

1. Crear proyecto Next.js en [sentry.io](https://sentry.io).
2. Copiar **DSN**, **SENTRY_ORG** y **SENTRY_PROJECT** a `.env.local` (y a Vercel).
3. Reiniciar `npm run dev` y probar en `/sentry-example-page`.
4. En producción, los errores aparecerán en Sentry → **Issues** (y en **Performance** si usas trazas).
