# Login en Vercel: cómo dejarlo como antes

Para que el login funcione **como cuando estaba bien** (sin 405/503):

1. **En el proyecto de Vercel (frontend):** define **NEXT_PUBLIC_API_URL** con la URL base de tu API, terminando en `/api` (ej. `https://api.lexisbill.com.do/api`).
2. **Asegúrate de que el API esté en línea** en esa URL (el servidor donde corre `api/index.js`).
3. **Redeploy** del frontend después de guardar la variable.

No hay Route Handler que intercepte el login: la petición se reenvía al backend por `next.config.js` (beforeFiles) cuando `NEXT_PUBLIC_API_URL` está definida.

---

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
- No configurar base URL del proyecto: la app usa rutas relativas y el API obtiene la base desde el request (Host / X-Forwarded-*).

### 3. Redeploy

Después de quitar **NEXT_PUBLIC_API_URL** y guardar:

- **Deployments** → **Redeploy** del último deployment.

## Resumen

| Configuración | Un solo proyecto Vercel |
|---------------|--------------------------|
| **NEXT_PUBLIC_API_URL** | No definir (o eliminar) |
| **Dominio** | Solo hace falta el del front (ej. www.lexisbill.com.do). No hace falta api.lexisbill.com.do. |
| **Quién atiende /api/\*** | vercel.json → api/index.js (Express) |

- Si tras quitar NEXT_PUBLIC_API_URL ves **405** o **503**, la petición está llegando a Next.js y no a `api/index.js` (en muchos proyectos Next.js, la carpeta `api/` de la raíz no se despliega). En ese caso **tienes que definir NEXT_PUBLIC_API_URL** con la URL de un API que sí esté en línea: por ejemplo un **segundo proyecto en Vercel** que despliegue solo el API (mismo repo, otro proyecto con raíz o build configurado para la carpeta `api`), o un API en Railway/Render/etc.
