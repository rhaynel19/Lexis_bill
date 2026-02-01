# Configuración para Producción — Lexis Bill

## 1️⃣ Configurar Sentry (Monitoreo de Errores)

Sentry es **obligatorio** en producción. La app no arranca sin `NEXT_PUBLIC_SENTRY_DSN`.

### Opción A: Usar el wizard (recomendado)

El wizard configura todo automáticamente: DSN, source maps, instrumentation y variables.

1. **Abre una terminal** en la raíz del proyecto (donde está `package.json`).

2. **Ejecuta el wizard:**
   ```bash
   npx @sentry/wizard@latest -i nextjs --saas --org lexis-bill --project javascript-nextjs
   ```

3. **El wizard hará:**
   - Abrir el navegador para que inicies sesión en Sentry (o crees cuenta).
   - Preguntar qué funciones quieres: Error Monitoring ✅, Logs, Session Replay, Tracing.
   - Crear/actualizar archivos de configuración.
   - Generar un **Auth Token** y crear `.env.sentry-build-plugin` (para subir source maps).
   - Añadir variables a tu `.env.local`.

4. **Responde las preguntas** según lo que necesites. Para empezar, marca **Error Monitoring**.

5. **Después del wizard**, copia las variables que te indique a:
   - **Local:** `.env.local`
   - **Vercel:** Settings → Environment Variables

   Variables típicas:
   ```
   NEXT_PUBLIC_SENTRY_DSN=https://xxx@o123456.ingest.sentry.io/7890123
   SENTRY_ORG=lexis-bill
   SENTRY_PROJECT=javascript-nextjs
   SENTRY_AUTH_TOKEN=sntrys_xxx   (solo para builds, sube source maps)
   ```

6. **En Vercel** añade también `SENTRY_AUTH_TOKEN` si quieres stack traces legibles en Sentry.

### Opción B: Configuración manual

1. Ve a [sentry.io](https://sentry.io) y crea una cuenta.
2. Crea un proyecto nuevo → elige **Next.js**.
3. Copia el **DSN** que te muestra (ejemplo: `https://abc123@o123456.ingest.sentry.io/7890123`).

**Variables de entorno:**

**En desarrollo (.env.local):**
```env
NEXT_PUBLIC_SENTRY_DSN=https://tu-dsn@o123456.ingest.sentry.io/7890123
SENTRY_ORG=lexis-bill
SENTRY_PROJECT=javascript-nextjs
```

**En Vercel (Producción):**
1. Dashboard Vercel → tu proyecto → **Settings** → **Environment Variables**
2. Añade:
   - `NEXT_PUBLIC_SENTRY_DSN` = `https://tu-dsn@o123456.ingest.sentry.io/7890123`
   - `SENTRY_ORG` = `lexis-bill`
   - `SENTRY_PROJECT` = `javascript-nextjs`
   - `SENTRY_AUTH_TOKEN` = (crea uno en Sentry → Settings → Auth Tokens) — opcional, para source maps
3. Marca **Production**, **Preview** y **Development** según necesites.
4. **Save** y vuelve a desplegar.

### Verificar

- La app arranca sin error.
- En Sentry → **Issues** verás los errores cuando ocurran.

---

## 2️⃣ Probar Backup y Restore

### Requisitos

- [MongoDB Database Tools](https://www.mongodb.com/try/download/database-tools) instalados (`mongodump` y `mongorestore`).
- En Windows: `choco install mongodb-database-tools` o descarga manual.

### Probar backup

```bash
# Crear carpeta y backup
npm run backup
```

Se crea `backups/backup-YYYY-MM-DD.gz`.

### Probar restore (en DB de prueba)

⚠️ **No uses la DB de producción.** Crea una DB temporal en Atlas o usa MongoDB local.

```bash
# Opción A: Backup y restore del día actual
MONGODB_URI=mongodb+srv://...lexis_bill_test npm run backup
MONGODB_URI=mongodb+srv://...lexis_bill_test npm run restore

# Opción B: Restore de un archivo específico
MONGODB_URI=mongodb+srv://...lexis_bill_test node scripts/restore-mongodb.js backups/backup-2026-01-31.gz
```

---

## 3️⃣ Cron diario para Backups

### Opción A: Vercel Cron (si tienes plan Pro)

En `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/backup",
      "schedule": "0 2 * * *"
    }
  ]
}
```

Crea el endpoint `app/api/cron/backup/route.ts` que ejecute el script o llame a un servicio externo.  
**Nota:** Las funciones serverless tienen límite de ejecución (10–60s). Para backups pesados es mejor usar un servidor externo.

### Opción B: GitHub Actions (recomendado, gratis)

Crea `.github/workflows/backup.yml`:

```yaml
name: MongoDB Backup
on:
  schedule:
    - cron: '0 6 * * *'  # 6:00 UTC diario
  workflow_dispatch:  # manual
jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: |
          curl -Lo mongodb-database-tools.deb https://fastdl.mongodb.org/tools/db/ubuntu2004-x86_64/mongodb-database-tools-ubuntu2004-x86_64-100.9.4.deb
          sudo dpkg -i mongodb-database-tools.deb
      - run: npm run backup
        env:
          MONGODB_URI: ${{ secrets.MONGODB_URI }}
          BACKUP_OUTPUT_DIR: ./backups
      - uses: actions/upload-artifact@v4
        with:
          name: backup
          path: backups/*.gz
```

En GitHub → **Settings** → **Secrets** añade `MONGODB_URI`.

### Opción C: Servidor propio o cron local

```bash
# Crontab (2:00 AM diario)
0 2 * * * cd /ruta/lexis-bill && MONGODB_URI=xxx npm run backup
```

### Opción D: MongoDB Atlas (automático)

Atlas incluye backups automáticos en clusters M10+. Revisa en **Backup** → **Continuous Backup** o **Cloud Backup**.

---

## 4️⃣ Resumen de variables para producción

| Variable | Obligatorio | Descripción |
|----------|-------------|-------------|
| `JWT_SECRET` | ✅ | Mínimo 32 caracteres |
| `MONGODB_URI` | ✅ | URI de MongoDB Atlas |
| `NEXT_PUBLIC_SENTRY_DSN` | ✅ | DSN del proyecto Sentry |
| `SENTRY_ORG` | ⚠️ Build | Slug de la org en Sentry (ej. lexis-bill) |
| `SENTRY_PROJECT` | ⚠️ Build | Slug del proyecto (ej. javascript-nextjs) |
| `SENTRY_AUTH_TOKEN` | ❌ | Para subir source maps; crea en Sentry → Auth Tokens |
| `CORS_ORIGIN` | ✅ | URL del frontend (ej. https://lexisbill.com) |
| `NEXT_PUBLIC_API_URL` | ✅ | URL de tu API (ej. https://api.lexisbill.com/api) |
