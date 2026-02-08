# Programa de Partners - Lexis Bill

## Guía de Implementación - Revenue Share Recurrente

---

## Modelo Híbrido de Onboarding

Lexis Bill usa un **modelo híbrido** para reclutar partners:

1. **Aplicación abierta**: Cualquier usuario logueado puede ir a `/unirse-como-partner` y solicitar ser partner.
2. **Invitación por link**: El admin genera links exclusivos en `/admin/partners` (card "Invitaciones Partner") para invitar a contadores, consultores o referidos clave.
   - Link generado: `https://lexisbill.com.do/unirse-como-partner?invite=INVxxxxx`
   - Quien entra con link válido ve badge "Invitación válida — Prioridad en aprobación" y la solicitud queda marcada como invitada (`invitedBy`).
   - Las invitaciones expiran en 7 días y tienen 1 uso por defecto (configurable en API).
3. **Flujo registro + invitación**: Si el usuario llega con invite pero no está logueado, puede "Crear cuenta" o "Ya tengo cuenta". Tras registrarse con `?invite=`, se redirige a `/unirse-como-partner?invite=` para completar la solicitud.

---

## 1. Modelo de Negocio

| Regla | Detalle |
|-------|---------|
| **Comisión** | 10% sobre clientes activos (pagos cobrados) |
| **Pago** | Mensual, 30 días después del cobro |
| **Condición** | Cliente activo + Partner cumple soporte básico |
| **Propiedad** | La cartera pertenece a Lexis Bill, no al partner |

### Niveles de Comisión (Tiered)

| Nivel | Clientes Activos | Comisión |
|-------|------------------|----------|
| **Starter** | 5-20 | 7% |
| **Growth** | 21-50 | 9% |
| **Elite** | 51+ | 10% |

---

## 2. Modelos de Datos (MongoDB)

### 2.1 Schema: Partner

```javascript
const partnerSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  referralCode: { type: String, required: true, unique: true }, // ej: "JUAN2025"
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  
  // Nivel y comisión actual
  tier: { type: String, enum: ['starter', 'growth', 'elite'], default: 'starter' },
  commissionRate: { type: Number, default: 0.07 }, // 7%, 9%, 10%
  
  // Datos bancarios para pago (encriptar en producción)
  bankName: { type: String },
  bankAccount: { type: String },
  bankAccountType: { type: String, enum: ['ahorro', 'corriente'] },
  
  // Estado
  status: { type: String, enum: ['pending', 'active', 'suspended'], default: 'pending' },
  approvedAt: { type: Date },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  // Cláusula aceptada
  termsAcceptedAt: { type: Date, required: true },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
partnerSchema.index({ referralCode: 1 });
partnerSchema.index({ status: 1 });
```

### 2.2 Schema: PartnerReferral (cliente referido)

```javascript
const partnerReferralSchema = new mongoose.Schema({
  partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  
  // Estado del cliente
  status: { type: String, enum: ['active', 'churned', 'trial'], default: 'trial' },
  subscribedAt: { type: Date }, // Cuando pasó a pago (Activo)
  churnedAt: { type: Date },
  
  // Historial de pagos cobrados (para comisión)
  payments: [{
    date: { type: Date },
    amount: { type: Number }, // RD$950
    paymentRef: { type: String },
    commissionEligible: { type: Boolean, default: true } // Después de 30 días
  }],
  
  createdAt: { type: Date, default: Date.now }
});
partnerReferralSchema.index({ partnerId: 1, status: 1 });
partnerReferralSchema.index({ userId: 1 }, { unique: true });
```

### 2.3 Schema: PartnerCommission (comisiones calculadas)

```javascript
const partnerCommissionSchema = new mongoose.Schema({
  partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', required: true },
  month: { type: String, required: true }, // "2025-02"
  year: { type: Number, required: true },
  
  // Métricas
  activeClientsCount: { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0 }, // Suma de RD$950 de clientes activos
  commissionRate: { type: Number }, // 0.07, 0.09, 0.10
  commissionAmount: { type: Number, default: 0 },
  
  // Estado del pago
  status: { type: String, enum: ['pending', 'paid', 'cancelled'], default: 'pending' },
  paidAt: { type: Date },
  paymentRef: { type: String },
  
  createdAt: { type: Date, default: Date.now }
});
partnerCommissionSchema.index({ partnerId: 1, month: 1 }, { unique: true });
```

---

## 3. Flujo de Registro con Referral

### 3.1 URL de Registro con Código

```
/registro?ref=JUAN2025
```

### 3.2 Modificaciones en `registro/page.tsx`

1. Leer `ref` de `useSearchParams()`
2. Si existe y es válido, guardar en `localStorage` o enviar en el payload
3. Al crear usuario, si hay `ref`, crear `PartnerReferral` con `partnerId`

### 3.3 Lógica en API (POST /api/auth/register)

```javascript
// Después de crear usuario
if (req.body.referralCode) {
  const partner = await Partner.findOne({ referralCode: req.body.referralCode, status: 'active' });
  if (partner) {
    await PartnerReferral.create({
      partnerId: partner._id,
      userId: newUser._id,
      status: 'trial'
    });
  }
}
```

---

## 4. Cálculo de Comisión (Mensual)

### 4.1 Job/Cron (ejecutar el día 1 de cada mes)

```
Para cada Partner activo:
  1. Contar PartnerReferral donde status='active' 
     y userId tiene subscriptionStatus='Activo' 
     y pagó en el mes anterior (o es recurrente)
  
  2. Determinar tier según conteo:
     - 5-20: starter (7%)
     - 21-50: growth (9%)
     - 51+: elite (10%)
  
  3. Calcular comisión:
     totalRevenue = activeClientsCount × 950
     commissionAmount = totalRevenue × commissionRate
  
  4. Crear/actualizar PartnerCommission para el mes
     (mes = mes anterior, por regla de 30 días)
```

### 4.2 Regla de 30 días

- Cobro del cliente: día 15 de febrero
- Comisión elegible: después del 15 de marzo
- PartnerCommission de marzo incluye ese cliente

---

## 5. API Endpoints

### 5.1 Partner (requiere rol `partner` o `admin`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/partners/me | Datos del partner actual |
| GET | /api/partners/dashboard | Métricas: clientes activos, comisión mes, historial |
| GET | /api/partners/referrals | Lista de clientes referidos (solo conteo y estado) |
| GET | /api/partners/commissions | Historial de comisiones |
| POST | /api/partners/apply | Solicitud para ser partner (crea Partner con status pending) |

### 5.2 Admin

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/admin/partners | Lista de partners |
| POST | /api/admin/partners/:id/approve | Aprobar partner |
| POST | /api/admin/partners/:id/suspend | Suspender partner |
| GET | /api/admin/partners/commissions | Comisiones pendientes de pago |

### 5.3 Público (sin auth)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/referral/validate?code=JUAN2025 | Validar si código existe (para mostrar badge en registro) |

---

## 6. Partner Dashboard (UI)

### 6.1 Ruta: `/partners` o `/partner-dashboard`

**Requisito:** Usuario debe ser Partner (role `partner` o tener documento en colección Partner)

### 6.2 Componentes del Dashboard

| Sección | Contenido |
|---------|-----------|
| **Resumen** | Clientes activos, comisión este mes, total acumulado |
| **Gráfica** | Evolución de clientes activos (últimos 6 meses) |
| **Nivel** | Badge Starter/Growth/Elite + progreso al siguiente nivel |
| **Link de referido** | `lexisbill.com.do/registro?ref=JUAN2025` + botón copiar |
| **Historial comisiones** | Tabla: mes, clientes, monto, estado (pendiente/pagado) |
| **Clientes** | Solo cantidad y estado (NO nombres - protección de datos) |

### 6.3 Ejemplo de tarjetas

```
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│ Clientes Activos    │  │ Comisión Este Mes   │  │ Nivel Actual        │
│ 47                  │  │ RD$ 4,009           │  │ Growth (9%)          │
│ +3 vs mes anterior  │  │ Pago: 15 Mar 2025   │  │ 4 para Elite        │
└─────────────────────┘  └─────────────────────┘  └─────────────────────┘
```

---

## 7. Cambios en User Model

Agregar campo opcional:

```javascript
role: { type: String, enum: ['user', 'admin', 'partner'], default: 'user' }
```

Un usuario puede ser `user` y `partner` a la vez (usa Lexis Bill y refiere). O crear usuarios separados para partners que solo refieren.

**Recomendación:** Un partner es un usuario que también usa Lexis Bill. Tiene `role: 'partner'` y un documento en `Partner`.

---

## 8. Aplicación para ser Partner

### 8.1 Página: `/unirse-como-partner` (pública)

Formulario completo (modelo híbrido recomendado):
- **Beneficios**: sección con niveles (Starter/Growth/Elite) y ventajas del programa.
- **Términos**: resumen + “Ver términos completos” expandible + checkbox obligatorio “Acepto los términos del Programa de Partners”.
- **Tu solicitud**: nombre, teléfono (opcional), “¿Por qué quieres ser partner?” (textarea, opcional, máx. 2000 caracteres).
- Envía a POST /api/partners/apply (name, phone, whyPartner, inviteToken). El backend guarda `whyPartner` en el documento Partner.

### 8.2 Admin aprueba

- Admin va a /admin/partners
- Ve solicitudes pendientes
- Aprueba → status = 'active', genera referralCode único

---

## 9. Orden de Implementación

### Fase 1: Base (1-2 semanas)

1. Crear schemas: Partner, PartnerReferral, PartnerCommission
2. Modificar registro: capturar ?ref= y crear PartnerReferral
3. Endpoint GET /api/referral/validate
4. Lógica: marcar PartnerReferral como 'active' cuando usuario paga (subscriptionStatus = 'Activo')

### Fase 2: Comisiones (1 semana)

5. Job/cron o endpoint manual para calcular comisiones mensuales
6. Integrar con PaymentRequest: cuando se aprueba pago, actualizar PartnerReferral
7. Endpoints: /api/partners/dashboard, /api/partners/commissions

### Fase 3: Dashboard UI (1-2 semanas)

8. Página /partners (protegida, solo partners)
9. Componentes: resumen, gráfica, link referido, historial
10. Diseño responsive

### Fase 4: Admin y Aplicación (1 semana)

11. Página /unirse-como-partner
12. Admin: lista partners, aprobar, suspender
13. Emails: notificación al partner cuando es aprobado

---

## 10. Cláusula Legal Sugerida

> **Términos del Programa de Partners Lexis Bill**
>
> - La cartera de clientes referidos pertenece a Lexis Bill. El partner recibe comisión mientras el cliente permanezca activo dentro del programa.
> - La comisión se paga mensualmente, 30 días después del cobro efectivo al cliente.
> - El partner se compromete a brindar soporte básico de onboarding a sus referidos.
> - Lexis Bill se reserva el derecho de modificar tasas de comisión con 30 días de anticipación.
> - Lexis Bill puede suspender al partner por incumplimiento de términos o conducta fraudulenta.

---

## 11. Variables de Entorno

```env
# Partner Program
PARTNER_COMMISSION_STARTER=0.07
PARTNER_COMMISSION_GROWTH=0.09
PARTNER_COMMISSION_ELITE=0.10
PARTNER_MIN_CLIENTS_STARTER=5
PARTNER_MIN_CLIENTS_GROWTH=21
PARTNER_MIN_CLIENTS_ELITE=51
```

---

## 12. Seguridad

- Partners NO ven datos personales de clientes (solo conteo y estado)
- Validar que partnerId en PartnerReferral coincide con el partner autenticado
- Admin: verificar role === 'admin' en todos los endpoints
- Rate limit en /api/partners/apply para evitar spam

---

## 13. Evitar duplicidad (cuentas y partners)

### 13.1 Registro de cliente (/registro)

- **Email único:** La API `POST /api/auth/register` comprueba si el correo ya existe (`User.findOne({ email })`). Si existe, responde 400 con "Este correo ya está registrado." También se captura el error 11000 de MongoDB (índice único) con mensaje "El correo o el RNC ya están registrados."
- **Usuario ya logueado:** La página `/registro` comprueba sesión (`api.getMe()`). Si el usuario ya está logueado, se redirige a `/dashboard` o a `/unirse-como-partner` (si llegó con `?tipo=partner` o `?invite=`), evitando intentar crear una segunda cuenta.

### 13.2 Solicitud de partner (POST /api/partners/apply)

- **Solicitud pendiente:** Si ya existe un documento Partner con `status: 'pending'` para ese usuario, la API responde 400: "Ya tienes una solicitud pendiente."
- **Partner activo:** Si `status: 'active'`, responde 400: "Ya eres partner activo." (incluye `referralCode`).
- **Partner suspendido:** Si `status: 'suspended'`, responde 400: "Tu cuenta partner está suspendida. Contacta a soporte."
- Un usuario (cliente) solo puede tener un documento Partner; no se permite duplicar la solicitud ni tener dos perfiles partner.

---

## 14. Sugerencias de implementación futura

Priorizadas por **impacto** y **esfuerzo**. Lo que ya está hecho (registro, apply, dashboard, admin, invitaciones, duplicidad) no se repite.

### 14.1 Programa Partners (alto impacto)

| Sugerencia | Estado | Notas |
|------------|--------|--------|
| **Job/cron de comisiones mensuales** | ✅ Implementado | POST `/api/admin/partners/calculate-commissions` (admin). Botón "Calcular comisiones (mes anterior)" en Admin → Partners. Opcional: cron el día 1 que llame a este endpoint. |
| **Email al aprobar partner** | ✅ Estructura lista | Tras aprobar se registra en log. Para enviar email: crear `api/mailer.js` con `sendPartnerApproved(email, name, referralCode, referralUrl)` y `SEND_PARTNER_APPROVED_EMAIL=true`. |
| **Mostrar "¿Por qué quieres ser partner?" en admin** | ✅ Implementado | Columna "¿Por qué partner?" en lista de partners (Admin → Partners) con tooltip con texto completo. |
| **Gráfica de evolución** | ✅ Implementado | En `/partners`, gráfica de barras (clientes activos por mes, últimos 12 meses). |

### 14.2 Auth y seguridad (alto impacto)

| Sugerencia | Estado | Notas |
|------------|--------|--------|
| **Recuperar contraseña** | ✅ Implementado | `/recuperar-contrasena` (solicitar enlace), `/restablecer-contrasena?token=` (nueva contraseña). API: POST `/api/auth/forgot-password`, POST `/api/auth/reset-password`. Login enlaza "¿Olvidó su contraseña?" a `/recuperar-contrasena`. Email: configurar `SEND_PASSWORD_RESET_EMAIL=true` y `api/mailer.js` con `sendPasswordReset(email, resetUrl)`. |
| **Rate limit en login** | ✅ Ya existía | `authLimiter` (5 intentos / 15 min) aplicado a `/api/auth/login`. |
| **Verificación de email (opcional)** | ✅ Estructura mínima | Campo `User.emailVerified`, colección `EmailVerify`, POST `/api/auth/verify-email` (token). Falta: enviar email con link al registrarse (integrar con mailer). |

### 14.3 UX y operación

| Sugerencia | Descripción | Esfuerzo |
|------------|-------------|----------|
| **Página pública de términos del programa** | Ruta tipo `/programa-partners` o `/terminos-partners` con el texto legal completo, enlazable desde "Ver términos completos" en `/unirse-como-partner`. | Bajo |
| **Exportar lista de partners (admin)** | Botón en admin partners para descargar CSV/Excel (nombre, email, código, estado, clientes, comisiones) para reportes o contabilidad. | Bajo |
| **Notificación in-app al partner** | ✅ Implementado | Aprobado: mensaje "Tu solicitud fue aprobada" en `/partners` (primeros 7 días). Suspendido: banner en layout protegido "Tu cuenta partner fue suspendida. Contacta a soporte." | Bajo |

### 14.4 Pendiente opcional

- **Email real:** Crear `api/mailer.js` con `sendPasswordReset(email, resetUrl)` y `sendPartnerApproved(email, name, referralCode, referralUrl)`; configurar Resend/SendGrid y `SEND_PASSWORD_RESET_EMAIL=true`, `SEND_PARTNER_APPROVED_EMAIL=true`.
- **Cron comisiones:** Llamar a POST `/api/admin/partners/calculate-commissions` el día 1 de cada mes (Vercel Cron, cron servidor, etc.).
- **Verificación email al registrarse:** Crear token en registro, enviar link con mailer, opcionalmente bloquear acciones hasta verificar.

---

*Documento creado para implementación del Programa de Partners Lexis Bill - Revenue Share Recurrente*
