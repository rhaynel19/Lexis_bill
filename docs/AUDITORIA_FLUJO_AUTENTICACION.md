# Auditoría del flujo de autenticación

## FASE 1 — Diagnóstico

### Causa exacta del error "El servidor no aceptó la solicitud..."

**Conclusión:** El frontend hace `POST /api/auth/login` a la **misma origen** (p. ej. `https://lexisbill.com.do/api/auth/login`). En producción, si **no está definida la variable `NEXT_PUBLIC_API_URL`** en el proyecto donde se despliega el frontend (p. ej. Vercel):

1. Las **rewrites** de Next.js devuelven array vacío (no hay proxy).
2. La petición a `lexisbill.com.do/api/auth/login` la atiende el **servidor que sirve la app Next** (p. ej. Vercel).
3. Ese servidor **no tiene** un handler para `POST /api/auth/login` (el login real está en el backend Express, en otro despliegue).
4. El servidor responde **405 Method Not Allowed** (o 404).
5. El frontend muestra el mensaje genérico que pusimos para 405.

Por tanto, el error es **de configuración en producción**: el proxy de `/api` al backend no se activa porque falta `NEXT_PUBLIC_API_URL`.

### 1. Endpoint de login

| Aspecto | Estado |
|--------|--------|
| URL en frontend | `API_URL = "/api"` → petición a `/api/auth/login` (same-origin). Correcto. |
| Método | POST. Correcto. |
| Payload | `{ email: string, password: string }`. Correcto. |
| Base URL | Relativa; no hay baseURL externa. El proxy (rewrites) debe enviar `/api/*` al backend. |

### 2. Variables de entorno

| Variable | Uso | Producción |
|----------|-----|------------|
| `NEXT_PUBLIC_API_URL` | En `next.config.js` rewrites: si está definida, se reescribe `/api/:path*` a `{base}/api/:path*`. | **Debe estar definida** con la URL base del API (p. ej. `https://api.lexisbill.com.do/api`). Si no, el proxy no se aplica y aparece 405. |
| Backend (Express) | `JWT_SECRET`, `MONGODB_URI`, `CORS_ORIGIN`, etc. | Independiente del frontend; el API debe estar desplegado y accesible. |

### 3. Diferencia local vs producción

- **Local:** Si no defines `NEXT_PUBLIC_API_URL`, rewrites en dev envían `/api/*` a `http://localhost:3001/api/*`. El backend Express corre en 3001 y el login funciona.
- **Producción:** Si no defines `NEXT_PUBLIC_API_URL`, rewrites devuelven `[]`. Las peticiones `/api/*` se quedan en el host del frontend (p. ej. Vercel) → 405.

### 4. Backend (Express)

- `POST /api/auth/login` existe y está registrado.
- Cuerpo: `email`, `password`. Respuestas: 200 (éxito), 401 (credenciales inválidas — usuario no encontrado o contraseña incorrecta), 403 (cuenta bloqueada), 500 (error interno).
- CORS: `credentials: true`, `methods` incluye POST; en producción se usa `CORS_ORIGIN` si está definido.
- Cookie: `lexis_auth` HttpOnly, Secure en prod, SameSite strict. Correcto.
- El 405 **no lo genera el backend** cuando la petición sí llega a Express; lo devuelve el servidor del frontend cuando la petición no se reenvía al backend.

### 5. CORS

- Con **same-origin** (frontend y peticiones a `/api` en el mismo dominio vía proxy), CORS no interviene.
- Si en el futuro el frontend llamara al API por otro dominio, el backend ya tiene CORS con `credentials: true`; en producción debe configurarse `CORS_ORIGIN` con el origen del frontend.

### 6. Base de datos y contraseñas

- Usuario por `email`; contraseña con `bcrypt.compare`. No se detectó cambio de método de encriptación ni problema de hash en el flujo actual.

---

## FASE 2 — Corrección aplicada

### 2.1 Configuración en producción (obligatoria)

En el proyecto donde se despliega el **frontend** (p. ej. Vercel):

1. Añadir variable de entorno:
   - **Nombre:** `NEXT_PUBLIC_API_URL`
   - **Valor:** URL base del API, por ejemplo:
     - `https://api.lexisbill.com.do/api`  
     (o la URL donde esté desplegado el Express que sirve `/api`).
2. Volver a desplegar el frontend para que las rewrites usen esa URL.

Así, las peticiones a `lexisbill.com.do/api/auth/login` se reescriben al backend real y deja de aparecer el 405.

### 2.2 Redirect typo /logir → /login

Si el usuario escribe `lexisbill.com.do/logir`, se redirige a `/login` para evitar quedarse en una ruta incorrecta.

### 2.3 Manejo de errores en la pantalla de login

Se distingue por tipo de error y se muestran mensajes claros y seguros:

| Situación | Mensaje al usuario |
|-----------|--------------------|
| 405 / 404 (API no alcanzable o ruta incorrecta) | Configuración del servidor incorrecta. Contacte a soporte. |
| Sin conexión / Failed to fetch | Verificar conexión a internet e intentar de nuevo. |
| 401 / credenciales inválidas | Correo o contraseña incorrectos. Verificar e intentar de nuevo. |
| 403 cuenta bloqueada | Cuenta bloqueada. Contacte a soporte. |
| 500 u otro error de servidor | Error temporal. Intentar más tarde o contactar a soporte. |
| Timeout | El servidor tarda demasiado. Verificar conexión o intentar más tarde. |

No se expone información sensible (no se muestran detalles internos ni stack traces).

### 2.4 Comprobación de disponibilidad del API en la página de login

En la carga de la página de login se hace una petición **GET** a `/api/health`.  
Si la respuesta es **404 o 405**, se considera que el API no está bien configurado o no está disponible, y se muestra un aviso en la página (sin bloquear el formulario):  
"El servicio de inicio de sesión no está disponible. Contacte al administrador."  
Así se detecta el problema de configuración antes de que el usuario envíe credenciales.

---

## FASE 3 — Mejora del manejo de errores

- Los errores se clasifican por `status` y por mensaje (red, timeout, 4xx, 5xx).
- Mensajes únicos por tipo, sin revelar datos internos.
- El usuario puede seguir intentando o contactar soporte según el mensaje.

---

## FASE 4 — Pruebas recomendadas

| Caso | Resultado esperado |
|------|--------------------|
| Login correcto | 200, cookie `lexis_auth`, redirección según rol. |
| Contraseña incorrecta | 401, mensaje "Correo o contraseña incorrectos...". |
| Usuario inexistente | 401 (mismo que contraseña incorrecta), mensaje genérico de credenciales. |
| Cuenta bloqueada | 403, mensaje "Cuenta bloqueada. Contacte a soporte.". |
| API no configurada (sin proxy) | 405 en login; en carga de página, aviso de servicio no disponible si health da 404/405. |
| Error de servidor simulado | 500, mensaje de error temporal. |

---

## Resumen y recomendaciones

- **Causa del error actual:** En producción no está definida `NEXT_PUBLIC_API_URL`, por lo que el proxy no reenvía `/api` al backend y el servidor del frontend responde 405.
- **Corrección principal:** Definir `NEXT_PUBLIC_API_URL` en el entorno de producción del frontend y redesplegar.
- **Otras correcciones:** Redirect `/logir` → `/login`, manejo de errores por tipo en login, y comprobación de disponibilidad del API con `/api/health` en la página de login.
- **Para evitar que vuelva a ocurrir:** Documentar en el proceso de despliegue que `NEXT_PUBLIC_API_URL` es obligatoria en producción; opcionalmente comprobar en CI que exista en el entorno de producción antes del deploy.
