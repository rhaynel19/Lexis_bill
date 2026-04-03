
const express = require('express');
const router = express.Router();
const expensesController = require('../controllers/expenses');
const { verifyToken, verifyClient } = require('../middleware/auth');

// All expense routes require authentication and client role
router.use(verifyToken, verifyClient);

router.get('/', expensesController.getExpenses);
router.post('/', expensesController.createExpense);
router.delete('/:id', expensesController.deleteExpense);

module.exports = router;
