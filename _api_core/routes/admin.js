const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

// Todas estas rutas requieren admin
router.use(verifyToken, verifyAdmin);

// Gestión de Usuarios
router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUser);
router.post('/users/:id/activate', adminController.activateUser);
router.post('/users/:id/deactivate', adminController.deactivateUser);
router.post('/users/:id/block', adminController.blockUser);
router.post('/users/:id/unblock', adminController.unblockUser);
router.put('/users/:id/notes', adminController.updateUserNotes);
router.delete('/users/:id', adminController.deleteUser);

// Gestión de Pagos (Admin)
const billingController = require('../controllers/billing');
router.get('/pending-payments', billingController.getPendingPayments);
router.post('/approve-payment/:id', billingController.approvePayment);
router.post('/reject-payment/:id', billingController.rejectPayment);
router.get('/payments-history', billingController.getPaymentsHistory);

// Analytics y Métricas (Admin)
router.get('/stats', billingController.getStats);
router.get('/metrics', billingController.getMetrics);
router.get('/chart-data', billingController.getChartData);

// Alertas y Auditoría
router.get('/alerts', adminController.getAdminAlerts);
router.get('/audit', adminController.getAdminAudit);

// Mantenimiento de Sistema
const reconciler = require('../services/reconciler');
router.post('/reconcile', async (req, res) => {
    try {
        const results = await reconciler.reconcileSystem(true);
        res.json(results);
    } catch (e) {
        res.status(500).json({ message: 'Error en la reconciliación manual', error: e.message });
    }
});

module.exports = router;
