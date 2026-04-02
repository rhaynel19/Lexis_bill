const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billing');
const { verifyToken, verifyAdmin, verifyClient } = require('../middleware/auth');

// --- Rutas de Cliente (Membresías y Suscripciones) ---
router.get('/membership/plans', billingController.getMembershipPlans);
router.get('/membership/payment-info', billingController.getPaymentInfo);
router.post('/membership/prepare-transfer', verifyToken, verifyClient, billingController.prepareTransfer);
router.post('/membership/request-payment', verifyToken, verifyClient, billingController.requestPayment);
router.get('/subscription/status', verifyToken, verifyClient, billingController.getSubscriptionStatus);
router.get('/payments/history', verifyToken, verifyClient, billingController.getPaymentsHistory);
router.get('/alerts', verifyToken, verifyClient, billingController.getAlerts);
router.get('/business-copilot', verifyToken, verifyClient, billingController.getBusinessCopilot);

// PayPal Webhook (Public)
router.post('/webhooks/paypal', express.raw({ type: 'application/json' }), billingController.paypalWebhook);

module.exports = router;
