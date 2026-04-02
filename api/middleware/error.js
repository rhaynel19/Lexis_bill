const log = require('../logger');

/**
 * Global Error Handler Middleware
 * Traps any unhandled exceptions traversing the Express routing pipeline.
 */
const globalErrorHandler = (err, req, res, next) => {
    // Audit Quick Win: Prevent silent failures by aggressively logging via Pino/Winston 
    log.error({
        err: err.message,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip
    }, 'Unhandled Express Exception Caught');

    // Mongoose Validation Error Mapping
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            message: 'Validation failed',
            errors: Object.values(err.errors).map(e => e.message)
        });
    }

    if (err.name === 'CastError') {
        return res.status(400).json({ message: 'Invalid ID format' });
    }

    // Default 500 response
    const statusCode = err.statusCode || 500;
    const message = process.env.NODE_ENV === 'production' 
                    ? 'Error interno del servidor.' 
                    : err.message;
                    
    res.status(statusCode).json({
        message,
        code: 'INTERNAL_SERVER_ERROR'
    });
};

module.exports = globalErrorHandler;
