# Configuración de Sentry - Paso a Paso

## Archivos creados (configuración actual)

| Archivo | Propósito |
|---------|-----------|
| `instrumentation.ts` | Registra los configs de server y edge, exporta `onRequestError` |
| `instrumentation-client.ts` | Inicializa Sentry en el navegador (cliente) |
| `sentry.server.config.ts` | Config para Node.js (API routes, Server Components) |
| `sentry.edge.config.ts` | Config para Edge Runtime (middleware) |
| `app/global-error.tsx` | Captura errores de render de React y los envía a Sentry |
| `app/(public)/sentry-example-page/page.tsx` | Página para probar que Sentry funciona |

## Variables de entorno requeridas

En `.env.local` (desarrollo) o en Vercel (producción):

```env
NEXT_PUBLIC_SENTRY_DSN=https://xxx@o123456.ingest.sentry.io/7890123
SENTRY_ORG=lexis-bill
SENTRY_PROJECT=javascript-nextjs
```

**¿Dónde obtener el DSN?**
1. Entra a [sentry.io](https://sentry.io)
2. Tu proyecto → **Settings** → **Client Keys (DSN)**
3. Copia el DSN

## Verificar que funciona

1. **Reinicia el servidor** (importante tras cambios en config):
   ```bash
   npm run dev
   ```

2. **Abre** [http://localhost:3000/sentry-example-page](http://localhost:3000/sentry-example-page)

3. **Desactiva bloqueadores de anuncios** (uBlock, AdBlock, Brave Shields) — bloquean requests a Sentry

4. **Haz clic** en "Disparar error de prueba"

5. **Revisa** en Sentry → [Issues](https://sentry.io/issues/) — deberías ver el error en 5-10 segundos

6. **Consola del navegador (F12)** — con `debug: true` en desarrollo verás logs de Sentry

## Solución de problemas

### El error no llega a Sentry

- **Bloqueadores**: Desactívalos o prueba en ventana de incógnito sin extensiones
- **DSN vacío**: Comprueba que `NEXT_PUBLIC_SENTRY_DSN` está en `.env.local` y que reiniciaste el servidor
- **Túnel**: Los eventos van por `/monitoring` para evitar bloqueadores. Si falla, prueba sin túnel (quita `tunnel: "/monitoring"` de `instrumentation-client.ts`)

### Build falla con Sentry

- Asegúrate de tener `SENTRY_ORG` y `SENTRY_PROJECT` en las variables de entorno
- Si no usas Sentry en dev: deja `NEXT_PUBLIC_SENTRY_DSN` vacío y el build usará la config sin Sentry
