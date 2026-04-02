/**
 * Servicio de gestión de suscripciones
 * Maneja la lógica de negocio para suscripciones de usuarios
 */

const { SUBSCRIPTION_PLANS } = require('../config/paypal');

// Simulación de base de datos (en producción usar MongoDB/PostgreSQL)
let subscriptions = [];

/**
 * Crea o actualiza una suscripción
 */
function createOrUpdateSubscription(userId, subscriptionData) {
    const existingIndex = subscriptions.findIndex(sub => sub.userId === userId);

    const subscription = {
        userId,
        planId: subscriptionData.planId,
        paypalSubscriptionId: subscriptionData.paypalSubscriptionId || null,
        status: subscriptionData.status || 'active',
        startDate: subscriptionData.startDate || new Date().toISOString(),
        expirationDate: calculateExpirationDate(subscriptionData.planId),
        nextBillingDate: subscriptionData.nextBillingDate || null,
        paymentHistory: subscriptionData.paymentHistory || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
        subscriptions[existingIndex] = { ...subscriptions[existingIndex], ...subscription };
    } else {
        subscriptions.push(subscription);
    }

    // Guardar en localStorage del servidor (temporal)
    saveToStorage();

    return subscription;
}

/**
 * Calcula la fecha de vencimiento según el plan
 */
function calculateExpirationDate(planId) {
    const now = new Date();

    if (planId === 'basic') {
        // Plan básico nunca vence
        return null;
    }

    // Planes de pago (Growth and Corporate): 30 días desde ahora
    const expirationDate = new Date(now);
    expirationDate.setDate(expirationDate.getDate() + 30);
    return expirationDate.toISOString();
}

/**
 * Extiende la fecha de vencimiento (cuando se recibe un pago)
 */
function extendSubscription(userId, days = 30) {
    const subscription = getSubscription(userId);

    if (!subscription) {
        throw new Error('Suscripción no encontrada');
    }

    // Si no tiene fecha de vencimiento (plan básico), no hacer nada
    if (!subscription.expirationDate) {
        return subscription;
    }

    // Extender desde la fecha actual de vencimiento
    const currentExpiration = new Date(subscription.expirationDate);
    const newExpiration = new Date(currentExpiration);
    newExpiration.setDate(newExpiration.getDate() + days);

    subscription.expirationDate = newExpiration.toISOString();
    subscription.updatedAt = new Date().toISOString();

    // Actualizar en el array
    const index = subscriptions.findIndex(sub => sub.userId === userId);
    if (index >= 0) {
        subscriptions[index] = subscription;
    }

    saveToStorage();

    return subscription;
}

/**
 * Agrega un pago al historial
 */
function addPaymentToHistory(userId, paymentData) {
    const subscription = getSubscription(userId);

    if (!subscription) {
        throw new Error('Suscripción no encontrada');
    }

    const payment = {
        id: paymentData.id || Date.now().toString(),
        date: paymentData.date || new Date().toISOString(),
        amount: paymentData.amount,
        currency: paymentData.currency || 'DOP',
        status: paymentData.status || 'completed',
        transactionId: paymentData.transactionId,
        receiptUrl: paymentData.receiptUrl || null,
    };

    if (!subscription.paymentHistory) {
        subscription.paymentHistory = [];
    }

    subscription.paymentHistory.push(payment);
    subscription.updatedAt = new Date().toISOString();

    // Actualizar en el array
    const index = subscriptions.findIndex(sub => sub.userId === userId);
    if (index >= 0) {
        subscriptions[index] = subscription;
    }

    saveToStorage();

    return payment;
}

/**
 * Obtiene la suscripción de un usuario
 */
function getSubscription(userId) {
    return subscriptions.find(sub => sub.userId === userId);
}

/**
 * Cancela una suscripción
 */
function cancelSubscription(userId) {
    const subscription = getSubscription(userId);

    if (!subscription) {
        throw new Error('Suscripción no encontrada');
    }

    subscription.status = 'cancelled';
    subscription.updatedAt = new Date().toISOString();
    // Mantener la fecha de vencimiento para que el usuario tenga acceso hasta el final del período pagado

    const index = subscriptions.findIndex(sub => sub.userId === userId);
    if (index >= 0) {
        subscriptions[index] = subscription;
    }

    saveToStorage();

    return subscription;
}

/**
 * Verifica si una suscripción está activa
 */
function isSubscriptionActive(userId) {
    const subscription = getSubscription(userId);

    if (!subscription) {
        return false;
    }

    // Plan básico siempre está activo
    if (subscription.planId === 'basic') {
        return true;
    }

    // Verificar si está cancelada
    if (subscription.status === 'cancelled' || subscription.status === 'expired') {
        // Verificar si aún tiene acceso hasta la fecha de vencimiento
        if (subscription.expirationDate) {
            const now = new Date();
            const expiration = new Date(subscription.expirationDate);
            return now < expiration;
        }
        return false;
    }

    // Verificar fecha de vencimiento
    if (subscription.expirationDate) {
        const now = new Date();
        const expiration = new Date(subscription.expirationDate);
        return now < expiration;
    }

    return subscription.status === 'active';
}

/**
 * Obtiene el plan de un usuario
 */
function getUserPlan(userId) {
    const subscription = getSubscription(userId);

    if (!subscription) {
        return SUBSCRIPTION_PLANS.BASIC; // Plan por defecto
    }

    return SUBSCRIPTION_PLANS[subscription.planId.toUpperCase()] || SUBSCRIPTION_PLANS.BASIC;
}

/**
 * Guarda las suscripciones en archivo (temporal)
 */
function saveToStorage() {
    // En producción, esto sería una operación de base de datos
    // Por ahora, solo mantenemos en memoria
    // Para persistencia real, usar fs.writeFileSync o base de datos
}

/**
 * Carga las suscripciones desde archivo (temporal)
 */
function loadFromStorage() {
    // En producción, esto cargaría desde base de datos
    // Por ahora, retornar array vacío
    return [];
}

// Inicializar
subscriptions = loadFromStorage();

module.exports = {
    createOrUpdateSubscription,
    extendSubscription,
    addPaymentToHistory,
    getSubscription,
    cancelSubscription,
    isSubscriptionActive,
    getUserPlan,
    calculateExpirationDate,
};
