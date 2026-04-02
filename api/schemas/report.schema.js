
const { z } = require('zod');

const reportQuerySchema = z.object({
  period: z.string()
    .regex(/^\d{6}$/, 'El periodo debe tener formato YYYYMM (ej. 202401)')
    .describe('Periodo fiscal en formato YYYYMM'),
});

const validate606Schema = z.object({
  periodo: z.string().regex(/^\d{6}$/, 'Periodo inválido'),
  rnc: z.string().min(9).max(11).optional(),
});

const validate607Schema = z.object({
  periodo: z.string().regex(/^\d{6}$/, 'Periodo inválido'),
  rnc: z.string().min(9).max(11).optional(),
});

const reportReminderSchema = z.object({
    // Intentionally empty for now, but can be extended
});

module.exports = {
  reportQuerySchema,
  validate606Schema,
  validate607Schema,
  reportReminderSchema
};
