# Cómo arreglar el error 405 en el login (solo Vercel)

Si en producción en Vercel el login sigue devolviendo **HTTP 405**, haz esto **en este orden**:

---

## 1. Redeploy sin caché

1. Entra en [vercel.com](https://vercel.com) → tu proyecto **Lexis Bill**.
2. Pestaña **Deployments**.
3. En el **último deployment**, clic en los **tres puntos (⋯)**.
4. Elige **Redeploy**.
5. **Desmarca** "Use existing Build Cache".
6. Confirma **Redeploy**.

Así se vuelve a construir y desplegar todo con el código actual (incluido `POST /api/login` en Express).

---

## 2. Comprobar variables de entorno

En **Settings** → **Environment Variables** asegúrate de tener en **Production**:

- `JWT_SECRET`
- `MONGODB_URI`
- `NEXT_PUBLIC_SENTRY_DSN`
- `CRON_SECRET`

Si falta alguna obligatoria, el backend puede no arrancar bien y las peticiones pueden fallar con 5xx o comportamientos raros.

---

## 3. Comprobar que el deployment es el correcto

En **Deployments**, el último deployment debe ser el del commit que incluye el fix del login (p. ej. mensaje tipo: *"fix: POST /api/login en Express..."*).  
Si el que está en **Production** es un deployment antiguo, activa el último: **⋯** → **Promote to Production**.

---

## 4. Probar de nuevo

1. Cierra sesión si la tienes abierta.
2. Abre la app en **modo incógnito** o vacía caché del sitio (Ctrl+Shift+Delete → solo “Imágenes y archivos en caché”).
3. Vuelve a la página de login e intenta entrar.

Si sigue saliendo 405, en el mismo proyecto de Vercel ve a **Settings** → **Functions** y revisa que la función que atiende `/api` (por ejemplo `api/index.js`) esté en la región correcta y sin errores en los logs (**Deployments** → deployment → **Functions** / **Logs**).

---

## Resumen

| Paso | Acción |
|------|--------|
| 1 | **Redeploy** del último deployment **sin** “Use existing Build Cache”. |
| 2 | Revisar **Environment Variables** en Production. |
| 3 | Confirmar que **Production** usa el deployment con el fix del login. |
| 4 | Probar en **incógnito** o con caché limpia. |

En la mayoría de casos el 405 se resuelve con el **Redeploy sin caché** (paso 1).
