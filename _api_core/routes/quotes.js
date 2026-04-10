
const express = require('express');
const router = express.Router();
const quotesController = require('../controllers/quotes');
const { verifyToken, verifyClient } = require('../middleware/auth');
const { requirePolicyAcceptance } = require('../middleware/policies');

// All quote routes require authentication and client role
router.use(verifyToken, verifyClient);

router.get('/', quotesController.getQuotes);
router.post('/', quotesController.createQuote);
router.delete('/:id', quotesController.deleteQuote);
router.post('/:id/convert', requirePolicyAcceptance, quotesController.convertToInvoice);

module.exports = router;
