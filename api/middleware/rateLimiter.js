const rateLimit = require('express-rate-limit');

// Rate limiting - Zero Risk Deploy (IP desde X-Forwarded-For con trust proxy)
const authLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 5,
    message: { message: 'Demasiados intentos. Intenta en 10 minutos.' },
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
    resetPasswordLimiter,
    invoiceLimiter,
    reportLimiter,
    uploadLimiter,
    rncLimiter
};
