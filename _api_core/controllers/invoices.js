
const mongoose = require('mongoose');
const { Invoice, Customer, InvoiceDraft, InvoiceTemplate, NCFSettings, User, Subscription, PaymentRequest } = require('../models');
const { sanitizeString, sanitizeItems } = require('../utils/sanitizers');
const { isValidObjectId } = require('../utils/validators');
const { computeAmountsFromItems, safeErrorMessage } = require('../utils/helpers');
const { getNextNcf } = require('../services/dgii');

const log = require('pino')();

const { MEMBERSHIP_PLANS } = require('../config/plans');
const { getUserSubscription } = require('../utils/helpers');


const getInvoices = async (req, res) => {

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
        res.status(500).json({ message: safeErrorMessage(error) });
    }
};

const createInvoice = async (req, res) => {
    const createdBeforeOnboarding = req.user.createdAt && new Date(req.user.createdAt) < new Date('2026-02-01');
    if (!req.user.onboardingCompleted && !createdBeforeOnboarding) {
        return res.status(403).json({
            message: 'Completa la configuración inicial antes de emitir facturas.',
            code: 'ONBOARDING_REQUIRED'
        });
    }
    if (!req.user.confirmedFiscalName) {
        return res.status(403).json({
            message: 'Para emitir documentos fiscales, confirma tu nombre fiscal en el dashboard.',
            code: 'FISCAL_NAME_REQUIRED'
        });
    }

    const sub = req.subscription || getUserSubscription(req.user);
    const blockedStatuses = ['SUSPENDED', 'CANCELLED', 'PAST_DUE'];
    const isExpired = blockedStatuses.includes(sub.status) ||
        (sub.currentPeriodEnd && new Date() > new Date(sub.currentPeriodEnd) && !sub.graceUntil);
    
    if (isExpired) {
        return res.status(403).json({
            message: 'Tu membresía ha expirado o está suspendida. Actualiza tu plan en Pagos.',
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
        if (req.body.requestId) {
            const existing = await Invoice.findOne({ requestId: req.body.requestId, userId: req.userId }).session(session);
            if (existing) {
                await session.abortTransaction();
                session.endSession();
                return res.status(201).json({ message: 'Factura ya procesada', ncf: existing.ncfSequence, invoice: existing, matchesRequestId: true });
            }
        }

        const data = req.validatedBody || req.body;
        const taxSettings = req.user?.taxSettings || {};
        const items = sanitizeItems(data.items, taxSettings.isTaxExemptCompany);
        const { subtotal, itbis, total } = computeAmountsFromItems(items, taxSettings);

        const isPlaceholderName = !data.clientName || (String(data.clientName).toUpperCase().trim() === 'CONTRIBUYENTE REGISTRADO');
        if (isPlaceholderName || !data.clientRnc || items.length === 0) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: isPlaceholderName ? 'Indica el nombre real del cliente (no el placeholder).' : 'Cliente, RNC e items son requeridos' });
        }

        const fullNcf = await getNextNcf(req.userId, data.ncfType, session, data.clientRnc);
        if (!fullNcf) throw new Error("No hay secuencias NCF disponibles.");

        let invoiceDate = new Date();
        if (data.date) {
            const parsed = new Date(data.date);
            if (!isNaN(parsed.getTime())) invoiceDate = parsed;
        }

        const pagoMixto = Array.isArray(data.pagoMixto) ? data.pagoMixto.filter(p => p && p.tipo && Number(p.monto) > 0).map(p => ({
            tipo: String(p.tipo).slice(0, 30),
            monto: Math.max(0, Math.min(Number(p.monto) || 0, 999999999))
        })) : [];

        if (data.tipoPago === 'mixto' && pagoMixto.length > 0) {
            const sum = pagoMixto.reduce((acc, p) => acc + p.monto, 0);
            if (Math.abs(sum - total) > 0.05) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({ message: `La suma de los montos (${sum.toFixed(2)}) debe coincidir exactamente con el total de la factura (${total.toFixed(2)}).` });
            }
        }

        let montoPagado = 0, balancePendiente = total, estadoPago = 'pendiente', fechaPago = null;
        if (data.tipoPago === 'credito') {
            montoPagado = 0;
            balancePendiente = total;
            estadoPago = 'pendiente';
        } else if (data.tipoPago === 'mixto' && pagoMixto.length > 0) {
            montoPagado = pagoMixto.reduce((s, p) => (p.tipo === 'credito' || p.tipo === 'pendiente') ? s : s + (p.monto || 0), 0);
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
            userId: req.userId,
            clientName: data.clientName,
            clientRnc: data.clientRnc,
            clientPhone: data.clientPhone,
            ncfType: data.ncfType,
            ncf: fullNcf,
            ncfSequence: fullNcf,
            requestId: data.requestId,
            items,
            subtotal,
            itbis,
            total,
            date: invoiceDate,
            tipoPago: data.tipoPago,
            tipoPagoOtro: data.tipoPago === 'otro' ? sanitizeString(data.tipoPagoOtro || '', 50) : null,
            pagoMixto: pagoMixto.length > 0 ? pagoMixto : undefined,
            paymentDetails: pagoMixto.length > 0 ? pagoMixto.map(p => ({ method: p.tipo, amount: p.monto })) : [{ method: data.tipoPago, amount: total }],
            montoPagado,
            balancePendiente,
            estadoPago,
            fechaPago,
            isrRetention: data.isrRetention || 0,
            itbisRetention: data.itbisRetention || 0,
            modifiedNcf: (data.ncfType === '04' || data.ncfType === '34') && data.modifiedNcf ? sanitizeString(data.modifiedNcf, 13).toUpperCase() : undefined
        });

        await newInvoice.save({ session });
        await Customer.findOneAndUpdate(
            { userId: req.userId, rnc: data.clientRnc },
            { $set: { lastInvoiceDate: new Date(), name: data.clientName } },
            { upsert: true, session }
        );

        await session.commitTransaction();
        session.endSession();

        // Notificación por email (legacy)
        try {
            const mailer = require('../mailer');
            if (typeof mailer.sendInvoiceCreated === 'function' && req.user && req.user.email) {
                await mailer.sendInvoiceCreated(req.user.email, fullNcf, (total || 0).toFixed(2), data.clientName);
            }
        } catch (err) { log.warn({ err: err.message }, 'Email factura emitida no enviado'); }

        res.status(201).json({ message: 'Factura creada exitosamente', ncf: fullNcf, invoice: newInvoice });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        log.error({ err: error.message, userId: req.userId }, 'Create invoice error');
        res.status(500).json({ message: safeErrorMessage(error) });
    }
};

const registerPayment = async (req, res) => {
    try {
        const invoiceId = req.params.invoiceId;
        const data = req.validatedBody || req.body;
        const invoice = await Invoice.findOne({ _id: invoiceId, userId: req.userId }).lean();
        if (!invoice) return res.status(404).json({ message: 'Factura no encontrada' });

        if (invoice.status === 'cancelled' || invoice.status === 'fully_credited') {
            return res.status(400).json({ message: 'No se puede registrar pago en esta factura.' });
        }

        const amount = data.amount;
        const currentBalance = Math.max(0, Number(invoice.balancePendiente != null ? invoice.balancePendiente : (invoice.total || 0)));
        if (currentBalance <= 0) return res.status(400).json({ message: 'La factura ya está saldada.' });
        if (amount > currentBalance) return res.status(400).json({ message: `El monto excede el balance pendiente (${currentBalance.toFixed(2)}).` });

        const prevPaid = Math.max(0, Number(invoice.montoPagado || 0));
        const newPaid = Math.min(Number(invoice.total || 0), prevPaid + amount);
        const newBalance = Math.max(0, currentBalance - amount);
        const newEstado = newBalance <= 0 ? 'pagado' : 'parcial';

        await Invoice.updateOne(
            { _id: invoiceId, userId: req.userId },
            {
                $set: {
                    montoPagado: newPaid,
                    balancePendiente: newBalance,
                    estadoPago: newEstado,
                    fechaPago: newEstado === 'pagado' ? new Date() : (invoice.fechaPago || null)
                },
                $push: { paymentDetails: { method: data.paymentMethod, amount } }
            }
        );

        res.json({ message: newEstado === 'pagado' ? 'Pago registrado. Factura saldada.' : 'Pago parcial registrado.', status: newEstado });
    } catch (error) {
        res.status(500).json({ message: safeErrorMessage(error) });
    }
};

const annulInvoice = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.validatedBody || req.body;
        const invoice = await Invoice.findOne({ _id: id, userId: req.userId });
        if (!invoice) return res.status(404).json({ message: 'Factura no encontrada.' });
        if (invoice.status === 'cancelled') return res.status(400).json({ message: 'La factura ya se encuentra anulada.' });
        
        invoice.status = 'cancelled';
        invoice.cancellationReason = reason;
        invoice.cancelledAt = new Date();
        await invoice.save();

        res.json({ success: true, message: 'Factura anulada exitosamente.' });
    } catch (error) {
        res.status(500).json({ message: safeErrorMessage(error) });
    }
};

const createCreditNote = async (req, res) => {
    const invoiceId = req.params.invoiceId;
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const original = await Invoice.findOne({ _id: invoiceId, userId: req.userId }).session(session).lean();
        if (!original) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: 'Factura no encontrada' });
        }
        
        const data = req.validatedBody || req.body;
        const creditNoteType = (original.ncfType && String(original.ncfType).startsWith('3')) ? '34' : '04';
        const fullNcf = await getNextNcf(req.userId, creditNoteType, session, original.clientRnc);
        if (!fullNcf) throw new Error("No hay secuencias NCF disponibles para Notas de Crédito.");

        const creditAmount = Math.min(data.amount || original.total, original.balancePendiente || original.total);
        const reason = data.reason || 'Devolución / Ajuste';

        const creditNote = new Invoice({
            userId: req.userId,
            clientName: original.clientName,
            clientRnc: original.clientRnc,
            ncfType: creditNoteType,
            ncf: fullNcf,
            ncfSequence: fullNcf,
            originalInvoiceId: original._id,
            items: original.items,
            subtotal: original.subtotal,
            itbis: original.itbis,
            total: creditAmount,
            date: new Date(),
            status: 'active',
            tipoPago: 'efectivo',
            montoPagado: creditAmount,
            balancePendiente: 0,
            estadoPago: 'pagado',
            fechaPago: new Date(),
            modifiedNcf: original.ncfSequence || original.ncf,
            reason: reason
        });
        await creditNote.save({ session });

        const newBalance = Math.max(0, (original.balancePendiente || 0) - creditAmount);
        const newStatus = newBalance === 0 ? 'fully_credited' : 'partially_credited';
        
        await Invoice.updateOne(
            { _id: invoiceId, userId: req.userId },
            { $set: { status: newStatus, balancePendiente: newBalance, annulledBy: fullNcf } },
            { session }
        );

        await session.commitTransaction();
        session.endSession();
        res.status(201).json({ ncf: fullNcf, message: 'Nota de Crédito emitida exitosamente' });
    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({ message: safeErrorMessage(err) });
    }
};

const duplicateInvoice = async (req, res) => {
    try {
        const original = await Invoice.findOne({ _id: req.params.id, userId: req.userId }).lean();
        if (!original) return res.status(404).json({ message: 'Factura no encontrada' });

        const draftPayload = {
            userId: req.userId,
            items: original.items,
            clientName: original.clientName || '',
            rnc: original.clientRnc || '',
            invoiceType: original.ncfType || '32',
            tipoPago: original.tipoPago || 'efectivo',
            tipoPagoOtro: original.tipoPagoOtro || '',
            pagoMixto: original.pagoMixto || [],
            updatedAt: new Date()
        };

        await InvoiceDraft.findOneAndUpdate({ userId: req.userId }, draftPayload, { upsert: true, new: true });
        res.status(201).json({ success: true });
    } catch (err) {
        res.status(500).json({ message: safeErrorMessage(err) });
    }
};

const getDraft = async (req, res) => {
    try {
        const draft = await InvoiceDraft.findOne({ userId: req.userId });
        res.json(draft || null);
    } catch (e) {
        res.status(500).json({ message: safeErrorMessage(e) });
    }
};

const updateDraft = async (req, res) => {
    try {
        const data = req.validatedBody || req.body;
        const draft = await InvoiceDraft.findOneAndUpdate(
            { userId: req.userId },
            { ...data, updatedAt: new Date() },
            { upsert: true, new: true }
        );
        res.json(draft);
    } catch (e) {
        res.status(500).json({ message: safeErrorMessage(e) });
    }
};

const deleteDraft = async (req, res) => {
    try {
        await InvoiceDraft.deleteOne({ userId: req.userId });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ message: safeErrorMessage(e) });
    }
};

const getTemplates = async (req, res) => {
    try {
        const templates = await InvoiceTemplate.find({ userId: req.userId }).sort({ createdAt: -1 });
        res.json(templates);
    } catch (e) {
        res.status(500).json({ message: safeErrorMessage(e) });
    }
};

const createTemplate = async (req, res) => {
    try {
        const template = new InvoiceTemplate({ ...req.body, userId: req.userId });
        await template.save();
        res.status(201).json(template);
    } catch (e) {
        res.status(500).json({ message: safeErrorMessage(e) });
    }
};


const getStatement = async (req, res) => {
    try {
        const cleanRnc = String(req.params.rnc).replace(/[^0-9]/g, '');
        const allInvoices = await Invoice.find({
            userId: req.userId,
            clientRnc: cleanRnc,
            status: { $nin: ['cancelled', 'void'] }
        }).sort({ date: -1 }).lean();

        const customer = await Customer.findOne({ userId: req.userId, rnc: cleanRnc }).lean();
        const invoices = allInvoices
            .map((inv) => {
                const total = Number(inv.total || 0);
                const paid = Number(inv.montoPagado || 0);
                const balanceRaw = inv.balancePendiente;
                const fallback = Math.max(0, total - paid);
                const effectiveBalance = (balanceRaw != null && balanceRaw > 0)
                    ? Number(balanceRaw)
                    : ((inv.estadoPago === 'pendiente' || inv.estadoPago === 'parcial' || inv.status === 'pending' || inv.tipoPago === 'credito') ? fallback : 0);
                return { ...inv, effectiveBalance };
            })
            .filter((inv) => inv.effectiveBalance > 0);
        const totalPending = invoices.reduce((sum, inv) => sum + inv.effectiveBalance, 0);

        res.json({
            customer: customer || { rnc: cleanRnc, name: invoices[0]?.clientName || 'Cliente desconocido' },
            invoices: invoices.map(inv => ({
                id: inv._id,
                ncf: inv.ncf || inv.ncfSequence,
                date: inv.date,
                total: inv.total,
                balance: inv.effectiveBalance,
                type: inv.ncfType
            })),
            totalPending,
            generatedAt: new Date()
        });
    } catch (error) {
        res.status(500).json({ message: safeErrorMessage(error) });
    }
};

const getDebtors = async (req, res) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.userId);
        const debtors = await Invoice.aggregate([
            { $match: { userId, status: { $nin: ['cancelled', 'void'] } } },
            {
                $addFields: {
                    _totalSafe: { $ifNull: ['$total', 0] },
                    _paidSafe: { $ifNull: ['$montoPagado', 0] },
                    _balanceRaw: { $ifNull: ['$balancePendiente', null] }
                }
            },
            {
                $addFields: {
                    _fallbackBalance: {
                        $max: [
                            { $subtract: ['$_totalSafe', '$_paidSafe'] },
                            0
                        ]
                    }
                }
            },
            {
                $addFields: {
                    _effectiveBalance: {
                        $cond: [
                            { $gt: ['$_balanceRaw', 0] },
                            '$_balanceRaw',
                            {
                                $cond: [
                                    {
                                        $or: [
                                            { $in: ['$estadoPago', ['pendiente', 'parcial']] },
                                            { $eq: ['$status', 'pending'] },
                                            { $eq: ['$tipoPago', 'credito'] }
                                        ]
                                    },
                                    '$_fallbackBalance',
                                    0
                                ]
                            }
                        ]
                    }
                }
            },
            { $match: { _effectiveBalance: { $gt: 0 } } },
            { $group: {
                _id: '$clientRnc',
                clientName: { $first: '$clientName' },
                totalBalance: { $sum: '$_effectiveBalance' },
                invoiceCount: { $sum: 1 },
                lastInvoiceDate: { $max: '$date' }
            }},
            {
                $lookup: {
                    from: 'customers',
                    let: { rnc: '$_id', uid: new mongoose.Types.ObjectId(req.userId) },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$rnc', '$$rnc'] },
                                        { $eq: ['$userId', '$$uid'] }
                                    ]
                                }
                            }
                        },
                        { $project: { _id: 0, phone: 1, email: 1, name: 1 } }
                    ],
                    as: 'customerData'
                }
            },
            {
                $addFields: {
                    customerDoc: { $arrayElemAt: ['$customerData', 0] }
                }
            },
            {
                $addFields: {
                    clientName: { $ifNull: ['$customerDoc.name', '$clientName'] },
                    phone: { $ifNull: ['$customerDoc.phone', ''] },
                    email: { $ifNull: ['$customerDoc.email', ''] }
                }
            },
            { $project: { customerData: 0, customerDoc: 0 } },
            { $sort: { totalBalance: -1 } }
        ]);

        res.json({ debtors });
    } catch (error) {
        res.status(500).json({ message: safeErrorMessage(error) });
    }
};

module.exports = {
    getInvoices,
    createInvoice,
    registerPayment,
    annulInvoice,
    createCreditNote,
    duplicateInvoice,
    getDraft,
    updateDraft,
    deleteDraft,
    getTemplates,
    createTemplate,
    getStatement,
    getDebtors
};

