const rateLimit = require('express-rate-limit');

// Limiter para LOGIN únicamente — intentos fallidos de registro NO lo afectan
const authLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 10,
    message: { message: 'Demasiados intentos de inicio de sesión. Intenta en 10 minutos.' },
    standardHeaders: true,
    legacyHeaders: false
});

// Limiter SEPARADO para REGISTRO — no comparte cupo con login
const registerLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { message: 'Demasiados intentos de registro. Intenta en 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false
});

const resetPasswordLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 3,
    message: { message: 'Demasiados intentos de restablecimiento. Intenta en 1 hora.' },
    standardHeaders: true,
    legacyHeaders: false
});

const invoiceLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 50,
    message: { message: 'Límite de solicitudes excedido. Espera un momento.' },
    standardHeaders: true,
    legacyHeaders: false
});

const reportLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    message: { message: 'Demasiadas descargas. Espera un momento.' },
    standardHeaders: true,
    legacyHeaders: false
});

const uploadLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    message: { message: 'Demasiados archivos. Espera un momento.' },
    standardHeaders: true,
    legacyHeaders: false
});

const rncLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    message: { message: 'Demasiadas consultas de RNC. Espera un momento.' },
    standardHeaders: true,
    legacyHeaders: false
});

module.exports = {
    authLimiter,
    registerLimiter,
    resetPasswordLimiter,
    invoiceLimiter,
    reportLimiter,
    uploadLimiter,
    rncLimiter
};
