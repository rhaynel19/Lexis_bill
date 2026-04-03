
const { Expense } = require('../models');
const { safeErrorMessage } = require('../utils/helpers');

const getExpenses = async (req, res) => {
    try {
        const expenses = await Expense.find({ userId: req.userId }).sort({ date: -1 }).lean();
        res.json(expenses);
    } catch (error) {
        res.status(500).json({ message: safeErrorMessage(error) });
    }
};

const createExpense = async (req, res) => {
    try {
        const data = req.body;
        const newExpense = new Expense({
            userId: req.userId,
            supplierName: data.supplierName,
            supplierRnc: data.supplierRnc,
            ncf: data.ncf,
            amount: data.amount,
            itbis: data.itbis || 0,
            category: data.category || '01',
            date: data.date || new Date(),
            imageUrl: data.imageUrl,
            paymentMethod: data.paymentMethod || '01'
        });

        await newExpense.save();
        res.status(201).json(newExpense);
    } catch (error) {
        res.status(500).json({ message: safeErrorMessage(error) });
    }
};

const deleteExpense = async (req, res) => {
    try {
        const { id } = req.params;
        await Expense.deleteOne({ _id: id, userId: req.userId });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: safeErrorMessage(error) });
    }
};

module.exports = {
    getExpenses,
    createExpense,
    deleteExpense
};
