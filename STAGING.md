# Entorno Staging — Lexis Bill

## Objetivo

**Nunca testear en producción.** Toda feature pasa por staging.

## Configuración

### 1. Base de datos separada

Crear un cluster o base de datos distinto en MongoDB Atlas:

- Producción: `lexis_bill`
- Staging: `lexis_bill_staging`

### 2. Variables de entorno

```env
NODE_ENV=staging
MONGODB_URI=mongodb+srv://...lexis_bill_staging
JWT_SECRET=<secreto_diferente_al_de_produccion>
CORS_ORIGIN=https://staging.lexisbill.com
NEXT_PUBLIC_SENTRY_DSN=<dsn_proyecto_staging_sentry>
```

### 3. Deploy Vercel

- Crear proyecto de Preview o branch `staging`
- Configurar dominio: `staging.lexisbill.com`
- Usar las variables de staging

### 4. Reglas

| Regla | Descripción |
|-------|-------------|
| No producción en staging | Datos de prueba únicamente |
| Preview antes de merge | Todo PR se despliega en preview |
| Staging = pre-producción | Última validación antes de prod |
