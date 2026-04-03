
const mongoose = require('mongoose');
const { Quote, Invoice, Customer, NCFSettings } = require('../models');
const { safeErrorMessage } = require('../utils/helpers');
const { computeAmountsFromItems } = require('../utils/helpers');
const { getNextNcf } = require('../services/dgii');

const getQuotes = async (req, res) => {
    try {
        const quotes = await Quote.find({ userId: req.userId }).sort({ createdAt: -1 }).lean();
        res.json(quotes);
    } catch (error) {
        res.status(500).json({ message: safeErrorMessage(error) });
    }
};

const createQuote = async (req, res) => {
    try {
        const data = req.body;
        const taxSettings = req.user?.taxSettings || {};
        const { subtotal, itbis, total } = computeAmountsFromItems(data.items || [], taxSettings);

        const newQuote = new Quote({
            userId: req.userId,
            clientName: data.clientName,
            clientRnc: data.clientRnc,
            clientPhone: data.clientPhone,
            items: data.items,
            subtotal,
            itbis,
            total,
            status: 'draft',
            validUntil: data.validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        });

        await newQuote.save();
        res.status(201).json(newQuote);
    } catch (error) {
        res.status(500).json({ message: safeErrorMessage(error) });
    }
};

const deleteQuote = async (req, res) => {
    try {
        const { id } = req.params;
        await Quote.deleteOne({ _id: id, userId: req.userId });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: safeErrorMessage(error) });
    }
};

const convertToInvoice = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { id } = req.params;
        const config = req.body; // ncfType, tipoPago, etc.

        const quote = await Quote.findOne({ _id: id, userId: req.userId }).session(session);
        if (!quote) throw new Error("Cotización no encontrada");
        if (quote.status === 'converted') throw new Error("Esta cotización ya fue facturada");

        const fullNcf = await getNextNcf(req.userId, config.ncfType, session, quote.clientRnc);
        if (!fullNcf) throw new Error("No hay secuencias NCF disponibles.");

        const newInvoice = new Invoice({
            userId: req.userId,
            clientName: quote.clientName,
            clientRnc: quote.clientRnc,
            clientPhone: quote.clientPhone,
            clientAddress: quote.clientAddress,
            ncf: fullNcf,
            ncfType: config.ncfType,
            items: quote.items,
            subtotal: quote.subtotal,
            itbis: quote.itbis,
            total: quote.total,
            tipoPago: config.tipoPago || 'efectivo',
            montoPagado: config.tipoPago === 'credito' ? 0 : quote.total,
            balancePendiente: config.tipoPago === 'credito' ? quote.total : 0,
            estadoPago: config.tipoPago === 'credito' ? 'pendiente' : 'pagado',
            fechaPago: config.tipoPago === 'credito' ? null : new Date(),
            isrRetention: config.isrRetention || 0,
            itbisRetention: config.itbisRetention || 0,
            date: new Date()
        });

        await newInvoice.save({ session });
        
        quote.status = 'converted';
        quote.invoiceId = newInvoice._id;
        await quote.save({ session });

        await session.commitTransaction();
        session.endSession();

        res.status(201).json({ message: 'Factura creada exitosamente', ncf: fullNcf, invoice: newInvoice });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({ message: safeErrorMessage(error) });
    }
};

module.exports = {
    getQuotes,
    createQuote,
    deleteQuote,
    convertToInvoice
};
