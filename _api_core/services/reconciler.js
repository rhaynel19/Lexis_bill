const { Subscription, User, updateSubscriptionStatus, logAdminAction } = require('../models');
const log = require('../logger');

/**
 * RECONCILER SERVICE
 * Maneja la lógica de mantenimiento automático de suscripciones y estados fiscales.
 */

/**
 * Job 1: Grace Manager
 * Busca suscripciones ACTIVE que ya vencieron y las pasa a GRACE_PERIOD (5 días).
 */
async function graceManagerJob() {
    const now = new Date();
    const toGrace = await Subscription.find({
        status: 'ACTIVE',
        currentPeriodEnd: { $lt: now }
    });

    log.info({ count: toGrace.length }, 'Reconciler: Iniciando Grace Manager Job');
    
    let processed = 0;
    for (const sub of toGrace) {
        try {
            await updateSubscriptionStatus(sub.userId, 'GRACE_PERIOD', {
                reason: 'Auto-reconcile: Period expired',
                changedBy: 'system_reconciler'
            });
            processed++;
        } catch (e) {
            log.error({ err: e.message, userId: sub.userId }, 'Error en Grace Manager para usuario');
        }
    }
    return processed;
}

/**
 * Job 2: Suspension Guard
 * Busca suscripciones GRACE_PERIOD cuyo periodo de gracia ya venció y las pasa a SUSPENDED.
 */
async function suspensionGuardJob() {
    const now = new Date();
    const toSuspend = await Subscription.find({
        status: 'GRACE_PERIOD',
        graceUntil: { $lt: now }
    });

    log.info({ count: toSuspend.length }, 'Reconciler: Iniciando Suspension Guard Job');
    
    let processed = 0;
    for (const sub of toSuspend) {
        try {
            await updateSubscriptionStatus(sub.userId, 'SUSPENDED', {
                reason: 'Auto-reconcile: Grace period expired',
                changedBy: 'system_reconciler'
            });
            processed++;
        } catch (e) {
            log.error({ err: e.message, userId: sub.userId }, 'Error en Suspension Guard para usuario');
        }
    }
    return processed;
}

/**
 * Reconciliación total del sistema
 */
async function reconcileSystem(force = false) {
    log.info({ force }, 'Ejecutando reconciliación total del sistema');
    
    const graceCount = await graceManagerJob();
    const suspensionCount = await suspensionGuardJob();
    
    // Tarea adicional: Bloquear usuarios cuya suscripción está suspendida (legacy support)
    const suspendedSubs = await Subscription.find({ status: 'SUSPENDED' });
    let blockedCount = 0;
    for (const sub of suspendedSubs) {
        const user = await User.findById(sub.userId);
        if (user && !user.blocked) {
            user.blocked = true;
            user.blockedAt = new Date();
            await user.save();
            blockedCount++;
        }
    }

    log.info({ graceCount, suspensionCount, blockedCount }, 'Reconciliación finalizada');
    
    return {
        success: true,
        results: {
            grace: { processed: graceCount },
            suspension: { processed: suspensionCount },
            legacyBlocking: { processed: blockedCount }
        },
        timestamp: new Date()
    };
}

module.exports = { reconcileSystem, graceManagerJob, suspensionGuardJob };
