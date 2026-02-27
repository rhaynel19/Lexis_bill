# Verificación por correo — Lexis Bill

Recomendaciones para activar y configurar la verificación de correo y evitar cuentas con correos falsos o inexistentes.

---

## Cómo funciona ya en Lexis Bill

- Al **registrarse**, se genera un enlace de verificación (válido 24 h) y se intenta enviar por email.
- El usuario debe abrir **`/verificar-correo?token=XXX`** y hacer clic (o el front ya llama al API con el token).
- Al verificar, se marca `emailVerified: true` en el usuario.
- En **login**, si el usuario fue creado después de la fecha `VERIFICATION_REQUIRED_AFTER` y **no** tiene `emailVerified`, no puede entrar y ve el mensaje de “Debes verificar tu correo…”.

Para que todo esto funcione en la práctica hace falta que **los correos se envíen de verdad**, es decir, tener **SMTP configurado**.

---

## 1. Configurar envío de correo (SMTP)

Sin SMTP, el backend solo escribe la URL de verificación en logs; el usuario nunca recibe el email.

### Variables de entorno necesarias

Añade en tu `.env` o en el panel de Vercel (Variables):

| Variable       | Descripción                          | Ejemplo                    |
|----------------|--------------------------------------|----------------------------|
| `SMTP_HOST`    | Servidor SMTP                        | `smtp.resend.com`          |
| `SMTP_PORT`    | Puerto (opcional, por defecto 587)   | `587`                      |
| `SMTP_USER`    | Usuario / API key (según proveedor)  | `resend` o tu email        |
| `SMTP_PASS`    | Contraseña o API key                | Tu API key                 |
| `SMTP_FROM`    | Remitente (opcional)                 | `Lexis Bill <noreply@tudominio.com>` |
| `SMTP_SECURE`  | `true` para puerto 465 (opcional)    | `false` con 587            |

### Proveedores recomendados

**Opción A – Resend (recomendada)**  
- Buena entrega, API sencilla, plan gratuito generoso.  
- En [resend.com](https://resend.com) creas un dominio (o usas su dominio de prueba).  
- Creas una **API Key** y usas:

  ```env
  SMTP_HOST=smtp.resend.com
  SMTP_PORT=587
  SMTP_USER=resend
  SMTP_PASS=re_xxxxxxxxxxxx
  SMTP_FROM=Lexis Bill <onboarding@resend.dev>
  ```

  (En producción conviene usar un dominio verificado en Resend y poner ese en `SMTP_FROM`.)

**Opción B – Gmail (desarrollo / bajo volumen)**  
- Cuenta de Google con “Contraseña de aplicación” (2FA activada).  
- Ejemplo:

  ```env
  SMTP_HOST=smtp.gmail.com
  SMTP_PORT=587
  SMTP_USER=tu@gmail.com
  SMTP_PASS=contraseña_de_16_caracteres
  SMTP_FROM=tu@gmail.com
  ```

**Opción C – SendGrid / Mailgun**  
- En el panel del proveedor obtienes usuario y contraseña/API key SMTP y usas su host y puerto (suelen indicarlos en “SMTP relay” o “API keys”).

---

## 2. Activar verificación para nuevos usuarios

- Por defecto el backend **ya intenta enviar** el correo de verificación si **no** pones `SEND_VERIFICATION_EMAIL=false`.
- Para **no** desactivarlo, simplemente **no definas** `SEND_VERIFICATION_EMAIL` o déjala en algo distinto de `'false'`.

Para que el login **exija** correo verificado solo para cuentas nuevas:

- `VERIFICATION_REQUIRED_AFTER` define “a partir de qué fecha de creación se exige verificación”.
- Por defecto en código está: `2026-02-27`.
- Para exigir verificación a **todos los que se registren desde hoy**:
  - Pon en `.env` la fecha/hora actual en ISO, por ejemplo:
    ```env
    VERIFICATION_REQUIRED_AFTER=2026-02-15T00:00:00Z
    ```
  - Así, usuarios creados **antes** de esa fecha pueden seguir entrando sin verificar (si ya estaban en producción); los que se registren **después** tendrán que verificar.

Si quieres que **solo** los registrados a partir de cuando activaste SMTP deban verificar, usa esa fecha como `VERIFICATION_REQUIRED_AFTER`.

---

## 3. Comprobar que funciona

1. Configura SMTP y despliega (o reinicia el API).
2. Registra un usuario con un correo **al que tengas acceso**.
3. Revisa la bandeja (y spam); deberías recibir “Verifica tu correo - Lexis Bill”.
4. Abre el enlace (te lleva a `https://tudominio.com/verificar-correo?token=...`).
5. Deberías ver “Correo verificado correctamente” y poder iniciar sesión.
6. Si en el registro no recibes el email, revisa logs del API: sin SMTP verás la URL en log; con SMTP verás si hay error de envío.

---

## 4. Resumen de variables útiles

| Variable                      | Uso |
|------------------------------|-----|
| `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` | Obligatorios para enviar correos. |
| `SMTP_FROM`                   | Remitente que ve el usuario (recomendado en producción). |
| `SEND_VERIFICATION_EMAIL`     | No pongas `false` si quieres verificación activa. |
| `VERIFICATION_REQUIRED_AFTER` | Fecha ISO a partir de la cual se exige correo verificado para poder hacer login. |
| `APP_NAME`                    | Opcional; aparece en el asunto/cuerpo del email (por defecto “Lexis Bill”). |

Con SMTP configurado y sin `SEND_VERIFICATION_EMAIL=false`, la verificación por correo queda activa y los usuarios no podrán usar correos “falsos” (no recibirán el enlace y no podrán activar la cuenta).
