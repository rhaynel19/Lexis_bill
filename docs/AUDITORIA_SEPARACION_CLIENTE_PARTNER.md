# Auditoría: Separación Cliente vs Partner

## Estado actual (problemas)

1. **Login**: Tras autenticarse, todos los usuarios (cliente y partner) van a `getSafeRedirect(redirect)` → típicamente `/dashboard`. No hay distinción por rol.
2. **Middleware**: Solo comprueba existencia de cookie `lexis_auth`. No valida rol. Rutas `/partners` y `/dashboard` están en el mismo matcher; cualquier usuario autenticado puede acceder a ambas.
3. **Layout (protected)**: Un solo layout para todo. Muestra sidebar de cliente (Dashboard, Nueva factura, Clientes, Gastos, Reportes, Pagos, etc.) y un enlace extra "Partner" si `user.partner?.status === 'active'`. Un partner ve el mismo layout que un cliente y puede navegar a facturas, NCF, etc.
4. **Rutas**: Todo bajo `app/(protected)/` (dashboard, nueva-factura, partners, etc.). No existe ruta dedicada `/partner/dashboard` ni grupo de rutas solo para partner.
5. **Base de datos**: 
   - `User.role`: existe, valores `user` | `admin` | `partner`.
   - `Partner`: modelo separado con `userId`, `referralCode`, `commissionRate`, `status`, etc. No hay `parent_partner_id`; se puede añadir si se requiere jerarquía.
   - Al aprobar solicitud partner se hace `User.role = 'partner'`.
6. **Backend**: `verifyToken` + `verifyPartner` en rutas `/api/partners/*`. No hay `verifyClient` que prohíba a partners llamar endpoints de cliente (facturas, gastos, etc.); actualmente un partner podría llamar esos endpoints porque tiene token válido.
7. **Experiencia**: Partner entra a dashboard de cliente; identidad visual y flujo no están separados.

---

## Objetivo y diseño

- **CLIENT** (role `user`): Acceso solo a rutas de negocio: `/dashboard`, `/nueva-factura`, `/clientes`, `/gastos`, `/reportes`, `/pagos`, `/configuracion`, etc. Redirect post-login → `/dashboard` (o `?redirect=` sanitizado de ese ámbito).
- **PARTNER** (role `partner` + Partner activo): Acceso solo a rutas partner: `/partner/dashboard`, `/partner/referidos`, etc. Redirect post-login → `/partner/dashboard`. No debe ver ni acceder al dashboard ni a acciones de cliente (crear factura, NCF, etc.).
- **ADMIN** (role `admin`): Acceso a cliente + `/admin`. Redirect post-login según intención (p. ej. `/dashboard` o `?redirect=`).

---

## Cambios implementados (resumen)

1. **Login**: Tras `getMe()`, si `role === 'partner'` y `partner?.status === 'active'` → redirect a `/partner/dashboard`. En caso contrario → `getSafeRedirect(redirect)` (cliente/admin).
2. **Middleware**: Incluir `/partner` en rutas protegidas (exigir cookie). La comprobación de rol se hace en layouts (getMe en cliente/partner).
3. **Layout (protected)**: Si `user.role === 'partner'` y `partner?.status === 'active'` → `router.replace('/partner/dashboard')` para no mostrar nunca la app de cliente al partner.
4. **Nuevo layout Partner**: `app/(partner)/layout.tsx` que comprueba auth y rol; si no es partner activo → redirect a `/dashboard`. Nav y contenido solo para partner (métricas, referidos, comisiones, sin facturas/NCF).
5. **Ruta Partner**: `app/(partner)/partner/dashboard/page.tsx` con el contenido del dashboard partner (referidos, ingresos, comisiones, estado suscripciones vinculadas, etc.).
6. **Rutas permitidas redirect**: Añadir `/partner`, `/partner/dashboard` a la lista de redirect permitidos para que un partner con `?redirect=/partner/dashboard` vuelva ahí.
7. **Backend**: Implementado middleware `verifyClient`: rechaza con 403 a usuarios con `role === 'partner'` en endpoints de cliente. Aplicado a: NCF, customers, invoice-draft, services, invoice-templates, documents, dashboard/stats, invoices, reports (606/607/summary/tax-health/reminder), expenses, quotes, autofill, membership, payments/history, subscription/status, business-copilot, client-payment-risk, alerts, tickets.
8. **DB**: Mantener `User.role` y modelo `Partner`. Añadir `parentPartnerId` en Partner si en el futuro se requiere jerarquía; por ahora no obligatorio.

---

## Estructura de carpetas resultante

- `app/(protected)/` — Rutas de **cliente** (dashboard, nueva-factura, clientes, gastos, reportes, pagos, configuracion, documentos, ayuda). Layout redirige a partners a `/partner/dashboard`.
- `app/(partner)/` — Layout partner (nav propia, sin facturas/NCF).
  - `partner/dashboard/page.tsx` — Dashboard partner (métricas, referidos, comisiones).
- `app/(public)/` — Login, registro, landing, políticas.
- `components/` — Compartidos; se pueden extraer después a `shared/` si se desea.
- No reutilizar el dashboard de cliente para el partner; el partner solo entra a `/partner/*`.

---

## Seguridad

- Middleware: solo comprueba cookie (no puede ver rol sin decodificar JWT en Edge). La separación real se hace en layouts al llamar a `getMe()` y redirigir por rol.
- Backend: en endpoints sensibles de cliente, usar `verifyClient` (o equivalente) para devolver 403 si el usuario es partner. En endpoints partner seguir usando `verifyPartner`.
- Frontend: no depender solo de ocultar botones; el layout impide que el partner cargue rutas de cliente (redirect) y el backend debe rechazar llamadas de partner a APIs de cliente si se implementa `verifyClient`.
