const mongoose = require('mongoose');
const { 
    Invoice, Customer, NCFSettings, User, SupportTicket, 
    InvoiceDraft, UserServices, UserDocument 
} = require('../models');
const { log } = require('../models');
const { safeErrorMessage } = require('../utils/helpers');
const { sanitizeString } = require('../utils/sanitizers');
const { isValidObjectId } = require('../utils/validators');
const { fetchRncFromExternalApi } = require('../services/dgii');

exports.getHealth = async (req, res) => {
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
        version: '1.0.5',
        checks: {
            database: checks.database,
            memory: memUsage,
            jwtConfigured: checks.env.jwt,
            mongodbConfigured: checks.env.mongodb,
            sentryConfigured: checks.env.sentry
        }
    });
};

exports.getStatus = async (req, res) => {
    res.json({
        mongodb: mongoose.connection.readyState === 1 ? 'CONNECTED' : 'DISCONNECTED',
        uri_exists: !!process.env.MONGODB_URI,
        version: '1.0.5',
        timestamp: new Date().toISOString()
    });
};

exports.getDashboardStats = async (req, res) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.userId);
        const now = new Date();
        const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

        const [currentMonthAgg, prevMonthAgg, porCobrarAgg, chartAgg, clientCount] = await Promise.all([
            Invoice.aggregate([
                { $match: { userId: userId, date: { $gte: startOfCurrentMonth, $lte: endOfCurrentMonth }, status: { $ne: 'cancelled' } } },
                {
                    $group: {
                        _id: null,
                        subtotal: { $sum: { $cond: [{ $in: ['$ncfType', ['04', '34']] }, { $multiply: ['$subtotal', -1] }, '$subtotal'] } },
                        revenue: { $sum: { $cond: [{ $in: ['$ncfType', ['04', '34']] }, { $multiply: ['$total', -1] }, '$total'] } },
                        count: { $sum: 1 }
                    }
                }
            ]),
            Invoice.aggregate([
                { $match: { userId: userId, date: { $gte: startOfPrevMonth, $lte: endOfPrevMonth }, status: { $ne: 'cancelled' } } },
                { $group: { _id: null, revenue: { $sum: { $cond: [{ $in: ['$ncfType', ['04', '34']] }, { $multiply: ['$total', -1] }, '$total'] } }, count: { $sum: 1 } } }
            ]),
            Invoice.aggregate([
                { $match: { userId, status: { $ne: 'cancelled' }, estadoPago: { $in: ['pendiente', 'parcial'] }, ncfType: { $nin: ['04', '34'] } } },
                { $group: { _id: null, count: { $sum: 1 }, totalPorCobrar: { $sum: '$balancePendiente' } } }
            ]),
            Invoice.aggregate([
                { $match: { userId, status: { $ne: 'cancelled' } } },
                { $project: { year: { $year: '$date' }, month: { $month: '$date' }, total: { $cond: [{ $in: ['$ncfType', ['04', '34']] }, { $multiply: ['$total', -1] }, '$total'] } } },
                { $group: { _id: { year: '$year', month: '$month' }, total: { $sum: '$total' } } },
                { $sort: { '_id.year': 1, '_id.month': 1 } }
            ]),
            Invoice.aggregate([
                { $match: { userId } },
                { $group: { _id: '$clientRnc' } },
                { $count: 'total' }
            ])
        ]);

        const monthlyRevenue = (currentMonthAgg[0] && currentMonthAgg[0].subtotal) || 0;
        const totalRevenue = (currentMonthAgg[0] && currentMonthAgg[0].revenue) || 0;
        const previousMonthRevenue = (prevMonthAgg[0] && prevMonthAgg[0].revenue) || 0;
        const totalClients = (clientCount[0] && clientCount[0].total) || 0;
        const porCobrarRow = porCobrarAgg[0];

        const byMonth = new Map();
        chartAgg.forEach((r) => byMonth.set(`${r._id.year}-${String(r._id.month).padStart(2, '0')}`, r.total));
        const last4MonthsData = [];
        const monthLabels = [];
        for (let i = 3; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            last4MonthsData.push(byMonth.get(key) || 0);
            monthLabels.push(d.toLocaleDateString('es-DO', { month: 'short' }));
        }

        res.json({
            monthlyRevenue,
            totalRevenue,
            previousMonthRevenue,
            totalClients,
            totalPorCobrar: (porCobrarRow && porCobrarRow.totalPorCobrar) || 0,
            chartData: last4MonthsData,
            monthLabels
        });
    } catch (e) {
        res.status(500).json({ message: safeErrorMessage(e) });
    }
};

exports.getAutofillSuggestions = async (req, res) => {
    try {
        const q = (req.query.q || '').trim().toLowerCase();
        const userId = req.userId;
        const result = { clients: [], services: [] };

        const clients = await Invoice.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(userId) } },
            { $group: { _id: '$clientRnc', name: { $first: '$clientName' }, count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);
        result.clients = clients.map(c => ({ name: c.name, rnc: c._id }));

        const services = await Invoice.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(userId) } },
            { $unwind: '$items' },
            { $group: { _id: '$items.description', price: { $avg: '$items.price' }, count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);
        result.services = services.map(s => ({ description: s._id, price: Math.round(s.price) }));

        res.json(result);
    } catch (e) {
        res.status(500).json({ message: safeErrorMessage(e) });
    }
};

exports.getNcfSettings = async (req, res) => {
    try {
        const settings = await NCFSettings.find({ userId: req.userId }).sort({ type: 1 });
        res.json(settings);
    } catch (error) {
        res.status(500).json({ message: safeErrorMessage(error) });
    }
};

exports.saveNcfSettings = async (req, res) => {
    try {
        const { type, sequenceType, initialNumber, finalNumber, expiryDate } = req.body;
        const series = sequenceType === 'traditional' ? 'B' : 'E';
        await NCFSettings.updateMany({ userId: req.userId, type, series, isActive: true }, { isActive: false });
        const newSetting = new NCFSettings({
            userId: req.userId, type, series, sequenceType: sequenceType || 'electronic',
            initialNumber, finalNumber, currentValue: initialNumber,
            expiryDate: new Date(expiryDate), isActive: true
        });
        await newSetting.save();
        res.status(201).json(newSetting);
    } catch (error) {
        res.status(500).json({ message: safeErrorMessage(error) });
    }
};

exports.updateNcfSettings = async (req, res) => {
    try {
        const { initialNumber, finalNumber, expiryDate } = req.body;
        const setting = await NCFSettings.findOne({ _id: req.params.id, userId: req.userId });
        if (!setting) {
            return res.status(404).json({ error: 'Lote no encontrado.' });
        }
        
        let updates = {};
        
        // Sólo permite cambiar el inicial si no se ha emitido ningún comprobante aún
        if (setting.currentValue === setting.initialNumber) {
            if (initialNumber !== undefined && initialNumber > 0) {
                updates.initialNumber = initialNumber;
                updates.currentValue = initialNumber;
            }
        }
        
        if (finalNumber !== undefined) {
            if (finalNumber < setting.currentValue) {
                return res.status(400).json({ message: 'El límite numérico final no puede ser menor a la secuencia actual.' });
            }
            updates.finalNumber = finalNumber;
        }
        
        if (expiryDate) {
            updates.expiryDate = new Date(expiryDate);
        }
        
        if (Object.keys(updates).length > 0) {
            await NCFSettings.updateOne({ _id: req.params.id, userId: req.userId }, { $set: updates });
        }
        
        res.status(200).json({ success: true, message: 'Lote actualizado.' });
    } catch (error) {
        res.status(500).json({ message: safeErrorMessage(error) });
    }
};

exports.deleteNcfSettings = async (req, res) => {
    try {
        const setting = await NCFSettings.findOne({ _id: req.params.id, userId: req.userId });
        if (!setting || setting.currentValue !== setting.initialNumber) {
            return res.status(400).json({ error: 'No se puede borrar un lote en uso.' });
        }
        await NCFSettings.deleteOne({ _id: req.params.id, userId: req.userId });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: safeErrorMessage(error) });
    }
};

exports.getServices = async (req, res) => {
    try {
        const doc = await UserServices.findOne({ userId: req.userId });
        res.json(doc?.services || []);
    } catch (e) {
        res.status(500).json({ message: safeErrorMessage(e) });
    }
};

exports.updateServices = async (req, res) => {
    try {
        const services = Array.isArray(req.body.services) ? req.body.services.slice(0, 50) : [];
        await UserServices.findOneAndUpdate({ userId: req.userId }, { services, updatedAt: new Date() }, { upsert: true, new: true });
        res.json({ services });
    } catch (e) {
        res.status(500).json({ message: safeErrorMessage(e) });
    }
};

exports.getDocuments = async (req, res) => {
    try {
        const docs = await UserDocument.find({ userId: req.userId }).sort({ createdAt: -1 }).limit(100);
        res.json(docs);
    } catch (e) {
        res.status(500).json({ message: safeErrorMessage(e) });
    }
};

exports.uploadDocument = async (req, res) => {
    try {
        const { name, type, data } = req.body;
        const doc = new UserDocument({ userId: req.userId, name, type, data });
        await doc.save();
        res.status(201).json(doc);
    } catch (e) {
        res.status(500).json({ message: safeErrorMessage(e) });
    }
};

/** POST /api/validate-rnc  y  GET /api/rnc/:number — Público. Valida un RNC/Cédula contra API DGII. */
exports.validateRnc = async (req, res) => {
    try {
        // Soporta GET /rnc/:number  y  POST /validate-rnc { rnc }
        const raw = req.params?.number || req.body?.rnc;
        if (!raw || typeof raw !== 'string') {
            return res.status(400).json({ valid: false, error: 'RNC requerido.' });
        }

        const cleanRnc = raw.replace(/\D/g, '');
        if (cleanRnc.length !== 9 && cleanRnc.length !== 11) {
            return res.status(400).json({ valid: false, error: 'El RNC debe tener 9 dígitos o la Cédula 11 dígitos.' });
        }

        // Si no hay URL externa configurada, responder con bypass informativo
        if (!process.env.DGII_RNC_API_URL) {
            const type = cleanRnc.length === 9 ? 'JURIDICA' : 'FISICA';
            log.warn({ rnc: cleanRnc }, 'DGII_RNC_API_URL not set — RNC validation bypassed');
            return res.json({
                valid: true,
                rnc: cleanRnc,
                name: type === 'FISICA' ? 'Persona Física' : 'Empresa Registrada',
                type,
                bypassed: true
            });
        }

        const result = await fetchRncFromExternalApi(cleanRnc);

        if (!result) {
            return res.json({ valid: false, rnc: cleanRnc, error: 'RNC no encontrado en el registro fiscal.' });
        }

        return res.json(result);
    } catch (e) {
        log.error({ err: e.message }, 'Error validating RNC');
        res.status(500).json({ valid: false, error: 'Error interno al validar el RNC.' });
    }
};
