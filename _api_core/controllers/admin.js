const { User, AdminAuditLog, Partner, PaymentRequest } = require('../models');
const { log, logAdminAction } = require('../models');
const { safeErrorMessage } = require('../utils/helpers');
const { isValidObjectId } = require('../utils/validators');
const { escapeRegex, sanitizeString } = require('../utils/sanitizers');

/**
 * Listar usuarios con filtros y paginación
 */
exports.getUsers = async (req, res) => {
    try {
        const qRaw = (req.query.q || '').trim().slice(0, 100);
        const role = (req.query.role || '').trim().toLowerCase();
        const plan = (req.query.plan || '').trim().toLowerCase();
        const statusFilter = (req.query.status || '').trim().toLowerCase();
        const activityFilter = (req.query.activity || '').trim().toLowerCase();
        const sortBy = (req.query.sortBy || 'createdAt').trim().toLowerCase();
        const sortOrder = (req.query.sortOrder || 'desc').toLowerCase() === 'asc' ? 1 : -1;
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(10, parseInt(req.query.limit, 10) || 50));
        const skip = (page - 1) * limit;

        const conditions = [];
        if (qRaw) {
            const qSafe = escapeRegex(qRaw);
            conditions.push({
                $or: [
                    { name: new RegExp(qSafe, 'i') },
                    { email: new RegExp(qSafe, 'i') },
                    { rnc: new RegExp(qSafe, 'i') }
                ]
            });
        }
        if (role && ['user', 'admin', 'partner'].includes(role)) {
            conditions.push({ role });
        }
        if (plan && ['free', 'pro', 'premium'].includes(plan)) {
            conditions.push({ $or: [{ membershipLevel: plan }, { 'subscription.plan': plan }] });
        }
        if (statusFilter === 'trial') {
            conditions.push({ subscriptionStatus: 'Trial' });
        } else if (statusFilter === 'active') {
            conditions.push({ $or: [{ subscriptionStatus: 'Activo' }, { 'subscription.status': 'active' }] });
        } else if (statusFilter === 'expired') {
            conditions.push({
                $or: [
                    { subscriptionStatus: 'Bloqueado' },
                    { 'subscription.status': 'expired' },
                    { expiryDate: { $lt: new Date() } },
                    { 'subscription.endDate': { $lt: new Date() } }
                ]
            });
        }
        if (activityFilter === 'active_7') {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            conditions.push({ lastLoginAt: { $gte: sevenDaysAgo } });
        } else if (activityFilter === 'active_30') {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            conditions.push({ lastLoginAt: { $gte: thirtyDaysAgo } });
        } else if (activityFilter === 'inactive_30') {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            conditions.push({ $or: [{ lastLoginAt: null }, { lastLoginAt: { $lt: thirtyDaysAgo } }] });
        }
        const filter = conditions.length ? { $and: conditions } : {};

        const sortField = sortBy === 'lastLoginAt' ? 'lastLoginAt' : 'createdAt';

        const [users, total] = await Promise.all([
            User.find(filter)
                .select('name email rnc role profession membershipLevel subscription subscriptionStatus expiryDate onboardingCompleted createdAt lastLoginAt blocked adminNotes')
                .sort({ [sortField]: sortOrder, createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            User.countDocuments(filter)
        ]);

        const userIds = users.map(u => u._id);
        const partners = await Partner.find({ userId: { $in: userIds } }).select('userId referralCode status tier').lean();
        const partnerByUser = Object.fromEntries(partners.map(p => [p.userId.toString(), p]));

        res.json({
            users: users.map(u => ({ ...u, partnerInfo: partnerByUser[u._id.toString()] })),
            total,
            page,
            pages: Math.ceil(total / limit)
        });
    } catch (e) {
        res.status(500).json({ message: safeErrorMessage(e) });
    }
};

/**
 * Obtener detalles de un usuario
 */
exports.getUser = async (req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: 'ID inválido' });
        const user = await User.findById(req.params.id)
            .select('-password')
            .populate('blockedBy', 'name email')
            .lean();
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
        res.json(user);
    } catch (e) {
        res.status(500).json({ message: safeErrorMessage(e) });
    }
};

/**
 * Activar manualmente una suscripción (legacy support)
 */
exports.activateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { plan, days } = req.body;
        const user = await User.findById(id);
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

        const expiry = new Date();
        expiry.setDate(expiry.getDate() + (days || 30));

        user.subscriptionStatus = 'Activo';
        user.membershipLevel = plan || 'pro';
        user.expiryDate = expiry;
        if (!user.subscription) user.subscription = {};
        user.subscription.plan = plan || 'pro';
        user.subscription.status = 'active';
        user.subscription.endDate = expiry;

        await user.save();
        await logAdminAction(req.userId, 'user_activate_manual', 'user', id, { plan, expiry });
        res.json({ message: 'Usuario activado manualmente' });
    } catch (e) {
        res.status(500).json({ message: safeErrorMessage(e) });
    }
};

/**
 * Desactivar manualmente una suscripción
 */
exports.deactivateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id);
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

        user.subscriptionStatus = 'Bloqueado';
        if (user.subscription) user.subscription.status = 'expired';

        await user.save();
        await logAdminAction(req.userId, 'user_deactivate_manual', 'user', id);
        res.json({ message: 'Usuario desactivado' });
    } catch (e) {
        res.status(500).json({ message: safeErrorMessage(e) });
    }
};

/**
 * Bloquear cuenta de usuario (suspensión total)
 */
exports.blockUser = async (req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: 'ID inválido' });
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
        user.blocked = true;
        user.blockedAt = new Date();
        user.blockedBy = req.userId;
        await user.save();
        await logAdminAction(req.userId, 'user_block', 'user', user._id.toString());
        res.json({ message: 'Usuario bloqueado exitosamente' });
    } catch (e) {
        res.status(500).json({ message: safeErrorMessage(e) });
    }
};

/**
 * Desbloquear cuenta de usuario
 */
exports.unblockUser = async (req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: 'ID inválido' });
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
        user.blocked = false;
        user.blockedAt = undefined;
        user.blockedBy = undefined;
        await user.save();
        await logAdminAction(req.userId, 'user_unblock', 'user', user._id.toString());
        res.json({ message: 'Usuario desbloqueado' });
    } catch (e) {
        res.status(500).json({ message: safeErrorMessage(e) });
    }
};

/**
 * Actualizar notas administrativas de un usuario
 */
exports.updateUserNotes = async (req, res) => {
    try {
        const { notes } = req.body;
        await User.findByIdAndUpdate(req.params.id, { adminNotes: sanitizeString(notes, 2000) });
        res.json({ message: 'Notas actualizadas' });
    } catch (e) {
        res.status(500).json({ message: safeErrorMessage(e) });
    }
};

/**
 * Eliminar usuario (acción crítica)
 */
exports.deleteUser = async (req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: 'ID inválido' });
        // En un SaaS real, esto suele ser soft delete, pero aquí procedemos con hard delete si se solicita
        const r = await User.findByIdAndDelete(req.params.id);
        if (!r) return res.status(404).json({ message: 'Usuario no encontrado' });
        await logAdminAction(req.userId, 'user_delete', 'user', req.params.id, { email: r.email });
        res.json({ message: 'Usuario eliminado permanentemente' });
    } catch (e) {
        res.status(500).json({ message: safeErrorMessage(e) });
    }
};

/**
 * Alertas administrativas consolidadas
 */
exports.getAdminAlerts = async (req, res) => {
    try {
        const now = new Date();
        const sevenDaysFromNow = new Date(now);
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const [trialsExpiring, inactiveUsers, pendingPayments, blockedCount] = await Promise.all([
            User.countDocuments({
                role: { $ne: 'admin' },
                subscriptionStatus: 'Trial',
                expiryDate: { $gte: now, $lte: sevenDaysFromNow }
            }),
            User.countDocuments({
                role: { $ne: 'admin' },
                $or: [{ lastLoginAt: null }, { lastLoginAt: { $lt: thirtyDaysAgo } }]
            }),
            PaymentRequest.countDocuments({
                status: { $in: ['pending', 'under_review'] },
                requestedAt: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
            }),
            User.countDocuments({ blocked: true })
        ]);

        const alerts = [];
        if (trialsExpiring > 0) alerts.push({ type: 'trials_expiring', count: trialsExpiring, severity: 'warning', message: `${trialsExpiring} trial(s) por vencer en 7 días` });
        if (inactiveUsers > 0) alerts.push({ type: 'inactive', count: inactiveUsers, severity: 'info', message: `${inactiveUsers} usuario(s) inactivos (>30 días)` });
        if (pendingPayments > 0) alerts.push({ type: 'pending_payments', count: pendingPayments, severity: 'warning', message: `${pendingPayments} pago(s) pendiente(s) de aprobar` });
        if (blockedCount > 0) alerts.push({ type: 'blocked', count: blockedCount, severity: 'info', message: `${blockedCount} cuenta(s) bloqueada(s)` });

        res.json({ alerts });
    } catch (e) {
        res.status(500).json({ message: safeErrorMessage(e) });
    }
};

/**
 * Log de auditoría administrativa
 */
exports.getAdminAudit = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(10, parseInt(req.query.limit, 10) || 50));
        const skip = (page - 1) * limit;

        const [logs, total] = await Promise.all([
            AdminAuditLog.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
            AdminAuditLog.countDocuments()
        ]);

        res.json({ list: logs, total, page, limit });
    } catch (e) {
        res.status(500).json({ message: safeErrorMessage(e) });
    }
};
