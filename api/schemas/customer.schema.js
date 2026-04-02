
const { z } = require('zod');

const createCustomerSchema = z.object({
  name: z.string().min(1, 'Nombre es requerido').max(200),
  rnc: z.string().regex(/^\d{9,11}$/, 'RNC debe tener 9 u 11 dígitos'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().max(30).optional().or(z.literal('')),
  address: z.string().max(500).optional().or(z.literal('')),
  notes: z.string().max(1000).optional().or(z.literal(''))
});

const updateCustomerSchema = createCustomerSchema.partial();

module.exports = {
  createCustomerSchema,
  updateCustomerSchema
};
