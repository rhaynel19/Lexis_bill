# Un solo proyecto en Vercel (frontend + API)

Si **todo** está desplegado en **un único proyecto** de Vercel (frontend Next.js + API Express en la misma cuenta/proyecto), sigue esto para que el login funcione y no aparezca 502.

## Cómo funciona

1. **vercel.json** reenvía todas las peticiones `/api/*` a la función serverless **api/index.js** (tu Express).
2. El frontend hace las peticiones al **mismo dominio** (ej. `https://www.lexisbill.com.do/api/auth/login`), así que **no** debe reenviarse a otro host.
3. Si defines **NEXT_PUBLIC_API_URL** apuntando a `https://api.lexisbill.com.do`, Next.js reescribe `/api/*` hacia esa URL. En un solo proyecto eso puede provocar **bucle o 502** (la petición “sale” y vuelve al mismo despliegue).

## Qué hacer en Vercel

### 1. Quitar la variable de API externa

En el proyecto en Vercel:

- **Settings** → **Environment Variables**
- **Elimina** la variable **NEXT_PUBLIC_API_URL** (o no la definas).
- Así las peticiones se quedan en el mismo origen y **vercel.json** las envía a `api/index.js`.

### 2. Variables que sí debe tener el proyecto

Asegúrate de tener en el **mismo proyecto** (para que las use la función `api/index.js`):

- **MONGODB_URI**
- **JWT_SECRET** (mínimo 32 caracteres)
- **CRON_SECRET** (para el cron)
- **NEXT_PUBLIC_SENTRY_DSN** (si usas Sentry)
- **NEXT_PUBLIC_BASE_URL** (ej. `https://www.lexisbill.com.do`)

### 3. Redeploy

Después de quitar **NEXT_PUBLIC_API_URL** y guardar:

- **Deployments** → **Redeploy** del último deployment.

## Resumen

| Configuración | Un solo proyecto Vercel |
|---------------|--------------------------|
| **NEXT_PUBLIC_API_URL** | No definir (o eliminar) |
| **Dominio** | Solo hace falta el del front (ej. www.lexisbill.com.do). No hace falta api.lexisbill.com.do. |
| **Quién atiende /api/\*** | vercel.json → api/index.js (Express) |

- **Importante:** Se eliminó el Route Handler `app/api/auth/login/route.ts` que devolvía 503 al no tener NEXT_PUBLIC_API_URL. Así la petición no la intercepta Next.js y puede ser atendida por `vercel.json` → `api/index.js`.

Si tras esto sigues teniendo **502**, revisa en Vercel la pestaña **Functions** o los **logs** del deployment para ver si la función `api/index.js` arranca bien (por ejemplo que no falle por MONGODB_URI, JWT_SECRET o CRON_SECRET). Si ves **404** en el login, puede que la petición llegue a Next.js antes que a la función; en ese caso comprueba en Vercel que la carpeta `api/` esté incluida en el despliegue.
