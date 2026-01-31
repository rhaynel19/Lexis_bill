const path = require('path');
// Load local env if exists (only for local testing)
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });
require('dotenv').config();

// --- SEGURIDAD: JWT_SECRET obligatorio - fallar arranque si no existe ---
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
    console.error('❌ FATAL: JWT_SECRET debe estar definido y tener al menos 32 caracteres.');
    process.exit(1);
}

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(cookieParser());

// CORS con credenciales para cookies HttpOnly
app.use(cors({
    origin: process.env.CORS_ORIGIN || true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// --- 1. CONFIGURACIÓN DE CONEXIÓN ---
const MONGODB_URI = process.env.MONGODB_URI;

// Conexión Singleton para Vercel Serverless
let cachedDb = null;

const connectDB = async () => {
    if (mongoose.connection.readyState === 1) return mongoose.connection;

    if (!MONGODB_URI) {
        console.error('❌ MONGODB_URI no definido');
        throw new Error('MONGODB_URI_MISSING');
    }

    try {
        console.log('=> Intentando conectar a MongoDB...');
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
        console.error('❌ Error fatal de conexión:', err.message);
        res.status(503).json({
            message: 'Error de conexión fiscal con la base de datos.',
            error: err.message,
            code: err.name,
            hint: 'Asegúrate de que el MONGODB_URI sea correcto y la IP esté permitida en Atlas.'
        });
    }
});

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
const NCFSettings = mongoose.models.NCFSettings || mongoose.model('NCFSettings', ncfSettingsSchema);
const Invoice = mongoose.models.Invoice || mongoose.model('Invoice', invoiceSchema);
const Customer = mongoose.models.Customer || mongoose.model('Customer', customerSchema);
const SupportTicket = mongoose.models.SupportTicket || mongoose.model('SupportTicket', supportTicketSchema);
const Expense = mongoose.models.Expense || mongoose.model('Expense', expenseSchema);
const Quote = mongoose.models.Quote || mongoose.model('Quote', quoteSchema);

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

            const now = new Date();
            const gracePeriodLimit = new Date(user.expiryDate);
            gracePeriodLimit.setDate(gracePeriodLimit.getDate() + 5);

            if (now > gracePeriodLimit) {
                return res.status(403).json({
                    message: 'Suscripción bloqueada. Periodo de gracia finalizado.',
                    code: 'SUBSCRIPTION_LOCKED'
                });
            }

            req.userId = decoded.id;
            req.user = user;
            next();
        } catch (dbErr) {
            res.status(500).json({ error: 'Error verificando suscripción' });
        }
    });
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
    console.log(`[validateTaxId] Input: "${id}", Clean: "${str}", Length: ${str.length}`);
    if (str.length === 9) {
        let sum = 0;
        const weights = [7, 9, 8, 6, 5, 4, 3, 2];
        for (let i = 0; i < 8; i++) sum += parseInt(str[i]) * weights[i];
        let remainder = sum % 11;
        let digit = remainder === 0 ? 2 : (remainder === 1 ? 1 : 11 - remainder);
        const isValid = digit === parseInt(str[8]);
        console.log(`[validateTaxId] 9-digits: Sum=${sum}, Remainder=${remainder}, ExpectedDigit=${digit}, ActualDigit=${str[8]}, Valid=${isValid}`);
        return isValid;
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
        const isValid = check === parseInt(str[10]);
        console.log(`[validateTaxId] 11-digits: Sum=${sum}, CheckSum=${sum % 10}, ExpectedDigit=${check}, ActualDigit=${str[10]}, Valid=${isValid}`);
        return isValid;
    }
    return false;
}

// --- 5. ENDPOINTS ---

// Health & Root
app.get('/api/health', (req, res) => {
    res.json({
        status: 'UP',
        timestamp: new Date().toISOString(),
        database: mongoose.connection.readyState === 1 ? 'UP' : 'DOWN',
        environment: process.env.NODE_ENV || 'production',
        engine: 'Vercel Serverless (Unified)'
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
        console.log(`[AUTH] Registering user: ${email}`);

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
            suggestedFiscalName: req.body.suggestedName || ""
        });

        await newUser.save();
        console.log(`[AUTH] User created successfully: ${email}`);
        res.status(201).json({ message: 'Usuario registrado exitosamente', plan: status });
    } catch (error) {
        console.error(`[AUTH] Error in registration:`, error);
        if (error.code === 11000) {
            return res.status(400).json({ message: 'El correo o el RNC ya están registrados.' });
        }
        res.status(500).json({ message: 'Error interno al crear el usuario', error: error.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log(`[AUTH] Login attempt: ${email}`);

        const user = await User.findOne({ email });
        if (!user) {
            console.warn(`[AUTH] Login failed: User not found (${email})`);
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        const passwordIsValid = await bcrypt.compare(password, user.password);
        if (!passwordIsValid) {
            console.warn(`[AUTH] Login failed: Invalid password (${email})`);
            return res.status(401).json({ message: 'Contraseña inválida' });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret_key_lexis_placeholder', { expiresIn: 86400 });

        // Cookie HttpOnly para que el middleware permita acceso a rutas protegidas
        res.cookie('lexis_auth', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 86400 * 1000, // 24h en ms
            path: '/'
        });

        console.log(`[AUTH] Login successful: ${email}`);
        res.status(200).json({
            id: user._id,
            email: user.email,
            name: user.name,
            profession: user.profession,
            rnc: user.rnc,
            fiscalStatus: {
                suggested: user.suggestedFiscalName,
                confirmed: user.confirmedFiscalName
            }
        });
    } catch (error) {
        console.error(`[AUTH] Error in login:`, error);
        res.status(500).json({ message: 'Error interno en el servidor', error: error.message });
    }
});

// Logout: limpiar cookie HttpOnly
app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('lexis_auth', { path: '/', httpOnly: true });
    res.json({ success: true });
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

app.get('/api/invoices', verifyToken, async (req, res) => {
    try {
        const invoices = await Invoice.find({ userId: req.userId }).sort({ date: -1 });
        res.json(invoices);
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

// --- REPORTE 607 (VENTAS) - Formato oficial DGII Norma 06-2018 / 07-2018 ---
// Estructura: RNC|TipoId|NCF|NCFModificado|TipoIngreso|FechaComprobante|FechaRetencion|
// MontoFacturado|ITBISFacturado|ITBISRetenido|ITBISPercibido|RetencionRenta|ISR|ISC|OtrosImpuestos|MontoTotal|
// ITBIS3ros|Percepciones|Intereses|IngresosTerceros
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

        res.setHeader('Content-Type', 'text/plain; charset=iso-8859-1');
        res.setHeader('Content-Disposition', `attachment; filename=607_${rncEmisor}_${periodo}.txt`);
        res.send(report);
    } catch (error) {
        console.error('[607] Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// --- GESTIÓN DE GASTOS (606) ---
app.get('/api/expenses', verifyToken, async (req, res) => {
    try {
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

// --- REPORTE 606 (COMPRAS/GASTOS) - Formato DGII - Fuente única: Expenses ---
// Validaciones: NCF suplidor, categoría 01-11, campos obligatorios
const DGII_EXPENSE_CATEGORIES = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11'];

function isValidNcfStructure(ncf) {
    if (!ncf || typeof ncf !== 'string') return false;
    const clean = ncf.replace(/[^\dA-Za-z]/g, '');
    return clean.length >= 11 && (clean.startsWith('B') || clean.startsWith('E'));
}

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

        const errores = [];
        expenses.forEach((exp, idx) => {
            if (!exp.supplierName || !exp.supplierRnc || !exp.ncf || exp.amount == null) {
                errores.push(`Gasto ${idx + 1}: Faltan campos obligatorios (suplidor, RNC, NCF, monto).`);
            }
            if (!DGII_EXPENSE_CATEGORIES.includes(exp.category)) {
                errores.push(`Gasto ${idx + 1}: Categoría ${exp.category} inválida. Use códigos 01-11 DGII.`);
            }
            if (!isValidNcfStructure(exp.ncf)) {
                errores.push(`Gasto ${idx + 1}: NCF del suplidor "${exp.ncf}" no tiene formato válido.`);
            }
        });

        if (errores.length > 0) {
            return res.status(400).json({ message: 'Errores fiscales. Corrija antes de exportar.', details: errores });
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

        res.setHeader('Content-Type', 'text/plain; charset=iso-8859-1');
        res.setHeader('Content-Disposition', `attachment; filename=606_${rncEmisor}_${periodo}.txt`);
        res.send(report);
    } catch (error) {
        console.error('[606] Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// --- COTIZACIONES (Quotes) - MongoDB, no localStorage ---
app.get('/api/quotes', verifyToken, async (req, res) => {
    try {
        const quotes = await Quote.find({ userId: req.userId }).sort({ lastSavedAt: -1 });
        res.json(quotes.map(q => ({
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
        })));
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
    const user = req.user;
    const now = new Date();
    const expiry = new Date(user.expiryDate);
    const diffDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    res.json({ expiryDate: user.expiryDate, daysRemaining: diffDays, status: user.subscriptionStatus });
});

// Final export for Vercel
module.exports = app;

// Local startup for 'node api/index.js'
if (require.main === module) {
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
        console.log(`🚀 Lexis Bill Backend (Unified) running at http://localhost:${PORT}`);
    });
}
