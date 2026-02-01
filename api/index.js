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
            dbName: 'lexis_bill' // Forzamos el nombre de la DB aquí también
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
    role: { type: String, enum: ['user', 'admin'], default: 'user' },

    // Identidad Fiscal (Asistente Inteligente)
    suggestedFiscalName: { type: String },
    confirmedFiscalName: { type: String },

    // Preferencias de Facturación
    hasElectronicBilling: { type: Boolean, default: false },

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
    comprobanteImage: { type: String }, // base64 data URL del comprobante (obligatorio para transferencia)
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    requestedAt: { type: Date, default: Date.now },
    processedAt: { type: Date },
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});
paymentRequestSchema.index({ status: 1, requestedAt: -1 });

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
    annulledBy: { type: String }
});
invoiceSchema.index({ userId: 1, date: -1 });
invoiceSchema.index({ userId: 1, ncfSequence: 1 });

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
const NCFSettings = mongoose.models.NCFSettings || mongoose.model('NCFSettings', ncfSettingsSchema);
const Invoice = mongoose.models.Invoice || mongoose.model('Invoice', invoiceSchema);
const Customer = mongoose.models.Customer || mongoose.model('Customer', customerSchema);
const SupportTicket = mongoose.models.SupportTicket || mongoose.model('SupportTicket', supportTicketSchema);
const Expense = mongoose.models.Expense || mongoose.model('Expense', expenseSchema);
const Quote = mongoose.models.Quote || mongoose.model('Quote', quoteSchema);
const UserDocument = mongoose.models.UserDocument || mongoose.model('UserDocument', userDocumentSchema);
const FiscalAuditLog = mongoose.models.FiscalAuditLog || mongoose.model('FiscalAuditLog', fiscalAuditLogSchema);

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
        const { email, password, name, rnc, profession, plan } = req.body;
        log.info({ action: 'register' }, 'Registrando usuario');

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
            suggestedFiscalName: req.body.suggestedName || ""
        });

        await newUser.save();
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
            sameSite: 'lax',
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

// Logout: limpiar cookie HttpOnly
app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('lexis_auth', { path: '/', httpOnly: true });
    res.json({ success: true });
});

app.get('/api/auth/me', verifyToken, async (req, res) => {
    try {
        const user = req.user;
        const sub = getUserSubscription(user);
        res.json({
            id: user._id,
            email: user.email,
            name: user.name,
            profession: user.profession,
            rnc: user.rnc,
            role: user.role || 'user',
            subscription: sub,
            fiscalStatus: { suggested: user.suggestedFiscalName, confirmed: user.confirmedFiscalName }
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
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

app.post('/api/membership/request-payment', verifyToken, async (req, res) => {
    try {
        const { plan, billingCycle, paymentMethod, comprobanteImage } = req.body;
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

        const pr = new PaymentRequest({
            userId: req.userId,
            plan,
            billingCycle: cycle,
            paymentMethod,
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
            message: 'Tu solicitud fue registrada. Tu membresía será activada una vez validemos el pago.',
            paymentRequest: { id: pr._id, plan, billingCycle: cycle, paymentMethod, status: 'pending' }
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- ADMIN: Pagos pendientes y validación ---
app.get('/api/admin/pending-payments', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const list = await PaymentRequest.find({ status: 'pending' })
            .populate('userId', 'name email rnc')
            .sort({ requestedAt: -1 });
        res.json(list.map(p => ({
            id: p._id,
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

app.post('/api/admin/approve-payment/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
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

        res.json({ message: 'Pago aprobado. Membresía activada por 30 días.' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/admin/reject-payment/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
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

// --- ADMIN: Estadísticas CEO ---
app.get('/api/admin/stats', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const [totalUsers, usersThisMonth, allInvoices, invoicesThisMonth, allExpenses, pendingPayments, planCounts] = await Promise.all([
            User.countDocuments({}),
            User.countDocuments({ createdAt: { $gte: startOfMonth } }),
            Invoice.find({ status: { $ne: 'cancelled' } }),
            Invoice.find({ status: { $ne: 'cancelled' }, date: { $gte: startOfMonth } }),
            Expense.find({}),
            PaymentRequest.countDocuments({ status: 'pending' }),
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

// --- ADMIN: Dashboard CEO - Métricas SaaS completas ---
app.get('/api/admin/metrics', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

        const [totalUsers, newThisMonth, newLastMonth, proUsers, approvedPayments, pendingPayments, expiredLastMonth] = await Promise.all([
            User.countDocuments({}),
            User.countDocuments({ createdAt: { $gte: startOfMonth } }),
            User.countDocuments({ createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } }),
            User.countDocuments({ $or: [{ 'subscription.plan': 'pro' }, { membershipLevel: 'pro' }], role: { $ne: 'admin' } }),
            PaymentRequest.find({ status: 'approved' }).sort({ processedAt: -1 }),
            PaymentRequest.countDocuments({ status: 'pending' }),
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
    const cleanNumber = number.replace(/\D/g, ""); // Limpiar espacios o caracteres invisibles

    if (!validateTaxId(cleanNumber)) return res.status(400).json({ valid: false, message: 'Documento Inválido' });

    const mockDb = {
        "101010101": "JUAN PEREZ",
        "131888444": "LEXIS BILL SOLUTIONS S.R.L.",
        "40222222222": "DRA. MARIA RODRIGUEZ (DEMO)",
        "130851255": "ASOCIACION DE ESPECIALISTAS FISCALES",
        "22301650929": "ASOCIACION PROFESIONAL DE SANTO DOMINGO"
    };
    const name = mockDb[cleanNumber] || "CONTRIBUYENTE REGISTRADO";
    res.json({ valid: true, rnc: cleanNumber, name, type: cleanNumber.length === 9 ? 'JURIDICA' : 'FISICA' });
});

app.post('/api/validate-rnc', async (req, res) => {
    try {
        const { rnc } = req.body;
        if (!rnc) return res.status(400).json({ valid: false, message: 'RNC requerido' });

        const cleanRnc = rnc.replace(/\D/g, "");
        if (!validateTaxId(cleanRnc)) {
            return res.json({ valid: false, message: 'Formato inválido' });
        }

        const mockDb = {
            "101010101": "JUAN PEREZ",
            "131888444": "LEXIS BILL SOLUTIONS S.R.L.",
            "40222222222": "DRA. MARIA RODRIGUEZ (DEMO)",
            "130851255": "ASOCIACION DE ESPECIALISTAS FISCALES",
            "22301650929": "ASOCIACION PROFESIONAL DE SANTO DOMINGO"
        };

        const name = mockDb[cleanRnc] || "CONTRIBUYENTE REGISTRADO";

        // Simular un pequeño delay de red para efectos de UX (solo si no es producción)
        if (process.env.NODE_ENV !== 'production') {
            await new Promise(resolve => setTimeout(resolve, 600));
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

app.get('/api/customers', verifyToken, async (req, res) => {
    try {
        const customers = await Customer.find({ userId: req.userId }).sort({ name: 1 });
        res.json(customers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/customers', verifyToken, async (req, res) => {
    try {
        const customer = await Customer.findOneAndUpdate(
            { userId: req.userId, rnc: req.body.rnc },
            { ...req.body, userId: req.userId },
            { upsert: true, new: true }
        );
        res.json(customer);
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
        const doc = await UserDocument.findOne({ _id: req.params.id, userId: req.userId });
        if (!doc) return res.status(404).json({ message: 'Documento no encontrado' });
        res.json({ id: doc._id.toString(), name: doc.name, type: doc.type, date: doc.createdAt, data: doc.data, mimeType: doc.mimeType });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/documents/:id', verifyToken, async (req, res) => {
    try {
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
        const { clientName, clientRnc, ncfType, items, subtotal, itbis, total } = req.body;
        const fullNcf = await getNextNcf(req.userId, ncfType, session, clientRnc);
        if (!fullNcf) throw new Error("No hay secuencias NCF disponibles.");
        const newInvoice = new Invoice({ userId: req.userId, clientName, clientRnc, ncfType, ncfSequence: fullNcf, items, subtotal, itbis, total });
        await newInvoice.save({ session });
        await Customer.findOneAndUpdate(
            { userId: req.userId, rnc: clientRnc },
            { lastInvoiceDate: new Date(), $set: { name: clientName } },
            { upsert: true, session }
        );
        await session.commitTransaction();
        session.endSession();
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
        invoices.forEach(inv => {
            const fechaComp = new Date(inv.date).toISOString().slice(0, 10).replace(/-/g, '');
            const rncCliente = (inv.clientRnc || '').replace(/[^\d]/g, '');
            const tipoId = rncCliente.length === 9 ? '1' : '2';
            const montoFact = (inv.subtotal || 0).toFixed(2);
            const itbisFact = (inv.itbis || 0).toFixed(2);
            const montoTotal = (inv.total || 0).toFixed(2);
            report += `${rncCliente}|${tipoId}|${inv.ncfSequence}|${inv.modifiedNcf || ''}|01|${fechaComp}||${montoFact}|${itbisFact}|0.00|0.00|0.00|0.00|0.00|0.00|${montoTotal}|0.00|0.00|0.00|0.00\n`;
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
        invoices.forEach(inv => {
            const fechaComp = new Date(inv.date).toISOString().slice(0, 10).replace(/-/g, '');
            const rncCliente = (inv.clientRnc || '').replace(/[^\d]/g, '');
            const tipoId = rncCliente.length === 9 ? '1' : '2';
            const montoFact = (inv.subtotal || 0).toFixed(2);
            const itbisFact = (inv.itbis || 0).toFixed(2);
            const montoTotal = (inv.total || 0).toFixed(2);
            report += `${rncCliente}|${tipoId}|${inv.ncfSequence}|${inv.modifiedNcf || ''}|01|${fechaComp}||${montoFact}|${itbisFact}|0.00|0.00|0.00|0.00|0.00|0.00|${montoTotal}|0.00|0.00|0.00|0.00\n`;
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
            report += `${rncLimpiado}|${tipoId}|${exp.category}|${exp.ncf}||${fecha}||${montoTotal}|0.00|${montoTotal}|${itbisPagado}|${itbisPagado}|||||||||\n`;
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
            report += `${rncLimpiado}|${tipoId}|${exp.category}|${exp.ncf}||${fecha}||${montoTotal}|0.00|${montoTotal}|${itbisPagado}|${itbisPagado}|||||||||\n`;
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
        const { clientName, clientRnc, clientPhone, items, subtotal, itbis, total, validUntil } = req.body;
        const quote = new Quote({
            userId: req.userId,
            clientName,
            clientRnc: (clientRnc || '').replace(/\D/g, '') || clientRnc || '',
            clientPhone,
            items: items || [],
            subtotal: subtotal || 0,
            itbis: itbis || 0,
            total: total || 0,
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
        const quote = await Quote.findOne({ _id: req.params.id, userId: req.userId });
        if (!quote) return res.status(404).json({ message: 'Cotización no encontrada' });
        if (quote.status === 'converted') return res.status(400).json({ message: 'No se puede editar una cotización ya facturada.' });

        const { clientName, clientRnc, clientPhone, items, subtotal, itbis, total, validUntil, status } = req.body;
        if (clientName !== undefined) quote.clientName = clientName;
        if (clientRnc !== undefined) quote.clientRnc = clientRnc;
        if (clientPhone !== undefined) quote.clientPhone = clientPhone;
        if (items !== undefined) quote.items = items;
        if (subtotal !== undefined) quote.subtotal = subtotal;
        if (itbis !== undefined) quote.itbis = itbis;
        if (total !== undefined) quote.total = total;
        if (validUntil !== undefined) quote.validUntil = new Date(validUntil);
        if (status !== undefined && ['draft', 'sent'].includes(status)) quote.status = status;
        quote.lastSavedAt = new Date();
        await quote.save();
        res.json({ ...quote.toObject(), id: quote._id.toString() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Convertir cotización a factura - marca como converted, asocia invoiceId, bloquea doble facturación
app.post('/api/quotes/:id/convert', verifyToken, async (req, res) => {
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
    res.json({
        plan: sub.plan,
        status: sub.status,
        expiryDate: endDate,
        daysRemaining: Math.max(0, diffDays),
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
