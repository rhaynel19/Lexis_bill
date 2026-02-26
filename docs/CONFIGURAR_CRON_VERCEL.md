# Cómo configurar el Cron en Vercel (Lexis Bill)

El proyecto usa un **cron** para ejecutar la reconciliación automática (pagos, suscripciones, gracia, suspensión) cada día. Así se configura.

---

## 1. Variable de entorno CRON_SECRET

1. **Genera un secreto** (solo una vez). En terminal:
   ```bash
   openssl rand -hex 32
   ```
   O usa un generador de contraseñas (mínimo 32 caracteres, aleatorio).

2. **Añádelo en Vercel:**
   - Entra a tu proyecto en [vercel.com](https://vercel.com) → **Settings** → **Environment Variables**.
   - **Name:** `CRON_SECRET`
   - **Value:** el valor que generaste (pega sin espacios).
   - Marca **Production** (y **Preview** si quieres que el cron corra también en preview).
   - Guarda.

**Importante:** Sin `CRON_SECRET` en producción, el backend **no arranca** (comprueba que exista y que no sea el valor por defecto).

---

## 2. Cron en vercel.json

En la raíz del repo ya está definido en `vercel.json`:

```json
"crons": [
  { "path": "/api/cron/reconcile", "schedule": "0 2 * * *" }
]
```

- **path:** ruta que se llama: `POST /api/cron/reconcile`.
- **schedule:** expresión cron. `0 2 * * *` = **todos los días a las 2:00 AM** (hora del servidor de Vercel, normalmente UTC).

Para cambiar la hora (ej. 4:00 AM):

- 4:00 AM UTC: `"0 4 * * *"`
- 2:00 AM en República Dominicana (UTC-4): en UTC serían 6:00 → `"0 6 * * *"`

Tras cambiar `vercel.json`, haz commit y push; Vercel usará la nueva configuración en el siguiente deploy.

---

## 3. Cómo se autentica el cron

Vercel, al invocar la URL del cron, puede enviar el secreto de dos formas:

1. **Header `Authorization: Bearer <CRON_SECRET>`**  
   En muchos proyectos Vercel inyecta la variable de entorno y la envía como `Authorization: Bearer ...`. El backend **ya acepta** este formato.

2. **Header `x-cron-secret`**  
   Si en el futuro configuras un cron externo (por ejemplo otro servicio), puedes enviar el mismo valor en el header `x-cron-secret`.

El backend comprueba, en este orden: `x-cron-secret`, `body.secret` y `Authorization: Bearer ...`. Si alguno coincide con `CRON_SECRET`, la petición se acepta.

---

## 4. Comprobar que funciona

1. **Despliega** con `CRON_SECRET` configurado en Vercel.
2. En el **dashboard de Vercel** → proyecto → **Settings** → **Cron Jobs** (o pestaña similar) deberías ver el cron listado con la ruta y el schedule.
3. Puedes hacer una prueba manual (solo en entorno seguro) con:
   ```bash
   curl -X POST https://tu-dominio.vercel.app/api/cron/reconcile \
     -H "Authorization: Bearer TU_CRON_SECRET"
   ```
   Debe devolver JSON con `success: true` y los resultados. No compartas el secreto ni hagas esto desde sitios públicos.

---

## 5. Resumen

| Paso | Acción |
|------|--------|
| 1 | Generar valor aleatorio para `CRON_SECRET`. |
| 2 | Añadir variable `CRON_SECRET` en Vercel (Production y opcionalmente Preview). |
| 3 | Dejar o ajustar el cron en `vercel.json` (path y schedule). |
| 4 | Hacer deploy; el cron se ejecutará a la hora indicada y el backend validará el secreto. |

Si algo falla, revisa que `CRON_SECRET` esté definido en el entorno donde corre el cron y que no tenga espacios o saltos de línea.
