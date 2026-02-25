# Recuperación de contraseña — Cómo se restaura

## Para el cliente (usuario final)

1. **Entrar a la app** y en la pantalla de login hacer clic en **“¿Olvidó su contraseña?”** (enlace a `/recuperar-contrasena`).

2. **Escribir el correo** con el que está registrado y pulsar **“Enviar enlace”**.

3. **Revisar el correo** (y carpeta de spam). Llega un mensaje de Lexis Bill con un enlace para restablecer la contraseña.  
   - El enlace lleva a: `https://tu-dominio.com/restablecer-contrasena?token=XXX`  
   - **Caduca en 1 hora.** Si ha pasado más tiempo, hay que volver a solicitar el enlace desde “Recuperar contraseña”.

4. **Abrir el enlace** y en la página **“Nueva contraseña”**:
   - Escribir la nueva contraseña (mínimo 8 caracteres, con mayúscula, minúscula y número).
   - Repetirla en “Confirmar contraseña”.
   - Pulsar **“Restablecer contraseña”**.

5. **Listo.** Se muestra un mensaje de éxito y se redirige al login. El cliente ya puede entrar con la nueva contraseña.

---

## Para el administrador (configurar el envío de emails)

Por defecto el backend **no envía** el correo; solo genera el token y, si está configurado, registra la URL en logs. Para que el cliente reciba el enlace por email:

1. **Variables de entorno** (en `.env` o en el servidor):
   - `SEND_PASSWORD_RESET_EMAIL=true`  
   - La base URL del enlace se obtiene del request (Host / X-Forwarded-*); no hace falta configurar `NEXT_PUBLIC_APP_URL`.

2. **Módulo de correo** (`api/mailer.js`):
   - Debe existir y exportar `sendPasswordReset(email, resetUrl)`.
   - Si usas Nodemailer (u otro), ahí se envía el email con `resetUrl` al `email` indicado.

3. **En desarrollo** (sin SMTP):
   - Con `SEND_PASSWORD_RESET_EMAIL=false`, el backend sigue respondiendo “Si el correo está registrado, recibirás un enlace…” pero no envía nada.
   - La URL de restablecimiento se escribe en los **logs del API** (buscar “Password reset” o “resetUrl”). Puedes copiar esa URL y abrirla en el navegador para probar el flujo.

Resumen: el cliente restaura la contraseña desde **Recuperar contraseña → correo → enlace → Nueva contraseña**. El admin habilita el envío real con `SEND_PASSWORD_RESET_EMAIL` y `api/mailer.js`.

---

## Enlace desde el login

En la pantalla de login (`/login`) hay un enlace **"¿Olvidó su contraseña?"** que lleva a `/recuperar-contrasena`. El cliente solo tiene que hacer clic ahí, escribir su correo y seguir los pasos anteriores.
