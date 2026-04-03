const { z } = require('zod');

const loginSchema = z.object({
    email: z.string().email('Email inválido').trim().toLowerCase(),
    password: z.string().min(1, 'La contraseña es requerida')
});

const registrationSchema = z.object({
    email: z.string().email('Email inválido').trim().toLowerCase(),
    password: z.string()
        .min(8, 'La contraseña debe tener al menos 8 caracteres')
        .regex(/[A-Z]/, 'Debe tener al menos una mayúscula')
        .regex(/[a-z]/, 'Debe tener al menos una minúscula')
        .regex(/[0-9]/, 'Debe tener al menos un número'),
    name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres'),
    rnc: z.string().optional().transform(val => val ? val.replace(/[^0-9]/g, '') : ''),
    profession: z.string().trim().optional(),
    plan: z.enum(['free', 'pro']).optional().default('free'),
    referralCode: z.string().trim().toUpperCase().optional().transform(val => val || ''),
    isPartnerRegistration: z.boolean().optional(),
    inviteToken: z.string().optional(),
    suggestedName: z.string().trim().optional(),
    acceptedPolicyVersions: z.record(z.string(), z.union([z.number(), z.string().transform(Number)])).optional()
});

const profileUpdateSchema = z.object({
    name: z.string().min(2).optional(),
    profession: z.string().optional(),
    logo: z.string().optional(),
    digitalSeal: z.string().optional(),
    exequatur: z.string().optional(),
    address: z.string().optional(),
    phone: z.string().optional().transform(val => val ? val.replace(/[^0-9+\-\s]/g, '') : undefined),
    hasElectronicBilling: z.boolean().optional(),
    taxSettings: z.object({
        isTaxExemptCompany: z.boolean().optional(),
        defaultTaxRate: z.number().min(0).max(0.18).optional()
    }).optional()
});

const forgotPasswordSchema = z.object({
    email: z.string().email('Email inválido').trim().toLowerCase()
});

const resetPasswordSchema = z.object({
    token: z.string().min(1, 'Token requerido'),
    newPassword: z.string()
        .min(8, 'La contraseña debe tener al menos 8 caracteres')
        .regex(/[A-Z]/, 'Debe tener al menos una mayúscula')
        .regex(/[a-z]/, 'Debe tener al menos una minúscula')
        .regex(/[0-9]/, 'Debe tener al menos un número')
});

module.exports = {
    loginSchema,
    registrationSchema,
    profileUpdateSchema,
    forgotPasswordSchema,
    resetPasswordSchema
};
