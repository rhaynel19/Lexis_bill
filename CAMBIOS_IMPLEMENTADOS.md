# CAMBIOS IMPLEMENTADOS – LEXISBILL PRODUCCIÓN CONTROLADA

**Fecha:** 30 de Enero, 2026  
**Objetivo:** Cerrar hallazgos críticos y medios del informe de auditoría  

---

## 1. SEGURIDAD (OBLIGATORIO)

### 1.1 JWT

- Eliminado fallback hardcodeado de JWT_SECRET
- Arranque falla si JWT_SECRET no existe o tiene menos de 32 caracteres
- Token solo en cookie HttpOnly (`lexis_auth`)
- Endpoint `/api/auth/logout` para limpiar cookie
- Login ya no devuelve `accessToken` en el body

### 1.2 Eliminación de token en URLs

- Descargas 607 y 606 usan `fetch` con `credentials: "include"`
- El token viaja solo en la cookie
- Página de reportes actualizada para usar `api.downloadReport607` y `api.downloadReport606`

### 1.3 Middleware de autenticación

- Creado `middleware.ts` para rutas protegidas
- Verifica cookie `lexis_auth` en `/dashboard`, `/cotizaciones`, `/reportes`, etc.
- Redirección a `/login` si no hay sesión válida

### 1.4 api-service

- Todas las peticiones usan `credentials: "include"`
- Eliminado uso de `localStorage` para el token
- Eliminados headers `Authorization: Bearer` en todas las llamadas

---

## 2. NCF – CUMPLIMIENTO FISCAL DGII

### 2.1 getNextNcf

- Validación de unicidad antes de asignar
- Validación de fecha de expiración del rango NCF
- Validación tipo cliente vs tipo NCF (B01/E31 empresas, B02/E32 consumidor, B15/E15 gobierno)
- La secuencia no se incrementa si la factura falla (uso de transacciones)

### 2.2 Tipos soportados

- Serie B: B01, B02, B14, B15
- Serie E: E31, E32, E15
- Comentarios fiscales añadidos en puntos críticos

---

## 3. REPORTE 607 (VENTAS)

- Formato reescrito según Norma DGII 06-2018/07-2018
- Campos: RNC, TipoId, NCF, NCFModificado, TipoIngreso, FechaComprobante, FechaRetencion, MontoFacturado, ITBISFacturado, etc.
- Campos no aplicables = 0.00
- Fechas en YYYYMMDD
- Validación de nombre fiscal confirmado

---

## 4. REPORTE 606 (GASTOS)

### 4.1 Fuente única

- Eliminado endpoint duplicado
- Un solo endpoint que usa exclusivamente la colección Expenses

### 4.2 Validaciones

- Validación de estructura del NCF del suplidor
- Categorías 01–11 DGII validadas
- No permite exportar si faltan campos obligatorios o hay errores fiscales
- Validación de nombre fiscal confirmado

---

## 5. COTIZACIONES (QUOTES)

### 5.1 Modelo MongoDB

- Nuevo modelo `Quote` con estados: `draft`, `sent`, `converted`
- Campos: clientName, clientRnc, clientPhone, items, subtotal, itbis, total, validUntil, invoiceId

### 5.2 API

- `GET /api/quotes` – listar cotizaciones
- `POST /api/quotes` – crear
- `PUT /api/quotes/:id` – actualizar
- `POST /api/quotes/:id/convert` – convertir a factura (bloquea doble facturación)

### 5.3 Migración de localStorage

- Página de cotizaciones usa `api.getQuotes()`
- Nueva cotización usa `api.createQuote()` y `api.updateQuote()`
- Auto-guardado cada 30s solo para cotizaciones existentes (modo edición)
- Conversión a factura vía API (no más `invoiceToClone`)

---

## 6. UX / RESPONSIVE

- Tablas con `overflow-x-auto` y `min-w-[640px]`
- Botón Facturar visible en móvil (cotizaciones)
- Botones con tamaño táctil mínimo (36px)
- StatusBadge actualizado con estados: draft, sent, converted

---

## 7. CONFIGURACIÓN Y ROBUSTEZ

### 7.1 next.config.js

- Eliminados `ignoreDuringBuilds` e `ignoreBuildErrors`
- Añadidos rewrites para proxy `/api` en desarrollo (same-origin para cookies)

### 7.2 env_example

- Actualizado con JWT_SECRET obligatorio (32+ caracteres)
- Añadido MONGODB_URI, CORS_ORIGIN, NEXT_PUBLIC_API_URL

---

## 8. DOCUMENTACIÓN

- Creado `DISCLAIMER_FISCAL.md` con:
  - Qué no valida DGII oficialmente
  - Responsabilidad del usuario
  - Uso recomendado

- Comentarios en código en puntos fiscales críticos (API)

---

## ARCHIVOS MODIFICADOS

- `api/index.js` – Seguridad, NCF, 606, 607, Quotes, CORS
- `lib/api-service.ts` – Credenciales, downloads, quotes
- `lib/secure-fetch.ts` – `credentials: "include"`
- `app/(public)/login/page.tsx` – Sin almacenar token
- `app/(protected)/layout.tsx` – Logout vía API
- `app/(protected)/reportes/page.tsx` – Descargas con blob
- `app/(protected)/cotizaciones/page.tsx` – API, conversión
- `app/(protected)/nueva-cotizacion/page.tsx` – API, auto-save
- `next.config.js` – Rewrites, eliminación de ignore*
- `middleware.ts` – Nuevo
- `components/ui/StatusBadge.tsx` – Estados draft, sent, converted
- `components/FacturaTable.tsx` – Overflow en tablas
- `env_example` – Variables obligatorias
- `package.json` – `cookie-parser`

---

## DEPLOYMENT

1. **Variables de entorno obligatorias:**
   - `JWT_SECRET` – mínimo 32 caracteres (sin esto la API no arranca)
   - `MONGODB_URI`
   - `CORS_ORIGIN` – opcional, por defecto según VERCEL_URL

2. **Build:**
   - Ejecutar `npm install` (incluye `cookie-parser`)
   - Ejecutar `npm run build`

3. **Desarrollo local:**
   - `npm run dev` (Next.js en 3000)
   - `npm run dev:backend` (API en 3001)
   - O `npm run dev:all` para ambos
   - La app usa `/api` y next.config reescribe a `http://localhost:3001/api` en dev

---

Lexis Bill – El orden que te deja tranquilo
