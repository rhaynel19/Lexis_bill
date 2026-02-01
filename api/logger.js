/**
 * Logger profesional - No loggear RNC, cédulas, montos, tokens
 * Masking de datos sensibles
 */
const pino = require('pino');

function maskRnc(val) {
    if (!val || typeof val !== 'string') return '***';
    const clean = val.replace(/\D/g, '');
    if (clean.length < 6) return '***';
    return clean.slice(0, 2) + '***' + clean.slice(-4);
}

function maskAmount(val) {
    if (val == null) return '***';
    if (typeof val === 'number') return '[REDACTED]';
    return '[REDACTED]';
}

const redactPaths = ['password', 'token', 'authorization', 'cookie', '*.rnc', '*.amount', '*.total', '*.itbis'];

const logger = pino({
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    redact: redactPaths,
    formatters: {
        level: (label) => ({ level: label })
    }
});

logger.maskRnc = maskRnc;
logger.maskAmount = maskAmount;

module.exports = logger;
