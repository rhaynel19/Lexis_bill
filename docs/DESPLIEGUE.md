# Guía de despliegue — Lexis Bill

Despliegue del frontend (Next.js) en **Vercel** y del API (Express) en un servidor Node (VPS, Railway, Render, etc.) o como serverless.

## Requisitos

- **MongoDB**: Atlas o instancia propia. Variable `MONGODB_URI`.
- **JWT_SECRET**: Mínimo 32 caracteres.
- **CORS**: En producción, `CORS_ORIGIN` debe ser la URL del frontend (ej. `https://app.lexisbill.com`).

## 1. Frontend (Vercel)

1. Conecta el repositorio en [Vercel](https://vercel.com).
2. **Build Command:** `npm run build`
3. **Output:** Next.js (detectado automáticamente).
4. **Variables de entorno** (solo las que usa el frontend en build/runtime):
   - `NEXT_PUBLIC_API_URL`: URL pública del API (ej. `https://api.lexisbill.com/api`).
   - `NEXT_PUBLIC_APP_URL`: URL de la app (ej. `https://app.lexisbill.com`).
   - Opcional: `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_SUPPORT_WHATSAPP`, etc.
5. No pongas en Vercel: `JWT_SECRET`, `MONGODB_URI` (son solo del API).

## 2. API (Node / Express)

El API está en `api/index.js`. Debe correr en un servidor que acepte peticiones HTTP (puerto 3001 o el que definas).

### Opción A: VPS (PM2, Docker)

- Clona el repo, `npm install --production`, `node api/index.js`.
- Usa **PM2**: `pm2 start api/index.js --name lexis-api`.
- Configura **Nginx** como reverse proxy hacia el puerto del API y termina SSL (Let’s Encrypt).

### Opción B: Railway / Render

- Crea un servicio Node.
- **Start command:** `node api/index.js` (o `npm run dev:backend` en dev).
- **Root directory:** raíz del proyecto (donde está `api/`).
- Añade variables: `MONGODB_URI`, `JWT_SECRET`, `CORS_ORIGIN`, `PORT`, etc. (ver `env_example`).

### Opción C: Vercel Serverless (API Routes)

- Puedes exponer el API como **Vercel Serverless Functions** moviendo los endpoints de `api/index.js` a `app/api/[...route]/route.ts` (o un proxy que llame a un backend externo). La opción más simple es tener el API en un servicio separado (A o B).

## 3. Variables de entorno del API

| Variable | Obligatorio | Descripción |
|----------|-------------|-------------|
| `MONGODB_URI` | Sí | Cadena de conexión MongoDB |
| `JWT_SECRET` | Sí | Mínimo 32 caracteres |
| `CORS_ORIGIN` | Sí (prod) | URL del frontend (ej. https://app.lexisbill.com) |
| `PORT` | No | Puerto (default 3001) |
| `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` | No | Para recuperación de contraseña y notificaciones |
| `DGII_RNC_API_URL` | No | URL de consulta RNC (proveedor externo) |
| `NEXT_PUBLIC_APP_URL` | Recomendado | URL de la app (enlaces en emails) |

Ver `env_example` en la raíz para el listado completo.

## 4. Post-despliegue

1. **Crear primer admin:** en MongoDB:  
   `db.users.updateOne({ email: "tu@email.com" }, { $set: { role: "admin" } })`  
   O usar `npm run promote-admin` si está configurado.
2. **Probar login** desde la URL del frontend.
3. **Probar API:** `GET https://tu-api.com/api/health` (debe devolver `healthy` si DB y JWT están ok).

## 5. Membresías y pagos

- Pagos manuales (transferencia/PayPal) no requieren variables extra.
- Para cobros automáticos, configura Stripe o PayPal según la documentación del proyecto.
- Variables de membresía (nombre del banco, cuenta, etc.) en `env_example`.

## 6. Resumen

- **Frontend:** Vercel, con `NEXT_PUBLIC_API_URL` apuntando al API.
- **API:** Servidor Node (VPS, Railway, Render) con `MONGODB_URI`, `JWT_SECRET`, `CORS_ORIGIN`.
- **Base de datos:** MongoDB Atlas (o compatible).
- **Emails:** Configurar SMTP para recuperación de contraseña y notificaciones (opcional pero recomendado).
