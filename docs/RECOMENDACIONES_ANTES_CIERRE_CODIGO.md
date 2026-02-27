# Recomendaciones antes de cerrar código y salir a buscar clientes

Lista priorizada de lo que conviene tener listo antes de concentrarte en ventas. No es obligatorio hacer todo; el orden es por impacto vs esfuerzo.

---

## Imprescindible (hacer antes de clientes de pago)

### 1. Recalcular totales en cotizaciones (backend)

**Problema:** En POST/PUT de cotizaciones se aceptan `subtotal`, `itbis` y `total` del body sin recalcular desde los ítems. Riesgo de incoherencia fiscal y con las facturas.

**Qué hacer:** En `api/index.js`, en las rutas de cotizaciones:
- **POST /api/quotes:** Si hay `items`, calcular siempre con `computeAmountsFromItems(sanitizeItems(items))` y usar ese resultado para subtotal, itbis y total. No usar los valores del body.
- **PUT /api/quotes/:id:** Si se envían `items`, recalcular con la misma función y actualizar los tres campos. No aceptar solo subtotal/itbis/total del body cuando hay ítems.

**Esfuerzo:** Bajo (1–2 h). **Impacto:** Alto (integridad fiscal).

---

### 2. Proteger búsqueda de usuarios en admin (ReDoS)

**Problema:** En listado de usuarios admin, `q` se usa en `new RegExp(q, 'i')` sin límite. Una búsqueda muy larga o con caracteres especiales puede bloquear el evento de Node.

**Qué hacer:** Limitar longitud y escapar regex, por ejemplo:
- `const q = (req.query.q || '').trim().slice(0, 100);`
- Antes de usarlo en RegExp, escapar: `str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')` y usar ese valor en el RegExp.

**Esfuerzo:** Bajo (~30 min). **Impacto:** Medio (evita caída del panel admin).

---

### 3. Verificación por correo (opcional pero recomendada)

**Problema:** Sin SMTP configurado, los usuarios no reciben el enlace de verificación; pueden registrarse con correos que no controlan.

**Qué hacer:** Seguir `docs/VERIFICACION_POR_CORREO_LEXIS_BILL.md`: configurar SMTP (p. ej. Resend), dejar activa la verificación y definir `VERIFICATION_REQUIRED_AFTER` para nuevos registros.

**Esfuerzo:** Medio (1–2 h de configuración). **Impacto:** Alto para confianza y calidad de leads.

---

## Muy recomendable (refuerza imagen y soporte)

### 4. Mostrar vencimiento del plan con fecha y hora

**Problema:** El usuario no sabe “a qué hora” termina su trial/plan hoy.

**Qué hacer:** En la página de Pagos (y/o en el badge de suscripción del dashboard), mostrar no solo la fecha sino la hora de `currentPeriodEnd` o `expiryDate` (ej. “Tu trial termina el 15/02/2026 a las 14:30”). En el backend ya se guarda Date; en el front formatear con `toLocaleString('es-DO', { dateStyle: 'short', timeStyle: 'short' })`.

**Esfuerzo:** Bajo. **Impacto:** Menos dudas y menos soporte.

---

### 5. Página o sección “Estado del sistema” / Health público

**Qué hacer:** Tener una URL pública (ej. `lexisbill.com.do/estado` o reutilizar `/api/health`) que devuelva “Operativo” o “Degradado” sin exponer detalles internos. Así puedes enlazarla en pie de página o en correos (“¿Problemas? Revisa el estado: …”) y dar confianza.

**Esfuerzo:** Bajo si reutilizas el health existente con una vista mínima. **Impacto:** Confianza y menos “¿está caído?”.

---

### 6. Documentar variables de entorno críticas

**Qué hacer:** Crear `.env.example` (sin valores reales) con las variables que debe tener quien despliegue: `JWT_SECRET`, `MONGODB_URI`, `CRON_SECRET`, `SMTP_*`, `SEND_VERIFICATION_EMAIL`, `VERIFICATION_REQUIRED_AFTER`, `CORS_ORIGIN`, `COOKIE_DOMAIN`, etc. Una línea por variable con un comentario breve. No commitear `.env`.

**Esfuerzo:** Bajo. **Impacto:** Deploys más rápidos y menos errores en producción.

---

## Opcional (puedes dejarlo para después de primeros clientes)

- **Modularización** de la API (routes/controllers/services): mejora mantenimiento; no es bloqueante para lanzar.
- **JWT refresh** y rotación: mejora seguridad y UX; el flujo actual es usable.
- **Rate limit global** (ej. 200 req/min por IP): refuerza defensa; ya tienes límites por ruta.
- **Caché de sesión** (Redis o en memoria) para reducir lecturas en verifyToken: optimización cuando el tráfico crezca.

---

## Checklist rápido antes de “cerrar código”

| # | Tarea | Hecho |
|---|--------|--------|
| 1 | Recalcular totales en cotizaciones (backend) | ☑ |
| 2 | Limitar y escapar `q` en búsqueda admin | ☑ |
| 3 | SMTP + verificación por correo (si quieres correos reales) | ☐ |
| 4 | Mostrar fecha y hora de vencimiento del plan | ☐ |
| 5 | Página o enlace de “Estado del sistema” | ☐ |
| 6 | `.env.example` con variables críticas | ☐ |

Con 1 y 2 listos puedes cerrar la parte de código con buena conciencia para facturación y panel admin. El resto refuerza imagen, soporte y operación.
