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
    rnc: z.string().optional().nullable().transform(val => val ? val.replace(/[^0-9]/g, '') : ''),
    profession: z.string().trim().optional().nullable(),
    hasRnc: z.string().optional().nullable(),
    // plan puede ser null (viene de searchParams cuando no hay ?plan=) → default 'free'
    plan: z.preprocess(
        val => (val === null || val === undefined || val === '' ? 'free' : val),
        z.enum(['free', 'pro'])
    ),
    referralCode: z.string().trim().optional().nullable().transform(val => val ? val.toUpperCase() : ''),
    isPartnerRegistration: z.boolean().optional().nullable(),
    inviteToken: z.string().optional().nullable(),
    suggestedName: z.string().trim().optional().nullable(),
    acceptedPolicyVersions: z.record(
        z.string(),
        z.preprocess(val => typeof val === 'string' ? Number(val) : val, z.number())
    ).optional().nullable()
}).passthrough(); // Ignorar campos extra (como confirmPassword si llegara)

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
