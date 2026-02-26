# Verificación 405 /api/login — api/index.js (Vercel)

Comprobación quirúrgica aplicada según el prompt específico para `api/index.js` en Vercel.

---

## 1. Export para Vercel

**Antes:** Solo `module.exports = app;`  
**Después:** `module.exports = app;` + `module.exports.default = app;`

El proyecto usa CommonJS (sin `"type": "module"` en package.json). Añadir `export default app` obligaría a convertir todo el archivo a ESM. Se añadió **`module.exports.default = app`** para que entornos que consumen el módulo como ESM (`import x from '...'` / `require('...').default`) reciban la app correctamente.

**Archivo:** `api/index.js` (final del archivo).

---

## 2. Ruta definida como POST con path completo

**Buscado:** `app.post('/api/login', ...)`  
**Encontrado:** `app.post('/api/login', authLimiter, handleLogin);` (línea ~1438).

La ruta usa el path completo **`/api/login`**. No está como `app.post('/login', ...)`.

---

## 3. No existe GET en /api/login

No hay `app.get('/api/login', ...)`. Solo existe `app.options('/api/login', ...)` (preflight CORS) y `app.post('/api/login', ...)`.

---

## 4. Llamada del frontend

**Archivo:** `lib/api-service.ts`

```ts
return secureFetch<any>("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    cacheKey: undefined
});
```

El frontend envía **POST** con `Content-Type: application/json` y body. Correcto.

---

## 5. Handler GET de prueba (temporal)

No se ha añadido un `app.get('/api/login', ...)` de prueba en el código para no dejar un endpoint GET en producción. Si quieres comprobar que Express responde en esa ruta, puedes añadir **temporalmente** en `api/index.js` antes del `app.post`:

```js
app.get('/api/login', (req, res) => {
  res.status(200).json({ message: 'GET funcionando' });
});
```

Después de probar `https://tudominio.vercel.app/api/login` en el navegador, **elimínalo** y vuelve a desplegar.

---

## 6. Ubicación del archivo

**Ruta del archivo:** `api/index.js` (en la **raíz** del proyecto, no en `src/`).

Estructura correcta para Vercel: la función serverless está en la raíz.

---

## 7. vercel.json

```json
"rewrites": [{ "source": "/api/(.*)", "destination": "/api/index.js" }]
```

Todas las peticiones a `/api/*` van a `api/index.js`. No hay reglas que reescriban solo `/api/login` de forma conflictiva. El método (POST/GET) se preserva en el rewrite.

---

## 8. Body parser

**Encontrado** (antes de las rutas): `app.use(express.json({ limit: '50mb' }));` (línea ~143).

El body del POST se parsea correctamente.

---

## Causa raíz y archivos modificados

- **Causa raíz:** En el código actual no había duplicación de ruta ni path incorrecto. El único ajuste aplicado fue el **export** para mejorar compatibilidad con Vercel (consumo como ESM vía `module.exports.default`).
- **Archivo modificado:** `api/index.js` (añadido `module.exports.default = app`).

**Resumen:** Ruta POST `/api/login` correcta, frontend con POST, archivo en raíz, body parser y vercel.json correctos. Si el 405 continúa en Vercel, hacer **Redeploy sin caché** y, si hace falta, probar temporalmente el GET de diagnóstico (punto 5) y revisar logs de la función en el dashboard.
