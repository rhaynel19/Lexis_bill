# Políticas legales y Manual de Uso — Entrega técnica

## 1. Estructura de base de datos

### PolicyAcceptance (aceptaciones por usuario)

| Campo         | Tipo     | Descripción                          |
|---------------|----------|--------------------------------------|
| `userId`      | ObjectId | Usuario que acepta                    |
| `policySlug`  | String   | Identificador: terms, privacy, etc.  |
| `policyVersion` | Number | Versión del documento aceptada       |
| `acceptedAt`  | Date     | Fecha y hora de aceptación           |
| `ip`          | String   | IP (opcional)                        |

- Índice único: `(userId, policySlug, policyVersion)` para evitar duplicados.
- Índice: `(userId, policySlug)` para consultar la última aceptación por política.

### Modelo de versionado

- **No hay colección PolicyVersion en DB.** El contenido y la versión actual viven en código: `api/policies-content.js`.
- Cada política tiene `version` (número), `title`, `slug`, `effectiveAt` y `content` (texto markdown).
- Para publicar una nueva versión: se edita `policies-content.js`, se incrementa `version` y se despliega. Los usuarios que tenían aceptada la versión anterior verán `needsPolicyAcceptance` en el siguiente login.

---

## 2. Middleware de validación

- **Registro:** El front envía `acceptedPolicyVersions: { terms: 1, privacy: 1 }` en el body de `POST /api/auth/register`. El backend registra en `PolicyAcceptance` para cada slug requerido.
- **Login / getMe:** `GET /api/auth/me` calcula si el usuario tiene aceptadas las versiones actuales de todas las políticas en `REQUIRED_POLICY_SLUGS` (terms, privacy). Si falta alguna, devuelve `needsPolicyAcceptance: true` y `policiesToAccept: [{ slug, version, title }]`.
- **Layout protegido:** Si `me.needsPolicyAcceptance` y la ruta no es `/aceptar-politicas`, se redirige a `/aceptar-politicas`. El usuario debe marcar el checkbox y enviar `POST /api/policies/accept` con `{ acceptances: [{ slug, version }] }` para poder seguir usando la app.

---

## 3. Flujo cuando se actualizan políticas

1. **Desarrollo:** En `api/policies-content.js` se actualiza el texto de una política y se incrementa su `version` (ej. privacy de 1 a 2).
2. **Despliegue:** Se sube el cambio. No hace falta migración en DB.
3. **Usuarios existentes:** En la siguiente llamada a `GET /api/auth/me`, el backend compara la versión aceptada (guardada en `PolicyAcceptance`) con la versión actual. Si la actual es mayor, se devuelve `needsPolicyAcceptance: true`.
4. **Redirección:** El layout redirige a `/aceptar-politicas`. El usuario lee (enlaces a /terminos, /privacidad, etc.), marca que acepta y envía el formulario.
5. **Registro:** `POST /api/policies/accept` inserta/actualiza filas en `PolicyAcceptance` con la nueva versión. A partir de ahí `getMe` ya no devuelve `needsPolicyAcceptance` y el usuario puede usar la app con normalidad.

---

## 4. Ubicación obligatoria de las políticas

| Ubicación              | Implementación                                                                 |
|------------------------|---------------------------------------------------------------------------------|
| **Footer (páginas públicas)** | En `app/(public)/page.tsx` y `app/(public)/landing/page.tsx`: enlaces a /terminos, /privacidad, /uso-aceptable, /limitacion-responsabilidad, /reembolsos. También en `TrustFooter` de `legal-design.tsx`. |
| **Dashboard / Perfil** | En **Configuración**: sección "Documentos legales" con enlaces a las 5 políticas. En **Centro de Ayuda** (/ayuda): card "Documentos legales" con enlaces. |
| **Registro**           | Checkbox obligatorio: "Acepto los Términos y Condiciones y la Política de Privacidad". Botón "Crear cuenta" deshabilitado hasta marcar. Al enviar el formulario se envían `acceptedPolicyVersions` y el backend guarda en `PolicyAcceptance`. |

---

## 5. Seguridad

- **Inmutabilidad:** Las políticas no son editables por el usuario. Solo se sirven en lectura vía `GET /api/policies/current` y `GET /api/policies/:slug`. El contenido está en código (o en un archivo en el repo), no en una tabla editable desde el front.
- **Versionado:** Cada documento tiene `version` numérica. Las aceptaciones guardan `policyVersion` para poder exigir re-aceptación cuando suba la versión.
- **Sin modificación desde frontend:** No existe UI de administración para cambiar el texto de las políticas; se cambia en `api/policies-content.js` y se despliega.

---

## 6. Contenido mínimo implementado

- **Términos y Condiciones:** Lexis Bill como herramienta de apoyo, responsabilidad del usuario sobre información fiscal, no sustituye asesoría contable, limitación de responsabilidad por errores del usuario, uso aceptable, modificaciones y contacto.
- **Política de Privacidad:** Datos que se recolectan, finalidad, almacenamiento y seguridad, uso de información fiscal, no compartir sin consentimiento, derechos del usuario.
- **Política de Uso Aceptable:** Uso permitido, prohibiciones (fraude, falsificación, acceso no autorizado, abuso), consecuencias y denuncia.
- **Limitación de Responsabilidad:** Alcance del servicio, responsabilidad del usuario, límite de responsabilidad, garantía "tal cual".
- **Política de Reembolsos:** Suscripciones y pagos, solicitud de reembolso (7 días), criterios, plazo y forma, período de prueba.

---

## 7. Riesgos legales detectados y mitigación

| Riesgo | Mitigación |
|--------|------------|
| Usuario alega no haber aceptado términos | Registro de aceptación con versión y fecha (y opcionalmente IP) en `PolicyAcceptance`. Checkbox obligatorio en registro y en re-aceptación. |
| Cambio de políticas sin nuevo consentimiento | Al subir versión en `policies-content.js`, `getMe` devuelve `needsPolicyAcceptance` y se bloquea el uso hasta re-aceptar en `/aceptar-politicas`. |
| Contenido fiscal inexacto | Textos explícitos: "no sustituye asesoría contable", "usuario responsable de verificar datos", "no garantiza aprobación DGII". Incluido en T&C, Limitación y Manual. |
| Reembolsos y disputas | Política de Reembolsos publicada (7 días, criterios, medio de pago). Documento en footer y en Centro de Ayuda. |
| Uso indebido del sistema | Política de Uso Aceptable con prohibiciones y consecuencias; T&C refuerzan responsabilidad sobre NCF. |

**Recomendación:** Revisión periódica por un abogado en RD para alineación con Ley 172-13 (protección de datos), Ley 07-23 (facturación) y normativa DGII.

---

## 8. Manual de Uso y Centro de Ayuda

- **Manual:** Contenido en `docs/MANUAL_USO_LEXIS_BILL.md`. Incluye: introducción, crear factura, nota de crédito, cotizaciones, clientes, rangos NCF, reportes 606/607, Resumen ITBIS, suscripción, FAQ y advertencias obligatorias.
- **PDF descargable:** Botón "Descargar Manual en PDF" en **Centro de Ayuda** (`/ayuda`). El PDF se genera en el cliente con `lib/manual-pdf.ts` (jsPDF) y se descarga como `Manual_Lexis_Bill.pdf`.
- **Centro de Ayuda:** Ruta `/ayuda` (protegida). Incluye: Manual en PDF, guía por módulo (enlaces a Nueva factura, Cotizaciones, Clientes, Reportes, Configuración, Pagos), documentos legales y enlace a soporte/Configuración.
- **Acceso:** En el menú lateral "Centro de Ayuda"; en móvil "Ayuda"; en Configuración, enlace "Centro de Ayuda — Manual de uso y tutoriales".

---

## 9. Código y archivos principales

| Área | Archivos |
|------|----------|
| Contenido políticas | `api/policies-content.js` |
| Modelo y API políticas | `api/index.js` (PolicyAcceptance, GET /api/policies/current, GET /api/policies/:slug, POST /api/policies/accept; registro y getMe) |
| Registro y aceptación | `app/(public)/registro/page.tsx`, `app/(protected)/aceptar-politicas/page.tsx` |
| Layout y redirección | `app/(protected)/layout.tsx` (redirect a /aceptar-politicas) |
| Páginas públicas políticas | `app/(public)/terminos/page.tsx`, `privacidad`, `uso-aceptable`, `limitacion-responsabilidad`, `reembolsos/page.tsx` |
| Componente lectura política | `components/PolicyView.tsx` |
| Footer y legal | `app/(public)/page.tsx`, `landing/page.tsx`, `components/legal-design.tsx` |
| Checkbox y modal registro | `components/legal-design.tsx` (LegalCheckbox, TermsModal) |
| Configuración | `app/(protected)/configuracion/page.tsx` (Documentos legales, enlace Centro de Ayuda) |
| Centro de Ayuda y manual | `app/(protected)/ayuda/page.tsx`, `lib/manual-pdf.ts`, `docs/MANUAL_USO_LEXIS_BILL.md` |
| API service front | `lib/api-service.ts` (getPoliciesCurrent, getPolicy, acceptPolicies) |

---

## 10. Cómo actualizar el manual sin afectar a usuarios

- **Contenido:** Editar `docs/MANUAL_USO_LEXIS_BILL.md` (fuente de verdad) y, si se desea que el PDF refleje cambios, actualizar también el contenido usado en `lib/manual-pdf.ts` (por ahora el PDF se genera con un resumen fijo en código). Alternativa futura: generar el PDF en el servidor desde el markdown (p. ej. con `md-to-pdf` o similar) y servir `/api/manual-pdf` o un archivo estático en `public/docs/`.
- **Versión del manual:** No hay versionado obligatorio del PDF; es material de ayuda. Si se quiere trazar versiones, se puede añadir una fecha o número de versión en la portada del PDF en `manual-pdf.ts`.
