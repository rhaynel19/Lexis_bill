/**
 * Rutas para gestión de suscripciones
 */

const express = require('express');
const router = express.Router();
const { SUBSCRIPTION_PLANS } = require('../config/paypal');
const subscriptionService = require('../services/subscription-service');

/**
 * GET /api/subscriptions/plans
 * Obtiene los planes disponibles
 */
router.get('/plans', (req, res) => {
    try {
        res.json({
            success: true,
            plans: Object.values(SUBSCRIPTION_PLANS)
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: { message: error.message }
        });
    }
});

/**
 * GET /api/subscriptions/:userId
 * Obtiene la suscripción de un usuario
 */
router.get('/:userId', (req, res) => {
    try {
        const { userId } = req.params;
        const subscription = subscriptionService.getSubscription(userId);

        if (!subscription) {
            // Si no tiene suscripción, retornar plan básico por defecto
            return res.json({
                success: true,
                subscription: {
                    userId,
                    planId: 'basic',
                    status: 'active',
                    expirationDate: null,
                    paymentHistory: []
                }
            });
        }

        res.json({
            success: true,
            subscription
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: { message: error.message }
        });
    }
});

/**
 * POST /api/subscriptions/create
 * Crea o actualiza una suscripción
 */
router.post('/create', (req, res) => {
    try {
        const { userId, planId, paypalSubscriptionId } = req.body;

        if (!userId || !planId) {
            return res.status(400).json({
                success: false,
                error: { message: 'userId y planId son requeridos' }
            });
        }

        const subscription = subscriptionService.createOrUpdateSubscription(userId, {
            planId,
            paypalSubscriptionId,
            status: 'active'
        });

        res.json({
            success: true,
            subscription,
            message: 'Suscripción creada exitosamente'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: { message: error.message }
        });
    }
});

/**
 * POST /api/subscriptions/cancel
 * Cancela una suscripción
 */
router.post('/cancel', (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: { message: 'userId es requerido' }
            });
        }

        const subscription = subscriptionService.cancelSubscription(userId);

        res.json({
            success: true,
            subscription,
            message: 'Suscripción cancelada. Tendrás acceso hasta la fecha de vencimiento.'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: { message: error.message }
        });
    }
});

/**
 * GET /api/subscriptions/:userId/status
 * Verifica si la suscripción está activa
 */
router.get('/:userId/status', (req, res) => {
    try {
        const { userId } = req.params;
        const isActive = subscriptionService.isSubscriptionActive(userId);
        const plan = subscriptionService.getUserPlan(userId);

        res.json({
            success: true,
            isActive,
            plan
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: { message: error.message }
        });
    }
});

/**
 * POST /api/subscriptions/payment
 * Registra un pago (simulado para plan básico → pro)
 */
router.post('/payment', (req, res) => {
    try {
        const { userId, amount, transactionId } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: { message: 'userId es requerido' }
            });
        }

        // Agregar pago al historial
        const payment = subscriptionService.addPaymentToHistory(userId, {
            amount: amount || 950,
            currency: 'DOP',
            status: 'completed',
            transactionId: transactionId || `TXN-${Date.now()}`,
            date: new Date().toISOString()
        });

        // Extender suscripción por 30 días
        const subscription = subscriptionService.extendSubscription(userId, 30);

        res.json({
            success: true,
            payment,
            subscription,
            message: 'Pago procesado. Suscripción extendida por 30 días.'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: { message: error.message }
        });
    }
});

module.exports = router;
