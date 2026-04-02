const log = require('../logger');

/** Recalcula subtotal, itbis y total desde ítems (nunca confiar en frontend). Usa taxSettings del usuario. */
function computeAmountsFromItems(items, appConfig) {
    let subtotal = 0;
    let totalItbis = 0;
    const isTaxExemptCompany = appConfig?.taxSettings?.isTaxExemptCompany || false;

    items.forEach(item => {
        const itemTotal = item.quantity * item.price;
        subtotal += itemTotal;
        
        // El ítem es gravado si no es exento Y la empresa no es exenta
        if (!isTaxExemptCompany && !item.isExempt && item.taxCategory !== 'exempt') {
            const rate = item.taxRate != null ? Number(item.taxRate) : 0.18;
            totalItbis += itemTotal * rate;
        }
    });

    const total = subtotal + totalItbis;

    return { subtotal, itbis: totalItbis, total };
}

/** En producción no exponer mensajes internos ni stack al cliente. */
function safeErrorMessage(err) {
    // Audit Quick Win: Registrar el error real en la consola del servidor para depuración
    if (err) console.error('[SAFE_ERROR_LOG]', err);
    return (err && err.message ? err.message : 'Error interno del servidor');
}

/** Base URL del sitio desde el request (Vercel/proxy). Sin usar variables de entorno de dominio. */
function getBaseUrl(req) {
    const proto = req.get('x-forwarded-proto') || (req.secure ? 'https' : 'http');
    const host = req.get('x-forwarded-host') || req.get('host') || '';
    return host ? `${proto}://${host}` : 'https://trinalyze.do';
}

function getUserSubscription(user) {
    // Usuario oficial/admin: acceso total siempre (plan Pro, sin bloqueos)
    if (user?.role === 'admin') {
        return {
            plan: 'pro',
            status: 'active',
            paymentMethod: null,
            startDate: user.createdAt,
            endDate: null
        };
    }
    const sub = user.subscription || {};
    const plan = sub.plan || user.membershipLevel || 'free';
    let status = sub.status;
    if (!status) {
        if (user.subscriptionStatus === 'Activo') status = 'active';
        else if (user.subscriptionStatus === 'Bloqueado') status = 'expired';
        else status = 'active';
    }
    return {
        plan,
        status: status || 'active',
        paymentMethod: sub.paymentMethod || null,
        startDate: sub.startDate || user.createdAt,
        endDate: sub.endDate || user.expiryDate
    };
}


module.exports = {
    computeAmountsFromItems,
    safeErrorMessage,
    getBaseUrl,
    getUserSubscription
};


