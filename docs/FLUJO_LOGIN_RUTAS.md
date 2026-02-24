# Login: ruta exacta, método y corrección del 405

## Entregable

| Concepto | Valor |
|----------|--------|
| **Ruta exacta** | `/api/auth/login` (no `/api/login`) |
| **Método** | `POST` |
| **Headers** | `Content-Type: application/json`, `Accept: application/json`; con cookies: `credentials: 'include'` |
| **Body** | `{ "email": string, "password": string }` |

---

## FASE 1 — Frontend (verificado)

- **Método:** `POST` — `lib/api-service.ts`: `method: "POST"`.
- **URL:** `/api/auth/login` — `API_URL = "/api"` → `${API_URL}/auth/login` = `/api/auth/login`.
- **Headers:** `Content-Type: application/json` (y `secure-fetch` envía la petición con credenciales cuando aplica).
- **Body:** `JSON.stringify({ email, password })`.

No se usa `baseURL` externa: las peticiones son al mismo origen (`/api/...`); el proxy (rewrites) las reenvía al backend cuando está configurado.

---

## FASE 2 — Backend (verificado)

- **Definición:** `api/index.js` línea 1327: `app.post('/api/auth/login', async (req, res) => { ... })`. Solo POST.
- **Rate limit:** `app.use('/api/auth/login', authLimiter)` antes de la ruta.
- **CORS:** `methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']`, `credentials: true`.

El servidor Express escucha `POST /api/auth/login` correctamente.

---

## Causa del 405 en producción

En producción el frontend hace **POST** a **mismo origen** (ej. `https://tu-dominio.com/api/auth/login`).

- En `next.config.js`, `rewrites()` solo reenvía `/api/:path*` al backend si existe **`NEXT_PUBLIC_API_URL`**.
- Si en el despliegue del frontend (p. ej. Vercel) **no** se define `NEXT_PUBLIC_API_URL`, las rewrites devuelven `[]` y no hay proxy.
- La petición la atiende el host del frontend (p. ej. Vercel), que **no** tiene un handler para `POST /api/auth/login` → responde **405 Method Not Allowed**.

Por tanto, el 405 no es por método o ruta incorrectos en el código; es por **configuración en producción**: el proxy no lleva `/api` al backend.

---

## Qué hacer para que el login funcione en producción

1. **En el proyecto donde se despliega el frontend** (p. ej. Vercel): definir la variable de entorno **`NEXT_PUBLIC_API_URL`** con la URL base del API (ej. `https://api.tudominio.com/api` o la URL real donde corre Express).
2. **Redesplegar el frontend** para que las rewrites usen esa URL y las peticiones `POST /api/auth/login` se reenvíen al backend.
3. Asegurar que el **backend Express** esté desplegado y accesible en esa URL y que las variables del backend (p. ej. **JWT_SECRET**, **MONGODB_URI**) estén bien configuradas en producción.

Si usas **nginx** u otro proxy delante del backend, hay que permitir **POST** en `/api/auth/login` y hacer `proxy_pass` al puerto donde corre Express.

---

## FASE 5 — Prueba directa (Postman)

- **URL:** `POST https://<tu-backend>/api/auth/login`
- **Headers:** `Content-Type: application/json`
- **Body (raw JSON):** `{ "email": "tu@email.com", "password": "tu_password" }`

- Si también devuelve **405** → el backend (o el proxy delante del backend) no tiene la ruta POST configurada o no permite POST.
- Si responde **200** (y cookie `lexis_auth`) → el backend está bien; si el login en la web sigue en 405, el problema es del frontend/proxy (falta `NEXT_PUBLIC_API_URL` o redeploy).

---

## Resumen

- **Ruta exacta corregida:** `/api/auth/login`.
- **Método correcto:** `POST`.
- **Confirmación de login:** el código frontend y backend están correctos; para que funcione en producción hay que definir **`NEXT_PUBLIC_API_URL`** en el entorno del frontend y redesplegar.
