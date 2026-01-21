const path = require('path');
// Load local env if exists (only for local testing)
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(cors());

// --- 1. CONFIGURACIÓN DE CONEXIÓN ---
const MONGODB_URI = process.env.MONGODB_URI;

// Conexión Singleton para Vercel Serverless
let cachedDb = null;

const connectDB = async () => {
    if (cachedDb && mongoose.connection.readyState === 1) {
        return cachedDb;
    }

    if (!MONGODB_URI) {
        console.error('❌ MONGODB_URI no definido');
        return null;
    }

    console.log('=> Iniciando nueva conexión a MongoDB...');
    try {
        const db = await mongoose.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
        });
        cachedDb = db;
        console.log('✅ Conexión exitosa');
        return db;
    } catch (err) {
        console.error('❌ Error de conexión:', err.message);
        return null;
    }
};

// Middleware para asegurar conexión en cada petición (Vercel standard)
app.use(async (req, res, next) => {
    await connectDB();
    next();
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

// Avoid "OverwriteModelError" in serverless environments
const User = mongoose.models.User || mongoose.model('User', userSchema);
const NCFSettings = mongoose.models.NCFSettings || mongoose.model('NCFSettings', ncfSettingsSchema);
const Invoice = mongoose.models.Invoice || mongoose.model('Invoice', invoiceSchema);
const Customer = mongoose.models.Customer || mongoose.model('Customer', customerSchema);
const SupportTicket = mongoose.models.SupportTicket || mongoose.model('SupportTicket', supportTicketSchema);

// --- 3. MIDDLEWARE ---
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ message: 'No token provided' });

    jwt.verify(token.split(' ')[1], process.env.JWT_SECRET || 'secret_key_lexis_placeholder', async (err, decoded) => {
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
async function getNextNcf(userId, type, session) {
    const activeBatch = await NCFSettings.findOneAndUpdate(
        {
            userId,
            type,
            isActive: true,
            $expr: { $lt: ["$currentValue", "$finalNumber"] }
        },
        { $inc: { currentValue: 1 } },
        { new: true, session }
    );

    if (!activeBatch) return null;

    const paddedSeq = activeBatch.currentValue.toString().padStart(10, '0');
    return `${activeBatch.series}${type}${paddedSeq}`;
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
        const hashedPassword = await bcrypt.hash(password, 12);
        const expiryDays = plan === 'pro' ? 30 : 15;
        const status = plan === 'pro' ? 'Activo' : 'Trial';

        const newUser = new User({
            email, password: hashedPassword, name, rnc, profession,
            subscriptionStatus: status,
            expiryDate: new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000),
            // Obtener sugerencia si el RNC fue validado en el frontend
            suggestedFiscalName: req.body.suggestedName || ""
        });
        await newUser.save();
        res.status(201).json({ message: 'Usuario registrado exitosamente', plan: status });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
        const passwordIsValid = await bcrypt.compare(password, user.password);
        if (!passwordIsValid) return res.status(401).json({ message: 'Contraseña inválida' });
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret_key_lexis_placeholder', { expiresIn: 86400 });
        res.status(200).json({
            id: user._id,
            email: user.email,
            name: user.name,
            profession: user.profession,
            rnc: user.rnc,
            accessToken: token,
            fiscalStatus: {
                suggested: user.suggestedFiscalName,
                confirmed: user.confirmedFiscalName
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
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

// Rest of endpoints (Invoices, Customers, etc.)
app.get('/api/rnc/:number', async (req, res) => {
    const { number } = req.params;
    if (!validateTaxId(number)) return res.status(400).json({ valid: false, message: 'Documento Inválido' });
    const mockDb = { "101010101": "JUAN PEREZ", "131888444": "LEXIS BILL SOLUTIONS S.R.L.", "40222222222": "DRA. MARIA RODRIGUEZ (DEMO)" };
    const name = mockDb[number] || "CONTRIBUYENTE ENCONTRADO";
    res.json({ valid: true, rnc: number, name, type: number.length === 9 ? 'JURIDICA' : 'FISICA' });
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
            "40222222222": "DRA. MARIA RODRIGUEZ (DEMO)"
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
        const fullNcf = await getNextNcf(req.userId, ncfType, session);
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

        const totalFacturado = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
        const totalItbis = invoices.reduce((sum, inv) => sum + (inv.itbis || 0), 0);

        res.json({
            month,
            year,
            totalFacturado,
            totalItbis,
            invoiceCount: invoices.length,
            confirmedName: req.user.confirmedFiscalName
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/reports/607', verifyToken, async (req, res) => {
    // Bloqueo Inteligente
    if (!req.user.confirmedFiscalName) {
        return res.status(403).json({ message: 'Confirma tu nombre fiscal para generar reportes.' });
    }

    try {
        const { month, year } = req.query;
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        const invoices = await Invoice.find({
            userId: req.userId,
            date: { $gte: startDate, $lte: endDate },
            status: { $ne: 'cancelled' }
        });

        // Generar formato TXT simplificado (Encabezado + Líneas)
        let report = `607|${req.user.rnc}|${year}${month.toString().padStart(2, '0')}|${invoices.length}\n`;

        invoices.forEach(inv => {
            const fecha = new Date(inv.date).toISOString().slice(0, 10).replace(/-/g, '');
            report += `${inv.clientRnc}|01|${inv.ncfSequence}||${fecha}||${inv.subtotal.toFixed(2)}|${inv.itbis.toFixed(2)}|||||||||\n`;
        });

        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename=607_${req.user.rnc}_${year}${month}.txt`);
        res.send(report);

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
