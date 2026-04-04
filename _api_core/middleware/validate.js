const { z } = require('zod');

/**
 * Middleware de validación con Zod
 * @param {z.ZodSchema} schema - El esquema de Zod para validar
 * @param {string} target - El origen de los datos ('body', 'query', 'params')
 * @returns {Function} Middleware de Express
 */
const validate = (schema, target = 'body') => (req, res, next) => {
    try {
        const sourceData = req[target];
        
        // Validar y transformar
        const validatedData = schema.parse(sourceData);
        
        // Reemplazar el origen con los datos validados/sanitizados
        req[target] = validatedData;
        next();
    } catch (error) {
        // Log error status if it's not a standard Zod error (helps debugging 500s)
        if (error.name === 'ZodError' || error instanceof z.ZodError) {
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
        
        console.error(`[Validation Middleware Error] [${target}]:`, error);
        next(error);
    }
};

module.exports = validate;
