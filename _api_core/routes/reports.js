
const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reports');
const { verifyToken, verifyClient } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { reportQuerySchema, validate606Schema, validate607Schema } = require('../schemas/report.schema');

// All report routes require authentication and client role
router.use(verifyToken, verifyClient);

// Download Reports
router.get('/606', validate(reportQuerySchema, 'query'), reportController.get606Report);
router.get('/607', validate(reportQuerySchema, 'query'), reportController.get607Report);
router.get('/608', validate(reportQuerySchema, 'query'), reportController.get608Report);

// Validate Reports
router.post('/606/validate', validate(validate606Schema), reportController.validate606);
router.post('/607/validate', validate(validate607Schema), reportController.validate607);

// Summary Reports
router.get('/summary', reportController.getTaxSummary);

// Reminders
router.post('/reminder', reportController.sendReportReminder);

// Send to Accountant
router.post('/send-to-accountant', reportController.sendToAccountant);

module.exports = router;
