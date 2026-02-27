# Verificación de correo y bloqueo de correos falsos (Lexis Bill)

## Cómo se evita que entren con correos falsos o inexistentes

### 1. Verificación por correo (doble opt-in)

- **Al registrarse:** Se crea la cuenta con `emailVerified: false` y se envía un correo con un enlace de verificación (válido 24 h).
- **Al iniciar sesión:** Si el usuario se registró después de la fecha configurada (`VERIFICATION_REQUIRED_AFTER`) y **no ha verificado** el correo, el login devuelve **403** con código `EMAIL_NOT_VERIFIED`. No puede entrar hasta hacer clic en el enlace del correo.
- **Página `/verificar-correo?token=XXX`:** El usuario hace clic en el enlace del email → se llama a `POST /api/auth/verify-email` → se marca `emailVerified: true` → puede iniciar sesión.
- **Reenviar verificación:** En la pantalla de login, si aparece el error "Debes verificar tu correo", se muestra el botón **"Reenviar verificación al correo"**, que llama a `POST /api/auth/resend-verify-email` con el email.

Así, **solo quien tenga acceso real al buzón** puede verificar y luego iniciar sesión. Un correo inventado o inexistente no recibirá el enlace.

### 2. Bloqueo de dominios desechables (correos temporales)

En el registro se comprueba el **dominio** del correo contra una lista de proveedores de correo temporal (mailinator, 10minutemail, yopmail, etc.). Si el dominio está en la lista, se rechaza el registro con:

*"No se permiten correos temporales o desechables. Usa un correo profesional o personal real."*

- **Activar/desactivar:** Variable de entorno `BLOCK_DISPOSABLE_EMAILS`. Por defecto está **activado**; para desactivar: `BLOCK_DISPOSABLE_EMAILS=false`.

### 3. Variables de entorno recomendadas

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `SEND_VERIFICATION_EMAIL` | Enviar (o no) el correo de verificación al registrarse. Si no hay SMTP, la URL se imprime en logs (solo dev). | `true` (default) / `false` |
| `BLOCK_DISPOSABLE_EMAILS` | Bloquear dominios de correo temporal en el registro. | `true` (default) / `false` |
| `VERIFICATION_REQUIRED_AFTER` | Fecha ISO a partir de la cual se exige correo verificado para login. Usuarios creados **antes** de esta fecha pueden entrar sin verificar (compatibilidad). | `2026-02-27T00:00:00Z` |
| `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Para que los correos de verificación (y recuperación de contraseña) se envíen realmente en producción. | Ver configuración de email del proyecto |

### 4. Resumen

- **Correos que no existen:** No reciben el email → no pueden verificar → no pueden iniciar sesión.
- **Correos falsos/temporales:** Se bloquean en registro (dominios desechables) o no pueden verificar si el dominio no está en la lista.
- **Usuarios antiguos:** Los creados antes de `VERIFICATION_REQUIRED_AFTER` siguen pudiendo entrar sin verificar (no se les pide verificación retroactiva).
