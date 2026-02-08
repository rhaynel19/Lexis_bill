const path = require('path');
// Load local env if exists (only for local testing)
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });
require('dotenv').config();

// --- FAIL-FAST: Variables críticas obligatorias ---
const JWT_SECRET = process.env.JWT_SECRET;
const MONGODB_URI = process.env.MONGODB_URI;
const isProd = process.env.NODE_ENV === 'production';

if (!JWT_SECRET || JWT_SECRET.length < 32) {
    console.error('❌ FATAL: JWT_SECRET debe estar definido y tener al menos 32 caracteres.');
    process.exit(1);
}
if (!MONGODB_URI) {
    console.error('❌ FATAL: MONGODB_URI no definido.');
    process.exit(1);
}
if (isProd && !process.env.NEXT_PUBLIC_SENTRY_DSN) {
    console.error('❌ FATAL: NEXT_PUBLIC_SENTRY_DSN requerido en producción. Cree proyecto en sentry.io');
    process.exit(1);
}

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const log = require('./logger');

// === UTILIDADES DE SEGURIDAD ===

/**
 * Sanitiza un string: remueve caracteres peligrosos y limita longitud
 */
const sanitizeString = (str, maxLength = 500) => {
    if (typeof str !== 'string') return '';
    return str
        .trim()
        .slice(0, maxLength)
        .replace(/<[^>]*>/g, '') // Remueve tags HTML
        .replace(/\$/g, '') // Previene operadores MongoDB
        .replace(/\{|\}/g, ''); // Previene objetos maliciosos
};

/**
 * Sanitiza un email: valida formato y limpia
 */
const sanitizeEmail = (email) => {
    if (typeof email !== 'string') return '';
    const cleaned = email.trim().toLowerCase().slice(0, 254);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(cleaned) ? cleaned : '';
};

/**
 * Valida un ObjectId de MongoDB
 */
const isValidObjectId = (id) => {
    return mongoose.Types.ObjectId.isValid(id) && (new mongoose.Types.ObjectId(id)).toString() === id;
};

/**
 * Valida fortaleza de contraseña
 * Mínimo 8 caracteres, al menos 1 mayúscula, 1 minúscula, 1 número
 */
const validatePassword = (password) => {
    if (typeof password !== 'string') return { valid: false, error: 'La contraseña es requerida' };
    if (password.length < 8) return { valid: false, error: 'La contraseña debe tener al menos 8 caracteres' };
    if (!/[A-Z]/.test(password)) return { valid: false, error: 'La contraseña debe tener al menos una mayúscula' };
    if (!/[a-z]/.test(password)) return { valid: false, error: 'La contraseña debe tener al menos una minúscula' };
    if (!/[0-9]/.test(password)) return { valid: false, error: 'La contraseña debe tener al menos un número' };
    return { valid: true };
};

/**
 * Sanitiza un objeto de items de factura/cotización
 */
const sanitizeItems = (items) => {
    if (!Array.isArray(items)) return [];
    return items.slice(0, 100).map(item => ({
        description: sanitizeString(item?.description || '', 500),
        quantity: Math.max(0, Math.min(Number(item?.quantity) || 0, 999999)),
        price: Math.max(0, Math.min(Number(item?.price) || 0, 999999999)),
        isExempt: Boolean(item?.isExempt)
    })).filter(item => item.description && item.quantity > 0);
};

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(cookieParser());

// CORS: en producción usar origen explícito; en dev permitir credenciales
const corsOrigin = process.env.CORS_ORIGIN;
app.use(cors({
    origin: isProd && corsOrigin ? corsOrigin.split(',').map(o => o.trim()) : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting - Zero Risk Deploy
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { message: 'Demasiados intentos. Intenta en 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false
});
const invoiceLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 50,
    message: { message: 'Límite de solicitudes excedido. Espera un momento.' },
    standardHeaders: true,
    legacyHeaders: false
});
const reportLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    message: { message: 'Demasiadas descargas. Espera un momento.' },
    standardHeaders: true,
    legacyHeaders: false
});
const uploadLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    message: { message: 'Demasiados archivos. Espera un momento.' },
    standardHeaders: true,
    legacyHeaders: false
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/invoices', invoiceLimiter);
app.use('/api/reports/606', reportLimiter);
app.use('/api/reports/607', reportLimiter);
app.use('/api/reports/606/validate', reportLimiter);
app.use('/api/reports/607/validate', reportLimiter);
app.use('/api/documents', uploadLimiter);

// --- 1. CONFIGURACIÓN DE CONEXIÓN ---

// Conexión Singleton para Vercel Serverless
let cachedDb = null;

const connectDB = async () => {
    if (mongoose.connection.readyState === 1) return mongoose.connection;

    if (!MONGODB_URI) {
        log.error('MONGODB_URI no definido');
        throw new Error('MONGODB_URI_MISSING');
    }

    try {
        log.info('Conectando a MongoDB...');
        return await mongoose.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 15000,
            dbName: 'lexis_bill',
            maxPoolSize: 25
        });
    } catch (err) {
        console.error('❌ Error fatal de conexión:', err.message);
        throw err;
    }
};

// Middleware para asegurar conexión en cada petición (Vercel standard)
app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (err) {
        log.error({ err: err.message }, 'Error de conexión en request');
        res.status(503).json({
            message: 'Error de conexión fiscal con la base de datos.',
            error: err.message,
            code: err.name,
            hint: 'Asegúrate de que el MONGODB_URI sea correcto y la IP esté permitida en Atlas.'
        });
    }
});

// --- PLANES DE MEMBRESÍA (Manual: Transferencia / PayPal) ---
// Objetivo: maximizar flujo de caja, reducir churn, incentivar anuales
const MEMBERSHIP_PLANS = {
    free: { id: 'free', name: 'Free', price: 0, currency: 'DOP', invoicesPerMonth: 5, features: ['5 facturas / mes', 'Reportes básicos'] },
    pro: {
        id: 'pro',
        name: 'Profesional',
        priceMonthly: 950,
        priceAnnual: 9500,
        currency: 'DOP',
        invoicesPerMonth: -1,
        available: true,
        features: ['Facturas ilimitadas', 'Reportes 606/607', 'Soporte prioritario'],
        annualNote: 'Paga 10 meses y usa 12',
        annualPopular: true
    },
    premium: {
        id: 'premium',
        name: 'Premium',
        price: 2450,
        currency: 'DOP',
        invoicesPerMonth: -1,
        available: false,
        comingSoon: true,
        comingSoonNote: 'Próximamente: multi-negocio y más. Te avisaremos.',
        features: ['Todo Pro', 'Multi-negocio', 'Soporte VIP']
    }
};

// --- 2. MODELOS ---
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    rnc: { type: String, required: true },
    profession: { type: String, enum: ['medico', 'abogado', 'ingeniero', 'tecnico', 'general'], default: 'general' },
    logo: { type: String },
    digitalSeal: { type: String },
    exequatur: { type: String },
    address: { type: String },
    phone: { type: String },
    membershipLevel: { type: String, default: 'free' },
    subscriptionStatus: { type: String, enum: ['Activo', 'Bloqueado', 'Trial', 'Gracia'], default: 'Trial' },
    expiryDate: { type: Date, default: () => new Date(Date.now() + 15 * 24 * 60 * 60 * 1000) },

    // Nuevo modelo de suscripción (Memberships)
    subscription: {
        plan: { type: String, enum: ['free', 'pro', 'premium'], default: 'free' },
        status: { type: String, enum: ['active', 'pending', 'expired'], default: 'active' },
        paymentMethod: { type: String, enum: ['transferencia', 'paypal'], default: null },
        startDate: { type: Date },
        endDate: { type: Date }
    },
    role: { type: String, enum: ['user', 'admin', 'partner'], default: 'user' },
    emailVerified: { type: Boolean, default: false },

    // Identidad Fiscal (Asistente Inteligente)
    suggestedFiscalName: { type: String },
    confirmedFiscalName: { type: String },

    // Preferencias de Facturación
    hasElectronicBilling: { type: Boolean, default: false },

    // Recordatorio 606/607: último periodo por el que se envió (YYYYMM)
    lastReportReminderPeriod: { type: String },

    // Onboarding obligatorio (First-Run Experience)
    onboardingCompleted: { type: Boolean, default: false },

    paymentHistory: [{
        date: { type: Date, default: Date.now },
        amount: Number,
        reference: String
    }],
    createdAt: { type: Date, default: Date.now }
});

const paymentRequestSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    plan: { type: String, enum: ['free', 'pro', 'premium'], required: true },
    billingCycle: { type: String, enum: ['monthly', 'annual'], default: 'monthly' },
    paymentMethod: { type: String, enum: ['transferencia', 'paypal'], required: true },
    reference: { type: String, unique: true, sparse: true }, // LEX-XXXX para que el cliente ponga en la transferencia
    comprobanteImage: { type: String }, // base64 data URL del comprobante (obligatorio para transferencia)
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    requestedAt: { type: Date, default: Date.now },
    processedAt: { type: Date },
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});
paymentRequestSchema.index({ status: 1, requestedAt: -1 });
paymentRequestSchema.index({ reference: 1 });
// Un solo pending por usuario: evita duplicados por doble clic / refresh / race
paymentRequestSchema.index(
    { userId: 1 },
    { unique: true, partialFilterExpression: { status: 'pending' } }
);

const ncfSettingsSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true },
    series: { type: String, default: 'E' },
    sequenceType: { type: String, enum: ['electronic', 'traditional'], default: 'electronic' },
    initialNumber: { type: Number, required: true },
    finalNumber: { type: Number, required: true },
    currentValue: { type: Number, required: true },
    expiryDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true }
});

const invoiceSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    clientName: { type: String, required: true },
    clientRnc: { type: String, required: true },
    ncfType: { type: String, required: true },
    ncfSequence: { type: String, required: true, unique: true },
    items: [{
        description: String,
        quantity: Number,
        price: Number,
        isExempt: Boolean
    }],
    subtotal: Number,
    itbis: Number,
    total: Number,
    date: { type: Date, default: Date.now },
    status: { type: String, enum: ['pending', 'paid', 'cancelled', 'modified'], default: 'pending' },
    modifiedNcf: { type: String },
    annulledBy: { type: String },
    // Retenciones practicadas por terceros (formato 607 DGII)
    isrRetention: { type: Number, default: 0 },
    itbisRetention: { type: Number, default: 0 },
    // --- Tipo de Pago (Lexis Copilot / Radar Morosidad) ---
    tipoPago: { type: String, enum: ['efectivo', 'transferencia', 'tarjeta', 'credito', 'mixto', 'otro'], default: 'efectivo' },
    tipoPagoOtro: { type: String },
    pagoMixto: [{
        tipo: { type: String },
        monto: { type: Number }
    }],
    montoPagado: { type: Number, default: 0 },
    balancePendiente: { type: Number, default: 0 },
    estadoPago: { type: String, enum: ['pagado', 'parcial', 'pendiente'], default: 'pagado' },
    fechaPago: { type: Date }
});
invoiceSchema.index({ userId: 1, date: -1 });
invoiceSchema.index({ userId: 1, ncfSequence: 1 });
invoiceSchema.index({ userId: 1, tipoPago: 1 });
invoiceSchema.index({ userId: 1, estadoPago: 1 });
invoiceSchema.index({ userId: 1, clientRnc: 1, date: -1 });

const customerSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    rnc: { type: String, required: true },
    phone: { type: String },
    email: { type: String },
    notes: { type: String },
    lastInvoiceDate: { type: Date },
    createdAt: { type: Date, default: Date.now }
});
customerSchema.index({ userId: 1, rnc: 1 }, { unique: true });

const supportTicketSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rnc: String,
    type: String,
    description: String,
    status: { type: String, default: 'open' },
    createdAt: { type: Date, default: Date.now }
});

const expenseSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    supplierName: { type: String, required: true },
    supplierRnc: { type: String, required: true },
    ncf: { type: String, required: true },
    amount: { type: Number, required: true },
    itbis: { type: Number, default: 0 },
    category: { type: String, required: true }, // DGII Expense Codes (01-11)
    date: { type: Date, default: Date.now },
    imageUrl: { type: String },
    paymentMethod: { type: String, default: '01' }, // DGII 606: 01 Efectivo, 02 Cheque, 03 Tarjeta, etc.
    createdAt: { type: Date, default: Date.now }
});
expenseSchema.index({ userId: 1, date: -1 });

const invoiceDraftSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [{ description: String, quantity: Number, price: Number, isExempt: Boolean }],
    clientName: String,
    rnc: String,
    invoiceType: String,
    updatedAt: { type: Date, default: Date.now }
});
invoiceDraftSchema.index({ userId: 1 }, { unique: true });

const invoiceTemplateSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    invoiceType: String,
    items: [{ description: String, quantity: Number, price: Number, isExempt: Boolean }],
    clientName: String,
    rnc: String,
    createdAt: { type: Date, default: Date.now }
});

const userServicesSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    services: [{ description: String, quantity: Number, price: Number, isExempt: Boolean }],
    updatedAt: { type: Date, default: Date.now }
});
userServicesSchema.index({ userId: 1 }, { unique: true });

const userDocumentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    type: { type: String, enum: ['Legal', 'Fiscal', 'Personal', 'Otro'], default: 'Personal' },
    data: { type: String, required: true }, // base64 data URL (imagen o PDF)
    mimeType: { type: String, default: 'application/octet-stream' },
    createdAt: { type: Date, default: Date.now }
});
userDocumentSchema.index({ userId: 1, createdAt: -1 });

const fiscalAuditLogSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tipoReporte: { type: String, enum: ['606', '607'], required: true },
    periodo: { type: String, required: true }, // YYYYMM
    resultadoValidacion: { type: String, enum: ['ok', 'error'], required: true },
    errores: [{ type: String }],
    registros: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});
fiscalAuditLogSchema.index({ userId: 1, createdAt: -1 });
fiscalAuditLogSchema.index({ tipoReporte: 1, periodo: 1 });

const quoteSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    clientName: { type: String, required: true },
    clientRnc: { type: String, required: true },
    clientPhone: { type: String },
    items: [{
        description: String,
        quantity: Number,
        price: Number,
        isExempt: Boolean
    }],
    subtotal: { type: Number, required: true },
    itbis: { type: Number, required: true },
    total: { type: Number, required: true },
    status: { type: String, enum: ['draft', 'sent', 'converted'], default: 'draft' },
    validUntil: { type: Date, required: true },
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
    lastSavedAt: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now }
});

// Avoid "OverwriteModelError" in serverless environments
const User = mongoose.models.User || mongoose.model('User', userSchema);
const PaymentRequest = mongoose.models.PaymentRequest || mongoose.model('PaymentRequest', paymentRequestSchema);
const InvoiceDraft = mongoose.models.InvoiceDraft || mongoose.model('InvoiceDraft', invoiceDraftSchema);
const InvoiceTemplate = mongoose.models.InvoiceTemplate || mongoose.model('InvoiceTemplate', invoiceTemplateSchema);
const UserServices = mongoose.models.UserServices || mongoose.model('UserServices', userServicesSchema);
const NCFSettings = mongoose.models.NCFSettings || mongoose.model('NCFSettings', ncfSettingsSchema);
const Invoice = mongoose.models.Invoice || mongoose.model('Invoice', invoiceSchema);
const Customer = mongoose.models.Customer || mongoose.model('Customer', customerSchema);
const SupportTicket = mongoose.models.SupportTicket || mongoose.model('SupportTicket', supportTicketSchema);
const Expense = mongoose.models.Expense || mongoose.model('Expense', expenseSchema);
const Quote = mongoose.models.Quote || mongoose.model('Quote', quoteSchema);
const UserDocument = mongoose.models.UserDocument || mongoose.model('UserDocument', userDocumentSchema);
const FiscalAuditLog = mongoose.models.FiscalAuditLog || mongoose.model('FiscalAuditLog', fiscalAuditLogSchema);

// --- PARTNER PROGRAM ---
const partnerSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    referralCode: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    whyPartner: { type: String },
    tier: { type: String, enum: ['starter', 'growth', 'elite'], default: 'starter' },
    commissionRate: { type: Number, default: 0.07 },
    bankName: { type: String },
    bankAccount: { type: String },
    bankAccountType: { type: String, enum: ['ahorro', 'corriente'] },
    status: { type: String, enum: ['pending', 'active', 'suspended'], default: 'pending' },
    approvedAt: { type: Date },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'PartnerInvite' },
    termsAcceptedAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});
partnerSchema.index({ referralCode: 1 });
partnerSchema.index({ status: 1 });

const partnerReferralSchema = new mongoose.Schema({
    partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    status: { type: String, enum: ['active', 'churned', 'trial'], default: 'trial' },
    subscribedAt: { type: Date },
    churnedAt: { type: Date },
    createdAt: { type: Date, default: Date.now }
});
partnerReferralSchema.index({ partnerId: 1, status: 1 });
partnerReferralSchema.index({ userId: 1 }, { unique: true });

const partnerCommissionSchema = new mongoose.Schema({
    partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', required: true },
    month: { type: String, required: true },
    year: { type: Number, required: true },
    activeClientsCount: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    commissionRate: { type: Number },
    commissionAmount: { type: Number, default: 0 },
    status: { type: String, enum: ['pending', 'paid', 'cancelled'], default: 'pending' },
    paidAt: { type: Date },
    paymentRef: { type: String },
    createdAt: { type: Date, default: Date.now }
});
partnerCommissionSchema.index({ partnerId: 1, month: 1 }, { unique: true });

const Partner = mongoose.models.Partner || mongoose.model('Partner', partnerSchema);
const PartnerReferral = mongoose.models.PartnerReferral || mongoose.model('PartnerReferral', partnerReferralSchema);
const PartnerCommission = mongoose.models.PartnerCommission || mongoose.model('PartnerCommission', partnerCommissionSchema);

// Invitaciones de Partner (modelo híbrido)
const partnerInviteSchema = new mongoose.Schema({
    token: { type: String, required: true, unique: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    usedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    usedAt: { type: Date },
    expiresAt: { type: Date },
    maxUses: { type: Number, default: 1 },
    useCount: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'used', 'expired'], default: 'active' },
    createdAt: { type: Date, default: Date.now }
});
partnerInviteSchema.index({ token: 1 });
partnerInviteSchema.index({ status: 1 });

const PartnerInvite = mongoose.models.PartnerInvite || mongoose.model('PartnerInvite', partnerInviteSchema);

function generateInviteToken() {
    return 'INV' + Math.random().toString(36).slice(2, 10).toUpperCase() + Date.now().toString(36).slice(-4).toUpperCase();
}

function generateReferralCode(name) {
    const base = (name || 'LB').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4) || 'LB';
    const random = Math.random().toString(36).slice(2, 6).toUpperCase();
    return base + random;
}

function getPartnerTier(activeCount) {
    if (activeCount >= 51) return { tier: 'elite', rate: 0.10 };
    if (activeCount >= 21) return { tier: 'growth', rate: 0.09 };
    return { tier: 'starter', rate: 0.07 };
}

// Token para recuperar contraseña
const passwordResetSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    token: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date },
    createdAt: { type: Date, default: Date.now }
});
passwordResetSchema.index({ token: 1 });
passwordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
const PasswordReset = mongoose.models.PasswordReset || mongoose.model('PasswordReset', passwordResetSchema);

function generateResetToken() {
    return require('crypto').randomBytes(32).toString('hex');
}

const { validate607Format, validate606Format, validateNcfStructure } = require('./dgii-validator');

function getUserSubscription(user) {
    // Usuario oficial/admin: acceso total siempre (plan Pro, sin bloqueos)
    if (user?.role === 'admin') {
        return {
            plan: 'pro',
            status: 'active',
            paymentMethod: null,
            startDate: user.createdAt,
            endDate: null
        };
    }
    const sub = user.subscription || {};
    const plan = sub.plan || user.membershipLevel || 'free';
    let status = sub.status;
    if (!status) {
        if (user.subscriptionStatus === 'Activo') status = 'active';
        else if (user.subscriptionStatus === 'Bloqueado') status = 'expired';
        else status = 'active';
    }
    return {
        plan,
        status: status || 'active',
        paymentMethod: sub.paymentMethod || null,
        startDate: sub.startDate || user.createdAt,
        endDate: sub.endDate || user.expiryDate
    };
}

// --- 3. MIDDLEWARE ---
// SEGURIDAD: Token solo en cookie HttpOnly (no en URL ni localStorage)
const verifyToken = (req, res, next) => {
    const token = req.cookies?.lexis_auth;
    if (!token) return res.status(403).json({ message: 'Sesión no válida. Inicie sesión.' });

    jwt.verify(token, JWT_SECRET, async (err, decoded) => {
        if (err) return res.status(401).json({ message: 'Unauthorized' });

        try {
            const user = await User.findById(decoded.id);
            if (!user) return res.status(404).json({ message: 'User not found' });

            const sub = getUserSubscription(user);
            const now = new Date();
            const endDate = sub.endDate ? new Date(sub.endDate) : user.expiryDate ? new Date(user.expiryDate) : null;

            // Admin: no se bloquea nunca
            if (user.role !== 'admin' && sub.status === 'expired' && endDate) {
                const gracePeriodLimit = new Date(endDate);
                gracePeriodLimit.setDate(gracePeriodLimit.getDate() + 5);
                if (now > gracePeriodLimit) {
                    return res.status(403).json({
                        message: 'Suscripción bloqueada. Periodo de gracia finalizado.',
                        code: 'SUBSCRIPTION_LOCKED'
                    });
                }
            }

            req.userId = decoded.id;
            req.user = user;
            req.subscription = sub;
            next();
        } catch (dbErr) {
            res.status(500).json({ error: 'Error verificando suscripción' });
        }
    });
};

const verifyAdmin = (req, res, next) => {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'Acceso denegado. Solo administradores.' });
    }
    next();
};

// --- 4. HELPERS ---
// DGII NCF: Tipos soportados - B01/E31 Empresas, B02/E32 Consumidor, B14 Educación, B15/E15 Gobierno
const NCF_TYPES_BUSINESS = ['01', '31'];
const NCF_TYPES_CONSUMER = ['02', '32'];
const NCF_TYPES_EDUCATION = ['14'];
const NCF_TYPES_GOVERNMENT = ['15', '45'];

function validateNcfForClient(ncfType, clientRnc) {
    if (!clientRnc) return { valid: true };
    const cleanRnc = (clientRnc || '').replace(/[^\d]/g, '');
    const isBusiness = cleanRnc.length === 9;
    const isGov = cleanRnc.startsWith('4') || cleanRnc.length === 11; // simplificado: cédula o gubernamental

    if (NCF_TYPES_BUSINESS.includes(ncfType) && !isBusiness) return { valid: false, reason: 'NCF B01/E31 solo para empresas (RNC 9 dígitos)' };
    if (NCF_TYPES_CONSUMER.includes(ncfType) && isBusiness) return { valid: false, reason: 'NCF B02/E32 para consumidor final, no empresas' };
    if (NCF_TYPES_GOVERNMENT.includes(ncfType) && !isGov) return { valid: false, reason: 'NCF B15/E15 solo para facturación gubernamental' };
    return { valid: true };
}

async function getNextNcf(userId, type, session, clientRnc) {
    // DGII: Validar tipo de cliente vs tipo de NCF
    const clientCheck = validateNcfForClient(type, clientRnc);
    if (!clientCheck.valid) throw new Error(clientCheck.reason);

    const now = new Date();
    // DGII: Validar fecha de expiración del rango - solo lotes vigentes
    const activeBatch = await NCFSettings.findOneAndUpdate(
        {
            userId,
            type,
            isActive: true,
            expiryDate: { $gte: now },
            $expr: { $lt: ["$currentValue", "$finalNumber"] }
        },
        { $inc: { currentValue: 1 } },
        { new: true, session }
    );

    if (!activeBatch) {
        const expired = await NCFSettings.findOne({ userId, type, isActive: true, expiryDate: { $lt: now } }).session(session);
        if (expired) throw new Error('El rango de NCF ha vencido. Configure un nuevo lote en Configuración.');
        throw new Error('No hay secuencias NCF disponibles para este tipo. Configure un lote en Configuración.');
    }

    const isElectronic = activeBatch.series === 'E';
    const padding = isElectronic ? 10 : 8;
    const paddedSeq = activeBatch.currentValue.toString().padStart(padding, '0');
    const fullNcf = `${activeBatch.series}${type}${paddedSeq}`;

    // DGII: Validar unicidad (doble verificación - índice unique en Invoice protege)
    const exists = await Invoice.findOne({ ncfSequence: fullNcf }).session(session);
    if (exists) throw new Error('NCF duplicado detectado. Contacte soporte.');

    return fullNcf;
}

function validateTaxId(id) {
    const str = id.replace(/[^\d]/g, '');
    if (str.length === 9) {
        let sum = 0;
        const weights = [7, 9, 8, 6, 5, 4, 3, 2];
        for (let i = 0; i < 8; i++) sum += parseInt(str[i]) * weights[i];
        let remainder = sum % 11;
        let digit = remainder === 0 ? 2 : (remainder === 1 ? 1 : 11 - remainder);
        return digit === parseInt(str[8]);
    }
    if (str.length === 11) {
        let sum = 0;
        const weights = [1, 2, 1, 2, 1, 2, 1, 2, 1, 2];
        for (let i = 0; i < 10; i++) {
            let prod = parseInt(str[i]) * weights[i];
            if (prod > 9) prod = Math.floor(prod / 10) + (prod % 10);
            sum += prod;
        }
        let check = (10 - (sum % 10)) % 10;
        return check === parseInt(str[10]);
    }
    return false;
}

/** Consulta RNC/Cédula en API externa DGII o proveedor (MegaPlus, etc.). Si DGII_RNC_API_URL está definido, hace GET a ?rnc=XXX. */
async function fetchRncFromExternalApi(cleanNumber) {
    const baseUrl = process.env.DGII_RNC_API_URL;
    if (!baseUrl || typeof cleanNumber !== 'string') return null;
    const url = baseUrl.includes('?') ? `${baseUrl}&rnc=${cleanNumber}` : `${baseUrl}?rnc=${cleanNumber}`;
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(url, { signal: controller.signal, headers: { 'Accept': 'application/json' } });
        clearTimeout(timeout);
        if (!res.ok) return null;
        const data = await res.json();
        // Formatos comunes: { razonSocial, nombreComercial }, { name }, { nombre }, { RazonSocial }
        const name = data.razonSocial || data.nombreRazonSocial || data.name || data.nombre || data.RazonSocial || data.nombreComercial || null;
        if (!name) return null;
        const type = cleanNumber.length === 9 ? 'JURIDICA' : 'FISICA';
        return { valid: true, rnc: cleanNumber, name: String(name).trim(), type };
    } catch (e) {
        log.warn({ err: e.message, rnc: cleanNumber }, 'RNC external API failed');
        return null;
    }
}

const RNC_MOCK_DB = {
    '101010101': 'JUAN PEREZ',
    '131888444': 'LEXIS BILL SOLUTIONS S.R.L.',
    '40222222222': 'DRA. MARIA RODRIGUEZ (DEMO)',
    '130851255': 'ASOCIACION DE ESPECIALISTAS FISCALES',
    '22301650929': 'ASOCIACION PROFESIONAL DE SANTO DOMINGO'
};

// --- 5. ENDPOINTS ---

// Health Check - Production Grade (UptimeRobot, BetterStack, Pingdom)
app.get('/api/health', async (req, res) => {
    const checks = {
        database: mongoose.connection.readyState === 1 ? 'UP' : 'DOWN',
        memory: process.memoryUsage ? 'OK' : 'UNKNOWN',
        env: {
            jwt: !!(process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32),
            mongodb: !!process.env.MONGODB_URI,
            sentry: !!process.env.NEXT_PUBLIC_SENTRY_DSN
        }
    };

    let memUsage = null;
    if (process.memoryUsage) {
        const mu = process.memoryUsage();
        memUsage = { heapUsed: Math.round(mu.heapUsed / 1024 / 1024), heapTotal: Math.round(mu.heapTotal / 1024 / 1024) };
    }

    const dbOk = checks.database === 'UP';
    const criticalOk = checks.env.jwt && checks.env.mongodb;
    const status = dbOk && criticalOk ? 'healthy' : (dbOk ? 'degraded' : 'down');

    res.status(status === 'down' ? 503 : 200).json({
        status,
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0',
        checks: {
            database: checks.database,
            memory: memUsage,
            jwtConfigured: checks.env.jwt,
            mongodbConfigured: checks.env.mongodb,
            sentryConfigured: checks.env.sentry
        },
        environment: process.env.NODE_ENV || 'production'
    });
});

// Tickets (Merged from legacy api/server.js)
app.post('/api/tickets', async (req, res) => {
    try {
        const { userId, rnc, type, description } = req.body;
        const newTicket = new SupportTicket({ userId, rnc, type, description });
        await newTicket.save();
        res.status(201).json({ message: 'Ticket creado exitosamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Auth
app.post('/api/auth/register', async (req, res) => {
    try {
        const { password, plan } = req.body;
        
        // === SANITIZACIÓN DE INPUTS ===
        const email = sanitizeEmail(req.body.email);
        const name = sanitizeString(req.body.name, 100);
        const rnc = sanitizeString(req.body.rnc, 20).replace(/[^0-9]/g, '');
        const profession = sanitizeString(req.body.profession, 100);
        
        log.info({ action: 'register' }, 'Registrando usuario');

        // === VALIDACIONES ===
        if (!email) {
            return res.status(400).json({ message: 'El correo electrónico no es válido.' });
        }
        if (!name || name.length < 2) {
            return res.status(400).json({ message: 'El nombre es requerido (mínimo 2 caracteres).' });
        }
        
        // Validar fortaleza de contraseña
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.valid) {
            return res.status(400).json({ message: passwordValidation.error });
        }

        // Verificar si el usuario ya existe antes de intentar guardar (más limpio que el catch de mongo)
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Este correo ya está registrado.' });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const expiryDays = plan === 'pro' ? 30 : 15;
        const status = plan === 'pro' ? 'Activo' : 'Trial';

        const newUser = new User({
            email, password: hashedPassword, name, rnc, profession,
            subscriptionStatus: status,
            expiryDate: new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000),
            subscription: {
                plan: plan === 'pro' ? 'pro' : 'free',
                status: 'active',
                startDate: new Date(),
                endDate: new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000)
            },
            suggestedFiscalName: req.body.suggestedName || "",
            onboardingCompleted: false
        });

        await newUser.save();

        // === PROGRAMA PARTNERS: Registrar referido si hay código válido ===
        const referralCode = sanitizeString(req.body.referralCode || '', 20).toUpperCase();
        if (referralCode) {
            try {
                const partner = await Partner.findOne({ referralCode, status: 'active' });
                if (partner) {
                    await PartnerReferral.create({
                        partnerId: partner._id,
                        userId: newUser._id,
                        status: plan === 'pro' ? 'active' : 'trial',
                        subscribedAt: plan === 'pro' ? new Date() : null
                    });
                    log.info({ action: 'register', referralCode }, 'Referido vinculado a partner');
                }
            } catch (refErr) {
                log.warn({ err: refErr.message }, 'Error vinculando referido');
            }
        }

        log.info({ action: 'register', success: true }, 'Usuario creado');
        res.status(201).json({ message: 'Usuario registrado exitosamente', plan: status });
    } catch (error) {
        log.error({ err: error.message }, 'Error en registro');
        if (error.code === 11000) {
            return res.status(400).json({ message: 'El correo o el RNC ya están registrados.' });
        }
        res.status(500).json({ message: 'Error interno al crear el usuario', error: error.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        log.info({ action: 'login' }, 'Intento de login');

        const user = await User.findOne({ email });
        if (!user) {
            log.warn('Login fallido: usuario no encontrado');
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        const passwordIsValid = await bcrypt.compare(password, user.password);
        if (!passwordIsValid) {
            log.warn('Login fallido: contraseña inválida');
            return res.status(401).json({ message: 'Contraseña inválida' });
        }

        const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: 86400 });

        // Cookie HttpOnly para que el middleware permita acceso a rutas protegidas
        res.cookie('lexis_auth', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax', // strict en prod previene CSRF
            maxAge: 86400 * 1000, // 24h en ms
            path: '/'
        });

        const sub = getUserSubscription(user);
        log.info({ action: 'login', success: true }, 'Login exitoso');
        res.status(200).json({
            id: user._id,
            email: user.email,
            name: user.name,
            profession: user.profession,
            rnc: user.rnc,
            role: user.role || 'user',
            subscription: sub,
            fiscalStatus: {
                suggested: user.suggestedFiscalName,
                confirmed: user.confirmedFiscalName
            }
        });
    } catch (error) {
        log.error({ err: error.message }, 'Error en login');
        res.status(500).json({ message: 'Error interno en el servidor', error: error.message });
    }
});

// Recuperar contraseña: solicitar token por email
app.post('/api/auth/forgot-password', authLimiter, async (req, res) => {
    try {
        const email = sanitizeEmail(req.body.email);
        if (!email) return res.status(400).json({ message: 'Correo no válido.' });
        const user = await User.findOne({ email });
        if (!user) {
            // No revelar si el email existe
            return res.status(200).json({ message: 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.' });
        }
        const token = generateResetToken();
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora
        await PasswordReset.deleteMany({ userId: user._id });
        await PasswordReset.create({ userId: user._id, token, expiresAt });
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lexisbill.com.do';
        const resetUrl = `${baseUrl}/restablecer-contrasena?token=${token}`;
        try {
            if (process.env.SEND_PASSWORD_RESET_EMAIL === 'true') {
                const mailer = require('./mailer');
                if (typeof mailer.sendPasswordReset === 'function') await mailer.sendPasswordReset(user.email, resetUrl);
                else log.info({ email: user.email, resetUrl }, 'Password reset (mailer.sendPasswordReset no definido)');
            } else {
                log.info({ email: user.email, resetUrl }, 'Password reset (email no enviado; configurar SEND_PASSWORD_RESET_EMAIL en dev usar URL del log)');
            }
        } catch (e) { log.warn({ err: (e && e.message) || 'mailer no disponible' }, 'Email reset no enviado'); }
        res.status(200).json({ message: 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.' });
    } catch (e) {
        log.error({ err: e.message }, 'Error forgot-password');
        res.status(500).json({ message: 'Error al procesar la solicitud.' });
    }
});

// Restablecer contraseña con token
app.post('/api/auth/reset-password', async (req, res) => {
    try {
        const token = sanitizeString(req.body.token || '', 200);
        const newPassword = req.body.newPassword;
        if (!token || !newPassword) return res.status(400).json({ message: 'Token y nueva contraseña son requeridos.' });
        const pwValidation = validatePassword(newPassword);
        if (!pwValidation.valid) return res.status(400).json({ message: pwValidation.error });
        const reset = await PasswordReset.findOne({ token, usedAt: null });
        if (!reset) return res.status(400).json({ message: 'Enlace inválido o expirado.' });
        if (new Date() > reset.expiresAt) {
            await PasswordReset.deleteOne({ _id: reset._id });
            return res.status(400).json({ message: 'El enlace ha expirado. Solicita uno nuevo.' });
        }
        const user = await User.findById(reset.userId);
        if (!user) return res.status(400).json({ message: 'Usuario no encontrado.' });
        user.password = await bcrypt.hash(newPassword, 12);
        await user.save();
        reset.usedAt = new Date();
        await reset.save();
        log.info({ userId: user._id }, 'Contraseña restablecida');
        res.status(200).json({ message: 'Contraseña actualizada. Ya puedes iniciar sesión.' });
    } catch (e) {
        log.error({ err: e.message }, 'Error reset-password');
        res.status(500).json({ message: 'Error al restablecer la contraseña.' });
    }
});

// Verificación de email (opcional): marcar email como verificado con token
app.post('/api/auth/verify-email', async (req, res) => {
    try {
        const token = sanitizeString(req.body.token || '', 200);
        if (!token) return res.status(400).json({ message: 'Token requerido.' });
        const ev = await EmailVerify.findOne({ token });
        if (!ev) return res.status(400).json({ message: 'Enlace inválido o expirado.' });
        if (new Date() > ev.expiresAt) {
            await EmailVerify.deleteOne({ _id: ev._id });
            return res.status(400).json({ message: 'El enlace ha expirado.' });
        }
        const user = await User.findByIdAndUpdate(ev.userId, { emailVerified: true }, { new: true });
        if (!user) return res.status(400).json({ message: 'Usuario no encontrado.' });
        await EmailVerify.deleteOne({ _id: ev._id });
        log.info({ userId: user._id }, 'Email verificado');
        res.status(200).json({ message: 'Correo verificado correctamente.' });
    } catch (e) {
        log.error({ err: e.message }, 'Error verify-email');
        res.status(500).json({ message: 'Error al verificar el correo.' });
    }
});

// Logout: limpiar cookie HttpOnly
app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('lexis_auth', { path: '/', httpOnly: true });
    res.json({ success: true });
});

app.get('/api/auth/me', verifyToken, async (req, res) => {
    try {
        const user = req.user;
        const sub = getUserSubscription(user);
        let partner = null;
        const p = await Partner.findOne({ userId: user._id });
        if (p) partner = { referralCode: p.referralCode, status: p.status, tier: p.tier };
        // Usuarios existentes (antes del deploy): considerar onboarded para no bloquearlos
        const createdBeforeOnboarding = user.createdAt && new Date(user.createdAt) < new Date('2026-02-01');
        const onboardingCompleted = user.onboardingCompleted === true || createdBeforeOnboarding;

        res.json({
            id: user._id,
            email: user.email,
            name: user.name,
            profession: user.profession,
            rnc: user.rnc,
            role: user.role || 'user',
            subscription: sub,
            fiscalStatus: { suggested: user.suggestedFiscalName, confirmed: user.confirmedFiscalName },
            partner,
            onboardingCompleted
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/onboarding/complete', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

        const { name, rnc, address, phone, confirmedFiscalName, logo } = req.body;
        if (name) user.name = sanitizeString(name, 200);
        if (rnc) user.rnc = String(rnc).replace(/[^0-9]/g, '').slice(0, 20);
        if (address !== undefined) user.address = sanitizeString(address, 300);
        if (phone !== undefined) user.phone = sanitizeString(phone, 20).replace(/[^0-9+\-\s]/g, '');
        if (confirmedFiscalName) user.confirmedFiscalName = sanitizeString(confirmedFiscalName, 200);
        if (logo) user.logo = logo;

        user.onboardingCompleted = true;
        await user.save();

        res.json({ success: true, message: 'Onboarding completado' });
    } catch (error) {
        res.status(500).json({ message: error.message || 'Error al completar onboarding' });
    }
});

app.post('/api/auth/confirm-fiscal-name', verifyToken, async (req, res) => {
    try {
        const { confirmedName } = req.body;
        if (!confirmedName) return res.status(400).json({ message: 'Nombre confirmado requerido' });

        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

        user.confirmedFiscalName = confirmedName;
        await user.save();

        res.json({ success: true, confirmedName });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- PARTNER PROGRAM ---
// Validar código de referido (público)
app.get('/api/referral/validate', async (req, res) => {
    try {
        const code = sanitizeString(req.query.code || '', 20).toUpperCase();
        if (!code) return res.json({ valid: false });
        const partner = await Partner.findOne({ referralCode: code, status: 'active' });
        res.json({ valid: !!partner, partnerName: partner?.name });
    } catch (e) {
        res.json({ valid: false });
    }
});

// Validar token de invitación partner (público)
app.get('/api/referral/invite', async (req, res) => {
    try {
        const token = sanitizeString(req.query.token || '', 50);
        if (!token) return res.json({ valid: false });
        const invite = await PartnerInvite.findOne({ token, status: 'active' });
        if (!invite) return res.json({ valid: false });
        const now = new Date();
        if (invite.expiresAt && now > invite.expiresAt) {
            invite.status = 'expired';
            await invite.save();
            return res.json({ valid: false });
        }
        if (invite.maxUses && invite.useCount >= invite.maxUses) {
            return res.json({ valid: false });
        }
        res.json({ valid: true, source: 'invite' });
    } catch (e) {
        res.json({ valid: false });
    }
});

// Aplicar para ser Partner (requiere login)
const partnerApplyLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: { message: 'Demasiadas solicitudes. Intenta en 1 hora.' },
    standardHeaders: true,
    legacyHeaders: false
});
app.post('/api/partners/apply', verifyToken, partnerApplyLimiter, async (req, res) => {
    try {
        const userId = req.userId;
        const existing = await User.findById(userId);
        if (!existing) return res.status(404).json({ message: 'Usuario no encontrado' });

        const name = sanitizeString(req.body.name || existing.name, 100);
        const phone = sanitizeString(req.body.phone || '', 30);
        const whyPartner = sanitizeString(req.body.whyPartner || '', 2000);
        const inviteToken = sanitizeString(req.body.inviteToken || '', 50);

        const exists = await Partner.findOne({ userId });
        if (exists) {
            if (exists.status === 'pending') return res.status(400).json({ message: 'Ya tienes una solicitud pendiente.' });
            if (exists.status === 'active') return res.status(400).json({ message: 'Ya eres partner activo.', referralCode: exists.referralCode });
            if (exists.status === 'suspended') return res.status(400).json({ message: 'Tu cuenta partner está suspendida. Contacta a soporte.' });
        }

        let invitedBy = null;
        if (inviteToken) {
            const invite = await PartnerInvite.findOne({ token: inviteToken, status: 'active' });
            if (invite) {
                const now = new Date();
                if ((!invite.expiresAt || now <= invite.expiresAt) && (!invite.maxUses || invite.useCount < invite.maxUses)) {
                    invitedBy = invite._id;
                    invite.useCount = (invite.useCount || 0) + 1;
                    if (invite.maxUses && invite.useCount >= invite.maxUses) invite.status = 'used';
                    invite.usedBy = userId;
                    invite.usedAt = now;
                    await invite.save();
                }
            }
        }

        let referralCode = generateReferralCode(name);
        while (await Partner.findOne({ referralCode })) referralCode = generateReferralCode(name + Math.random());

        const partnerData = {
            userId,
            referralCode,
            name,
            email: existing.email,
            phone,
            whyPartner: whyPartner || undefined,
            status: 'pending',
            termsAcceptedAt: new Date()
        };
        if (invitedBy) partnerData.invitedBy = invitedBy;
        const partner = new Partner(partnerData);
        await partner.save();

        if (existing.role !== 'partner') {
            existing.role = 'partner';
            await existing.save();
        }

        res.status(201).json({
            message: 'Solicitud enviada. Te contactaremos cuando sea aprobada.',
            status: 'pending'
        });
    } catch (e) {
        log.error({ err: e.message }, 'Error en partner apply');
        res.status(500).json({ message: 'Error al enviar solicitud' });
    }
});

const verifyPartner = async (req, res, next) => {
    const p = await Partner.findOne({ userId: req.userId, status: 'active' });
    if (!p) return res.status(403).json({ message: 'Acceso denegado. No eres partner activo.' });
    req.partner = p;
    next();
};

app.get('/api/partners/me', verifyToken, verifyPartner, async (req, res) => {
    try {
        const p = req.partner;
        const activeCount = await PartnerReferral.countDocuments({ partnerId: p._id, status: 'active' });
        const trialCount = await PartnerReferral.countDocuments({ partnerId: p._id, status: 'trial' });
        const tier = getPartnerTier(activeCount);
        if (tier.tier !== p.tier) {
            p.tier = tier.tier;
            p.commissionRate = tier.rate;
            await p.save();
        }
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lexisbill.com.do';
        res.json({
            referralCode: p.referralCode,
            referralUrl: `${baseUrl}/registro?ref=${p.referralCode}`,
            tier: p.tier,
            commissionRate: p.commissionRate,
            activeClients: activeCount,
            trialClients: trialCount
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/partners/dashboard', verifyToken, verifyPartner, async (req, res) => {
    try {
        const p = req.partner;
        const activeCount = await PartnerReferral.countDocuments({ partnerId: p._id, status: 'active' });
        const trialCount = await PartnerReferral.countDocuments({ partnerId: p._id, status: 'trial' });
        const churnedCount = await PartnerReferral.countDocuments({ partnerId: p._id, status: 'churned' });
        const tier = getPartnerTier(activeCount);
        const pricePerClient = 950;
        const totalRevenue = activeCount * pricePerClient;
        const commissionAmount = Math.round(totalRevenue * tier.rate);

        const commissions = await PartnerCommission.find({ partnerId: p._id })
            .sort({ year: -1, month: -1 }).limit(12).lean();

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lexisbill.com.do';
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const showWelcome = p.approvedAt && new Date(p.approvedAt) >= sevenDaysAgo;
        res.json({
            referralCode: p.referralCode,
            referralUrl: `${baseUrl}/registro?ref=${p.referralCode}`,
            tier: tier.tier,
            commissionRate: tier.rate,
            activeClients: activeCount,
            trialClients: trialCount,
            churnedClients: churnedCount,
            totalRevenue,
            commissionThisMonth: commissionAmount,
            approvedAt: p.approvedAt,
            showWelcomeMessage: !!showWelcome,
            commissions: commissions.map(c => ({
                month: c.month,
                year: c.year,
                activeClients: c.activeClientsCount,
                amount: c.commissionAmount,
                status: c.status
            }))
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/auth/profile', verifyToken, async (req, res) => {
    try {
        const updates = req.body;
        const allowedUpdates = [
            'name', 'profession', 'logo', 'digitalSeal', 'exequatur',
            'address', 'phone', 'hasElectronicBilling'
        ];

        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

        allowedUpdates.forEach(field => {
            if (updates[field] !== undefined) {
                user[field] = updates[field];
            }
        });

        await user.save();
        res.json({
            success: true, user: {
                name: user.name,
                email: user.email,
                hasElectronicBilling: user.hasElectronicBilling
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- Referencia única LEX-XXXX para transferencias ---
async function generateUniquePaymentReference() {
    for (let attempt = 0; attempt < 20; attempt++) {
        const num = Math.floor(1000 + Math.random() * 9000);
        const ref = `LEX-${num}`;
        const exists = await PaymentRequest.findOne({ reference: ref });
        if (!exists) return ref;
    }
    const fallback = `LEX-${Date.now().toString().slice(-4)}`;
    return fallback;
}

// --- MEMBRESÍAS (Manual: Transferencia / PayPal) ---
app.get('/api/membership/plans', (req, res) => {
    res.json({ plans: Object.values(MEMBERSHIP_PLANS) });
});

app.get('/api/membership/payment-info', (req, res) => {
    res.json({
        bankName: process.env.LEXISBILL_BANK_NAME || 'Banco Popular Dominicano',
        bankAccount: process.env.LEXISBILL_BANK_ACCOUNT || 'XXX-XXXXXX-X',
        paypalEmail: process.env.LEXISBILL_PAYPAL_EMAIL || 'pagos@lexisbill.com'
    });
});

// Preparar transferencia: devuelve SOLO referencia única LEX-XXXX. NO crea PaymentRequest.
// La solicitud se crea ÚNICAMENTE cuando el usuario sube comprobante en request-payment.
app.post('/api/membership/prepare-transfer', verifyToken, async (req, res) => {
    try {
        const { plan, billingCycle } = req.body;
        if (!plan || plan !== 'pro') {
            return res.status(400).json({ message: 'Por ahora solo el plan Profesional está disponible.' });
        }
        const reference = await generateUniquePaymentReference();
        res.json({ reference });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Crear solicitud de validación SOLO cuando existe evidencia: comprobante (transfer) o confirmación (paypal).
app.post('/api/membership/request-payment', verifyToken, async (req, res) => {
    try {
        const { plan, billingCycle, paymentMethod, comprobanteImage, reference: clientReference } = req.body;

        if (!plan || plan !== 'pro') {
            return res.status(400).json({ message: 'Por ahora solo el plan Profesional está disponible.' });
        }
        const cycle = billingCycle === 'annual' ? 'annual' : 'monthly';
        if (!paymentMethod || !['transferencia', 'paypal'].includes(paymentMethod)) {
            return res.status(400).json({ message: 'Método de pago inválido. Elige Transferencia o PayPal.' });
        }

        if (paymentMethod === 'transferencia') {
            if (!comprobanteImage || !comprobanteImage.startsWith('data:image/')) {
                return res.status(400).json({ message: 'Debes subir el comprobante de transferencia para continuar.' });
            }
        }

        const existing = await PaymentRequest.findOne({ userId: req.userId, status: 'pending' });
        if (existing) {
            return res.status(400).json({ message: 'Ya tienes una solicitud de pago pendiente. Espera a que la validemos.' });
        }

        const reference = clientReference && /^LEX-\d{4}$/.test(String(clientReference).trim())
            ? String(clientReference).trim()
            : await generateUniquePaymentReference();

        const pr = new PaymentRequest({
            userId: req.userId,
            plan,
            billingCycle: cycle,
            paymentMethod,
            reference,
            comprobanteImage: paymentMethod === 'transferencia' ? comprobanteImage : undefined,
            status: 'pending'
        });
        await pr.save();

        const user = req.user;
        if (!user.subscription) user.subscription = {};
        user.subscription.plan = plan;
        user.subscription.status = 'pending';
        user.subscription.paymentMethod = paymentMethod;
        await user.save();

        res.status(201).json({
            message: paymentMethod === 'paypal'
                ? 'Tu solicitud fue registrada. Tu plan se activa automáticamente una vez validemos el pago (puede tardar hasta 24 horas).'
                : 'Comprobante recibido. Tu plan se activa automáticamente una vez validemos el pago (puede tardar hasta 24 horas).',
            paymentRequest: { id: pr._id, reference, plan, billingCycle: cycle, paymentMethod, status: 'pending' }
        });
    } catch (e) {
        if (e.code === 11000) {
            return res.status(400).json({ message: 'Ya tienes una solicitud de pago pendiente. Espera a que la validemos.' });
        }
        res.status(500).json({ error: e.message });
    }
});

// --- ADMIN: Pagos pendientes y validación ---
// Solo mostrar solicitudes con evidencia: comprobante (transfer) o paypal (confirmación).
// Excluye registros legacy sin comprobante creados por prepare-transfer antiguo.
app.get('/api/admin/pending-payments', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const list = await PaymentRequest.find({
            status: 'pending',
            $or: [
                { comprobanteImage: { $exists: true, $ne: null, $ne: '' } },
                { paymentMethod: 'paypal' }
            ]
        })
            .populate('userId', 'name email rnc')
            .sort({ requestedAt: -1 });
        res.json(list.map(p => ({
            id: p._id,
            reference: p.reference,
            userId: p.userId?._id,
            userName: p.userId?.name,
            userEmail: p.userId?.email,
            plan: p.plan,
            billingCycle: p.billingCycle || 'monthly',
            paymentMethod: p.paymentMethod,
            comprobanteImage: p.comprobanteImage,
            requestedAt: p.requestedAt
        })));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Aprobación de pago: al aprobar, el usuario se ACTIVA AUTOMÁTICAMENTE (membresía activa desde ese momento).
app.post('/api/admin/approve-payment/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({ message: 'ID de solicitud inválido' });
        }
        const pr = await PaymentRequest.findById(req.params.id);
        if (!pr || pr.status !== 'pending') {
            return res.status(404).json({ message: 'Solicitud no encontrada o ya procesada.' });
        }

        const user = await User.findById(pr.userId);
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado.' });

        const now = new Date();
        const endDate = new Date(now);
        const daysToAdd = (pr.billingCycle === 'annual') ? 365 : 30;
        endDate.setDate(endDate.getDate() + daysToAdd);

        // Activación automática: el cliente no tiene que hacer nada más; queda activo al aprobar.
        if (!user.subscription) user.subscription = {};
        user.subscription.plan = pr.plan;
        user.subscription.status = 'active';
        user.subscription.paymentMethod = pr.paymentMethod;
        user.subscription.startDate = now;
        user.subscription.endDate = endDate;
        user.expiryDate = endDate;
        user.subscriptionStatus = 'Activo';
        user.membershipLevel = pr.plan;
        await user.save();

        pr.status = 'approved';
        pr.processedAt = now;
        pr.processedBy = req.userId;
        await pr.save();

        // Marcar referido como activo si es partner referral
        await PartnerReferral.findOneAndUpdate(
            { userId: pr.userId },
            { status: 'active', subscribedAt: now }
        );

        // Notificación por email (si está configurado el mailer)
        try {
            const mailer = require('./mailer');
            if (typeof mailer.sendPaymentApproved === 'function') {
                await mailer.sendPaymentApproved(user.email, pr.plan, pr.billingCycle);
            }
        } catch (err) { log.warn({ err: err.message }, 'Email pago aprobado no enviado'); }

        res.json({ message: 'Pago aprobado. Membresía activada por 30 días.' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/admin/reject-payment/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({ message: 'ID de solicitud inválido' });
        }
        const pr = await PaymentRequest.findById(req.params.id);
        if (!pr || pr.status !== 'pending') {
            return res.status(404).json({ message: 'Solicitud no encontrada o ya procesada.' });
        }

        const user = await User.findById(pr.userId);
        if (user && user.subscription) {
            user.subscription.status = user.subscription.plan === 'free' ? 'active' : user.subscription.status;
            user.subscription.paymentMethod = null;
            await user.save();
        }

        pr.status = 'rejected';
        pr.processedAt = new Date();
        pr.processedBy = req.userId;
        await pr.save();

        res.json({ message: 'Solicitud rechazada.' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- ADMIN: Listado de usuarios registrados ---
app.get('/api/admin/users', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const q = (req.query.q || '').trim();
        const role = (req.query.role || '').trim().toLowerCase();
        const plan = (req.query.plan || '').trim().toLowerCase();
        const statusFilter = (req.query.status || '').trim().toLowerCase(); // active | trial | expired
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(10, parseInt(req.query.limit, 10) || 50));
        const skip = (page - 1) * limit;

        const conditions = [];
        if (q) {
            conditions.push({
                $or: [
                    { name: new RegExp(q, 'i') },
                    { email: new RegExp(q, 'i') },
                    { rnc: new RegExp(q, 'i') }
                ]
            });
        }
        if (role && ['user', 'admin', 'partner'].includes(role)) {
            conditions.push({ role });
        }
        if (plan && ['free', 'pro', 'premium'].includes(plan)) {
            conditions.push({ $or: [{ membershipLevel: plan }, { 'subscription.plan': plan }] });
        }
        if (statusFilter === 'trial') {
            conditions.push({ subscriptionStatus: 'Trial' });
        } else if (statusFilter === 'active') {
            conditions.push({ $or: [{ subscriptionStatus: 'Activo' }, { 'subscription.status': 'active' }] });
        } else if (statusFilter === 'expired') {
            conditions.push({
                $or: [
                    { subscriptionStatus: 'Bloqueado' },
                    { 'subscription.status': 'expired' },
                    { expiryDate: { $lt: new Date() } },
                    { 'subscription.endDate': { $lt: new Date() } }
                ]
            });
        }
        const filter = conditions.length ? { $and: conditions } : {};

        const [users, total] = await Promise.all([
            User.find(filter)
                .select('name email rnc role profession membershipLevel subscription subscriptionStatus expiryDate onboardingCompleted createdAt')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            User.countDocuments(filter)
        ]);

        const userIds = users.map(u => u._id);
        const partners = await Partner.find({ userId: { $in: userIds } }).select('userId referralCode status tier').lean();
        const partnerByUser = Object.fromEntries(partners.map(p => [p.userId.toString(), p]));

        const list = users.map(u => {
            const sub = u.subscription || {};
            const plan = u.membershipLevel || sub.plan || 'free';
            const status = u.subscriptionStatus || sub.status || (sub.endDate && new Date(sub.endDate) < new Date() ? 'expired' : 'active');
            const partner = partnerByUser[u._id.toString()];
            return {
                id: u._id,
                name: u.name,
                email: u.email,
                rnc: u.rnc,
                role: u.role,
                profession: u.profession,
                plan,
                subscriptionStatus: status,
                expiryDate: u.expiryDate || sub.endDate,
                onboardingCompleted: !!u.onboardingCompleted,
                createdAt: u.createdAt,
                partner: partner ? { referralCode: partner.referralCode, status: partner.status, tier: partner.tier } : null
            };
        });

        res.json({ list, total, page, limit });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- ADMIN: Activar / Desactivar membresía de usuario ---
app.post('/api/admin/users/:id/activate', verifyToken, verifyAdmin, async (req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: 'ID de usuario inválido.' });
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado.' });
        if (user.role === 'admin') return res.status(400).json({ message: 'No se puede modificar la membresía de un admin.' });

        const now = new Date();
        const endDate = new Date(now);
        endDate.setDate(endDate.getDate() + 30);

        if (!user.subscription) user.subscription = {};
        user.subscription.plan = user.subscription.plan || user.membershipLevel || 'pro';
        user.subscription.status = 'active';
        user.subscription.startDate = now;
        user.subscription.endDate = endDate;
        user.expiryDate = endDate;
        user.subscriptionStatus = 'Activo';
        user.membershipLevel = user.subscription.plan;
        await user.save();

        res.json({ message: 'Membresía activada. 30 días desde hoy.' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/admin/users/:id/deactivate', verifyToken, verifyAdmin, async (req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: 'ID de usuario inválido.' });
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado.' });
        if (user.role === 'admin') return res.status(400).json({ message: 'No se puede modificar la membresía de un admin.' });

        if (!user.subscription) user.subscription = {};
        user.subscription.status = 'expired';
        user.subscription.endDate = new Date();
        user.expiryDate = new Date();
        user.subscriptionStatus = 'Bloqueado';
        await user.save();

        res.json({ message: 'Membresía bloqueada. El usuario ya no tendrá acceso Pro.' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- ADMIN: Eliminar usuario (cascada completa) ---
app.delete('/api/admin/users/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const userId = req.params.id;
        if (!isValidObjectId(userId)) return res.status(400).json({ message: 'ID de usuario inválido.' });

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado.' });
        if (user.role === 'admin') return res.status(400).json({ message: 'No se puede eliminar un administrador.' });

        const uid = user._id;

        await Promise.all([
            Invoice.deleteMany({ userId: uid }),
            Quote.deleteMany({ userId: uid }),
            Customer.deleteMany({ userId: uid }),
            Expense.deleteMany({ userId: uid }),
            NCFSettings.deleteMany({ userId: uid }),
            InvoiceDraft.deleteOne({ userId: uid }),
            InvoiceTemplate.deleteMany({ userId: uid }),
            UserServices.deleteOne({ userId: uid }),
            UserDocument.deleteMany({ userId: uid }),
            FiscalAuditLog.deleteMany({ userId: uid }),
            PaymentRequest.deleteMany({ userId: uid }),
            PasswordReset.deleteMany({ userId: uid }),
            SupportTicket.deleteMany({ userId: uid }),
            PartnerReferral.deleteMany({ userId: uid }),
            Partner.deleteOne({ userId: uid })
        ]);

        await User.deleteOne({ _id: uid });

        res.json({ message: 'Usuario eliminado correctamente.' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- ADMIN: Programa Partners ---
app.get('/api/admin/partners', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const partners = await Partner.find().sort({ createdAt: -1 }).populate('userId', 'name email').lean();
        const withStats = await Promise.all(partners.map(async (p) => {
            const active = await PartnerReferral.countDocuments({ partnerId: p._id, status: 'active' });
            const trial = await PartnerReferral.countDocuments({ partnerId: p._id, status: 'trial' });
            const churned = await PartnerReferral.countDocuments({ partnerId: p._id, status: 'churned' });
            const totalCommissions = await PartnerCommission.aggregate([
                { $match: { partnerId: p._id, status: 'paid' } },
                { $group: { _id: null, total: { $sum: '$commissionAmount' } } }
            ]);
            const pendingCommissions = await PartnerCommission.aggregate([
                { $match: { partnerId: p._id, status: 'pending' } },
                { $group: { _id: null, total: { $sum: '$commissionAmount' } } }
            ]);
            return {
                ...p,
                activeClients: active,
                trialClients: trial,
                churnedClients: churned,
                totalEarned: totalCommissions[0]?.total || 0,
                pendingPayout: pendingCommissions[0]?.total || 0
            };
        }));
        res.json(withStats);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Crear invitación partner (admin)
app.post('/api/admin/partners/invites', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const days = Math.min(30, Math.max(1, parseInt(req.body.expiresDays, 10) || 7));
        const maxUses = Math.min(100, Math.max(1, parseInt(req.body.maxUses, 10) || 1));
        let token = generateInviteToken();
        while (await PartnerInvite.findOne({ token })) token = generateInviteToken();

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + days);

        const invite = new PartnerInvite({
            token,
            createdBy: req.userId,
            expiresAt,
            maxUses,
            status: 'active'
        });
        await invite.save();

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lexisbill.com.do';
        const inviteUrl = `${baseUrl}/unirse-como-partner?invite=${token}`;

        res.status(201).json({
            message: 'Invitación creada',
            token,
            inviteUrl,
            expiresAt: invite.expiresAt,
            maxUses
        });
    } catch (e) {
        log.error({ err: e.message }, 'Error creando invitación partner');
        res.status(500).json({ message: 'Error al crear invitación' });
    }
});

app.get('/api/admin/partners/stats', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const total = await Partner.countDocuments({ status: 'active' });
        const pending = await Partner.countDocuments({ status: 'pending' });
        const suspended = await Partner.countDocuments({ status: 'suspended' });
        const totalReferrals = await PartnerReferral.countDocuments();
        const activeReferrals = await PartnerReferral.countDocuments({ status: 'active' });
        const trialReferrals = await PartnerReferral.countDocuments({ status: 'trial' });
        const churnedReferrals = await PartnerReferral.countDocuments({ status: 'churned' });
        const pricePerClient = 950;
        const revenueFromPartners = activeReferrals * pricePerClient;
        const totalCommissionsPaid = await PartnerCommission.aggregate([
            { $match: { status: 'paid' } },
            { $group: { _id: null, total: { $sum: '$commissionAmount' } } }
        ]);
        const totalCommissionsPending = await PartnerCommission.aggregate([
            { $match: { status: 'pending' } },
            { $group: { _id: null, total: { $sum: '$commissionAmount' } } }
        ]);
        res.json({
            totalPartners: total,
            pendingApprovals: pending,
            suspendedPartners: suspended,
            totalReferrals,
            activeReferrals,
            trialReferrals,
            churnedReferrals,
            revenueFromPartners,
            commissionsPaid: totalCommissionsPaid[0]?.total || 0,
            commissionsPending: totalCommissionsPending[0]?.total || 0
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Cartera de un partner (referidos)
app.get('/api/admin/partners/:id/cartera', verifyToken, verifyAdmin, async (req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: 'ID inválido' });
        const partner = await Partner.findById(req.params.id);
        if (!partner) return res.status(404).json({ message: 'Partner no encontrado' });

        const referidos = await PartnerReferral.find({ partnerId: partner._id })
            .populate('userId', 'name email rnc')
            .sort({ createdAt: -1 })
            .lean();

        const cartera = referidos.map(r => ({
            userId: r.userId?._id,
            name: r.userId?.name,
            email: r.userId?.email,
            rnc: r.userId?.rnc,
            status: r.status,
            subscribedAt: r.subscribedAt,
            churnedAt: r.churnedAt,
            createdAt: r.createdAt
        }));

        res.json({
            partner: { name: partner.name, referralCode: partner.referralCode },
            cartera
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/admin/partners/:id/approve', verifyToken, verifyAdmin, async (req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: 'ID inválido' });
        const p = await Partner.findById(req.params.id);
        if (!p) return res.status(404).json({ message: 'Partner no encontrado' });
        if (p.status === 'active') return res.status(400).json({ message: 'Partner ya está aprobado' });
        p.status = 'active';
        p.approvedAt = new Date();
        p.approvedBy = req.userId;
        p.updatedAt = new Date();
        await p.save();
        // Notificación por email al partner (placeholder: integrar Resend/SendGrid)
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lexisbill.com.do';
        const referralUrl = `${baseUrl}/registro?ref=${p.referralCode}`;
        log.info({ partnerId: p._id, email: p.email, referralCode: p.referralCode, referralUrl }, 'Partner aprobado (email no enviado; configurar SEND_PARTNER_APPROVED_EMAIL y mailer)');
        try {
            if (process.env.SEND_PARTNER_APPROVED_EMAIL === 'true') {
                const mailer = require('./mailer');
                if (typeof mailer.sendPartnerApproved === 'function') await mailer.sendPartnerApproved(p.email, p.name, p.referralCode, referralUrl);
            }
        } catch (mailErr) { log.warn({ err: (mailErr && mailErr.message) || 'mailer no disponible' }, 'Email partner aprobado no enviado'); }
        res.json({ message: 'Partner aprobado', referralCode: p.referralCode });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Calcular comisiones mensuales (admin) — ejecutar el día 1 de cada mes o manual
app.post('/api/admin/partners/calculate-commissions', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const now = new Date();
        const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1);
        const year = parseInt(req.body.year, 10) || prevMonth.getFullYear();
        const monthNum = parseInt(req.body.month, 10) || (prevMonth.getMonth() + 1);
        const monthStr = `${year}-${String(monthNum).padStart(2, '0')}`;

        const partners = await Partner.find({ status: 'active' }).lean();
        const pricePerClient = 950;
        let created = 0;
        let updated = 0;

        for (const p of partners) {
            const activeCount = await PartnerReferral.countDocuments({ partnerId: p._id, status: 'active' });
            const tier = getPartnerTier(activeCount);
            const totalRevenue = activeCount * pricePerClient;
            const commissionAmount = Math.round(totalRevenue * tier.rate);

            const existing = await PartnerCommission.findOne({ partnerId: p._id, month: monthStr });
            if (existing) {
                existing.activeClientsCount = activeCount;
                existing.totalRevenue = totalRevenue;
                existing.commissionRate = tier.rate;
                existing.commissionAmount = commissionAmount;
                existing.status = existing.status || 'pending';
                await existing.save();
                updated++;
            } else {
                await PartnerCommission.create({
                    partnerId: p._id,
                    month: monthStr,
                    year,
                    activeClientsCount: activeCount,
                    totalRevenue,
                    commissionRate: tier.rate,
                    commissionAmount,
                    status: 'pending'
                });
                created++;
            }
        }

        res.json({
            message: 'Comisiones calculadas',
            month: monthStr,
            partnersProcessed: partners.length,
            created,
            updated
        });
    } catch (e) {
        log.error({ err: e.message }, 'Error calculando comisiones');
        res.status(500).json({ message: 'Error al calcular comisiones', error: e.message });
    }
});

app.post('/api/admin/partners/:id/suspend', verifyToken, verifyAdmin, async (req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: 'ID inválido' });
        const p = await Partner.findById(req.params.id);
        if (!p) return res.status(404).json({ message: 'Partner no encontrado' });
        p.status = 'suspended';
        p.updatedAt = new Date();
        await p.save();
        res.json({ message: 'Partner suspendido' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- ADMIN: Estadísticas CEO ---
app.get('/api/admin/stats', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const now = new Date();
        const periodLastMonth = req.query.period === 'last_month';
        const ref = periodLastMonth
            ? new Date(now.getFullYear(), now.getMonth() - 1, 1)
            : new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfMonth = ref;
        const endOfMonth = periodLastMonth
            ? new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
            : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        const [totalUsers, usersThisMonth, allInvoices, invoicesThisMonth, allExpenses, pendingPayments, planCounts] = await Promise.all([
            User.countDocuments({}),
            User.countDocuments({ createdAt: { $gte: startOfMonth, $lte: endOfMonth } }),
            Invoice.find({ status: { $ne: 'cancelled' } }),
            Invoice.find({ status: { $ne: 'cancelled' }, date: { $gte: startOfMonth, $lte: endOfMonth } }),
            Expense.find({}),
            PaymentRequest.countDocuments({
                status: 'pending',
                $or: [
                    { comprobanteImage: { $exists: true, $ne: null, $ne: '' } },
                    { paymentMethod: 'paypal' }
                ]
            }),
            User.aggregate([
                { $project: { plan: { $ifNull: ['$subscription.plan', { $ifNull: ['$membershipLevel', 'free'] }] } } },
                { $group: { _id: '$plan', count: { $sum: 1 } } }
            ])
        ]);

        const report606Count = new Set(allExpenses.map(e => `${e.userId}-${e.date?.getFullYear()}-${(e.date?.getMonth() || 0) + 1}`)).size;
        const report607Count = new Set(allInvoices.map(i => `${i.userId}-${i.date?.getFullYear()}-${(i.date?.getMonth() || 0) + 1}`)).size;

        const ncfByType = {};
        allInvoices.forEach(inv => {
            const t = (inv.ncfSequence || '').substring(1, 3) || 'XX';
            ncfByType[t] = (ncfByType[t] || 0) + 1;
        });

        const freeCount = planCounts.find(p => p._id === 'free')?.count || 0;
        const proCount = planCounts.find(p => p._id === 'pro')?.count || 0;
        const premiumCount = planCounts.find(p => p._id === 'premium')?.count || 0;

        const activeSubs = await User.countDocuments({
            $or: [
                { 'subscription.status': 'active' },
                { subscriptionStatus: 'Activo' },
                { subscriptionStatus: 'Trial' }
            ]
        });

        res.json({
            users: { total: totalUsers, newThisMonth: usersThisMonth },
            invoicing: {
                totalInvoices: allInvoices.length,
                monthlyInvoices: invoicesThisMonth.length,
                monthlyTotal: invoicesThisMonth.reduce((s, i) => s + (i.total || 0), 0),
                totalItbis: allInvoices.reduce((s, i) => s + (i.itbis || 0), 0)
            },
            fiscal: { report606: report606Count, report607: report607Count, invoicesByNcfType: ncfByType },
            business: {
                freeUsers: freeCount,
                proUsers: proCount,
                premiumUsers: premiumCount,
                activeMemberships: activeSubs,
                pendingPayments
            }
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- ADMIN: Datos para gráficos (últimos 12 meses) ---
app.get('/api/admin/chart-data', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const months = parseInt(req.query.months, 10) || 12;
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth() - months, 1);
        const agg = await Invoice.aggregate([
            { $match: { status: { $ne: 'cancelled' }, date: { $gte: start } } },
            {
                $group: {
                    _id: { year: { $year: '$date' }, month: { $month: '$date' } },
                    revenue: { $sum: '$total' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);
        const byMonth = {};
        for (let i = 0; i < months; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - months + i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            byMonth[key] = { month: key, revenue: 0, invoices: 0 };
        }
        agg.forEach(row => {
            const key = `${row._id.year}-${String(row._id.month).padStart(2, '0')}`;
            if (!byMonth[key]) byMonth[key] = { month: key, revenue: 0, invoices: 0 };
            byMonth[key].revenue = row.revenue;
            byMonth[key].invoices = row.count;
        });
        const monthly = Object.keys(byMonth).sort().map(k => byMonth[k]);
        const planCounts = await User.aggregate([
            { $match: { role: { $ne: 'admin' } } },
            { $project: { plan: { $ifNull: ['$subscription.plan', { $ifNull: ['$membershipLevel', 'free'] }] } } },
            { $group: { _id: '$plan', count: { $sum: 1 } } }
        ]);
        const usersByPlan = { free: 0, pro: 0, premium: 0 };
        planCounts.forEach(p => { usersByPlan[p._id] = p.count; });
        res.json({ monthly, usersByPlan });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- ADMIN: Dashboard CEO - Métricas SaaS completas ---
app.get('/api/admin/metrics', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const now = new Date();
        const periodLastMonth = req.query.period === 'last_month';
        const startOfMonth = periodLastMonth
            ? new Date(now.getFullYear(), now.getMonth() - 1, 1)
            : new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = periodLastMonth
            ? new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
            : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59);

        const [totalUsers, newThisMonth, newLastMonth, proUsers, approvedPayments, pendingPayments, expiredLastMonth] = await Promise.all([
            User.countDocuments({}),
            User.countDocuments({ createdAt: { $gte: startOfMonth, $lte: endOfMonth } }),
            User.countDocuments({ createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } }),
            User.countDocuments({ $or: [{ 'subscription.plan': 'pro' }, { membershipLevel: 'pro' }], role: { $ne: 'admin' } }),
            PaymentRequest.find({ status: 'approved' }).sort({ processedAt: -1 }),
            PaymentRequest.countDocuments({
                status: 'pending',
                $or: [
                    { comprobanteImage: { $exists: true, $ne: null, $ne: '' } },
                    { paymentMethod: 'paypal' }
                ]
            }),
            User.countDocuments({
                role: { $ne: 'admin' },
                $or: [
                    { 'subscription.status': 'expired', 'subscription.endDate': { $gte: startOfLastMonth, $lte: endOfLastMonth } },
                    { subscriptionStatus: 'Bloqueado', expiryDate: { $gte: startOfLastMonth, $lte: endOfLastMonth } }
                ]
            })
        ]);

        const revenueTotal = approvedPayments.reduce((s, p) => {
            const amt = p.billingCycle === 'annual' ? 9500 : 950;
            return s + amt;
        }, 0);

        const mrr = proUsers * 950;
        const arpu = proUsers > 0 ? revenueTotal / proUsers : 0;
        const growthRate = newLastMonth > 0 ? ((newThisMonth - newLastMonth) / newLastMonth) * 100 : (newThisMonth > 0 ? 100 : 0);
        const churnRate = totalUsers > 0 ? (expiredLastMonth / totalUsers) * 100 : 0;

        res.json({
            mrr: Math.round(mrr),
            churn: Math.round(churnRate * 100) / 100,
            activeUsers: proUsers,
            arpu: Math.round(arpu),
            revenueTotal,
            growthRate: Math.round(growthRate * 100) / 100,
            newThisMonth,
            newLastMonth,
            pendingPayments,
            totalUsers
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- LEXIS BUSINESS COPILOT: Analytics inteligente (sin IA externa) ---
app.get('/api/business-copilot', verifyToken, async (req, res) => {
    try {
        const userId = req.userId;
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

        // 1. Agregación: clientes con última factura, total facturado, días sin facturar
        const clientStats = await Invoice.aggregate([
            { $match: {
                userId: new mongoose.Types.ObjectId(userId),
                status: { $nin: ['cancelled'] },
                clientRnc: { $exists: true, $nin: [null, ''] }
            }},
            { $group: {
                _id: '$clientRnc',
                clientName: { $first: '$clientName' },
                lastInvoiceDate: { $max: '$date' },
                totalRevenue: { $sum: '$total' },
                invoiceCount: { $sum: 1 }
            }},
            { $project: {
                rnc: '$_id',
                clientName: 1,
                lastInvoiceDate: 1,
                totalRevenue: 1,
                invoiceCount: 1,
                daysSinceLastInvoice: {
                    $floor: { $divide: [{ $subtract: [now, '$lastInvoiceDate'] }, 86400000] }
                }
            }},
            { $sort: { totalRevenue: -1 } }
        ]);

        // 2. Ingresos por mes (actual vs anterior)
        const monthlyRevenue = await Invoice.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(userId), status: { $nin: ['cancelled'] } } },
            { $group: {
                _id: { year: { $year: '$date' }, month: { $month: '$date' } },
                total: { $sum: '$total' },
                count: { $sum: 1 }
            }}
        ]);
        const currMonth = monthlyRevenue.find(r => r._id.year === now.getFullYear() && r._id.month === now.getMonth() + 1);
        const prevMonth = monthlyRevenue.find(r => r._id.year === endOfLastMonth.getFullYear() && r._id.month === endOfLastMonth.getMonth() + 1);
        const currentRevenue = currMonth?.total || 0;
        const previousRevenue = prevMonth?.total || 0;
        const currentInvoiceCount = currMonth?.count || 0;

        // 3. Servicios más vendidos (desde items)
        const topServices = await Invoice.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(userId), status: { $nin: ['cancelled'] } } },
            { $unwind: '$items' },
            { $match: { 'items.description': { $exists: true, $nin: [null, ''] } } },
            { $group: {
                _id: '$items.description',
                totalQuantity: { $sum: { $ifNull: ['$items.quantity', 1] } },
                totalRevenue: { $sum: { $multiply: [{ $ifNull: ['$items.quantity', 1] }, { $ifNull: ['$items.price', 0] }] } }
            }},
            { $sort: { totalRevenue: -1 } },
            { $limit: 5 },
            { $project: { description: '$_id', totalQuantity: 1, totalRevenue: 1, _id: 0 } }
        ]);

        // 4. NCF Settings y alertas fiscales
        const ncfSettings = await NCFSettings.find({ userId, isActive: true }).lean();
        const customers = await Customer.find({ userId }).select('rnc name').lean();

        // Calcular total facturado para % concentración
        const totalRevenueAll = clientStats.reduce((s, c) => s + c.totalRevenue, 0);
        const topClient = clientStats[0];
        const topClientPct = totalRevenueAll > 0 && topClient ? (topClient.totalRevenue / totalRevenueAll * 100) : 0;

        // Clientes por categoría de inactividad
        const clients30 = clientStats.filter(c => c.daysSinceLastInvoice >= 30 && c.daysSinceLastInvoice < 60);
        const clients60 = clientStats.filter(c => c.daysSinceLastInvoice >= 60 && c.daysSinceLastInvoice < 90);
        const clients90 = clientStats.filter(c => c.daysSinceLastInvoice >= 90);

        // Alertas inteligentes
        const alerts = [];
        if (clients30.length > 0 || clients60.length > 0 || clients90.length > 0) {
            const total = clients30.length + clients60.length + clients90.length;
            const maxDays = Math.max(...[clients30, clients60, clients90].flat().map(c => c.daysSinceLastInvoice));
            const threshold = maxDays >= 90 ? 90 : maxDays >= 60 ? 60 : 30;
            alerts.push({
                type: 'inactive_clients',
                severity: maxDays >= 90 ? 'high' : maxDays >= 60 ? 'medium' : 'info',
                message: `Tienes ${total} cliente${total > 1 ? 's' : ''} con más de ${threshold} días sin facturar. Podrías reactivarlos.`,
                count: total,
                threshold
            });
        }
        if (previousRevenue > 0 && currentRevenue < previousRevenue) {
            const pct = Math.round(((previousRevenue - currentRevenue) / previousRevenue) * 100);
            alerts.push({
                type: 'revenue_drop',
                severity: pct > 20 ? 'high' : 'medium',
                message: `Tu facturación bajó ${pct}% respecto al mes pasado.`,
                pct
            });
        }
        if (previousRevenue > 0 && currentRevenue > previousRevenue) {
            const pct = Math.round(((currentRevenue - previousRevenue) / previousRevenue) * 100);
            alerts.push({
                type: 'revenue_growth',
                severity: 'positive',
                message: `Tu facturación creció ${pct}% respecto al mes pasado.`,
                pct
            });
        }
        if (topClientPct > 50 && topClient) {
            alerts.push({
                type: 'concentration',
                severity: 'medium',
                message: `Un cliente concentra el ${Math.round(topClientPct)}% de tus ingresos. Considera diversificar.`,
                pct: Math.round(topClientPct),
                clientName: topClient.clientName
            });
        } else if (topClient && totalRevenueAll > 0) {
            alerts.push({
                type: 'top_client',
                severity: 'info',
                message: `${topClient.clientName || 'Este cliente'} es tu mayor fuente de ingresos.`,
                clientName: topClient.clientName,
                pct: Math.round(topClientPct)
            });
        }
        if (topServices.length > 0) {
            alerts.push({
                type: 'top_service',
                severity: 'info',
                message: `"${topServices[0].description}" es tu servicio más vendido este período.`,
                service: topServices[0].description
            });
        }

        // Radar de clientes (scoring)
        const clientRadar = clientStats.map(c => {
            let status = 'active';
            if (c.daysSinceLastInvoice >= 90) status = 'lost';
            else if (c.daysSinceLastInvoice >= 30) status = 'at_risk';
            const pct = totalRevenueAll > 0 ? (c.totalRevenue / totalRevenueAll * 100) : 0;
            return {
                rnc: c.rnc,
                clientName: c.clientName,
                lastInvoiceDate: c.lastInvoiceDate,
                daysSinceLastInvoice: c.daysSinceLastInvoice,
                totalRevenue: c.totalRevenue,
                revenuePct: Math.round(pct * 10) / 10,
                status,
                recommendation: status !== 'active' && pct >= 5
                    ? `Este cliente representaba el ${Math.round(pct)}% de tus ingresos. Considera reactivarlo.`
                    : null
            };
        });

        // Ranking mensual
        const lastMonthClients = await Invoice.aggregate([
            { $match: {
                userId: new mongoose.Types.ObjectId(userId),
                status: { $nin: ['cancelled'] },
                date: { $gte: startOfLastMonth, $lte: endOfLastMonth }
            }},
            { $group: { _id: '$clientRnc', clientName: { $first: '$clientName' }, total: { $sum: '$total' } } },
            { $sort: { total: -1 } }
        ]);
        const thisMonthClients = await Invoice.aggregate([
            { $match: {
                userId: new mongoose.Types.ObjectId(userId),
                status: { $nin: ['cancelled'] },
                date: { $gte: startOfMonth }
            }},
            { $group: { _id: '$clientRnc', clientName: { $first: '$clientName' }, total: { $sum: '$total' } } }
        ]);
        const lastMonthRncSet = new Set(lastMonthClients.map(c => c._id));
        const thisMonthRncSet = new Set(thisMonthClients.map(c => c._id));
        const droppedClient = lastMonthClients.find(c => !thisMonthRncSet.has(c._id));

        const rankings = {
            topClient: topClient ? { name: topClient.clientName, total: topClient.totalRevenue, pct: Math.round(topClientPct) } : null,
            droppedClient: droppedClient ? { name: droppedClient.clientName, lastMonthTotal: droppedClient.total } : null,
            topService: topServices[0] ? { description: topServices[0].description, totalRevenue: topServices[0].totalRevenue, totalQuantity: topServices[0].totalQuantity } : null
        };

        // Detector de errores fiscales
        const fiscalAlerts = [];
        const typeToLabel = { '01': 'B01', '02': 'B02', '31': 'E31', '32': 'E32', '14': 'B14', '15': 'B15', '44': 'E44', '45': 'E45' };
        for (const s of ncfSettings) {
            const remaining = (s.finalNumber || 0) - (s.currentValue || 0);
            const label = typeToLabel[s.type] || `${s.series}${s.type}`;
            if (remaining >= 0 && remaining < 15) {
                fiscalAlerts.push({
                    type: 'ncf_low',
                    severity: 'warning',
                    message: `Lexis detectó que tu secuencia NCF (${label}) podría agotarse pronto (quedan ${remaining}). Te recomendamos solicitar una nueva.`,
                    remaining
                });
            }
            if (s.expiryDate && new Date(s.expiryDate) < new Date(now.getTime() + 30 * 86400000)) {
                fiscalAlerts.push({
                    type: 'ncf_expiring',
                    severity: 'info',
                    message: `Tu secuencia ${label} vence el ${new Date(s.expiryDate).toLocaleDateString('es-DO')}.`,
                    expiryDate: s.expiryDate
                });
            }
        }
        // Clientes con RNC inválido (9 o 11 dígitos)
        const invalidRnc = customers.filter(c => {
            const clean = (c.rnc || '').replace(/\D/g, '');
            return clean.length !== 9 && clean.length !== 11;
        });
        if (invalidRnc.length > 0) {
            fiscalAlerts.push({
                type: 'invalid_rnc',
                severity: 'warning',
                message: `Lexis detectó ${invalidRnc.length} cliente${invalidRnc.length > 1 ? 's' : ''} con RNC que no cumple el formato (9 u 11 dígitos).`,
                count: invalidRnc.length
            });
        }

        // --- TIPO DE PAGO: analytics (tipoPago, balancePendiente) ---
        const paymentStats = await Invoice.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(userId), status: { $nin: ['cancelled'] } } },
            { $addFields: {
                tipoPago: { $ifNull: ['$tipoPago', 'efectivo'] },
                balance: { $cond: [{ $gt: [{ $ifNull: ['$balancePendiente', 0] }, 0] }, '$balancePendiente', { $cond: [{ $eq: ['$status', 'pending'] }, '$total', 0] }] },
                montoPagado: { $ifNull: ['$montoPagado', { $cond: [{ $eq: ['$status', 'pending'] }, 0, '$total'] }] }
            }},
            { $group: {
                _id: '$tipoPago',
                count: { $sum: 1 },
                totalRevenue: { $sum: '$total' },
                totalBalance: { $sum: '$balance' }
            }}
        ]);
        const totalInvoicesForPayment = paymentStats.reduce((s, p) => s + p.count, 0);
        const creditStats = paymentStats.find(p => p._id === 'credito');
        const creditPct = totalInvoicesForPayment > 0 && creditStats ? (creditStats.count / totalInvoicesForPayment * 100) : 0;
        const transferStats = paymentStats.find(p => p._id === 'transferencia');
        const transferPct = totalRevenueAll > 0 && transferStats ? (transferStats.totalRevenue / totalRevenueAll * 100) : 0;
        let totalBalancePendiente = paymentStats.reduce((s, p) => s + (p.totalBalance || 0), 0);
        if (totalBalancePendiente === 0 && invoicesWithBalance.length > 0) {
            totalBalancePendiente = invoicesWithBalance.reduce((s, inv) => {
                const bal = (inv.balancePendiente != null && inv.balancePendiente > 0) ? inv.balancePendiente : (inv.total || 0);
                return s + bal;
            }, 0);
        }

        // Morosidad: facturas con balance pendiente
        const allInvoices = await Invoice.find({ userId, status: { $nin: ['cancelled'] } })
            .select('clientRnc clientName date total balancePendiente estadoPago status').lean();
        const invoicesWithBalance = allInvoices.filter(inv => {
            const bal = (inv.balancePendiente != null && inv.balancePendiente > 0)
                ? inv.balancePendiente
                : (inv.estadoPago === 'pendiente' || inv.estadoPago === 'parcial' || inv.status === 'pending')
                    ? (inv.total || 0) : 0;
            return bal > 0;
        });
        const morosityByClient = {};
        invoicesWithBalance.forEach(inv => {
            const rnc = inv.clientRnc || 'unknown';
            if (!morosityByClient[rnc]) morosityByClient[rnc] = { clientName: inv.clientName, total: 0, count: 0, maxDays: 0 };
            const bal = inv.balancePendiente ?? inv.total;
            morosityByClient[rnc].total += bal;
            morosityByClient[rnc].count += 1;
            const days = Math.floor((now - new Date(inv.date)) / 86400000);
            if (days > morosityByClient[rnc].maxDays) morosityByClient[rnc].maxDays = days;
        });
        const morosityList = Object.entries(morosityByClient).map(([rnc, d]) => ({
            rnc,
            clientName: d.clientName,
            totalPendiente: d.total,
            facturasVencidas: d.count,
            diasMayorAntiguedad: d.maxDays,
            nivel: d.maxDays <= 15 ? 'normal' : d.maxDays <= 30 ? 'atencion' : d.maxDays <= 60 ? 'riesgo' : 'critico'
        })).sort((a, b) => b.totalPendiente - a.totalPendiente);

        // Payment insights para alerts
        if (creditPct >= 30 && totalInvoicesForPayment >= 3) {
            alerts.push({
                type: 'credit_dependency',
                severity: 'medium',
                message: `El ${Math.round(creditPct)}% de tus facturas se están vendiendo a crédito. Esto puede afectar tu flujo de caja.`,
                pct: Math.round(creditPct)
            });
        }
        if (transferPct >= 50 && totalRevenueAll > 0) {
            alerts.push({
                type: 'cash_flow',
                severity: 'positive',
                message: `El ${Math.round(transferPct)}% de tus ingresos entra vía transferencia. Tu liquidez es saludable.`,
                pct: Math.round(transferPct)
            });
        }
        if (totalBalancePendiente > 0) {
            alerts.push({
                type: 'morosity',
                severity: totalBalancePendiente > 50000 ? 'high' : 'medium',
                message: `Lexis detectó RD$${Math.round(totalBalancePendiente).toLocaleString('es-DO')} pendientes de cobro. Te recomendamos gestionar estos pagos.`,
                amount: totalBalancePendiente
            });
        }

        // Predicción simple: ritmo actual * días restantes
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const daysElapsed = now.getDate();
        const daysRemaining = daysInMonth - daysElapsed;
        const dailyRate = daysElapsed > 0 ? currentRevenue / daysElapsed : 0;
        const projectedMonth = Math.round(currentRevenue + (dailyRate * daysRemaining));

        // Predicción de caja: cuentas por cobrar + proyección
        const projectedCash15Days = Math.round(totalBalancePendiente + (dailyRate * Math.min(15, daysRemaining)));

        // Score de salud (0-100)
        const invoiceFreqScore = Math.min(100, currentInvoiceCount * 8);
        const growthScore = previousRevenue > 0
            ? Math.min(50, Math.max(-50, ((currentRevenue - previousRevenue) / previousRevenue) * 100) + 50)
            : 50;
        const diversificationScore = topClientPct > 70 ? 30 : topClientPct > 50 ? 60 : 90;
        const inactivePenalty = (clients90.length * 10) + (clients60.length * 5) + (clients30.length * 2);
        const healthScore = Math.round(Math.max(0, Math.min(100,
            (invoiceFreqScore * 0.2) + (growthScore * 0.3) + (diversificationScore * 0.3) + (Math.max(0, 100 - inactivePenalty) * 0.2)
        )));
        let healthLabel = 'Excelente';
        if (healthScore < 50) healthLabel = 'Requiere atención';
        else if (healthScore < 70) healthLabel = 'Estable';
        else if (healthScore < 90) healthLabel = 'Bueno';

        res.json({
            alerts,
            clientRadar,
            rankings,
            fiscalAlerts,
            prediction: {
                currentRevenue,
                projectedMonth,
                dailyRate: Math.round(dailyRate),
                daysRemaining,
                projectedCash15Days
            },
            businessHealth: {
                score: healthScore,
                label: healthLabel,
                concentrationRisk: topClientPct > 50 ? `Detectamos dependencia de un solo cliente (${Math.round(topClientPct)}%).` : null
            },
            paymentInsights: {
                creditPct: Math.round(creditPct),
                transferPct: Math.round(transferPct),
                totalBalancePendiente,
                byTipo: paymentStats.reduce((o, p) => { o[p._id] = { count: p.count, total: p.totalRevenue }; return o; }, {})
            },
            morosityRadar: {
                totalPendiente: totalBalancePendiente,
                clientes: morosityList.slice(0, 10),
                riesgoGeneral: totalBalancePendiente > 100000 ? 'alto' : totalBalancePendiente > 30000 ? 'medio' : totalBalancePendiente > 0 ? 'bajo' : 'ninguno'
            }
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- Modo preventivo: riesgo del cliente antes de facturar a crédito ---
app.get('/api/client-payment-risk', verifyToken, async (req, res) => {
    try {
        const cleanRnc = (req.query.rnc || '').replace(/[^\d]/g, '');
        if (!cleanRnc || cleanRnc.length < 9) return res.json({ riskScore: 50, level: 'unknown' });

        const invoices = await Invoice.find({
            userId: req.userId,
            status: { $nin: ['cancelled'] },
            clientRnc: cleanRnc
        }).select('date total balancePendiente estadoPago tipoPago montoPagado').sort({ date: -1 }).limit(50).lean();

        if (invoices.length === 0) return res.json({ riskScore: 50, level: 'unknown' });

        const pendingInvs = invoices.filter(inv => {
            const bal = inv.balancePendiente ?? (inv.estadoPago === 'pendiente' || inv.estadoPago === 'parcial' ? inv.total : 0);
            return bal > 0;
        });
        const totalPending = pendingInvs.reduce((s, inv) => s + (inv.balancePendiente ?? inv.total), 0);
        const now = new Date();
        const paidInvoices = invoices.filter(inv => (inv.balancePendiente ?? 0) <= 0 && (inv.montoPagado ?? inv.total) > 0);
        let avgDaysToPay = 0;
        if (paidInvoices.length >= 2) {
            const daysArray = [];
            for (let i = 0; i < paidInvoices.length - 1; i++) {
                const invDate = new Date(paidInvoices[i].date);
                daysArray.push(Math.floor((now - invDate) / 86400000));
            }
            avgDaysToPay = Math.round(daysArray.reduce((a, b) => a + b, 0) / daysArray.length);
        }
        const maxDaysOverdue = pendingInvs.length > 0
            ? Math.max(...pendingInvs.map(inv => Math.floor((now - new Date(inv.date)) / 86400000)))
            : 0;

        let riskScore = 80;
        if (pendingInvs.length > 2) riskScore -= 25;
        else if (pendingInvs.length > 0) riskScore -= 15;
        if (maxDaysOverdue > 60) riskScore -= 30;
        else if (maxDaysOverdue > 30) riskScore -= 20;
        else if (maxDaysOverdue > 15) riskScore -= 10;
        if (avgDaysToPay > 45) riskScore -= 15;
        riskScore = Math.max(0, Math.min(100, riskScore));

        let level = 'confiable';
        if (riskScore < 50) level = 'alto_riesgo';
        else if (riskScore < 80) level = 'inestable';

        const message = riskScore < 50
            ? 'Este cliente suele pagar con retraso. ¿Deseas continuar con venta a crédito?'
            : riskScore < 80 ? 'Este cliente tiene historial irregular de pagos.' : null;

        res.json({ riskScore, level, message, avgDaysToPay: avgDaysToPay || undefined, pendingAmount: totalPending || undefined });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- Alertas proactivas: NCF bajo, secuencias por vencer, suscripciones por vencer ---
app.get('/api/alerts', verifyToken, async (req, res) => {
    try {
        const alerts = [];
        const now = new Date();
        const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        const ncfSettings = await NCFSettings.find({ userId: req.userId, isActive: true });
        ncfSettings.forEach(s => {
            const remaining = (s.finalNumber || 0) - (s.currentValue || 0);
            if (remaining < 10 && remaining >= 0) {
                alerts.push({ type: 'ncf_low', message: `NCF ${s.series}${s.type} le quedan ${remaining} números.`, severity: 'warning' });
            }
            if (s.expiryDate && new Date(s.expiryDate) < in30Days) {
                alerts.push({ type: 'ncf_expiring', message: `Secuencia NCF ${s.series}${s.type} vence el ${new Date(s.expiryDate).toLocaleDateString('es-DO')}.`, severity: 'warning' });
            }
        });

        const user = await User.findById(req.userId);
        if (user?.role !== 'admin') {
            const sub = user?.subscription || {};
            const endDate = sub.endDate ? new Date(sub.endDate) : user?.expiryDate ? new Date(user.expiryDate) : null;
            if (endDate && endDate < in30Days && sub.status !== 'active') {
                alerts.push({ type: 'subscription_expiring', message: `Tu suscripción vence el ${endDate.toLocaleDateString('es-DO')}.`, severity: 'info' });
            }
        }

        res.json({ alerts });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/status', async (req, res) => {
    res.json({
        mongodb: mongoose.connection.readyState === 1 ? 'CONNECTED' : 'DISCONNECTED',
        uri_exists: !!process.env.MONGODB_URI,
        uri_format: process.env.MONGODB_URI ? (process.env.MONGODB_URI.startsWith('mongodb+srv') ? 'VALID_PREFIX' : 'INVALID_PREFIX') : 'MISSING',
        version: '1.0.5',
        timestamp: new Date().toISOString()
    });
});

// Rest of endpoints (Invoices, Customers, etc.)
app.get('/api/rnc/:number', async (req, res) => {
    const { number } = req.params;
    const cleanNumber = number.replace(/\D/g, "");

    if (!validateTaxId(cleanNumber)) return res.status(400).json({ valid: false, message: 'Documento Inválido' });

    const external = await fetchRncFromExternalApi(cleanNumber);
    if (external) return res.json(external);

    const name = RNC_MOCK_DB[cleanNumber] || 'CONTRIBUYENTE REGISTRADO';
    res.json({ valid: true, rnc: cleanNumber, name, type: cleanNumber.length === 9 ? 'JURIDICA' : 'FISICA' });
});

app.post('/api/validate-rnc', async (req, res) => {
    try {
        const { rnc } = req.body;
        if (!rnc) return res.status(400).json({ valid: false, message: 'RNC requerido' });

        const cleanRnc = rnc.replace(/\D/g, "");
        if (!validateTaxId(cleanRnc)) return res.json({ valid: false, message: 'Formato inválido' });

        const external = await fetchRncFromExternalApi(cleanRnc);
        if (external) return res.json({ valid: true, name: external.name });

        const name = RNC_MOCK_DB[cleanRnc] || 'CONTRIBUYENTE REGISTRADO';
        if (process.env.NODE_ENV !== 'production') {
            await new Promise(resolve => setTimeout(resolve, 300));
        }
        res.json({ valid: true, name });
    } catch (error) {
        res.status(500).json({ valid: false, error: error.message });
    }
});

// --- GESTIÓN DE COMPROBANTES (NCF) ---
app.get('/api/ncf-settings', verifyToken, async (req, res) => {
    try {
        const settings = await NCFSettings.find({ userId: req.userId }).sort({ type: 1 });
        res.json(settings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/ncf-settings', verifyToken, async (req, res) => {
    try {
        const { type, sequenceType, initialNumber, finalNumber, expiryDate } = req.body;

        // Determinar serie basada en sequenceType
        const series = sequenceType === 'traditional' ? 'B' : 'E';

        // Desactivar lotes anteriores del mismo tipo y serie
        await NCFSettings.updateMany(
            { userId: req.userId, type, series, isActive: true },
            { isActive: false }
        );

        const newSetting = new NCFSettings({
            userId: req.userId,
            type,
            series,
            sequenceType: sequenceType || 'electronic',
            initialNumber,
            finalNumber,
            currentValue: initialNumber,
            expiryDate: new Date(expiryDate),
            isActive: true
        });

        await newSetting.save();
        res.status(201).json(newSetting);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Actualizar lote NCF solo si no se ha usado (currentValue === initialNumber)
app.put('/api/ncf-settings/:id', verifyToken, async (req, res) => {
    try {
        const setting = await NCFSettings.findOne({ _id: req.params.id, userId: req.userId });
        if (!setting) return res.status(404).json({ error: 'Lote no encontrado.' });
        if (setting.currentValue !== setting.initialNumber) {
            return res.status(400).json({ error: 'No se puede modificar un lote que ya tiene comprobantes en uso. El contador ya avanzó.' });
        }
        const { initialNumber, finalNumber, expiryDate } = req.body;
        if (initialNumber != null) setting.initialNumber = Number(initialNumber);
        if (finalNumber != null) setting.finalNumber = Number(finalNumber);
        if (expiryDate != null) setting.expiryDate = new Date(expiryDate);
        await setting.save();
        res.json(setting);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- AUTOFILL INTELIGENTE ---
app.get('/api/autofill/suggestions', verifyToken, async (req, res) => {
    try {
        const q = (req.query.q || '').trim().toLowerCase();
        const rnc = (req.query.rnc || '').replace(/[^\d]/g, '');
        const userId = req.userId;

        const result = { clients: [], services: [], lastInvoice: null };

        // 1. Clientes: Invoice (frecuencia, último monto, tipoPago habitual) + Customer
        const clientAgg = await Invoice.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(userId), status: { $nin: ['cancelled'] }, clientRnc: { $nin: [null, ''] } } },
            { $addFields: { tipoPago: { $ifNull: ['$tipoPago', 'efectivo'] } } },
            { $sort: { date: -1 } },
            { $group: {
                _id: '$clientRnc',
                clientName: { $first: '$clientName' },
                count: { $sum: 1 },
                lastTotal: { $first: '$total' },
                lastDate: { $first: '$date' },
                lastTipoPago: { $first: '$tipoPago' }
            }},
            { $sort: { count: -1, lastDate: -1 } },
            { $limit: 50 }
        ]);

        const customers = await Customer.find({ userId }).select('name rnc phone').lean();
        const custByRnc = Object.fromEntries(customers.map(c => [String(c.rnc).replace(/[^\d]/g, ''), c]));

        const clientList = clientAgg.map(c => {
            const cust = custByRnc[String(c._id).replace(/[^\d]/g, '')];
            const name = (c.clientName || cust?.name || '').trim();
            return {
                name,
                rnc: String(c._id),
                phone: cust?.phone || '',
                lastTotal: c.lastTotal,
                count: c.count,
                usualTipoPago: c.lastTipoPago || 'efectivo'
            };
        });

        result.clients = q
            ? clientList.filter(c => (c.name || '').toLowerCase().includes(q) || c.rnc.includes(q)).slice(0, 8)
            : clientList.slice(0, 8);

        // 2. Servicios: items de facturas, frecuencia y precio habitual
        const serviceAgg = await Invoice.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(userId), status: { $nin: ['cancelled'] } } },
            { $unwind: '$items' },
            { $match: { 'items.description': { $exists: true, $nin: [null, ''] } } },
            { $group: {
                _id: '$items.description',
                description: { $first: '$items.description' },
                avgPrice: { $avg: '$items.price' },
                lastPrice: { $last: '$items.price' },
                isExemptCount: { $sum: { $cond: ['$items.isExempt', 1, 0] } },
                count: { $sum: 1 }
            }},
            { $project: {
                description: '$_id',
                price: { $round: [{ $ifNull: ['$lastPrice', '$avgPrice'] }, 0] },
                isExempt: { $gte: ['$isExemptCount', { $multiply: ['$count', 0.5] }] },
                count: 1
            }},
            { $sort: { count: -1 } },
            { $limit: 30 }
        ]);

        result.services = serviceAgg
            .filter(s => !q || (String(s.description || '')).toLowerCase().includes(q))
            .slice(0, 10)
            .map(s => ({ description: s.description, price: s.price || 0, isExempt: !!s.isExempt, count: s.count }));

        // 3. Última factura por RNC (para Repetir / USAR LA MISMA)
        if (rnc && rnc.length >= 9) {
            const lastInv = await Invoice.findOne(
                { userId, clientRnc: rnc, status: { $nin: ['cancelled'] } }
            ).sort({ date: -1 }).lean();
            if (lastInv) {
                result.lastInvoice = {
                    items: (lastInv.items || []).map(i => ({
                        description: i.description,
                        quantity: i.quantity ?? 1,
                        price: i.price ?? 0,
                        isExempt: i.isExempt
                    })),
                    tipoPago: lastInv.tipoPago || 'efectivo',
                    ncfType: lastInv.ncfType,
                    total: lastInv.total,
                    date: lastInv.date
                };
            }
        }

        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Borrar lote NCF solo si no se ha usado (currentValue === initialNumber)
app.delete('/api/ncf-settings/:id', verifyToken, async (req, res) => {
    try {
        const setting = await NCFSettings.findOne({ _id: req.params.id, userId: req.userId });
        if (!setting) return res.status(404).json({ error: 'Lote no encontrado.' });
        if (setting.currentValue !== setting.initialNumber) {
            return res.status(400).json({ error: 'No se puede borrar un lote que ya tiene comprobantes en uso.' });
        }
        await NCFSettings.deleteOne({ _id: req.params.id, userId: req.userId });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/customers', verifyToken, async (req, res) => {
    try {
        const customers = await Customer.find({ userId: req.userId }, "name rnc phone email lastInvoiceDate")
            .sort({ name: 1 })
            .lean();
        res.json(customers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Importación masiva de clientes (CSV/JSON) - límites: 5MB body, 20,000 filas
const CUSTOMER_IMPORT_MAX_ROWS = 20000;
const CUSTOMER_IMPORT_MAX_BYTES = 5 * 1024 * 1024;

app.post('/api/customers/import', verifyToken, async (req, res) => {
    try {
        const data = req.body;
        if (!Array.isArray(data)) {
            return res.status(400).json({ message: 'Se espera un arreglo de clientes.' });
        }
        if (data.length > CUSTOMER_IMPORT_MAX_ROWS) {
            return res.status(400).json({ message: `Máximo ${CUSTOMER_IMPORT_MAX_ROWS.toLocaleString('es-DO')} clientes por importación. Divide tu archivo.` });
        }
        const bodyStr = JSON.stringify(data);
        if (Buffer.byteLength(bodyStr, 'utf8') > CUSTOMER_IMPORT_MAX_BYTES) {
            return res.status(400).json({ message: 'El archivo supera el límite de 5 MB.' });
        }

        let imported = 0;
        let updated = 0;
        const errors = [];

        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            if (!row || typeof row !== 'object') continue;
            const rnc = String(row.rnc || '').replace(/[^0-9]/g, '');
            const name = sanitizeString(row.name || row.nombre || '', 200);
            if (!rnc || rnc.length < 9 || rnc.length > 11) {
                errors.push(`Fila ${i + 2}: RNC inválido (9 u 11 dígitos).`);
                continue;
            }
            if (!name) {
                errors.push(`Fila ${i + 2}: Nombre requerido.`);
                continue;
            }
            const sanitized = {
                userId: req.userId,
                name,
                rnc,
                phone: sanitizeString(row.phone || row.telefono || row.tel || '', 20).replace(/[^0-9+\-\s]/g, ''),
                email: sanitizeEmail(row.email || row.correo || row.mail || ''),
                notes: sanitizeString(row.notes || row.notas || '', 500)
            };
            try {
                const existing = await Customer.findOne({ userId: req.userId, rnc });
                await Customer.findOneAndUpdate(
                    { userId: req.userId, rnc },
                    sanitized,
                    { upsert: true, new: true }
                );
                if (existing) updated++; else imported++;
            } catch (err) {
                errors.push(`Fila ${i + 2}: ${err.message || 'Error al guardar'}`);
            }
        }

        const total = imported + updated;
        const msg = total > 0
            ? `${total.toLocaleString('es-DO')} cliente(s) procesados (${imported} nuevos, ${updated} actualizados).` + (errors.length > 0 ? ` ${errors.length} fila(s) con error.` : '')
            : 'No se importó ningún cliente. Revisa el formato (RNC 9/11 dígitos, nombre obligatorio).';
        res.json({ message: msg, imported, updated, errors: errors.slice(0, 10) });
    } catch (error) {
        res.status(500).json({ message: error.message || 'Error al importar clientes.' });
    }
});

app.post('/api/customers', verifyToken, async (req, res) => {
    try {
        // === SANITIZACIÓN DE INPUTS ===
        const sanitizedData = {
            name: sanitizeString(req.body.name, 200),
            rnc: sanitizeString(req.body.rnc, 20).replace(/[^0-9]/g, ''),
            phone: sanitizeString(req.body.phone, 20).replace(/[^0-9+\-\s]/g, ''),
            email: sanitizeEmail(req.body.email),
            address: sanitizeString(req.body.address, 300),
            userId: req.userId
        };
        
        if (!sanitizedData.name || !sanitizedData.rnc) {
            return res.status(400).json({ message: 'Nombre y RNC son requeridos' });
        }
        
        const customer = await Customer.findOneAndUpdate(
            { userId: req.userId, rnc: sanitizedData.rnc },
            sanitizedData,
            { upsert: true, new: true }
        );
        res.json(customer);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/customers/:id', verifyToken, async (req, res) => {
    try {
        // === VALIDACIÓN DE OBJECTID ===
        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({ message: 'ID de cliente inválido' });
        }
        
        const deleted = await Customer.findOneAndDelete({
            _id: req.params.id,
            userId: req.userId
        });
        if (!deleted) return res.status(404).json({ message: 'Cliente no encontrado' });
        res.json({ success: true, message: 'Cliente eliminado' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- BORRADOR Y PLANTILLAS DE FACTURA ---
app.get('/api/invoice-draft', verifyToken, async (req, res) => {
    try {
        const draft = await InvoiceDraft.findOne({ userId: req.userId });
        res.json(draft || null);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/invoice-draft', verifyToken, async (req, res) => {
    try {
        const { items, clientName, rnc, invoiceType } = req.body;
        const draft = await InvoiceDraft.findOneAndUpdate(
            { userId: req.userId },
            { items: items || [], clientName: clientName || '', rnc: rnc || '', invoiceType: invoiceType || '', updatedAt: new Date() },
            { upsert: true, new: true }
        );
        res.json(draft);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/invoice-draft', verifyToken, async (req, res) => {
    try {
        await InvoiceDraft.deleteOne({ userId: req.userId });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Servicios predefinidos (factura) — migrado desde localStorage
app.get('/api/services', verifyToken, async (req, res) => {
    try {
        const doc = await UserServices.findOne({ userId: req.userId });
        res.json(doc?.services || []);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/services', verifyToken, async (req, res) => {
    try {
        const services = Array.isArray(req.body.services) ? req.body.services.slice(0, 50).map(s => ({
            description: sanitizeString(s?.description || '', 500),
            quantity: Math.max(0, Math.min(Number(s?.quantity) || 0, 999999)),
            price: Math.max(0, Math.min(Number(s?.price) || 0, 999999999)),
            isExempt: Boolean(s?.isExempt)
        })) : [];
        await UserServices.findOneAndUpdate(
            { userId: req.userId },
            { services, updatedAt: new Date() },
            { upsert: true, new: true }
        );
        res.json({ services });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/invoice-templates', verifyToken, async (req, res) => {
    try {
        const templates = await InvoiceTemplate.find({ userId: req.userId }).sort({ createdAt: -1 });
        res.json(templates);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/invoice-templates', verifyToken, async (req, res) => {
    try {
        const { name, invoiceType, items, clientName, rnc } = req.body;
        if (!name) return res.status(400).json({ message: 'Nombre requerido' });
        const template = new InvoiceTemplate({
            userId: req.userId,
            name,
            invoiceType: invoiceType || '',
            items: items || [],
            clientName: clientName || '',
            rnc: rnc || ''
        });
        await template.save();
        res.status(201).json(template);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- BÓVEDA DE DOCUMENTOS (persistencia en MongoDB) ---
const MAX_DOC_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
app.get('/api/documents', verifyToken, async (req, res) => {
    try {
        const docs = await UserDocument.find({ userId: req.userId }).sort({ createdAt: -1 });
        res.json(docs.map(d => ({
            id: d._id.toString(),
            name: d.name,
            type: d.type,
            date: d.createdAt,
            mimeType: d.mimeType
        })));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/documents', verifyToken, async (req, res) => {
    try {
        const { name, type, data } = req.body;
        if (!name || !data) return res.status(400).json({ message: 'Nombre y archivo requeridos' });
        const base64Match = data.match(/^data:([^;]+);base64,(.+)$/);
        const mimeType = base64Match ? base64Match[1] : 'application/octet-stream';
        const rawSize = base64Match ? (base64Match[2].length * 3) / 4 : 0;
        if (rawSize > MAX_DOC_SIZE_BYTES) return res.status(400).json({ message: 'Archivo máximo 5MB' });
        const doc = new UserDocument({
            userId: req.userId,
            name,
            type: type || 'Personal',
            data,
            mimeType
        });
        await doc.save();
        res.status(201).json({ id: doc._id.toString(), name: doc.name, type: doc.type, date: doc.createdAt });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/documents/:id', verifyToken, async (req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({ message: 'ID de documento inválido' });
        }
        const doc = await UserDocument.findOne({ _id: req.params.id, userId: req.userId });
        if (!doc) return res.status(404).json({ message: 'Documento no encontrado' });
        res.json({ id: doc._id.toString(), name: doc.name, type: doc.type, date: doc.createdAt, data: doc.data, mimeType: doc.mimeType });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/documents/:id', verifyToken, async (req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({ message: 'ID de documento inválido' });
        }
        const r = await UserDocument.findOneAndDelete({ _id: req.params.id, userId: req.userId });
        if (!r) return res.status(404).json({ message: 'Documento no encontrado' });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/invoices', verifyToken, async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(500, Math.max(10, parseInt(req.query.limit, 10) || 50));
        const skip = (page - 1) * limit;
        const [invoices, total] = await Promise.all([
            Invoice.find({ userId: req.userId }).sort({ date: -1 }).skip(skip).limit(limit).lean(),
            Invoice.countDocuments({ userId: req.userId })
        ]);
        res.json({ data: invoices, total, page, limit, pages: Math.ceil(total / limit) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/invoices', verifyToken, async (req, res) => {
    // Bloqueo: Onboarding obligatorio
    const createdBeforeOnboarding = req.user.createdAt && new Date(req.user.createdAt) < new Date('2026-02-01');
    if (!req.user.onboardingCompleted && !createdBeforeOnboarding) {
        return res.status(403).json({
            message: 'Completa la configuración inicial antes de emitir facturas.',
            code: 'ONBOARDING_REQUIRED'
        });
    }
    // Bloqueo Inteligente: Requiere nombre fiscal confirmado
    if (!req.user.confirmedFiscalName) {
        return res.status(403).json({
            message: 'Para emitir documentos fiscales, confirma tu nombre fiscal en el dashboard.',
            code: 'FISCAL_NAME_REQUIRED'
        });
    }

    const sub = req.subscription || getUserSubscription(req.user);
    if (sub.status === 'expired') {
        return res.status(403).json({
            message: 'Tu membresía ha expirado. Actualiza tu plan en Configuración.',
            code: 'SUBSCRIPTION_EXPIRED'
        });
    }

    const planConfig = MEMBERSHIP_PLANS[sub.plan] || MEMBERSHIP_PLANS.free;
    if (planConfig.invoicesPerMonth >= 0) {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        const count = await Invoice.countDocuments({
            userId: req.userId,
            date: { $gte: startOfMonth },
            status: { $ne: 'cancelled' }
        });
        if (count >= planConfig.invoicesPerMonth) {
            return res.status(403).json({
                message: `Límite del plan Free alcanzado (${planConfig.invoicesPerMonth} facturas/mes). Actualiza a Pro para facturas ilimitadas.`,
                code: 'INVOICE_LIMIT_REACHED'
            });
        }
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        // === SANITIZACIÓN DE INPUTS ===
        const clientName = sanitizeString(req.body.clientName, 200);
        const clientRnc = (sanitizeString(req.body.clientRnc || req.body.rnc, 20)).replace(/[^0-9]/g, '');
        const ncfType = sanitizeString(req.body.ncfType || req.body.type, 10);
        const items = sanitizeItems(req.body.items);
        const subtotal = Math.max(0, Math.min(Number(req.body.subtotal) || 0, 999999999));
        const itbis = Math.max(0, Math.min(Number(req.body.itbis) || 0, 999999999));
        const total = Math.max(0, Math.min(Number(req.body.total) || 0, 999999999));
        
        const isPlaceholderName = !clientName || (String(clientName).toUpperCase().trim() === 'CONTRIBUYENTE REGISTRADO');
        if (isPlaceholderName || !clientRnc || items.length === 0) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: isPlaceholderName ? 'Indica el nombre real del cliente (no el placeholder).' : 'Cliente, RNC e items son requeridos' });
        }
        
        const fullNcf = await getNextNcf(req.userId, ncfType, session, clientRnc);
        if (!fullNcf) throw new Error("No hay secuencias NCF disponibles.");
        let invoiceDate = new Date();
        if (req.body.date) {
            const parsed = new Date(req.body.date);
            if (!isNaN(parsed.getTime())) invoiceDate = parsed;
        }
        // Tipo de Pago
        const tipoPagoValidos = ['efectivo', 'transferencia', 'tarjeta', 'credito', 'mixto', 'otro'];
        const tipoPago = tipoPagoValidos.includes(req.body.tipoPago) ? req.body.tipoPago : 'efectivo';
        const pagoMixto = Array.isArray(req.body.pagoMixto) ? req.body.pagoMixto.filter(p => p && p.tipo && Number(p.monto) > 0).map(p => ({
            tipo: String(p.tipo).slice(0, 30),
            monto: Math.max(0, Math.min(Number(p.monto) || 0, 999999999))
        })) : [];
        let montoPagado = 0, balancePendiente = total, estadoPago = 'pendiente', fechaPago = null;
        if (tipoPago === 'credito') {
            montoPagado = 0;
            balancePendiente = total;
            estadoPago = 'pendiente';
        } else if (tipoPago === 'mixto' && pagoMixto.length > 0) {
            montoPagado = pagoMixto.reduce((s, p) => s + (p.monto || 0), 0);
            balancePendiente = Math.max(0, total - montoPagado);
            estadoPago = balancePendiente <= 0 ? 'pagado' : 'parcial';
            if (estadoPago === 'pagado') fechaPago = new Date();
        } else {
            montoPagado = total;
            balancePendiente = 0;
            estadoPago = 'pagado';
            fechaPago = new Date();
        }
        const newInvoice = new Invoice({
            userId: req.userId, clientName, clientRnc, ncfType, ncfSequence: fullNcf, items, subtotal, itbis, total, date: invoiceDate,
            tipoPago, tipoPagoOtro: tipoPago === 'otro' ? sanitizeString(req.body.tipoPagoOtro || '', 50) : null,
            pagoMixto: pagoMixto.length > 0 ? pagoMixto : undefined,
            montoPagado, balancePendiente, estadoPago, fechaPago
        });
        await newInvoice.save({ session });
        await Customer.findOneAndUpdate(
            { userId: req.userId, rnc: clientRnc },
            { lastInvoiceDate: new Date(), $set: { name: clientName } },
            { upsert: true, session }
        );
        await session.commitTransaction();
        session.endSession();

        // Notificación por email (factura emitida)
        try {
            const mailer = require('./mailer');
            if (typeof mailer.sendInvoiceCreated === 'function' && req.user && req.user.email) {
                await mailer.sendInvoiceCreated(req.user.email, fullNcf, (total || 0).toFixed(2), clientName);
            }
        } catch (err) { log.warn({ err: err.message }, 'Email factura emitida no enviado'); }

        res.status(201).json({ message: 'Factura creada exitosamente', ncf: fullNcf, invoice: newInvoice });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/reports/summary', verifyToken, async (req, res) => {
    try {
        const { month, year } = req.query;
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        const invoices = await Invoice.find({
            userId: req.userId,
            date: { $gte: startDate, $lte: endDate },
            status: { $ne: 'cancelled' }
        });

        // Calculamos el subtotal real (sin impuestos)
        const subtotal = invoices.reduce((sum, inv) => sum + (inv.subtotal || 0), 0);
        const itbis = invoices.reduce((sum, inv) => sum + (inv.itbis || 0), 0);
        const total = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);

        res.json({
            month,
            year,
            subtotal,
            itbis,
            total,
            count: invoices.length,
            confirmedName: req.user.confirmedFiscalName
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- Tax Health (Bolsillo Fiscal) - datos reales desde DB ---
app.get('/api/reports/tax-health', verifyToken, async (req, res) => {
    try {
        const { month, year } = req.query;
        const now = new Date();
        const m = month ? parseInt(month, 10) : now.getMonth() + 1;
        const y = year ? parseInt(year, 10) : now.getFullYear();
        const startDate = new Date(y, m - 1, 1);
        const endDate = new Date(y, m, 0, 23, 59, 59);

        const [invoices, expenses] = await Promise.all([
            Invoice.find({
                userId: req.userId,
                date: { $gte: startDate, $lte: endDate },
                status: { $ne: 'cancelled' }
            }),
            Expense.find({
                userId: req.userId,
                date: { $gte: startDate, $lte: endDate }
            })
        ]);

        const collectedItbis = invoices.reduce((sum, inv) => sum + (inv.itbis || 0), 0);
        const retentions = invoices.reduce((sum, inv) => sum + (inv.isrRetention || 0) + (inv.itbisRetention || 0), 0);
        const subtotalRevenue = invoices.reduce((sum, inv) => sum + (inv.subtotal || ((inv.total || 0) - (inv.itbis || 0))), 0);
        const paidItbis = expenses.reduce((sum, exp) => sum + (exp.itbis != null ? exp.itbis : (exp.amount || 0) * 0.15), 0);
        const itbisRetentions = invoices.reduce((sum, inv) => sum + (inv.itbisRetention || 0), 0);

        let liability = collectedItbis - paidItbis;
        if (liability < 0) liability = 0;
        liability -= itbisRetentions;
        if (liability < 0) liability = 0;

        const netCash = subtotalRevenue - expenses.reduce((s, e) => s + (e.amount || 0), 0);

        res.json({
            collectedItbis,
            paidItbis,
            retentions,
            netTaxPayable: liability,
            safeToSpend: netCash,
            status: liability > (collectedItbis * 0.5) ? 'warning' : 'healthy'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- REPORTE 607 (VENTAS) - Pre-validación + Log Fiscal ---
app.get('/api/reports/607/validate', verifyToken, async (req, res) => {
    if (!req.user.confirmedFiscalName) {
        return res.status(403).json({ valid: false, message: 'Confirma tu nombre fiscal para generar reportes.' });
    }
    try {
        const { month, year } = req.query;
        const m = parseInt(month, 10);
        const y = parseInt(year, 10);
        if (!m || !y || m < 1 || m > 12) {
            return res.status(400).json({ valid: false, errors: ['Parámetros month y year inválidos.'] });
        }
        const startDate = new Date(y, m - 1, 1);
        const endDate = new Date(y, m, 0, 23, 59, 59);
        const invoices = await Invoice.find({
            userId: req.userId,
            date: { $gte: startDate, $lte: endDate },
            status: { $ne: 'cancelled' }
        }).sort({ date: 1, ncfSequence: 1 });

        const periodo = `${y}${m.toString().padStart(2, '0')}`;
        const rncEmisor = req.user.rnc.replace(/[^\d]/g, '');
        let report = `607|${rncEmisor}|${periodo}|${invoices.length}\n`;
        // 607 DGII: RNC|TipoId|NCF|NCFModificado|TipoIngreso(01-06)|FechaComp|FechaRetencion|MontoFacturado|ITBISFacturado|RentaRetenida|ITBISRetenido|Selectivo|Propina|Otros|MontoTotal|...
        invoices.forEach(inv => {
            const fechaComp = new Date(inv.date).toISOString().slice(0, 10).replace(/-/g, '');
            const rncCliente = (inv.clientRnc || '').replace(/[^\d]/g, '');
            const tipoId = rncCliente.length === 9 ? '1' : '2';
            const montoFact = (inv.subtotal || 0).toFixed(2);
            const itbisFact = (inv.itbis || 0).toFixed(2);
            const montoTotal = (inv.total || 0).toFixed(2);
            const isrRet = (inv.isrRetention || 0).toFixed(2);
            const itbisRet = (inv.itbisRetention || 0).toFixed(2);
            report += `${rncCliente}|${tipoId}|${inv.ncfSequence}|${inv.modifiedNcf || ''}|01|${fechaComp}||${montoFact}|${itbisFact}|${isrRet}|${itbisRet}|0.00|0.00|0.00|0.00|0.00|${montoTotal}|0.00|0.00|0.00\n`;
        });

        const validation = validate607Format(report);
        await FiscalAuditLog.create({
            userId: req.userId,
            tipoReporte: '607',
            periodo,
            resultadoValidacion: validation.valid ? 'ok' : 'error',
            errores: validation.errors,
            registros: invoices.length
        });
        res.json({ valid: validation.valid, errors: validation.errors || [] });
    } catch (error) {
        res.status(500).json({ valid: false, errors: [error.message] });
    }
});

app.get('/api/reports/607', verifyToken, async (req, res) => {
    if (!req.user.confirmedFiscalName) {
        return res.status(403).json({ message: 'Confirma tu nombre fiscal para generar reportes.' });
    }
    try {
        const { month, year } = req.query;
        const m = parseInt(month, 10);
        const y = parseInt(year, 10);
        if (!m || !y || m < 1 || m > 12) {
            return res.status(400).json({ message: 'Parámetros month y year inválidos.' });
        }
        const startDate = new Date(y, m - 1, 1);
        const endDate = new Date(y, m, 0, 23, 59, 59);
        const invoices = await Invoice.find({
            userId: req.userId,
            date: { $gte: startDate, $lte: endDate },
            status: { $ne: 'cancelled' }
        }).sort({ date: 1, ncfSequence: 1 });

        const periodo = `${y}${m.toString().padStart(2, '0')}`;
        const rncEmisor = req.user.rnc.replace(/[^\d]/g, '');
        let report = `607|${rncEmisor}|${periodo}|${invoices.length}\n`;
        // 607 DGII: misma estructura con retenciones ISR/ITBIS
        invoices.forEach(inv => {
            const fechaComp = new Date(inv.date).toISOString().slice(0, 10).replace(/-/g, '');
            const rncCliente = (inv.clientRnc || '').replace(/[^\d]/g, '');
            const tipoId = rncCliente.length === 9 ? '1' : '2';
            const montoFact = (inv.subtotal || 0).toFixed(2);
            const itbisFact = (inv.itbis || 0).toFixed(2);
            const montoTotal = (inv.total || 0).toFixed(2);
            const isrRet = (inv.isrRetention || 0).toFixed(2);
            const itbisRet = (inv.itbisRetention || 0).toFixed(2);
            report += `${rncCliente}|${tipoId}|${inv.ncfSequence}|${inv.modifiedNcf || ''}|01|${fechaComp}||${montoFact}|${itbisFact}|${isrRet}|${itbisRet}|0.00|0.00|0.00|0.00|0.00|${montoTotal}|0.00|0.00|0.00\n`;
        });

        const validation = validate607Format(report);
        if (!validation.valid) {
            await FiscalAuditLog.create({
                userId: req.userId,
                tipoReporte: '607',
                periodo,
                resultadoValidacion: 'error',
                errores: validation.errors,
                registros: invoices.length
            });
            return res.status(400).json({
                message: 'El archivo no cumple el formato DGII. Corrija antes de descargar.',
                valid: false,
                details: validation.errors
            });
        }

        await FiscalAuditLog.create({
            userId: req.userId,
            tipoReporte: '607',
            periodo,
            resultadoValidacion: 'ok',
            errores: [],
            registros: invoices.length
        });

        res.setHeader('Content-Type', 'text/plain; charset=iso-8859-1');
        res.setHeader('Content-Disposition', `attachment; filename=607_${rncEmisor}_${periodo}.txt`);
        res.send(report);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- GESTIÓN DE GASTOS (606) ---
app.get('/api/expenses', verifyToken, async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10);
        const limit = parseInt(req.query.limit, 10);
        if (page && limit) {
            const skip = (page - 1) * limit;
            const [data, total] = await Promise.all([
                Expense.find({ userId: req.userId }).sort({ date: -1 }).skip(skip).limit(Math.min(limit, 500)).lean(),
                Expense.countDocuments({ userId: req.userId })
            ]);
            return res.json({ data, total, page, limit, pages: Math.ceil(total / limit) });
        }
        const expenses = await Expense.find({ userId: req.userId }).sort({ date: -1 });
        res.json(expenses);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/expenses', verifyToken, async (req, res) => {
    try {
        const { supplierName, supplierRnc, ncf, amount, itbis, category, date } = req.body;
        const newExpense = new Expense({
            userId: req.userId,
            supplierName,
            supplierRnc,
            ncf,
            amount,
            itbis: itbis || 0,
            category,
            date: date || new Date()
        });
        await newExpense.save();
        res.status(201).json(newExpense);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/expenses/:id', verifyToken, async (req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({ message: 'ID de gasto inválido' });
        }
        await Expense.findOneAndDelete({ _id: req.params.id, userId: req.userId });
        res.json({ message: 'Gasto eliminado' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- REPORTE 606 (COMPRAS/GASTOS) - Pre-validación + Log Fiscal ---
const DGII_EXPENSE_CATEGORIES = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11'];

app.get('/api/reports/606/validate', verifyToken, async (req, res) => {
    if (!req.user.confirmedFiscalName) {
        return res.status(403).json({ valid: false, message: 'Confirma tu nombre fiscal para generar reportes.' });
    }
    try {
        const { month, year } = req.query;
        const m = parseInt(month, 10);
        const y = parseInt(year, 10);
        if (!m || !y || m < 1 || m > 12) {
            return res.status(400).json({ valid: false, errors: ['Parámetros month y year inválidos.'] });
        }
        const startDate = new Date(y, m - 1, 1);
        const endDate = new Date(y, m, 0, 23, 59, 59);
        const expenses = await Expense.find({
            userId: req.userId,
            date: { $gte: startDate, $lte: endDate }
        }).sort({ date: 1 });

        const preErrores = [];
        expenses.forEach((exp, idx) => {
            if (!exp.supplierName || !exp.supplierRnc || !exp.ncf || exp.amount == null) {
                preErrores.push(`Gasto ${idx + 1}: Faltan campos obligatorios (suplidor, RNC, NCF, monto).`);
            }
            if (!DGII_EXPENSE_CATEGORIES.includes(exp.category)) {
                preErrores.push(`Gasto ${idx + 1}: Categoría ${exp.category} inválida. Use códigos 01-11 DGII.`);
            }
            const ncfRes = validateNcfStructure(exp.ncf || '');
            if (!ncfRes.valid) preErrores.push(`Gasto ${idx + 1}: ${ncfRes.errors.join('; ')}`);
        });
        if (preErrores.length > 0) {
            await FiscalAuditLog.create({
                userId: req.userId,
                tipoReporte: '606',
                periodo: `${y}${m.toString().padStart(2, '0')}`,
                resultadoValidacion: 'error',
                errores: preErrores,
                registros: expenses.length
            });
            return res.json({ valid: false, errors: preErrores });
        }

        const periodo = `${y}${m.toString().padStart(2, '0')}`;
        const rncEmisor = req.user.rnc.replace(/[^\d]/g, '');
        let report = `606|${rncEmisor}|${periodo}|${expenses.length}\n`;
        expenses.forEach(exp => {
            const fecha = new Date(exp.date).toISOString().slice(0, 10).replace(/-/g, '');
            const rncLimpiado = (exp.supplierRnc || '').replace(/[^0-9]/g, '');
            const tipoId = rncLimpiado.length === 9 ? '1' : '2';
            const itbisPagado = (exp.itbis || 0).toFixed(2);
            const montoTotal = (exp.amount || 0).toFixed(2);
            const formaPago = exp.paymentMethod || '01';
            report += `${rncLimpiado}|${tipoId}|${exp.category}|${exp.ncf}||${fecha}||${montoTotal}|0.00|${montoTotal}|${itbisPagado}|${itbisPagado}|${formaPago}||||||||\n`;
        });

        const validation = validate606Format(report);
        await FiscalAuditLog.create({
            userId: req.userId,
            tipoReporte: '606',
            periodo,
            resultadoValidacion: validation.valid ? 'ok' : 'error',
            errores: validation.errors,
            registros: expenses.length
        });
        res.json({ valid: validation.valid, errors: validation.errors || [] });
    } catch (error) {
        res.status(500).json({ valid: false, errors: [error.message] });
    }
});

app.get('/api/reports/606', verifyToken, async (req, res) => {
    if (!req.user.confirmedFiscalName) {
        return res.status(403).json({ message: 'Confirma tu nombre fiscal para generar reportes.' });
    }
    try {
        const { month, year } = req.query;
        const m = parseInt(month, 10);
        const y = parseInt(year, 10);
        if (!m || !y || m < 1 || m > 12) {
            return res.status(400).json({ message: 'Parámetros month y year inválidos.' });
        }
        const startDate = new Date(y, m - 1, 1);
        const endDate = new Date(y, m, 0, 23, 59, 59);
        const expenses = await Expense.find({
            userId: req.userId,
            date: { $gte: startDate, $lte: endDate }
        }).sort({ date: 1 });

        const preErrores = [];
        expenses.forEach((exp, idx) => {
            if (!exp.supplierName || !exp.supplierRnc || !exp.ncf || exp.amount == null) {
                preErrores.push(`Gasto ${idx + 1}: Faltan campos obligatorios.`);
            }
            if (!DGII_EXPENSE_CATEGORIES.includes(exp.category)) {
                preErrores.push(`Gasto ${idx + 1}: Categoría ${exp.category} inválida.`);
            }
            const ncfRes = validateNcfStructure(exp.ncf || '');
            if (!ncfRes.valid) preErrores.push(`Gasto ${idx + 1}: NCF inválido.`);
        });
        if (preErrores.length > 0) {
            await FiscalAuditLog.create({
                userId: req.userId,
                tipoReporte: '606',
                periodo: `${y}${m.toString().padStart(2, '0')}`,
                resultadoValidacion: 'error',
                errores: preErrores,
                registros: expenses.length
            });
            return res.status(400).json({
                message: 'El archivo no cumple el formato DGII. Corrija antes de descargar.',
                valid: false,
                details: preErrores
            });
        }

        const periodo = `${y}${m.toString().padStart(2, '0')}`;
        const rncEmisor = req.user.rnc.replace(/[^\d]/g, '');
        let report = `606|${rncEmisor}|${periodo}|${expenses.length}\n`;
        expenses.forEach(exp => {
            const fecha = new Date(exp.date).toISOString().slice(0, 10).replace(/-/g, '');
            const rncLimpiado = (exp.supplierRnc || '').replace(/[^0-9]/g, '');
            const tipoId = rncLimpiado.length === 9 ? '1' : '2';
            const itbisPagado = (exp.itbis || 0).toFixed(2);
            const montoTotal = (exp.amount || 0).toFixed(2);
            const formaPago = exp.paymentMethod || '01';
            report += `${rncLimpiado}|${tipoId}|${exp.category}|${exp.ncf}||${fecha}||${montoTotal}|0.00|${montoTotal}|${itbisPagado}|${itbisPagado}|${formaPago}||||||||\n`;
        });

        const validation = validate606Format(report);
        if (!validation.valid) {
            await FiscalAuditLog.create({
                userId: req.userId,
                tipoReporte: '606',
                periodo,
                resultadoValidacion: 'error',
                errores: validation.errors,
                registros: expenses.length
            });
            return res.status(400).json({
                message: 'El archivo no cumple el formato DGII. Corrija antes de descargar.',
                valid: false,
                details: validation.errors
            });
        }

        await FiscalAuditLog.create({
            userId: req.userId,
            tipoReporte: '606',
            periodo,
            resultadoValidacion: 'ok',
            errores: [],
            registros: expenses.length
        });

        res.setHeader('Content-Type', 'text/plain; charset=iso-8859-1');
        res.setHeader('Content-Disposition', `attachment; filename=606_${rncEmisor}_${periodo}.txt`);
        res.send(report);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Recordatorio 606/607: enviar email al entrar a Reportes (máximo 1 por periodo por usuario)
app.post('/api/reports/reminder', verifyToken, async (req, res) => {
    try {
        const now = new Date();
        const y = now.getFullYear();
        const m = now.getMonth() + 1;
        const period = `${y}${m.toString().padStart(2, '0')}`;
        const periodLabel = `${y}-${m.toString().padStart(2, '0')}`;
        const user = await User.findById(req.userId).select('email lastReportReminderPeriod').lean();
        if (!user || !user.email) return res.json({ sent: false, reason: 'no_email' });
        if (user.lastReportReminderPeriod === period) return res.json({ sent: false, reason: 'already_sent', period: periodLabel });
        const mailer = require('./mailer');
        if (typeof mailer.send606607Reminder === 'function') {
            await mailer.send606607Reminder(user.email, periodLabel);
        }
        await User.findByIdAndUpdate(req.userId, { lastReportReminderPeriod: period });
        res.json({ sent: true, period: periodLabel });
    } catch (e) {
        log.warn({ err: e.message, userId: req.userId }, 'Report reminder failed');
        res.status(500).json({ sent: false, error: e.message });
    }
});

// --- COTIZACIONES (Quotes) - MongoDB, no localStorage ---
app.get('/api/quotes', verifyToken, async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10);
        const limit = parseInt(req.query.limit, 10);
        const mapQuote = (q) => ({
            id: q._id.toString(),
            _id: q._id,
            clientName: q.clientName,
            rnc: q.clientRnc,
            clientPhone: q.clientPhone,
            items: q.items,
            subtotal: q.subtotal,
            itbis: q.itbis,
            total: q.total,
            status: q.status,
            date: q.createdAt,
            validUntil: q.validUntil,
            invoiceId: q.invoiceId
        });
        if (page && limit) {
            const skip = (page - 1) * limit;
            const [quotes, total] = await Promise.all([
                Quote.find({ userId: req.userId }).sort({ lastSavedAt: -1 }).skip(skip).limit(Math.min(limit, 500)).lean(),
                Quote.countDocuments({ userId: req.userId })
            ]);
            return res.json({ data: quotes.map(mapQuote), total, page, limit, pages: Math.ceil(total / limit) });
        }
        const quotes = await Quote.find({ userId: req.userId }).sort({ lastSavedAt: -1 });
        res.json(quotes.map(mapQuote));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/quotes', verifyToken, async (req, res) => {
    try {
        // === SANITIZACIÓN DE INPUTS ===
        const clientName = sanitizeString(req.body.clientName, 200);
        const clientRnc = sanitizeString(req.body.clientRnc, 20).replace(/[^0-9]/g, '');
        const clientPhone = sanitizeString(req.body.clientPhone, 20).replace(/[^0-9+\-\s]/g, '');
        const items = sanitizeItems(req.body.items);
        const subtotal = Math.max(0, Math.min(Number(req.body.subtotal) || 0, 999999999));
        const itbis = Math.max(0, Math.min(Number(req.body.itbis) || 0, 999999999));
        const total = Math.max(0, Math.min(Number(req.body.total) || 0, 999999999));
        const validUntil = req.body.validUntil;
        
        if (!clientName) {
            return res.status(400).json({ message: 'El nombre del cliente es requerido' });
        }
        
        const quote = new Quote({
            userId: req.userId,
            clientName,
            clientRnc,
            clientPhone,
            items,
            subtotal,
            itbis,
            total,
            validUntil: new Date(validUntil || Date.now() + 15 * 24 * 60 * 60 * 1000),
            status: 'draft'
        });
        await quote.save();
        res.status(201).json({ ...quote.toObject(), id: quote._id.toString() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/quotes/:id', verifyToken, async (req, res) => {
    try {
        // === VALIDACIÓN DE OBJECTID ===
        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({ message: 'ID de cotización inválido' });
        }
        
        const quote = await Quote.findOne({ _id: req.params.id, userId: req.userId });
        if (!quote) return res.status(404).json({ message: 'Cotización no encontrada' });
        if (quote.status === 'converted') return res.status(400).json({ message: 'No se puede editar una cotización ya facturada.' });

        // === SANITIZACIÓN DE INPUTS ===
        if (req.body.clientName !== undefined) quote.clientName = sanitizeString(req.body.clientName, 200);
        if (req.body.clientRnc !== undefined) quote.clientRnc = sanitizeString(req.body.clientRnc, 20).replace(/[^0-9]/g, '');
        if (req.body.clientPhone !== undefined) quote.clientPhone = sanitizeString(req.body.clientPhone, 20).replace(/[^0-9+\-\s]/g, '');
        if (req.body.items !== undefined) quote.items = sanitizeItems(req.body.items);
        if (req.body.subtotal !== undefined) quote.subtotal = Math.max(0, Math.min(Number(req.body.subtotal) || 0, 999999999));
        if (req.body.itbis !== undefined) quote.itbis = Math.max(0, Math.min(Number(req.body.itbis) || 0, 999999999));
        if (req.body.total !== undefined) quote.total = Math.max(0, Math.min(Number(req.body.total) || 0, 999999999));
        if (req.body.validUntil !== undefined) quote.validUntil = new Date(req.body.validUntil);
        if (req.body.status !== undefined && ['draft', 'sent'].includes(req.body.status)) quote.status = req.body.status;
        quote.lastSavedAt = new Date();
        await quote.save();
        res.json({ ...quote.toObject(), id: quote._id.toString() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/quotes/:id', verifyToken, async (req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({ message: 'ID de cotización inválido' });
        }
        const quote = await Quote.findOne({ _id: req.params.id, userId: req.userId });
        if (!quote) return res.status(404).json({ message: 'Cotización no encontrada' });
        if (quote.status === 'converted') {
            return res.status(400).json({ message: 'No se puede eliminar una cotización ya facturada.' });
        }
        await Quote.deleteOne({ _id: req.params.id, userId: req.userId });
        res.json({ message: 'Cotización eliminada' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Convertir cotización a factura - marca como converted, asocia invoiceId, bloquea doble facturación
app.post('/api/quotes/:id/convert', verifyToken, async (req, res) => {
    // === VALIDACIÓN DE OBJECTID ===
    if (!isValidObjectId(req.params.id)) {
        return res.status(400).json({ message: 'ID de cotización inválido' });
    }
    
    if (!req.user.confirmedFiscalName) {
        return res.status(403).json({ message: 'Confirma tu nombre fiscal para facturar.' });
    }
    try {
        const quote = await Quote.findOne({ _id: req.params.id, userId: req.userId });
        if (!quote) return res.status(404).json({ message: 'Cotización no encontrada' });
        if (quote.status === 'converted') {
            return res.status(400).json({ message: 'Esta cotización ya fue facturada.', invoiceId: quote.invoiceId });
        }

        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const ncfType = quote.clientRnc?.replace(/[^\d]/g, '').length === 9 ? '31' : '32';
            const fullNcf = await getNextNcf(req.userId, ncfType, session, quote.clientRnc);
            const newInvoice = new Invoice({
                userId: req.userId,
                clientName: quote.clientName,
                clientRnc: quote.clientRnc,
                ncfType,
                ncfSequence: fullNcf,
                items: quote.items,
                subtotal: quote.subtotal,
                itbis: quote.itbis,
                total: quote.total
            });
            await newInvoice.save({ session });
            quote.status = 'converted';
            quote.invoiceId = newInvoice._id;
            quote.lastSavedAt = new Date();
            await quote.save({ session });
            await Customer.findOneAndUpdate(
                { userId: req.userId, rnc: quote.clientRnc },
                { lastInvoiceDate: new Date(), $set: { name: quote.clientName } },
                { upsert: true, session }
            );
            await session.commitTransaction();
            session.endSession();
            res.status(201).json({ message: 'Factura creada', invoice: newInvoice, ncf: fullNcf });
        } catch (err) {
            await session.abortTransaction();
            session.endSession();
            throw err;
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/subscription/status', verifyToken, (req, res) => {
    const sub = req.subscription || getUserSubscription(req.user);
    const now = new Date();
    const endDate = sub.endDate ? new Date(sub.endDate) : req.user.expiryDate ? new Date(req.user.expiryDate) : null;
    const diffDays = endDate ? Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)) : 999;
    const daysRemaining = Math.max(-999, diffDays);
    const GRACE_DAYS = 5;
    const daysPastEnd = daysRemaining < 0 ? Math.abs(daysRemaining) : 0;
    const graceDaysRemaining = daysPastEnd > 0 ? Math.max(0, GRACE_DAYS - daysPastEnd) : GRACE_DAYS;
    let displayStatus = 'Activo';
    if (sub.status === 'expired' || daysRemaining <= 0) {
        displayStatus = graceDaysRemaining > 0 ? 'Gracia' : 'Bloqueado';
    } else if (daysRemaining <= 7) {
        displayStatus = 'VencePronto';
    }
    res.json({
        plan: sub.plan,
        status: displayStatus,
        expiryDate: endDate,
        daysRemaining: Math.max(0, daysRemaining),
        graceDaysRemaining: daysRemaining <= 0 ? graceDaysRemaining : null,
        paymentMethod: sub.paymentMethod
    });
});

// Final export for Vercel
module.exports = app;

// Local startup for 'node api/index.js'
if (require.main === module) {
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
        log.info({ port: PORT }, 'Lexis Bill Backend running');
    });
}
