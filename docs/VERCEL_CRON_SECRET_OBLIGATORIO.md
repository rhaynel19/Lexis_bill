# CRON_SECRET es obligatorio en producción (Vercel)

## Qué pasa si no está configurado

Si **CRON_SECRET** no está definido en Vercel (o tiene el valor por defecto), el backend **no arranca**:

```
❌ FATAL: CRON_SECRET debe estar definido en producción y no usar el valor por defecto.
Node.js process exited with exit status: 1.
```

Consecuencia:
- **POST /api/login** → 405 (el proceso sale antes de atender la petición)
- **GET /api/health**, **GET /api/auth/me**, etc. → 500

No es un error de método HTTP ni de código: la función sale en el arranque y Vercel devuelve error.

## Cómo solucionarlo

1. **Vercel** → Proyecto → **Settings** → **Environment Variables**
2. Añadir:
   - **Name:** `CRON_SECRET`
   - **Value:** una cadena aleatoria larga (ej. `openssl rand -hex 32`)
   - **Environments:** Production (y Preview si usas cron ahí)
3. **Guardar**
4. **Redeploy** (Deployments → ⋯ → Redeploy) para que la variable se cargue en el próximo arranque de la función

Después de esto el login y el resto del API deberían responder bien.
