const { z } = require('zod');

/**
 * Middleware de validación con Zod
 * @param {z.ZodSchema} schema - El esquema de Zod para validar req.body
 * @returns {Function} Middleware de Express
 */
const validate = (schema) => (req, res, next) => {
    try {
        // Validar y transformar (parse aplica las transformaciones y sanitizaciones de Zod)
        const validatedData = schema.parse(req.body);
        
        // Reemplazar body con los datos validados/sanitizados
        req.body = validatedData;
        next();
    } catch (error) {
        if (error instanceof z.ZodError) {
            const errors = error.errors.map(err => ({
                field: err.path.join('.'),
                message: err.message
            }));
            
            return res.status(400).json({
                message: 'Error de validación en los datos enviados.',
                errors,
                code: 'VALIDATION_ERROR'
            });
        }
        next(error);
    }
};

module.exports = validate;
