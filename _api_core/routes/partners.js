const express = require('express');
const router = express.Router();
const partnersController = require('../controllers/partners');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

// --- Rutas Públicas ---
router.get('/validate', partnersController.validateReferral);
router.get('/invite/validate', partnersController.validateInvite);

// --- Rutas de Cliente Partner ---
router.post('/apply', verifyToken, partnersController.applyPartner);
router.get('/profile', verifyToken, partnersController.verifyPartner, partnersController.getPartnerProfile);
router.get('/dashboard', verifyToken, partnersController.verifyPartner, partnersController.getPartnerDashboard);

// --- Rutas Admin: Gestión de Partners ---
router.get('/admin', verifyToken, verifyAdmin, partnersController.getPartners);
router.post('/admin/invites', verifyToken, verifyAdmin, partnersController.invitePartner);
router.get('/admin/stats', verifyToken, verifyAdmin, partnersController.getPartnerStats);
router.post('/admin/commissions/:commissionId/mark-paid', verifyToken, verifyAdmin, partnersController.markCommissionPaid);
router.get('/admin/:id', verifyToken, verifyAdmin, partnersController.getPartnerDetail);
router.get('/admin/:id/cartera', verifyToken, verifyAdmin, partnersController.getPartnerCartera);
router.post('/admin/:id/approve', verifyToken, verifyAdmin, partnersController.approvePartner);
router.post('/admin/:id/reject', verifyToken, verifyAdmin, partnersController.rejectPartner);
router.get('/admin/:id/activity', verifyToken, verifyAdmin, partnersController.getPartnerActivity);
router.patch('/admin/:id', verifyToken, verifyAdmin, partnersController.updatePartner);
router.post('/admin/calculate-commissions', verifyToken, verifyAdmin, partnersController.calculateCommissions);
router.post('/admin/:id/suspend', verifyToken, verifyAdmin, partnersController.suspendPartner);
router.post('/admin/:id/activate', verifyToken, verifyAdmin, partnersController.activatePartner);

module.exports = router;
