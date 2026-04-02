const express = require('express');
const router = express.Router();
const systemController = require('../controllers/system');
const { verifyToken, verifyClient } = require('../middleware/auth');

router.get('/health', systemController.getHealth);
router.get('/status', systemController.getStatus);

router.get('/dashboard/stats', verifyToken, verifyClient, systemController.getDashboardStats);
router.get('/autofill/suggestions', verifyToken, verifyClient, systemController.getAutofillSuggestions);

router.get('/ncf-settings', verifyToken, verifyClient, systemController.getNcfSettings);
router.post('/ncf-settings', verifyToken, verifyClient, systemController.saveNcfSettings);
router.delete('/ncf-settings/:id', verifyToken, verifyClient, systemController.deleteNcfSettings);

router.get('/services', verifyToken, verifyClient, systemController.getServices);
router.put('/services', verifyToken, verifyClient, systemController.updateServices);

router.get('/documents', verifyToken, verifyClient, systemController.getDocuments);
router.post('/documents', verifyToken, verifyClient, systemController.uploadDocument);

module.exports = router;
