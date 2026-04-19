
const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoices');
const { verifyToken, verifyClient } = require('../middleware/auth');
const { requirePolicyAcceptance } = require('../middleware/policies');
const validate = require('../middleware/validate');
const { 
    createInvoiceSchema, 
    paymentSchema, 
    annulSchema, 
    creditNoteSchema, 
    draftSchema 
} = require('../schemas/invoice.schema');

// All invoice routes require authentication and client role
router.use(verifyToken);
router.use(verifyClient);

// Invoice CRUD & Search
router.get('/', invoiceController.getInvoices);
router.post('/', requirePolicyAcceptance, validate(createInvoiceSchema), invoiceController.createInvoice);
router.post('/:id/duplicate', invoiceController.duplicateInvoice);

// Payments & Credits
router.post('/:invoiceId/payments', validate(paymentSchema), invoiceController.registerPayment);
router.post('/:invoiceId/credit-note', requirePolicyAcceptance, validate(creditNoteSchema), invoiceController.createCreditNote);
router.post('/:id/annul', requirePolicyAcceptance, validate(annulSchema), invoiceController.annulInvoice);

// Drafts
router.get('/draft', invoiceController.getDraft);
router.put('/draft', validate(draftSchema), invoiceController.updateDraft);
router.delete('/draft', invoiceController.deleteDraft);

// Templates
router.get('/templates', invoiceController.getTemplates);
router.post('/templates', invoiceController.createTemplate);

// Reports & Collections
router.get('/statement/:rnc', invoiceController.getStatement);
router.get('/debtors', invoiceController.getDebtors);
router.post('/debtors/:rnc/settle', invoiceController.settleDebtorBalance);

module.exports = router;

