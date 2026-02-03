# Onboarding Obligatorio y Mejoras de Arquitectura

**Fecha:** Febrero 2026

## 1. Onboarding Guiado (First-Run Experience)

### Implementado

- **Campo `onboardingCompleted`** en modelo User (API)
- **Ruta `/onboarding`** — Wizard obligatorio antes de facturar
- **Middleware** — `/onboarding` protegido (requiere login)
- **Layout protegido** — Redirige a `/onboarding` si `onboardingCompleted === false`
- **Bloqueo de facturación** — POST `/api/invoices` retorna 403 si no completó onboarding

### Flujo del wizard

1. **Paso 1 — Datos fiscales**
   - RNC/Cédula (validado con DGII)
   - Nombre fiscal
   - Dirección (obligatoria)
   - Teléfono, email (opcionales)

2. **Paso 2 — Siguiente paso**
   - Indica que debe configurar NCF en Configuración
   - Botón "Finalizar configuración"

### Migración usuarios existentes

- Usuarios creados **antes del 2026-02-01** se consideran onboarded (no se bloquean).
- Usuarios nuevos (registro) tienen `onboardingCompleted: false`.

### API

- `GET /api/auth/me` — Devuelve `onboardingCompleted`
- `POST /api/onboarding/complete` — Marca onboarding como completado y actualiza datos fiscales

---

## 2. Optimización MongoDB

- **maxPoolSize: 25** — Concurrencia para múltiples solicitudes simultáneas.
- **Proyecciones** — Lista de clientes: solo campos necesarios (`name rnc phone email lastInvoiceDate`).
- **Índices** — Ya existían los críticos (userId+date, userId+rnc, etc.).

---

## 3. Vercel Analytics

- `@vercel/analytics` instalado.
- Componente `<Analytics />` en `app/layout.tsx`.
- Métricas de visitas y rendimiento en el dashboard de Vercel.

---

## 4. Capacidad estimada

Con las mejoras aplicadas, el sistema está preparado para:

- **Cientos de usuarios** sin cambios arquitectónicos.
- **Queries optimizadas** (proyecciones, índices, pool).
- **Monitoreo** con Sentry (ya configurado) y Vercel Analytics.

---

## 5. Pendiente (futuras iteraciones)

- Dynamic imports para componentes pesados (PDF, gráficas).
- Skeletons mejorados en todas las listas.
- Server Components para dashboards y reportes.
- Migración de `middleware` a `proxy` (Next.js 16).
