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

if (!MONGODB_URI) {
    console.error('❌ ERROR FATAL: MONGODB_URI no está definido en el archivo .env');
    process.exit(1);
}

mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ Conectado a MongoDB Atlas (LexisBill)'))
    .catch(err => {
        console.error('❌ Error de conexión MongoDB:', err);
        process.exit(1);
    });

mongoose.connection.on('connected', () => {
    console.log('Mongoose conectado al clúster.');
});

mongoose.connection.on('error', (err) => {
    console.log('Mongoose error de conexión:', err);
});

// --- 2. MODELOS (SCHEMAS) ---

// User Schema (Profesionales)
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
    paymentHistory: [{
        date: { type: Date, default: Date.now },
        amount: Number,
        reference: String
    }],
    createdAt: { type: Date, default: Date.now }
});

// NCF Settings Schema (NCF Batches/Lotes)
const ncfSettingsSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true }, // '31', '32', '34'
    series: { type: String, default: 'E' },
    initialNumber: { type: Number, required: true },
    finalNumber: { type: Number, required: true },
    currentValue: { type: Number, required: true },
    expiryDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true }
});

// Invoice Schema
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
    modifiedNcf: { type: String }, // Link to original NCF
    annulledBy: { type: String } // Link to Credit Note NCF
});

// Customer Schema (CRM)
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

// Index to ensure RNC unique per User for Upsert logic
customerSchema.index({ userId: 1, rnc: 1 }, { unique: true });

const User = mongoose.model('User', userSchema);
const NCFSettings = mongoose.model('NCFSettings', ncfSettingsSchema);
const Invoice = mongoose.model('Invoice', invoiceSchema);
const Customer = mongoose.model('Customer', customerSchema);

// --- 3. MIDDLEWARE DE SEGURIDAD (JWT) ---
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ message: 'No token provided' });

    jwt.verify(token.split(' ')[1], process.env.JWT_SECRET || 'secret_key_lexis_placeholder', async (err, decoded) => {
        if (err) return res.status(401).json({ message: 'Unauthorized' });

        // Subscription & Grace Period Check
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
            req.user = user; // Pass user object for efficiency
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
        for (let i = 0; i < 8; i++) {
            sum += parseInt(str[i]) * weights[i];
        }
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

// Customers (CRM & Import)
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
        const customerData = { ...req.body, userId: req.userId };
        const customer = await Customer.findOneAndUpdate(
            { userId: req.userId, rnc: req.body.rnc },
            customerData,
            { upsert: true, new: true }
        );
        res.json(customer);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/customers/import', verifyToken, async (req, res) => {
    try {
        const customers = req.body; // Array of items
        if (!Array.isArray(customers)) throw new Error("Formato de datos inválido");

        const ops = customers.map(c => ({
            updateOne: {
                filter: { userId: req.userId, rnc: c.rnc },
                update: { $set: { ...c, userId: req.userId } },
                upsert: true
            }
        }));

        const result = await Customer.bulkWrite(ops);
        res.json({
            success: true,
            message: `${result.upsertedCount + result.modifiedCount} clientes procesados.`,
            details: result
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/customers/:rnc/history', verifyToken, async (req, res) => {
    try {
        const invoices = await Invoice.find({
            userId: req.userId,
            clientRnc: req.params.rnc
        }).sort({ date: -1 }).limit(5);
        res.json(invoices);
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
            email,
            password: hashedPassword,
            name,
            rnc,
            profession,
            subscriptionStatus: status,
            expiryDate: new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000)
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
        const token = jwt.sign({ id: user._id, role: user.profession }, process.env.JWT_SECRET || 'secret_key_lexis_placeholder', { expiresIn: 86400 });
        res.status(200).json({ id: user._id, email: user.email, name: user.name, profession: user.profession, rnc: user.rnc, accessToken: token });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Tax Data
app.get('/api/rnc/:number', async (req, res) => {
    const { number } = req.params;
    if (!validateTaxId(number)) return res.status(400).json({ valid: false, message: 'Documento Inválido' });
    const mockDb = { "101010101": "JUAN PEREZ", "131888444": "LEXIS BILL SOLUTIONS S.R.L.", "40222222222": "DRA. MARIA RODRIGUEZ (DEMO)" };
    const name = mockDb[number] || "CONTRIBUYENTE ENCONTRADO";
    res.json({ valid: true, rnc: number, name, type: number.length === 9 ? 'JURIDICA' : 'FISICA' });
});

// NCF Settings
app.get('/api/ncf-settings', verifyToken, async (req, res) => {
    try {
        const settings = await NCFSettings.find({ userId: req.userId });
        res.json(settings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/ncf-settings', verifyToken, async (req, res) => {
    try {
        const { type, initialNumber, finalNumber, expiryDate } = req.body;
        const newBatch = new NCFSettings({
            userId: req.userId,
            type,
            initialNumber,
            finalNumber,
            currentValue: initialNumber - 1,
            expiryDate: new Date(expiryDate)
        });
        await newBatch.save();
        res.status(201).json(newBatch);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Invoices & Credit Notes
app.get('/api/invoices', verifyToken, async (req, res) => {
    try {
        const invoices = await Invoice.find({ userId: req.userId }).sort({ date: -1 });
        res.json(invoices);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/invoices', verifyToken, async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { clientName, clientRnc, ncfType, items, subtotal, itbis, total } = req.body;
        const fullNcf = await getNextNcf(req.userId, ncfType, session);
        if (!fullNcf) throw new Error("No hay secuencias NCF disponibles.");
        const newInvoice = new Invoice({ userId: req.userId, clientName, clientRnc, ncfType, ncfSequence: fullNcf, items, subtotal, itbis, total });
        await newInvoice.save({ session });

        // Update Customer Last Invoice Date
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

app.post('/api/invoices/:id/credit-note', verifyToken, async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const originalInvoice = await Invoice.findOne({ _id: req.params.id, userId: req.userId }).session(session);
        if (!originalInvoice) throw new Error("Factura no encontrada");
        if (originalInvoice.status === 'modified') throw new Error("Ya posee una nota de crédito");

        const creditNoteNcf = await getNextNcf(req.userId, "34", session);
        if (!creditNoteNcf) throw new Error("No hay secuencias e-CF 34 disponibles.");

        const creditNote = new Invoice({
            userId: req.userId, clientName: originalInvoice.clientName, clientRnc: originalInvoice.clientRnc,
            ncfType: "34", ncfSequence: creditNoteNcf, items: originalInvoice.items,
            subtotal: originalInvoice.subtotal, itbis: originalInvoice.itbis, total: originalInvoice.total,
            modifiedNcf: originalInvoice.ncfSequence, status: "paid"
        });

        originalInvoice.status = 'modified';
        originalInvoice.annulledBy = creditNoteNcf;

        await creditNote.save({ session });
        await originalInvoice.save({ session });
        await session.commitTransaction();
        session.endSession();
        res.json({ message: "Nota de Crédito generada", ncf: creditNoteNcf });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({ error: error.message });
    }
});

// --- Reports & DGII ---
app.get('/api/reports/summary', verifyToken, async (req, res) => {
    try {
        const { month, year } = req.query; // YYYY-MM
        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 0, 23, 59, 59);

        const invoices = await Invoice.find({
            userId: req.userId,
            date: { $gte: start, $lte: end }
        });

        const summary = invoices.reduce((acc, inv) => {
            acc.subtotal += inv.subtotal;
            acc.itbis += inv.itbis;
            acc.total += inv.total;
            acc.count += 1;
            return acc;
        }, { subtotal: 0, itbis: 0, total: 0, count: 0 });

        res.json({ ...summary, month, year });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/reports/607', verifyToken, async (req, res) => {
    try {
        const { month, year } = req.query;
        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 0, 23, 59, 59);

        const invoices = await Invoice.find({
            userId: req.userId,
            date: { $gte: start, $lte: end }
        }).sort({ date: 1 });

        // DGII 607 Format (Pipe Delimited)
        // Fields: RNC/Cédula | Tipo ID | NCF | NCF Modificado | Fecha (YYYYMMDD) | ITBIS | Monto Facturado | Total
        let report = "RNC_CEDULA|TIPO_ID|NCF|NCF_MODIFICADO|FECHA|ITBIS|MONTO_FACTURADO|TOTAL\n";

        invoices.forEach(inv => {
            const cleanRnc = inv.clientRnc.replace(/[^0-9]/g, '');
            const tipoId = cleanRnc.length === 9 ? '1' : '2'; // 1=RNC, 2=Cédula
            const fecha = new Date(inv.date).toISOString().slice(0, 10).replace(/-/g, '');
            const ncfModificado = inv.modifiedNcf || "";

            report += `${cleanRnc}|${tipoId}|${inv.ncfSequence}|${ncfModificado}|${fecha}|${inv.itbis.toFixed(2)}|${inv.subtotal.toFixed(2)}|${inv.total.toFixed(2)}\n`;
        });

        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename=607_${year}${month.padStart(2, '0')}.txt`);
        res.send(report);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- Subscription & Payments ---
app.get('/api/subscription/status', verifyToken, (req, res) => {
    const user = req.user;
    const now = new Date();
    const expiry = new Date(user.expiryDate);
    const graceCutoff = new Date(expiry);
    graceCutoff.setDate(graceCutoff.getDate() + 5);

    const diffTime = expiry - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Grace period calculation
    const graceDiffTime = graceCutoff - now;
    const graceDaysRemaining = Math.ceil(graceDiffTime / (1000 * 60 * 60 * 24));

    let status = 'Activo';
    if (diffDays <= 7 && diffDays > 0) status = 'VencePronto';
    if (diffDays <= 0 && graceDaysRemaining >= 0) status = 'Gracia';
    if (graceDaysRemaining < 0) status = 'Bloqueado';

    res.json({
        expiryDate: user.expiryDate,
        daysRemaining: diffDays,
        graceDaysRemaining: graceDaysRemaining,
        status: status,
        subscriptionStatus: user.subscriptionStatus
    });
});

app.post('/api/payments/webhook', async (req, res) => {
    try {
        const { userId, amount, reference } = req.body;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.subscriptionStatus = 'Activo';

        const now = new Date();
        const baseDate = user.expiryDate > now ? user.expiryDate : now;
        user.expiryDate = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000);

        user.paymentHistory.push({
            date: new Date(),
            amount: amount || 950,
            reference: reference || 'Renovación Automática'
        });

        await user.save();
        res.json({ success: true, newExpiry: user.expiryDate });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/payments/history', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('paymentHistory');
        res.json(user.paymentHistory);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
