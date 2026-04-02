
const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customers');
const { verifyToken, verifyClient } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createCustomerSchema, updateCustomerSchema } = require('../schemas/customer.schema');

// All customer routes require authentication and client role
router.use(verifyToken, verifyClient);

router.get('/', customerController.getCustomers);
router.post('/', validate(createCustomerSchema), customerController.createCustomer);
router.get('/risk', customerController.getClientRisk);
router.get('/:rnc/history', customerController.getCustomerHistory);

router.put('/:id', validate(updateCustomerSchema), customerController.updateCustomer);
router.delete('/:id', customerController.deleteCustomer);
router.post('/import', customerController.importCustomers);

// RNC/DGII Helpers (Related to Customers)
router.get('/lookup/:number', customerController.lookupRnc);
router.post('/validate-rnc', customerController.validateRnc);

module.exports = router;
