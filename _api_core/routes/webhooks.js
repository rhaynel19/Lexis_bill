/**
 * Rutas para webhooks de PayPal
 */

const express = require('express');
const router = express.Router();
const subscriptionService = require('../services/subscription-service');

/**
 * POST /api/webhooks/paypal
 * Recibe webhooks de PayPal
 */
router.post('/paypal', async (req, res) => {
    try {
        const webhookEvent = req.body;

        console.log('📨 Webhook recibido:', webhookEvent.event_type);
        console.log('Datos:', JSON.stringify(webhookEvent, null, 2));

        // Procesar según el tipo de evento
        switch (webhookEvent.event_type) {
            case 'BILLING.SUBSCRIPTION.ACTIVATED':
                await handleSubscriptionActivated(webhookEvent);
                break;

            case 'PAYMENT.SALE.COMPLETED':
                await handlePaymentCompleted(webhookEvent);
                break;

            case 'BILLING.SUBSCRIPTION.CANCELLED':
                await handleSubscriptionCancelled(webhookEvent);
                break;

            case 'BILLING.SUBSCRIPTION.SUSPENDED':
                await handleSubscriptionSuspended(webhookEvent);
                break;

            case 'BILLING.SUBSCRIPTION.EXPIRED':
                await handleSubscriptionExpired(webhookEvent);
                break;

            default:
                console.log(`⚠️  Evento no manejado: ${webhookEvent.event_type}`);
        }

        // Siempre responder 200 OK para que PayPal no reintente
        res.status(200).json({ received: true });
    } catch (error) {
        console.error('❌ Error procesando webhook:', error);
        // Aún así responder 200 para evitar reintentos
        res.status(200).json({ received: true, error: error.message });
    }
});

/**
 * Maneja evento de suscripción activada
 */
async function handleSubscriptionActivated(event) {
    console.log('✅ Suscripción activada');

    const subscriptionId = event.resource.id;
    const userId = event.resource.custom_id || 'user-demo'; // Obtener del custom_id

    // Crear suscripción
    subscriptionService.createOrUpdateSubscription(userId, {
        planId: 'pro',
        paypalSubscriptionId: subscriptionId,
        status: 'active'
    });

    console.log(`✅ Suscripción creada para usuario: ${userId}`);
}

/**
 * Maneja evento de pago completado
 * IMPORTANTE: Aquí se extiende la fecha de vencimiento
 */
async function handlePaymentCompleted(event) {
    console.log('💰 Pago completado');

    const saleId = event.resource.id;
    const amount = event.resource.amount.total;
    const currency = event.resource.amount.currency;
    const userId = event.resource.custom || 'user-demo'; // Obtener del campo custom

    // Agregar pago al historial
    subscriptionService.addPaymentToHistory(userId, {
        amount: parseFloat(amount),
        currency,
        status: 'completed',
        transactionId: saleId,
        date: event.create_time
    });

    // EXTENDER SUSCRIPCIÓN POR 30 DÍAS
    const subscription = subscriptionService.extendSubscription(userId, 30);

    console.log(`✅ Pago registrado para usuario: ${userId}`);
    console.log(`✅ Suscripción extendida hasta: ${subscription.expirationDate}`);
}

/**
 * Maneja evento de suscripción cancelada
 */
async function handleSubscriptionCancelled(event) {
    console.log('🚫 Suscripción cancelada');

    const subscriptionId = event.resource.id;
    const userId = event.resource.custom_id || 'user-demo';

    // Cancelar suscripción (mantiene acceso hasta vencimiento)
    subscriptionService.cancelSubscription(userId);

    console.log(`✅ Suscripción cancelada para usuario: ${userId}`);
}

/**
 * Maneja evento de suscripción suspendida
 */
async function handleSubscriptionSuspended(event) {
    console.log('⏸️  Suscripción suspendida');

    const userId = event.resource.custom_id || 'user-demo';

    const subscription = subscriptionService.getSubscription(userId);
    if (subscription) {
        subscription.status = 'suspended';
        subscriptionService.createOrUpdateSubscription(userId, subscription);
    }

    console.log(`⚠️  Suscripción suspendida para usuario: ${userId}`);
}

/**
 * Maneja evento de suscripción expirada
 */
async function handleSubscriptionExpired(event) {
    console.log('⏰ Suscripción expirada');

    const userId = event.resource.custom_id || 'user-demo';

    const subscription = subscriptionService.getSubscription(userId);
    if (subscription) {
        subscription.status = 'expired';
        subscriptionService.createOrUpdateSubscription(userId, subscription);
    }

    console.log(`❌ Suscripción expirada para usuario: ${userId}`);
}

module.exports = router;
