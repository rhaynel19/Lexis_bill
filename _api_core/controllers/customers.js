
const { Customer, Invoice } = require('../models');
const { sanitizeString, sanitizeEmail } = require('../utils/sanitizers');
const { isValidObjectId, validateTaxId } = require('../utils/validators');
const { safeErrorMessage } = require('../utils/helpers');
const { fetchRncFromExternalApi } = require('../services/dgii');

// Mock DB for local fallback (copied from index.js)
const RNC_MOCK_DB = {
    '101010101': 'JUAN PEREZ',
    '131888444': 'SOLUCIONES TECNOLOGICAS S.R.L.',
    '40222222222': 'DRA. MARIA RODRIGUEZ (DEMO)',
    '130851255': 'ASOCIACION DE ESPECIALISTAS FISCALES',
    '22301650929': 'ASOCIACION PROFESIONAL DE SANTO DOMINGO'
};

const getCustomers = async (req, res) => {
    try {
        const limit = Math.min(2000, Math.max(1, parseInt(req.query.limit, 10) || 500));
        const customers = await Customer.find({ userId: req.userId }, "name rnc phone email lastInvoiceDate")
            .sort({ name: 1 })
            .limit(limit)
            .lean();
        res.json(customers);
    } catch (error) {
        res.status(500).json({ message: safeErrorMessage(error) });
    }
};

const getCustomerHistory = async (req, res) => {
    try {
        const rnc = (req.params.rnc || '').replace(/[^0-9]/g, '');
        if (!rnc) return res.status(400).json({ message: 'RNC requerido' });
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
        const invoices = await Invoice.find({
            userId: req.userId,
            clientRnc: rnc,
            status: { $nin: ['cancelled'] }
        })
            .sort({ date: -1 })
            .limit(limit)
            .lean();
        res.json(invoices);
    } catch (error) {
        res.status(500).json({ message: safeErrorMessage(error) });
    }
};

const createCustomer = async (req, res) => {
    try {
        const data = req.validatedBody || req.body;
        const sanitizedData = {
            name: sanitizeString(data.name, 200),
            rnc: sanitizeString(data.rnc, 20).replace(/[^0-9]/g, ''),
            phone: sanitizeString(data.phone, 20).replace(/[^0-9+\-\s]/g, ''),
            email: sanitizeEmail(data.email),
            address: sanitizeString(data.address, 300),
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
        res.status(500).json({ message: safeErrorMessage(error) });
    }
};

const updateCustomer = async (req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({ message: 'ID de cliente inválido' });
        }

        const data = req.validatedBody || req.body;
        const sanitizedData = {
            name: sanitizeString(data.name, 200),
            rnc: sanitizeString(data.rnc, 20).replace(/[^0-9]/g, ''),
            phone: sanitizeString(data.phone, 20).replace(/[^0-9+\-\s]/g, ''),
            email: sanitizeEmail(data.email),
            address: sanitizeString(data.address, 300),
        };

        if (!sanitizedData.name || !sanitizedData.rnc) {
            return res.status(400).json({ message: 'Nombre y RNC son requeridos' });
        }
        if (sanitizedData.rnc.length < 9 || sanitizedData.rnc.length > 11) {
            return res.status(400).json({ message: 'RNC inválido (9 u 11 dígitos).' });
        }

        const existingByRnc = await Customer.findOne({
            userId: req.userId,
            rnc: sanitizedData.rnc,
            _id: { $ne: req.params.id }
        }).lean();
        if (existingByRnc) {
            return res.status(409).json({ message: 'Ya existe otro cliente con ese RNC.' });
        }

        const updated = await Customer.findOneAndUpdate(
            { _id: req.params.id, userId: req.userId },
            sanitizedData,
            { new: true }
        );
        if (!updated) return res.status(404).json({ message: 'Cliente no encontrado' });

        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: safeErrorMessage(error) });
    }
};

const deleteCustomer = async (req, res) => {
    try {
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
        res.status(500).json({ message: safeErrorMessage(error) });
    }
};

const importCustomers = async (req, res) => {
    try {
        const data = req.body;
        if (!Array.isArray(data)) {
            return res.status(400).json({ message: 'Se espera un arreglo de clientes.' });
        }
        const MAX_ROWS = 20000;
        if (data.length > MAX_ROWS) {
            return res.status(400).json({ message: `Máximo ${MAX_ROWS.toLocaleString('es-DO')} clientes por importación.` });
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
                errors.push(`Fila ${i + 2}: RNC inválido.`);
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
                await Customer.findOneAndUpdate({ userId: req.userId, rnc }, sanitized, { upsert: true });
                if (existing) updated++; else imported++;
            } catch (err) {
                errors.push(`Fila ${i + 2}: ${err.message}`);
            }
        }

        res.json({ 
            message: `${imported + updated} clientes procesados.`, 
            imported, 
            updated, 
            errors: errors.slice(0, 10) 
        });
    } catch (error) {
        res.status(500).json({ message: safeErrorMessage(error) });
    }
};

const lookupRnc = async (req, res) => {
    try {
        const { number } = req.params;
        const cleanNumber = number.replace(/\D/g, "");
        if (!validateTaxId(cleanNumber)) return res.status(400).json({ valid: false, message: 'Documento Inválido' });

        const external = await fetchRncFromExternalApi(cleanNumber);
        if (external) return res.json(external);

        let name = RNC_MOCK_DB[cleanNumber] || '';
        if (String(name).toUpperCase().trim() === 'CONTRIBUYENTE REGISTRADO') name = '';
        res.json({ valid: true, rnc: cleanNumber, name, type: cleanNumber.length === 9 ? 'JURIDICA' : 'FISICA' });
    } catch (error) {
        res.status(500).json({ message: safeErrorMessage(error) });
    }
};

const validateRnc = async (req, res) => {
    try {
        const { rnc } = req.body;
        const cleanRnc = String(rnc || '').replace(/[^0-9]/g, '');
        if (!cleanRnc || cleanRnc.length < 9) return res.status(400).json({ valid: false, message: 'RNC inválido' });
        
        const isValid = validateTaxId(cleanRnc);
        res.json({ valid: isValid, rnc: cleanRnc });
    } catch (error) {
        res.status(500).json({ message: safeErrorMessage(error) });
    }
};

const getClientRisk = async (req, res) => {
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
        res.status(500).json({ message: safeErrorMessage(e) });
    }
};

module.exports = {
    getCustomers,
    getCustomerHistory,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    importCustomers,
    lookupRnc,
    validateRnc,
    getClientRisk
};

