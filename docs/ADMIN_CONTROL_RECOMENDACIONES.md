# Recomendaciones de control y mejoras para el Panel Admin

Resumen de controles ya implementados y sugerencias para ampliar el control y la operación del sistema.

---

## Ya implementado

| Funcionalidad | Dónde | Descripción |
|---------------|--------|-------------|
| **Pagos pendientes** | `/admin` | Aprobar o rechazar solicitudes de pago (transferencia/PayPal). |
| **Usuarios registrados** | `/admin/usuarios` | Listado con búsqueda, filtros (rol, plan, estado), exportar CSV. Nombres genéricos "CONTRIBUYENTE REGISTRADO" se muestran como "Sin nombre fiscal (email)". |
| **Partners** | `/admin/partners` | Aprobar/suspender partners, cartera de referidos, comisiones, invitaciones. |
| **Estadísticas CEO** | `/admin/dashboard` | Gráficas de ingresos, facturas, usuarios por plan; exportar CSV y selector de periodo. |

---

## Recomendaciones de control (próximos pasos)

### 1. Detalle de usuario (desde el listado)
- **Qué:** Al hacer clic en una fila o en "Ver", abrir un panel/drawer con:
  - Datos del usuario (nombre, email, RNC, plan, vencimiento).
  - Últimas facturas o total facturado.
  - Si es referido por partner, mostrar referidor.
- **Para qué:** Revisar un usuario concreto sin salir del admin.

### 2. Bloquear / desbloquear cuenta
- **Qué:** Acción "Bloquear acceso" para un usuario (por abuso, solicitud, etc.).
- **Implementación:** Campo `User.blocked: Boolean` y que el login/API rechace cuando `blocked === true`. En el listado de usuarios, botón "Bloquear" / "Desbloquear".
- **Riesgo:** Solo administradores; registrar quién bloqueó y cuándo (audit log).

### 3. Registro de acciones de admin (audit log)
- **Qué:** Guardar en BD quién (admin) hizo qué y cuándo: aprobar pago, rechazar pago, aprobar partner, bloquear usuario, etc.
- **Implementación:** Colección `AdminAuditLog` con `adminId`, `action`, `targetType`, `targetId`, `metadata`, `createdAt`. Mostrar en `/admin/audit` o en un panel colapsable.
- **Para qué:** Trazabilidad y soporte ante reclamaciones.

### 4. Alertas en el panel
- **Qué:** Bloque destacado en `/admin` o en el dashboard con:
  - Trials por vencer en X días.
  - Usuarios que llevan muchos días sin iniciar sesión (inactivos).
  - Picos de errores (si usas Sentry) o fallos de API.
- **Para qué:** Tomar acción antes de que expire un trial o se pierda un usuario.

### 5. Comunicación in-app
- **Qué:** Banner o modal para todos los usuarios (o por segmento: solo Trial, solo Pro) con avisos de mantenimiento, nuevas funciones o recordatorios fiscales.
- **Implementación:** Colección `Announcement` con mensaje, fechas de vigencia, audiencia (all / trial / pro). El layout protegido lee el anuncio activo y lo muestra una vez por usuario (por cookie o flag en usuario).

### 6. 2FA para administradores
- **Qué:** Segundo factor (TOTP, ej. Google Authenticator) solo para cuentas con rol `admin`.
- **Para qué:** Reducir riesgo si alguien obtiene la contraseña de un admin.

### 7. Exportar listado de usuarios con filtros
- **Ya tienes:** Exportar CSV del listado actual. Puedes mejorar dejando claro que el CSV respeta los filtros aplicados (rol, plan, estado) y añadiendo en el nombre del archivo los filtros usados, por ejemplo: `usuarios-lexisbill-2026-02-03-trial.csv`.

---

## Prioridad sugerida

1. **Corto plazo:** Detalle de usuario (1) y audit log básico (3) para tener más control y trazabilidad.
2. **Medio plazo:** Bloquear cuenta (2) y alertas en el panel (4).
3. **Largo plazo:** Comunicación in-app (5) y 2FA para admins (6).

Si quieres, se puede bajar a nivel de esquemas de API y pantallas concretas para cualquiera de estos puntos.
