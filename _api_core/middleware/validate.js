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
        // Errores de validación Zod
        if (error && (error.name === 'ZodError' || error.issues)) {
            const errors = (error.errors || error.issues || []).map(err => ({
                field: (err.path || []).join('.'),
                message: err.message
            }));
            
            return res.status(400).json({
                message: errors.length > 0
                    ? errors.map(e => e.message).join('. ')
                    : 'Error de validación en los datos enviados.',
                errors,
                code: 'VALIDATION_ERROR'
            });
        }
        
        // Cualquier otro error (no debe llegar al global handler — evitar el 500)
        console.error(`[Validation Middleware Error] [${target}]:`, error);
        return res.status(400).json({
            message: 'Error de validación en los datos enviados.',
            code: 'VALIDATION_ERROR'
        });
    }
};

module.exports = validate;
