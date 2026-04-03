const { Partner, PartnerReferral, PartnerInvite, PartnerCommission, User, AdminAuditLog, generateInviteToken, generateReferralCode, getPartnerTier } = require('../models');
const { log } = require('../logger');
const { logAdminAction, logPaymentStatusChange } = require('../models'); // Re-using existing generation logic from models exports
const { sanitizeString } = require('../utils/sanitizers');
const { safeErrorMessage, getBaseUrl } = require('../utils/helpers');
const { isValidObjectId } = require('../utils/validators');
const rateLimit = require('express-rate-limit');

/**
 * Validar código de referido (público)
 */
exports.validateReferral = async (req, res) => {
    try {
        const code = sanitizeString(req.query.code || '', 20).toUpperCase();
        if (!code) return res.json({ valid: false });
        const partner = await Partner.findOne({ referralCode: code, status: 'active' });
        res.json({ valid: !!partner, partnerName: partner?.name });
    } catch (e) {
        res.json({ valid: false });
    }
};

/**
 * Validar token de invitación partner (público)
 */
exports.validateInvite = async (req, res) => {
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
};

/**
 * Aplicar para ser Partner (requiere login)
 */
exports.applyPartner = async (req, res) => {
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
        log.error({ err: e.message, userId: req.userId }, 'Error applying for partner');
        res.status(500).json({ message: safeErrorMessage(e) });
    }
};

// --- ADMIN: Partners Management ---

exports.getPartners = async (req, res) => {
    try {
        const list = await Partner.find({}).populate('userId', 'name email createdAt').sort({ createdAt: -1 }).lean();
        
        // Enriquecer con conteos de clientes y ganancias
        const enrichedList = await Promise.all(list.map(async (p) => {
            const [activeClients, trialClients, churnedClients] = await Promise.all([
                PartnerReferral.countDocuments({ partnerId: p._id, status: 'active' }),
                PartnerReferral.countDocuments({ partnerId: p._id, status: 'trial' }),
                PartnerReferral.countDocuments({ partnerId: p._id, status: 'churned' })
            ]);

            const commissions = await PartnerCommission.find({ partnerId: p._id });
            const totalEarned = commissions.reduce((sum, c) => sum + (c.commissionAmount || 0), 0);
            const pendingPayout = commissions.filter(c => c.status === 'pending' || c.status === 'approved').reduce((sum, c) => sum + (c.commissionAmount || 0), 0);

            return {
                ...p,
                activeClients,
                trialClients,
                churnedClients,
                totalEarned,
                pendingPayout
            };
        }));

        res.json(enrichedList);
    } catch (e) {
        res.status(500).json({ message: safeErrorMessage(e) });
    }
};

exports.invitePartner = async (req, res) => {
    try {
        const { maxUses, expiresDays } = req.body;
        const expiresAt = expiresDays ? new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000) : null;
        const invite = new PartnerInvite({
            token: generateInviteToken(),
            createdBy: req.userId,
            maxUses: maxUses || 1,
            expiresAt
        });
        await invite.save();
        res.status(201).json(invite);
    } catch (e) {
        res.status(500).json({ message: safeErrorMessage(e) });
    }
};

exports.getPartnerStats = async (req, res) => {
    try {
        const [totalPartners, pendingApprovals, activePartners] = await Promise.all([
            Partner.countDocuments({}),
            Partner.countDocuments({ status: 'pending' }),
            Partner.countDocuments({ status: 'active' })
        ]);

        const [activeReferrals, totalReferrals, trialReferrals, churnedReferrals] = await Promise.all([
            PartnerReferral.countDocuments({ status: 'active' }),
            PartnerReferral.countDocuments({}),
            PartnerReferral.countDocuments({ status: 'trial' }),
            PartnerReferral.countDocuments({ status: 'churned' })
        ]);

        const commissions = await PartnerCommission.find({});
        const commissionsThisMonth = commissions.filter(c => {
            const now = new Date();
            return c.month === String(now.getMonth() + 1).padStart(2, '0') && c.year === now.getFullYear();
        }).reduce((sum, c) => sum + (c.commissionAmount || 0), 0);

        const commissionsPending = commissions.filter(c => c.status === 'pending' || c.status === 'approved').reduce((sum, c) => sum + (c.commissionAmount || 0), 0);
        const commissionsPaid = commissions.filter(c => c.status === 'paid').reduce((sum, c) => sum + (c.commissionAmount || 0), 0);

        res.json({
            totalPartners,
            pendingApprovals,
            activePartners,
            activeReferrals,
            totalReferrals,
            trialReferrals,
            churnedReferrals,
            commissionsThisMonth,
            commissionsPending,
            commissionsPaid
        });
    } catch (e) {
        res.status(500).json({ message: safeErrorMessage(e) });
    }
};

exports.markCommissionPaid = async (req, res) => {
    try {
        const { paymentRef } = req.body;
        const c = await PartnerCommission.findById(req.params.commissionId);
        if (!c) return res.status(404).json({ message: 'Comisión no encontrada' });
        c.status = 'paid';
        c.paidAt = new Date();
        c.paymentRef = paymentRef;
        await c.save();
        res.json({ message: 'Comisión marcada como pagada' });
    } catch (e) {
        res.status(500).json({ message: safeErrorMessage(e) });
    }
};

exports.getPartnerDetail = async (req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: 'ID inválido' });
        const p = await Partner.findById(req.params.id).populate('userId', 'name email rnc phone lastLoginAt');
        if (!p) return res.status(404).json({ message: 'Partner no encontrado' });
        res.json(p);
    } catch (e) {
        res.status(500).json({ message: safeErrorMessage(e) });
    }
};

exports.getPartnerCartera = async (req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: 'ID inválido' });
        const p = await Partner.findById(req.params.id).populate('userId', 'name email').lean();
        const referrals = await PartnerReferral.find({ partnerId: req.params.id }).populate('userId', 'name email membershipLevel subscriptionStatus createdAt lastLoginAt').lean();
        res.json({ partner: p, cartera: referrals });
    } catch (e) {
        res.status(500).json({ message: safeErrorMessage(e) });
    }
};

exports.approvePartner = async (req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: 'ID inválido' });
        const p = await Partner.findById(req.params.id);
        if (!p) return res.status(404).json({ message: 'Partner no encontrado' });
        p.status = 'active';
        p.approvedAt = new Date();
        p.approvedBy = req.userId;
        await p.save();
        await User.findByIdAndUpdate(p.userId, { role: 'partner' });
        await logAdminAction(req.userId, 'partner_approve', 'partner', p._id.toString(), { referralCode: p.referralCode });
        res.json({ message: 'Partner aprobado y rol actualizado' });
    } catch (e) {
        res.status(500).json({ message: safeErrorMessage(e) });
    }
};

exports.rejectPartner = async (req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: 'ID inválido' });
        const p = await Partner.findById(req.params.id);
        if (!p) return res.status(404).json({ message: 'Partner no encontrado' });
        p.status = 'rejected';
        p.rejectedAt = new Date();
        await p.save();
        await logAdminAction(req.userId, 'partner_reject', 'partner', p._id.toString());
        res.json({ message: 'Solicitud rechazada' });
    } catch (e) {
        res.status(500).json({ message: safeErrorMessage(e) });
    }
};

exports.getPartnerActivity = async (req, res) => {
    try {
        const logs = await AdminAuditLog.find({ targetType: 'partner', targetId: req.params.id }).sort({ createdAt: -1 }).limit(50);
        res.json(logs);
    } catch (e) {
        res.status(500).json({ message: safeErrorMessage(e) });
    }
};

exports.updatePartner = async (req, res) => {
    try {
        const { tier, commissionRate } = req.body;
        const p = await Partner.findByIdAndUpdate(req.params.id, { tier, commissionRate, updatedAt: new Date() }, { new: true });
        await logAdminAction(req.userId, 'partner_update', 'partner', p._id.toString(), { tier, commissionRate });
        res.json(p);
    } catch (e) {
        res.status(500).json({ message: safeErrorMessage(e) });
    }
};

exports.calculateCommissions = async (req, res) => {
    try {
        const now = new Date();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();
        const partners = await Partner.find({ status: 'active' });
        const results = [];
        for (const p of partners) {
            const referrals = await PartnerReferral.find({ partnerId: p._id, status: 'active' });
            const commission = new PartnerCommission({
                partnerId: p._id,
                month,
                year,
                activeClientsCount: referrals.length,
                totalRevenue: referrals.length * 950,
                commissionRate: p.commissionRate,
                commissionAmount: referrals.length * 950 * p.commissionRate
            });
            await commission.save().catch(() => {}); // Ignorar duplicados
            results.push(commission);
        }
        res.json({ success: true, count: results.length });
    } catch (e) {
        res.status(500).json({ message: safeErrorMessage(e) });
    }
};

exports.suspendPartner = async (req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: 'ID inválido' });
        const p = await Partner.findById(req.params.id);
        if (!p) return res.status(404).json({ message: 'Partner no encontrado' });
        if (p.status === 'suspended') return res.status(400).json({ message: 'El partner ya está suspendido' });
        p.status = 'suspended';
        p.suspendedAt = new Date();
        p.updatedAt = new Date();
        await p.save();
        await logAdminAction(req.userId, 'partner_suspend', 'partner', p._id.toString(), { referralCode: p.referralCode });
        res.json({ message: 'Partner suspendido' });
    } catch (e) {
        res.status(500).json({ message: safeErrorMessage(e) });
    }
};

exports.activatePartner = async (req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: 'ID inválido' });
        const p = await Partner.findById(req.params.id);
        if (!p) return res.status(404).json({ message: 'Partner no encontrado' });
        if (p.status === 'active') return res.status(400).json({ message: 'El partner ya está activo' });
        p.status = 'active';
        p.suspendedAt = undefined;
        p.updatedAt = new Date();
        await p.save();
        await logAdminAction(req.userId, 'partner_activate', 'partner', p._id.toString(), { referralCode: p.referralCode });
        res.json({ message: 'Partner activado correctamente' });
    } catch (e) {
        res.status(500).json({ message: safeErrorMessage(e) });
    }
};


/**
 * Obtener perfil de partner
 */
exports.getPartnerProfile = async (req, res) => {
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
        const baseUrl = getBaseUrl(req);
        res.json({
            referralCode: p.referralCode,
            referralUrl: `${baseUrl}/registro?ref=${p.referralCode}`,
            tier: p.tier,
            commissionRate: p.commissionRate,
            activeClients: activeCount,
            trialClients: trialCount
        });
    } catch (e) {
        res.status(500).json({ message: safeErrorMessage(e) });
    }
};

/**
 * Dashboard de Partner
 */
exports.getPartnerDashboard = async (req, res) => {
    try {
        const p = req.partner;
        const activeCount = await PartnerReferral.countDocuments({ partnerId: p._id, status: 'active' });
        const trialCount = await PartnerReferral.countDocuments({ partnerId: p._id, status: 'trial' });
        const churnedCount = await PartnerReferral.countDocuments({ partnerId: p._id, status: 'churned' });
        const commissionRate = 0.30;
        const pricePerClient = 950;
        const estimatedMonthlyEarnings = Math.round(activeCount * pricePerClient * commissionRate);

        const commissions = await PartnerCommission.find({ partnerId: p._id })
            .sort({ year: -1, month: -1 }).limit(24).lean();
            
        const totalCommissions = commissions.reduce((sum, c) => sum + (c.commissionAmount || 0), 0);
        const pendingCommissionsTotal = commissions.filter(c => c.status === 'pending').reduce((sum, c) => sum + (c.commissionAmount || 0), 0);

        const rawReferrals = await PartnerReferral.find({ partnerId: p._id })
            .populate('userId', 'name email createdAt plan')
            .sort({ createdAt: -1 })
            .lean();

        const referrals = rawReferrals.map(r => ({
            id: r._id,
            status: r.status,
            name: r.userId ? r.userId.name : 'Usuario',
            email: r.userId ? r.userId.email : '',
            plan: r.userId?.plan || 'Estándar',
            monthlyCommission: Math.round(pricePerClient * commissionRate),
            joinedAt: r.createdAt || r.registeredAt
        }));

        const baseUrl = getBaseUrl(req);
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const showWelcome = p.approvedAt && new Date(p.approvedAt) >= sevenDaysAgo;
        
        res.json({
            referralCode: p.referralCode,
            referralUrl: `${baseUrl}/registro?ref=${p.referralCode}`,
            tier: "Partner",
            commissionRate,
            activeClients: activeCount,
            trialClients: trialCount,
            churnedClients: churnedCount,
            totalReferrals: activeCount + trialCount + churnedCount,
            estimatedMonthlyEarnings,
            totalCommissions,
            pendingCommissionsTotal,
            approvedAt: p.approvedAt,
            showWelcomeMessage: !!showWelcome,
            referrals,
            commissions: commissions.map(c => ({
                month: c.month,
                year: c.year,
                activeClients: c.activeClientsCount,
                amount: c.commissionAmount,
                status: c.status,
                paidAt: c.paidAt
            }))
        });
    } catch (e) {
        res.status(500).json({ message: safeErrorMessage(e) });
    }
};

/**
 * Middleware para asegurar que el usuario es un Partner activo
 */
exports.verifyPartner = async (req, res, next) => {
    try {
        const p = await Partner.findOne({ userId: req.userId, status: 'active' });
        if (!p) return res.status(403).json({ message: 'Acceso denegado. No eres partner activo.' });
        req.partner = p;
        next();
    } catch (e) {
        res.status(500).json({ message: safeErrorMessage(e) });
    }
};
