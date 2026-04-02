
const { z } = require('zod');

const invoiceItemSchema = z.object({
  description: z.string().min(1, 'Descripción es requerida').max(500),
  quantity: z.number().min(0).max(999999).default(1),
  price: z.number().min(0).max(999999999),
  isExempt: z.boolean().optional().default(false),
  taxCategory: z.enum(['taxable', 'exempt']).optional().default('taxable'),
  taxRate: z.number().min(0).max(0.18).optional().default(0.18)
});

const createInvoiceSchema = z.object({
  clientName: z.string().min(1, 'Nombre del cliente es requerido').max(200),
  clientRnc: z.string().regex(/^\d{9,11}$/, 'RNC debe tener 9 u 11 dígitos'),
  clientPhone: z.string().optional(),
  ncfType: z.string().min(2).max(10),
  items: z.array(invoiceItemSchema).min(1, 'Debe incluir al menos un ítem'),
  date: z.string().optional(),
  tipoPago: z.enum(['efectivo', 'transferencia', 'tarjeta', 'credito', 'mixto', 'otro']).default('efectivo'),
  tipoPagoOtro: z.string().max(50).optional(),
  pagoMixto: z.array(z.object({
    tipo: z.string().max(30),
    monto: z.number().min(0)
  })).optional(),
  requestId: z.string().optional(), // Idempotency
  isrRetention: z.number().min(0).optional(),
  itbisRetention: z.number().min(0).optional(),
  modifiedNcf: z.string().max(13).optional()
});

const paymentSchema = z.object({
  amount: z.number().positive('Monto debe ser positivo'),
  paymentMethod: z.enum(['efectivo', 'transferencia', 'tarjeta', 'otro']).default('transferencia')
});

const annulSchema = z.object({
  reason: z.enum(['01', '02', '03', '04', '05'], {
    errorMap: () => ({ message: 'Motivo de anulación (01-05) es obligatorio conforme a DGII.' })
  })
});

const creditNoteSchema = z.object({
  amount: z.number().positive().optional(),
  reason: z.string().max(100).optional()
});

const draftSchema = z.object({
  items: z.array(invoiceItemSchema).optional(),
  clientName: z.string().max(200).optional(),
  rnc: z.string().optional(),
  invoiceType: z.string().optional(),
  tipoPago: z.string().optional(),
  tipoPagoOtro: z.string().optional(),
  pagoMixto: z.array(z.any()).optional()
});

module.exports = {
  createInvoiceSchema,
  paymentSchema,
  annulSchema,
  creditNoteSchema,
  draftSchema
};
