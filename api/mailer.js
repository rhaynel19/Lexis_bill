/**
 * Mailer para Lexis Bill (recuperación de contraseña y notificaciones).
 * Con SMTP configurado envía emails; si no, solo registra en logs (útil en dev).
 */

const log = require('./logger');

let transporter = null;

function getTransporter() {
    if (transporter !== null) return transporter;
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (!host || !user || !pass) {
        log.info('Mailer: SMTP no configurado (SMTP_HOST, SMTP_USER, SMTP_PASS). Los enlaces se mostrarán en logs.');
        return null;
    }
    try {
        const nodemailer = require('nodemailer');
        transporter = nodemailer.createTransport({
            host,
            port: port ? parseInt(port, 10) : 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: { user, pass }
        });
        return transporter;
    } catch (e) {
        log.warn({ err: e.message }, 'Mailer: nodemailer no instalado. Ejecuta: npm install nodemailer');
        return null;
    }
}

/**
 * Envía email con enlace para verificar la dirección de correo (evitar correos falsos).
 * @param {string} email - Correo del usuario
 * @param {string} verifyUrl - URL completa: https://dominio.com/verificar-correo?token=XXX
 */
async function sendVerificationEmail(email, verifyUrl) {
    const transport = getTransporter();
    const appName = process.env.APP_NAME || 'Lexis Bill';
    if (transport) {
        await transport.sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to: email,
            subject: `Verifica tu correo - ${appName}`,
            text: `Hola,\n\nPara activar tu cuenta y poder iniciar sesión, verifica tu correo abriendo este enlace (válido 24 horas):\n\n${verifyUrl}\n\nSi no creaste una cuenta en ${appName}, ignora este correo.\n\n— ${appName}`,
            html: `<p>Hola,</p><p>Para activar tu cuenta y poder iniciar sesión, <a href="${verifyUrl}">verifica tu correo haciendo clic aquí</a> (el enlace es válido 24 horas).</p><p>Si no creaste una cuenta en ${appName}, ignora este correo.</p><p>— ${appName}</p>`
        });
        log.info({ email }, 'Email verificación enviado');
        return;
    }
    log.info({ email, verifyUrl }, 'Verificación de correo (sin SMTP): usar esta URL en dev');
}

/**
 * Envía email con enlace para restablecer contraseña.
 * @param {string} email - Correo del usuario
 * @param {string} resetUrl - URL completa: https://dominio.com/restablecer-contrasena?token=XXX
 */
async function sendPasswordReset(email, resetUrl) {
    const transport = getTransporter();
    const appName = process.env.APP_NAME || 'Lexis Bill';
    if (transport) {
        await transport.sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to: email,
            subject: `Restablecer contraseña - ${appName}`,
            text: `Hola,\n\nSolicitaste restablecer tu contraseña. Abre este enlace (válido 1 hora):\n\n${resetUrl}\n\nSi no solicitaste esto, ignora este correo.\n\n— ${appName}`,
            html: `<p>Hola,</p><p>Solicitaste restablecer tu contraseña. <a href="${resetUrl}">Haz clic aquí para restablecerla</a> (el enlace es válido 1 hora).</p><p>Si no solicitaste esto, ignora este correo.</p><p>— ${appName}</p>`
        });
        log.info({ email }, 'Email restablecer contraseña enviado');
        return;
    }
    log.info({ email, resetUrl }, 'Password reset (sin SMTP): usar esta URL en dev');
}

/**
 * Notificación: pago aprobado, membresía activada.
 */
async function sendPaymentApproved(email, plan, billingCycle) {
    const transport = getTransporter();
    const appName = process.env.APP_NAME || 'Lexis Bill';
    const cycle = billingCycle === 'annual' ? 'anual' : 'mensual';
    if (transport) {
        await transport.sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to: email,
            subject: `Pago aprobado - ${appName}`,
            text: `Hola,\n\nTu pago ha sido validado. Tu plan ${plan} (${cycle}) está activo. Ya puedes usar todas las funciones de Lexis Bill.\n\n— ${appName}`,
            html: `<p>Hola,</p><p>Tu pago ha sido validado. Tu plan <strong>${plan}</strong> (${cycle}) está activo. Ya puedes usar todas las funciones de Lexis Bill.</p><p>— ${appName}</p>`
        });
        log.info({ email }, 'Email pago aprobado enviado');
        return;
    }
    log.info({ email, plan }, 'Notificación pago aprobado (sin SMTP)');
}

/**
 * Notificación: factura emitida.
 */
async function sendInvoiceCreated(email, ncf, total, clientName) {
    const transport = getTransporter();
    const appName = process.env.APP_NAME || 'Lexis Bill';
    if (transport) {
        await transport.sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to: email,
            subject: `Factura emitida ${ncf} - ${appName}`,
            text: `Hola,\n\nSe emitió la factura NCF ${ncf} por RD$${total} a ${clientName || 'cliente'}. Este correo es una notificación; el comprobante debe enviarse al cliente.\n\n— ${appName}`,
            html: `<p>Hola,</p><p>Se emitió la factura <strong>NCF ${ncf}</strong> por RD$${total} a ${clientName || 'cliente'}. Este correo es una notificación; el comprobante debe enviarse al cliente.</p><p>— ${appName}</p>`
        });
        log.info({ email, ncf }, 'Email factura emitida enviado');
        return;
    }
    log.info({ email, ncf }, 'Notificación factura emitida (sin SMTP)');
}

/**
 * Recordatorio: reportes 606/607 pendientes (opcional, llamar desde cron o al entrar a reportes).
 */
async function send606607Reminder(email, period) {
    const transport = getTransporter();
    const appName = process.env.APP_NAME || 'Lexis Bill';
    if (transport) {
        await transport.sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to: email,
            subject: `Recordatorio reportes fiscales ${period} - ${appName}`,
            text: `Hola,\n\nTe recordamos presentar tus reportes 606 y 607 del periodo ${period} en la DGII. Puedes generarlos desde Lexis Bill en la sección Reportes.\n\n— ${appName}`,
            html: `<p>Hola,</p><p>Te recordamos presentar tus reportes 606 y 607 del periodo <strong>${period}</strong> en la DGII. Puedes generarlos desde Lexis Bill en la sección Reportes.</p><p>— ${appName}</p>`
        });
        log.info({ email, period }, 'Email recordatorio 606/607 enviado');
        return;
    }
    log.info({ email, period }, 'Recordatorio 606/607 (sin SMTP)');
}

module.exports = { sendVerificationEmail, sendPasswordReset, sendPaymentApproved, sendInvoiceCreated, send606607Reminder, getTransporter };
