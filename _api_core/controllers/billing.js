const { 
    User, PaymentRequest, Subscription, Partner, PartnerReferral, 
    PartnerCommission, Invoice, Expense, AdminAuditLog, 
    getOrCreateSubscription, activateSubscriptionFromPayment, 
    updateSubscriptionStatus, logPaymentStatusChange, billingEventEmitter 
} = require('../models');
const { log, logAdminAction } = require('../models');
const { safeErrorMessage, getBaseUrl } = require('../utils/helpers');
const { isValidObjectId } = require('../utils/validators');
const { sanitizeString } = require('../utils/sanitizers');
const { MEMBERSHIP_PLANS } = require('../config/plans');
const mongoose = require('mongoose');

// --- Helper: Alertas de Billing ---
// (No changes to getBillingAlertsInternal...)
async function getBillingAlertsInternal() {
    const alerts = [];
    try {
        const approvedPayments = await PaymentRequest.find({ status: 'approved' }).populate('userId');
        for (const payment of approvedPayments) {
            if (!payment.userId) continue;
            const sub = await Subscription.findOne({ userId: payment.userId._id });
            if (!sub || sub.status !== 'ACTIVE') {
                alerts.push({
                    type: 'payment_approved_no_activation',
                    severity: 'critical',
                    message: `Pago aprobado (${payment._id}) sin suscripción activa para usuario ${payment.userId.email}`,
                    userId: payment.userId._id,
                    paymentId: payment._id
                });
            }
        }
        const suspendedSubs = await Subscription.find({ status: 'SUSPENDED' });
        for (const sub of suspendedSubs) {
            const recentPayment = await PaymentRequest.findOne({
                userId: sub.userId,
                status: 'approved',
                processedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
            });
            if (recentPayment) {
                alerts.push({
                    type: 'suspended_with_recent_payment',
                    severity: 'warning',
                    message: `Usuario suspendido con pago aprobado reciente`,
                    userId: sub.userId,
                    paymentId: recentPayment._id
                });
            }
        }
        const longGraceSubs = await Subscription.find({
            status: 'GRACE_PERIOD',
            graceUntil: { $lt: new Date() }
        });
        if (longGraceSubs.length > 0) {
            alerts.push({
                type: 'grace_period_expired',
                severity: 'warning',
                message: `${longGraceSubs.length} suscripciones en gracia expirada`,
                count: longGraceSubs.length
            });
        }
    } catch (e) {
        log.error({ err: e.message }, 'Error generando alertas de billing');
    }
    return alerts;
}

// --- Helper: Generar Referencia Única de Pago ---
async function generateUniquePaymentReference() {
    for (let i = 0; i < 30; i++) {
        const part = Date.now().toString(36).toUpperCase().slice(-5);
        const num = Math.floor(100000 + Math.random() * 900000);
        const ref = `LEX-${part}-${num}`;
        if (!(await PaymentRequest.findOne({ reference: ref }))) return ref;
    }
    return `LEX-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// --- PayPal Webhook Verification ---
async function verifyPayPalWebhook(req) {
    const isProd = process.env.NODE_ENV === 'production';
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    if (!webhookId || !clientId || !clientSecret) {
        if (isProd) { log.warn('Webhook PayPal: faltan credenciales; rechazando en producción'); return false; }
        return true;
    }
    const transmissionId = req.headers['paypal-transmission-id'];
    const transmissionTime = req.headers['paypal-transmission-time'];
    const transmissionSig = req.headers['paypal-transmission-sig'];
    const certUrl = req.headers['paypal-cert-url'];
    if (!transmissionId || !transmissionTime || !transmissionSig || !certUrl) {
        log.warn('Webhook PayPal: faltan cabeceras de firma');
        return false;
    }
    try {
        const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        const verifyRes = await fetch(
            (process.env.PAYPAL_API_BASE || 'https://api-m.paypal.com') + '/v1/notifications/verify-webhook-signature',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${auth}`
                },
                body: JSON.stringify({
                    auth_algo: 'SHA256withRSA',
                    cert_url: certUrl,
                    transmission_id: transmissionId,
                    transmission_sig: transmissionSig,
                    transmission_time: transmissionTime,
                    webhook_id: webhookId
                })
            }
        );
        if (!verifyRes.ok) return false;
        const data = await verifyRes.json();
        return data.verification_status === 'SUCCESS';
    } catch (e) {
        log.error({ err: e.message }, 'Error verificando firma webhook PayPal');
        return false;
    }
}

// --- Client Endpoints ---

exports.getMembershipPlans = (req, res) => {
    res.json({ plans: Object.values(MEMBERSHIP_PLANS) });
};

exports.getPaymentInfo = (req, res) => {
    res.json({
        bankName: process.env.TRINALYZE_BANK_NAME || 'Banco Popular Dominicano',
        bankAccount: process.env.TRINALYZE_BANK_ACCOUNT || '789042660',
        bankHolder: process.env.TRINALYZE_BANK_HOLDER || 'Fraimel Trinidad',
        bankHolderDoc: process.env.TRINALYZE_BANK_HOLDER_DOC || '22301660929',
        paypalEmail: process.env.TRINALYZE_PAYPAL_EMAIL || 'pagos@trinalyze.do',
        paypalMeUrl: process.env.TRINALYZE_PAYPAL_ME_URL || 'https://paypal.me/frameltrinidad'
    });
};

exports.prepareTransfer = async (req, res) => {
    try {
        const { plan } = req.body;
        if (!plan || plan !== 'pro') return res.status(400).json({ message: 'Por ahora solo el plan Profesional está disponible.' });
        const reference = await generateUniquePaymentReference();
        res.json({ reference });
    } catch (e) {
        res.status(500).json({ message: safeErrorMessage(e) });
    }
};

exports.requestPayment = async (req, res) => {
    try {
        const { plan, billingCycle, paymentMethod, comprobanteImage, clientReference } = req.body;
        const cycle = billingCycle === 'annual' ? 'annual' : 'monthly';
        
        const existing = await PaymentRequest.findOne({
            userId: req.userId,
            status: { $in: ['pending', 'under_review'] },
            requestedAt: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
        });
        if (existing) {
            return res.status(400).json({
                message: 'Ya tienes una solicitud de pago pendiente o en revisión. Espera a que la validemos.',
                existingPaymentId: existing._id,
                existingStatus: existing.status
            });
        }

        const refTrim = clientReference && String(clientReference).trim();
        const refValid = refTrim && /^LEX-/.test(refTrim);
        let reference = refValid ? refTrim : await generateUniquePaymentReference();

        const amount = cycle === 'annual' ? 9500 : 950;
        
        const pr = new PaymentRequest({
            userId: req.userId,
            plan,
            billingCycle: cycle,
            amount,
            paymentMethod,
            reference,
            comprobanteImage: paymentMethod === 'transferencia' ? comprobanteImage : undefined,
            status: 'pending'
        });
        await pr.save();

        await logPaymentStatusChange(pr._id, req.userId, 'none', 'pending', null, { plan, billingCycle: cycle, paymentMethod, reference });

        const sub = await getOrCreateSubscription(req.userId);
        if (sub.status !== 'PENDING_PAYMENT') {
            await updateSubscriptionStatus(req.userId, 'PENDING_PAYMENT', {
                paymentId: pr._id,
                reason: 'Payment request created'
            });
        }

        await billingEventEmitter.emit('payment_uploaded', {
            userId: req.userId,
            paymentId: pr._id,
            subscriptionId: sub._id,
            plan,
            paymentMethod,
            reference
        });

        const updatedStatus = await Subscription.findOne({ userId: req.userId });
        res.status(201).json({
            success: true,
            message: 'Solicitud recibida. Tu plan se activa tras validar el pago (hasta 24h).',
            payment: { id: pr._id, reference, status: 'pending' },
            subscription: { status: updatedStatus?.status || 'PENDING_PAYMENT' }
        });
    } catch (e) {
        res.status(500).json({ message: safeErrorMessage(e) });
    }
};

exports.paypalWebhook = async (req, res) => {
    try {
        const isProd = process.env.NODE_ENV === 'production';
        if (isProd && req.rawBody && !(await verifyPayPalWebhook(req))) {
            log.warn('Webhook PayPal con firma inválida; rechazado');
            return res.status(401).json({ error: 'Invalid signature' });
        }

        const event = req.body;
        const eventType = event?.event_type;
        const resource = event?.resource || {};
        const customId = resource.custom_id || resource.custom;
        const userId = customId && isValidObjectId(customId) ? new mongoose.Types.ObjectId(customId) : null;

        if (!userId) return res.status(200).json({ received: true });

        switch (eventType) {
            case 'BILLING.SUBSCRIPTION.ACTIVATED':
            case 'PAYMENT.SALE.COMPLETED':
                await getOrCreateSubscription(userId);
                await activateSubscriptionFromPayment(userId, null, 'pro', 'monthly');
                break;
            case 'BILLING.SUBSCRIPTION.CANCELLED':
            case 'BILLING.SUBSCRIPTION.EXPIRED':
                await updateSubscriptionStatus(userId, 'CANCELLED', { reason: eventType });
                break;
            case 'BILLING.SUBSCRIPTION.SUSPENDED':
                await updateSubscriptionStatus(userId, 'SUSPENDED', { reason: 'PayPal suspended' });
                break;
        }
        res.status(200).json({ received: true });
    } catch (err) {
        log.error({ err: err.message }, 'Error procesando webhook PayPal');
        res.status(500).send();
    }
};


exports.getSubscriptionStatus = async (req, res) => {
    try {
        const user = req.user;
        let sub = await Subscription.findOne({ userId: user._id });
        if (!sub) sub = await getOrCreateSubscription(user._id);

        const now = new Date();
        const endDate = sub.currentPeriodEnd;
        const diffDays = endDate ? Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)) : 999;
        
        const pendingPayment = await PaymentRequest.findOne({
            userId: user._id,
            status: { $in: ['pending', 'under_review'] },
            requestedAt: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
        });

        let internalStatus = sub.status;
        if (user.blocked) internalStatus = 'SUSPENDED';
        else if (pendingPayment && internalStatus !== 'ACTIVE') internalStatus = 'PENDING_PAYMENT';
        else if (internalStatus === 'ACTIVE' && endDate && now > endDate) {
            const graceUntil = sub.graceUntil || new Date(endDate.getTime() + 5 * 24 * 60 * 60 * 1000);
            internalStatus = now <= graceUntil ? 'GRACE_PERIOD' : 'PAST_DUE';
        }

        const displayStatus = {
            'TRIAL': 'Trial', 'ACTIVE': 'Activo', 'GRACE_PERIOD': 'Gracia',
            'PAST_DUE': 'Vencido', 'PENDING_PAYMENT': 'Pendiente',
            'UNDER_REVIEW': 'En Revisión', 'SUSPENDED': 'Suspendido', 'CANCELLED': 'Cancelado'
        }[internalStatus] || 'Trial';

        res.json({
            plan: sub.plan,
            status: displayStatus,
            internalStatus,
            expiryDate: endDate,
            daysRemaining: Math.max(0, diffDays),
            hasPendingPayment: !!pendingPayment,
            shouldRedirect: internalStatus === 'PAST_DUE' || internalStatus === 'SUSPENDED',
            allowPartialAccess: ['GRACE_PERIOD', 'PENDING_PAYMENT', 'UNDER_REVIEW'].includes(internalStatus)
        });
    } catch (e) {
        res.status(500).json({ message: safeErrorMessage(e) });
    }
};

// --- Admin Endpoints ---

exports.getPendingPayments = async (req, res) => {
    try {
        const list = await PaymentRequest.find({ status: { $in: ['pending', 'under_review'] } })
            .populate('userId', 'name email rnc phone lastLoginAt')
            .sort({ requestedAt: -1 });
        res.json(list);
    } catch (e) {
        res.status(500).json({ message: safeErrorMessage(e) });
    }
};

exports.approvePayment = async (req, res) => {
    try {
        const id = req.params.id || req.body.id || req.body.paymentId;
        if (!isValidObjectId(id)) return res.status(400).json({ message: 'ID inválido' });
        const request = await PaymentRequest.findById(id);
        if (!request) return res.status(404).json({ message: 'Solicitud no encontrada' });
        if (request.status === 'approved') return res.status(400).json({ message: 'Ya está aprobado' });

        request.status = 'approved';
        request.processedAt = new Date();
        request.processedBy = req.userId;
        await request.save();

        await getOrCreateSubscription(request.userId);
        await activateSubscriptionFromPayment(request.userId, request._id, request.plan, request.billingCycle);
        await logAdminAction(req.userId, 'payment_approve', 'payment', id, { userId: request.userId });

        res.json({ message: 'Pago aprobado y suscripción activada' });
    } catch (e) {
        res.status(500).json({ message: safeErrorMessage(e) });
    }
};

exports.rejectPayment = async (req, res) => {
    try {
        const id = req.params.id || req.body.id || req.body.paymentId;
        const { reason } = req.body;
        if (!isValidObjectId(id)) return res.status(400).json({ message: 'ID inválido' });
        const request = await PaymentRequest.findById(id);
        if (!request) return res.status(404).json({ message: 'Solicitud no encontrada' });
        request.status = 'rejected';
        request.rejectionReason = reason;
        request.processedAt = new Date();
        request.processedBy = req.userId;
        await request.save();
        await logAdminAction(req.userId, 'payment_reject', 'payment', id, { reason });
        res.json({ message: 'Pago rechazado' });
    } catch (e) {
        res.status(500).json({ message: safeErrorMessage(e) });
    }
};

exports.getPaymentsHistory = async (req, res) => {
    try {
        const list = await PaymentRequest.find({ status: { $nin: ['pending', 'under_review'] } })
            .populate('userId', 'name email')
            .sort({ processedAt: -1 }).limit(100);
        res.json(list);
    } catch (e) {
        res.status(500).json({ message: safeErrorMessage(e) });
    }
};

exports.getBillingAlerts = async (req, res) => {
    try {
        const alerts = await getBillingAlertsInternal();
        res.json({ success: true, alerts });
    } catch (e) {
        res.status(500).json({ message: safeErrorMessage(e) });
    }
};

exports.getBillingHealth = async (req, res) => {
    try {
        const totalPayments = await PaymentRequest.countDocuments({});
        const approvedPayments = await PaymentRequest.find({ status: 'approved' }).select('userId').lean();
        let consistent = 0;
        for (const p of approvedPayments) {
            const sub = await Subscription.findOne({ userId: p.userId, status: 'ACTIVE' });
            if (sub) consistent++;
        }
        const healthScore = approvedPayments.length > 0 ? (consistent / approvedPayments.length * 100) : 100;
        res.json({ 
            success: true, 
            healthScore: parseFloat(healthScore.toFixed(2)), 
            isHealthy: healthScore >= 98,
            metrics: { totalPayments, approved: approvedPayments.length, consistent }
        });
    } catch (e) {
        res.status(500).json({ message: safeErrorMessage(e) });
    }
};

exports.getStats = async (req, res) => {
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const [totalUsers, newUsers, allInvoices, invoicesMonth, pendingPayments] = await Promise.all([
            User.countDocuments({}),
            User.countDocuments({ createdAt: { $gte: startOfMonth } }),
            Invoice.find({ status: { $ne: 'cancelled' } }),
            Invoice.find({ status: { $ne: 'cancelled' }, date: { $gte: startOfMonth } }),
            PaymentRequest.countDocuments({ status: { $in: ['pending', 'under_review'] } })
        ]);
        const mTotal = invoicesMonth.reduce((s, i) => s + (i.total || 0), 0);
        res.json({ 
            users: { total: totalUsers, newThisMonth: newUsers },
            invoicing: { total: allInvoices.length, monthlyCount: invoicesMonth.length, monthlyTotal: mTotal },
            business: { pendingPayments }
        });
    } catch (e) {
        res.status(500).json({ message: safeErrorMessage(e) });
    }
};

exports.getChartData = async (req, res) => {
    try {
        const months = 12;
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth() - months, 1);
        const agg = await Invoice.aggregate([
            { $match: { status: { $ne: 'cancelled' }, date: { $gte: start } } },
            { $group: { _id: { year: { $year: '$date' }, month: { $month: '$date' } }, revenue: { $sum: '$total' }, count: { $sum: 1 } } },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);
        res.json({ monthly: agg.map(r => ({ month: `${r._id.year}-${String(r._id.month).padStart(2, '0')}`, revenue: r.revenue, invoices: r.count })) });
    } catch (e) {
        res.status(500).json({ message: safeErrorMessage(e) });
    }
};

exports.getMetrics = async (req, res) => {
    try {
        const proUsers = await User.countDocuments({ role: { $ne: 'admin' }, $or: [{ 'subscription.plan': 'pro' }, { membershipLevel: 'pro' }] });
        const approved = await PaymentRequest.find({ status: 'approved' }).lean();
        const revenue = approved.reduce((s, p) => s + (p.amount || (p.billingCycle === 'annual' ? 9500 : 950)), 0);
        res.json({ mrr: proUsers * 950, activeUsers: proUsers, revenueTotal: revenue });
    } catch (e) {
        res.status(500).json({ message: safeErrorMessage(e) });
    }
};

exports.getBusinessCopilot = async (req, res) => {
    try {
        const userId = req.userId;
        const { Invoice, Customer, NCFSettings, Expense } = require('../models');
        const { BillingBrain } = require('../services/billing-brain');

        const [invoices, customers, ncfSettings, expenses] = await Promise.all([
            Invoice.find({ userId }).lean(),
            Customer.find({ userId }).lean(),
            NCFSettings.find({ userId, isActive: true }).lean(),
            Expense.find({ userId }).lean()
        ]);

        const brain = new BillingBrain(userId, invoices, customers, ncfSettings, expenses);
        const biResult = await brain.analyze();
        const biSummary = biResult.summary || {};

        // Calcular métricas base para el dashboard (con defensa ante datos nulos)
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        const monthlyInvoices = invoices.filter(inv => {
            if (!inv.date) return false;
            const invDate = new Date(inv.date);
            return !isNaN(invDate.getTime()) && invDate >= firstDayOfMonth && inv.status !== 'cancelled';
        });
        const monthlyRevenue = monthlyInvoices.reduce((acc, inv) => acc + (Number(inv.total) || 0), 0);
        
        const pendingInvoices = invoices.filter(inv => (inv.estadoPago === 'pendiente' || inv.estadoPago === 'parcial') && inv.status !== 'cancelled');
        const totalPending = pendingInvoices.reduce((acc, inv) => acc + (Number(inv.balancePendiente) || 0), 0);

        res.json({
            success: true,
            // 🚀 ESTRUCTURA COMPLETA PARA EVITAR CRASHES EN EL FRONTEND
            proactiveInsights: biResult.insights || [],
            biSummary: biSummary,
            alerts: [], // Mantener compatibilidad con el frontend anterior
            clientRadar: [],
            rankings: {
                topClient: null,
                droppedClient: null,
                topService: null
            },
            fiscalAlerts: [],
            prediction: {
                currentRevenue: monthlyRevenue,
                projectedMonth: monthlyRevenue * 1.1, // Estimación básica
                dailyRate: monthlyRevenue / (now.getDate() || 1),
                daysRemaining: 30 - now.getDate(),
                projectedCash15Days: totalPending * 0.4
            },
            businessHealth: {
                score: 85,
                label: "Estable",
                concentrationRisk: null
            },
            stats: {
                monthlyRevenue,
                invoiceCount: monthlyInvoices.length,
                totalPending,
                pendingCount: pendingInvoices.length
            }
        });
    } catch (e) {
        console.error("Copilot Error:", e);
        res.status(500).json({ message: safeErrorMessage(e) });
    }
};

exports.getAlerts = async (req, res) => {
    try {
        const { NCFSettings } = require('../models');
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
        res.status(500).json({ message: safeErrorMessage(e) });
    }
};
