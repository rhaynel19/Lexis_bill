const mongoose = require('mongoose');

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
    // Configuración fiscal: empresa exenta y tasa por defecto (facturas mixtas / ítems exentos)
    taxSettings: {
        isTaxExemptCompany: { type: Boolean, default: false },
        defaultTaxRate: { type: Number, default: 0.18 }
    },

    // Recordatorio 606/607: último periodo por el que se envió (YYYYMM)
    lastReportReminderPeriod: { type: String },

    // Onboarding obligatorio (First-Run Experience)
    onboardingCompleted: { type: Boolean, default: false },

    paymentHistory: [{
        date: { type: Date, default: Date.now },
        amount: Number,
        reference: String
    }],
    createdAt: { type: Date, default: Date.now },
    lastLoginAt: { type: Date },
    blocked: { type: Boolean, default: false },
    blockedAt: { type: Date },
    blockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    adminNotes: { type: String }
});

const paymentRequestSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    plan: { type: String, enum: ['free', 'pro', 'premium'], required: true },
    billingCycle: { type: String, enum: ['monthly', 'annual'], default: 'monthly' },
    paymentMethod: { type: String, enum: ['transferencia', 'paypal'], required: true },
    reference: { type: String, unique: true, sparse: true }, // LEX-XXXX para que el cliente ponga en la transferencia
    comprobanteImage: { type: String }, // base64 data URL del comprobante (obligatorio para transferencia)
    status: { type: String, enum: ['pending', 'under_review', 'approved', 'rejected', 'expired'], default: 'pending' },
    requestedAt: { type: Date, default: Date.now },
    processedAt: { type: Date },
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});
paymentRequestSchema.index({ status: 1, requestedAt: -1 });
paymentRequestSchema.index({ reference: 1 });
// ✅ Un solo pending o under_review por usuario: evita duplicados por doble clic / refresh / race
paymentRequestSchema.index(
    { userId: 1 },
    { unique: true, partialFilterExpression: { status: { $in: ['pending', 'under_review'] } } }
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
    ncf: { type: String, required: true },
    ncfType: { type: String, required: true },
    clientPhone: { type: String },
    originalInvoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' }, // For credit notes
    requestId: { type: String, unique: true, sparse: true }, // For idempotency
    items: [{
        description: { type: String, required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
        taxCategory: { type: String, enum: ['taxable', 'exempt'], default: 'taxable' }, // Per-item tax
        taxRate: { type: Number, default: 0.18 },
        isExempt: { type: Boolean, default: false } // Legacy support
    }],
    subtotal: { type: Number, required: true },
    itbis: { type: Number, required: true },
    total: { type: Number, required: true },
    isrRetention: { type: Number, default: 0 },
    itbisRetention: { type: Number, default: 0 },
    date: { type: Date, default: Date.now },
    tipoPago: { type: String, default: 'efectivo' },
    paymentDetails: [{
        method: { type: String },
        amount: { type: Number }
    }],
    montoPagado: { type: Number, default: 0 },
    balancePendiente: { type: Number, default: 0 },
    estadoPago: { type: String, enum: ['pendiente', 'parcial', 'pagado', 'credito_aplicado'], default: 'pendiente' },
    fechaPago: { type: Date, default: null },
    status: { type: String, enum: ['active', 'pending', 'cancelled', 'credited', 'partially_credited', 'fully_credited', 'void'], default: 'active' },
    cancellationReason: { type: String }, // DGII 608: 01-05
    cancelledAt: { type: Date },
    modifiedNcf: { type: String },
});
invoiceSchema.index({ userId: 1, date: -1 });
invoiceSchema.index({ userId: 1, ncf: 1 }, { unique: true }); // Unique index for NCF per user
invoiceSchema.index({ userId: 1, ncfSequence: 1 }); // Index for ncfSequence per user (no unique to avoid conflicts)
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
    tipoPago: { type: String, default: 'efectivo' },
    tipoPagoOtro: String,
    pagoMixto: [{ tipo: String, monto: Number }],
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
        isExempt: Boolean,
        taxCategory: { type: String, enum: ['taxable', 'exempt'], default: 'taxable' },
        taxRate: { type: Number, default: 0.18 }
    }],
    subtotal: { type: Number, required: true },
    itbis: { type: Number, required: true },
    total: { type: Number, required: true },
    status: { type: String, enum: ['draft', 'sent', 'accepted', 'rejected', 'converted'], default: 'draft' },
    converted: { type: Boolean, default: false },
    validUntil: { type: Date, required: true },
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
    lastSavedAt: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now }
});

// Políticas legales: aceptación por usuario (versionado, inmutable)
const policyAcceptanceSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    policySlug: { type: String, required: true },
    policyVersion: { type: Number, required: true },
    acceptedAt: { type: Date, default: Date.now },
    ip: { type: String }
});
policyAcceptanceSchema.index({ userId: 1, policySlug: 1, policyVersion: 1 }, { unique: true });
policyAcceptanceSchema.index({ userId: 1, policySlug: 1 });

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
const PolicyAcceptance = mongoose.models.PolicyAcceptance || mongoose.model('PolicyAcceptance', policyAcceptanceSchema);
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
    status: { type: String, enum: ['pending', 'active', 'suspended', 'rejected'], default: 'pending' },
    approvedAt: { type: Date },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    suspendedAt: { type: Date },
    rejectedAt: { type: Date },
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
    status: { type: String, enum: ['pending', 'approved', 'paid', 'cancelled'], default: 'pending' },
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

const adminAuditLogSchema = new mongoose.Schema({
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    adminEmail: { type: String },
    action: { type: String, required: true },
    targetType: { type: String },
    targetId: { type: String },
    metadata: { type: mongoose.Schema.Types.Mixed },
    createdAt: { type: Date, default: Date.now }
});
adminAuditLogSchema.index({ createdAt: -1 });
adminAuditLogSchema.index({ adminId: 1, createdAt: -1 });
adminAuditLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
adminAuditLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
const AdminAuditLog = mongoose.models.AdminAuditLog || mongoose.model('AdminAuditLog', adminAuditLogSchema);

// === SCHEMAS DE AUDITORÍA PARA PAGOS Y SUSCRIPCIONES ===
const paymentAuditLogSchema = new mongoose.Schema({
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'PaymentRequest', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    statusBefore: { type: String, required: true },
    statusAfter: { type: String, required: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // null si es automático
    metadata: { type: mongoose.Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now }
});
paymentAuditLogSchema.index({ paymentId: 1, timestamp: -1 });
paymentAuditLogSchema.index({ userId: 1, timestamp: -1 });

const subscriptionAuditLogSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    statusBefore: { type: String, required: true },
    statusAfter: { type: String, required: true },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'PaymentRequest' }, // Si fue por pago
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // null si es automático
    metadata: { type: mongoose.Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now }
});
subscriptionAuditLogSchema.index({ userId: 1, timestamp: -1 });
subscriptionAuditLogSchema.index({ paymentId: 1 });

const PaymentAuditLog = mongoose.models.PaymentAuditLog || mongoose.model('PaymentAuditLog', paymentAuditLogSchema);
const SubscriptionAuditLog = mongoose.models.SubscriptionAuditLog || mongoose.model('SubscriptionAuditLog', subscriptionAuditLogSchema);

// === SCHEMA: SUBSCRIPTION (Fuente de Verdad) ===
const subscriptionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    plan: { type: String, enum: ['free', 'pro', 'premium'], required: true, default: 'free' },
    status: {
        type: String,
        enum: ['TRIAL', 'ACTIVE', 'GRACE_PERIOD', 'PAST_DUE', 'PENDING_PAYMENT', 'UNDER_REVIEW', 'SUSPENDED', 'CANCELLED'],
        required: true,
        default: 'TRIAL'
    },
    currentPeriodStart: { type: Date, required: true, default: Date.now },
    currentPeriodEnd: { type: Date, required: true },
    graceUntil: { type: Date }, // null si no está en gracia
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});
subscriptionSchema.index({ userId: 1 }, { unique: true });
subscriptionSchema.index({ status: 1 });
subscriptionSchema.index({ currentPeriodEnd: 1 });
subscriptionSchema.index({ graceUntil: 1 });

// === SCHEMA: BILLING_EVENTS (Auditoría Completa) ===
const billingEventSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: [
            'subscription_created',
            'subscription_activated',
            'subscription_grace_started',
            'subscription_suspended',
            'subscription_cancelled',
            'payment_uploaded',
            'payment_approved',
            'payment_rejected',
            'payment_failed',
            'period_renewed',
            'plan_changed',
            'reconciliation_performed'
        ]
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription' },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'PaymentRequest' },
    payload: { type: mongoose.Schema.Types.Mixed, required: true }, // Datos completos del evento
    createdAt: { type: Date, default: Date.now }
});
billingEventSchema.index({ userId: 1, createdAt: -1 });
billingEventSchema.index({ type: 1, createdAt: -1 });
billingEventSchema.index({ subscriptionId: 1 });
billingEventSchema.index({ paymentId: 1 });

const Subscription = mongoose.models.Subscription || mongoose.model('Subscription', subscriptionSchema);
const BillingEvent = mongoose.models.BillingEvent || mongoose.model('BillingEvent', billingEventSchema);

async function logAdminAction(adminId, action, targetType, targetId, metadata = {}) {
    try {
        const admin = await User.findById(adminId).select('email').lean();
        await AdminAuditLog.create({
            adminId,
            adminEmail: admin?.email,
            action,
            targetType,
            targetId,
            metadata
        });
    } catch (e) {
        log.warn({ err: e.message }, 'AdminAuditLog: error guardando');
    }
}

async function logPaymentStatusChange(paymentId, userId, statusBefore, statusAfter, changedBy = null, metadata = {}) {
    try {
        await PaymentAuditLog.create({
            paymentId,
            userId,
            statusBefore,
            statusAfter,
            changedBy,
            metadata
        });
    } catch (e) {
        log.warn({ err: e.message }, 'PaymentAuditLog: error guardando');
    }
}

async function logSubscriptionStatusChange(userId, statusBefore, statusAfter, paymentId = null, changedBy = null, metadata = {}) {
    try {
        await SubscriptionAuditLog.create({
            userId,
            statusBefore,
            statusAfter,
            paymentId,
            changedBy,
            metadata
        });
    } catch (e) {
        log.warn({ err: e.message }, 'SubscriptionAuditLog: error guardando');
    }
}

// === SISTEMA DE EVENTOS DE BILLING (Desacoplado) ===
const billingEventEmitter = {
    listeners: {},
    on(eventType, handler) {
        if (!this.listeners[eventType]) this.listeners[eventType] = [];
        this.listeners[eventType].push(handler);
    },
    async emit(eventType, payload) {
        // Guardar evento en BD primero (fuente de verdad)
        try {
            await BillingEvent.create({
                type: eventType,
                userId: payload.userId,
                subscriptionId: payload.subscriptionId,
                paymentId: payload.paymentId,
                payload: payload
            });
        } catch (e) {
            log.error({ err: e.message, eventType }, 'Error guardando BillingEvent');
        }

        // Ejecutar listeners de forma asíncrona (no bloqueante)
        const handlers = this.listeners[eventType] || [];
        for (const handler of handlers) {
            try {
                await handler(payload);
            } catch (e) {
                log.error({ err: e.message, eventType, handler: handler.name }, 'Error en listener de billing event');
            }
        }
    }
};

// Partners son colaboradores: no tienen trial que venza (acceso sin vencimiento)
const PARTNER_EXPIRY_DAYS = 3650; // ~10 años

async function getOrCreateSubscription(userId) {
    let sub = await Subscription.findOne({ userId });
    if (!sub) {
        const now = new Date();
        const user = await User.findById(userId);
        const isPartner = user?.role === 'partner';
        const periodEnd = new Date(now);
        periodEnd.setDate(periodEnd.getDate() + (isPartner ? PARTNER_EXPIRY_DAYS : 15));
        const status = isPartner ? 'ACTIVE' : 'TRIAL';

        sub = await Subscription.create({
            userId,
            plan: 'free',
            status,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd
        });

        await billingEventEmitter.emit('subscription_created', {
            userId,
            subscriptionId: sub._id,
            plan: 'free',
            status,
            periodEnd
        });
    }
    return sub;
}

async function updateSubscriptionStatus(userId, newStatus, metadata = {}) {
    const sub = await getOrCreateSubscription(userId);
    const statusBefore = sub.status;

    if (statusBefore === newStatus) return sub; // Sin cambios

    const updates = { status: newStatus, updatedAt: new Date() };

    // Lógica específica por estado
    const now = new Date();
    if (newStatus === 'GRACE_PERIOD') {
        const graceUntil = new Date(now);
        graceUntil.setDate(graceUntil.getDate() + 5);
        updates.graceUntil = graceUntil;
    } else if (newStatus === 'ACTIVE') {
        updates.graceUntil = null;
    }

    Object.assign(sub, updates);
    await sub.save();

    // Logs y eventos
    await logSubscriptionStatusChange(userId, statusBefore, newStatus, metadata.paymentId, metadata.changedBy, metadata);

    const eventType = {
        'ACTIVE': 'subscription_activated',
        'GRACE_PERIOD': 'subscription_grace_started',
        'SUSPENDED': 'subscription_suspended',
        'CANCELLED': 'subscription_cancelled'
    }[newStatus];

    if (eventType) {
        await billingEventEmitter.emit(eventType, {
            userId,
            subscriptionId: sub._id,
            statusBefore,
            statusAfter: newStatus,
            ...metadata
        });
    }

    return sub;
}

async function activateSubscriptionFromPayment(userId, paymentId, plan, billingCycle) {
    const now = new Date();
    const daysToAdd = billingCycle === 'annual' ? 365 : 30;
    const periodEnd = new Date(now);
    periodEnd.setDate(periodEnd.getDate() + daysToAdd);

    const sub = await getOrCreateSubscription(userId);
    const statusBefore = sub.status;

    // ✅ Actualizar Subscription (fuente de verdad)
    const updatedSub = await Subscription.findOneAndUpdate(
        { userId },
        {
            plan,
            status: 'ACTIVE',
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            graceUntil: null,
            updatedAt: now
        },
        { upsert: true, new: true }
    );

    // ✅ Log de auditoría: cambio de estado de suscripción
    await logSubscriptionStatusChange(userId, statusBefore, 'ACTIVE', paymentId, null, {
        plan,
        billingCycle,
        reason: 'Payment approved - automatic activation'
    });

    // Sincronizar con User (legacy, para compatibilidad)
    const user = await User.findById(userId);
    if (user) {
        if (!user.subscription) user.subscription = {};
        user.subscription.plan = plan;
        user.subscription.status = 'active';
        user.subscription.startDate = now;
        user.subscription.endDate = periodEnd;
        user.expiryDate = periodEnd;
        user.subscriptionStatus = 'Activo';
        user.membershipLevel = plan;
        await user.save();

        // ✅ Log de auditoría: actualización de User legacy
        log.info({ userId, paymentId, plan }, 'User legacy subscription updated after payment approval');
    }

    // ✅ Emitir evento de activación
    await billingEventEmitter.emit('subscription_activated', {
        userId,
        subscriptionId: updatedSub._id,
        paymentId,
        plan,
        periodStart: now,
        periodEnd
    });

    log.info({ userId, paymentId, plan, statusBefore, statusAfter: 'ACTIVE' }, 'Subscription activated from payment');

    return updatedSub;
}

// === LISTENERS DE EVENTOS (Desacoplados) ===
billingEventEmitter.on('payment_approved', async (payload) => {
    // Activar suscripción automáticamente
    const { userId, paymentId, plan, billingCycle } = payload;
    if (userId && plan) {
        await activateSubscriptionFromPayment(userId, paymentId, plan, billingCycle || 'monthly');
    }
});

billingEventEmitter.on('subscription_activated', async (payload) => {
    // Enviar email de confirmación (si está configurado)
    try {
        const mailer = require('./mailer');
        if (typeof mailer.sendSubscriptionActivated === 'function') {
            const user = await User.findById(payload.userId).select('email name').lean();
            if (user) {
                await mailer.sendSubscriptionActivated(user.email, user.name, payload.plan);
            }
        }
    } catch (e) {
        // Mailer no disponible, ignorar
    }
});

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

// Verificación de correo (evitar cuentas con correos falsos o no existentes)
const emailVerifySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    token: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now }
});
emailVerifySchema.index({ token: 1 });
emailVerifySchema.index({ userId: 1 });
emailVerifySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
const EmailVerify = mongoose.models.EmailVerify || mongoose.model('EmailVerify', emailVerifySchema);

function generateResetToken() {
    return require('crypto').randomBytes(32).toString('hex');
}


module.exports = { User, PaymentRequest, InvoiceDraft, InvoiceTemplate, UserServices, NCFSettings, Invoice, Customer, SupportTicket, Expense, Quote, PolicyAcceptance, UserDocument, FiscalAuditLog, Partner, PartnerReferral, PartnerCommission, PartnerInvite, AdminAuditLog, PaymentAuditLog, SubscriptionAuditLog, Subscription, BillingEvent, PasswordReset, EmailVerify, generateInviteToken, generateReferralCode, getPartnerTier, getOrCreateSubscription, logAdminAction, logPaymentStatusChange, logSubscriptionStatusChange, billingEventEmitter, updateSubscriptionStatus, activateSubscriptionFromPayment };
