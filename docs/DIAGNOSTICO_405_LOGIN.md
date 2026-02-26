# Diagnóstico 405 Method Not Allowed en /api/login

Verificación quirúrgica aplicada al proyecto (Next + Vercel + Express).

---

## 1. Duplicación de ruta

| Ubicación | ¿Existe? | Estado |
|-----------|----------|--------|
| `app/api/login/route.ts` (Next App Router) | **No** | No existe en el proyecto. |
| `api/index.js` → `app.post('/api/login', ...)` (Express) | **Sí** | Única definición de login. |

**Conclusión:** No hay duplicación. El login está **solo en Express** (`api/index.js`). No hay conflicto con Next.

---

## 2. Método en route.ts (Next)

No aplica: no existe `app/api/login/route.ts`.

---

## 3. Llamada del frontend

**Archivo:** `lib/api-service.ts`

```ts
return secureFetch<any>("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    cacheKey: undefined
});
```

**Página de login:** `app/(public)/login/page.tsx` → usa `api.login(email, password)` (línea 111).

**Conclusión:** El frontend envía **POST** con body JSON. Correcto.

---

## 4. Rewrites en vercel.json

```json
"rewrites": [{ "source": "/api/(.*)", "destination": "/api/index.js" }]
```

Todas las peticiones a `/api/*` van a la función Express (`api/index.js`). Next no define `/api/login`, así que no hay conflicto: **solo Express atiende /api/login**.

**Conclusión:** Configuración coherente con tener el login solo en Express.

---

## 5. Express: método POST

**Archivo:** `api/index.js`

- `app.options('/api/login', ...)` → responde OPTIONS (preflight CORS).
- `app.post('/api/login', authLimiter, handleLogin)` → acepta **POST**.

**Conclusión:** Express acepta POST en `/api/login`. No hay `app.get('/api/login')` que provoque 405.

---

## 6. express.json()

**Archivo:** `api/index.js` (línea ~143)

```js
app.use(express.json({ limit: '50mb' }));
```

Registrado antes de las rutas. El body del POST se parsea correctamente.

---

## 7. OPTIONS (CORS)

`app.options('/api/login', ...)` responde 204 con headers CORS. OPTIONS no está bloqueado.

---

## 8. Causa raíz y acciones

### Estado del código

- **Causa raíz en código:** Ninguna. No hay duplicación, el frontend usa POST, Express tiene POST y OPTIONS, y el rewrite envía todo `/api/*` a Express.
- **Archivos modificados en esta verificación:** Ninguno (solo este documento de diagnóstico).

### Si el 405 sigue en producción (Vercel)

La causa suele ser **despliegue o caché**, no el código:

1. **Redeploy sin caché:** Vercel → Proyecto → Deployments → ⋯ en el último deployment → **Redeploy** → desmarcar **Use existing Build Cache**.
2. **Promover el deployment correcto:** Asegurarse de que Production usa el deployment que incluye `app.post('/api/login', ...)` en `api/index.js`.
3. **Probar en incógnito** o con caché del sitio vacía.

### Confirmación

| Comprobación | Estado |
|--------------|--------|
| ¿/api/login acepta POST? | Sí (Express `app.post('/api/login', ...)`) |
| ¿Hay otra ruta que compita? | No (no existe `app/api/login/route.ts`) |
| ¿Frontend envía POST? | Sí (`api-service.ts` con `method: "POST"`) |
| ¿Rewrite envía a Express? | Sí (`/api/(.*)` → `/api/index.js`) |

**Resumen:** La arquitectura actual es correcta. Si el 405 persiste en Vercel, aplicar **Redeploy sin caché** y, si hace falta, revisar logs de la función en el dashboard de Vercel.
