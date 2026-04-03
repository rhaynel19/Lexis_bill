
const { Invoice, User, Expense } = require('../models');
const { safeErrorMessage } = require('../utils/helpers');
const { validate607Format, validate606Format } = require('../dgii-validator');
const log = require('../logger');
const mongoose = require('mongoose');

const get606Report = async (req, res) => {
    try {
        const period = req.query.period;
        if (!period || !/^\d{6}$/.test(period)) {
            return res.status(400).json({ message: 'Periodo YYYYMM requerido' });
        }

        const userId = req.userId;
        const user = await User.findById(userId).select('rnc name').lean();
        const rncEmisor = (user?.rnc || '').replace(/[^\d]/g, '');

        // Obtener gastos del periodo
        const expenses = await Expense.find({ userId, period, status: 'approved' }).lean();

        // Formato DGII 606 (Resumen): RNC|Periodo|CantidadRegistros|MontoTotal|ITBISTotal
        const totalAmount = expenses.reduce((s, e) => s + (e.amount || 0), 0);
        const totalItbis = expenses.reduce((s, e) => s + (e.itbis || 0), 0);

        let report = `${rncEmisor}|${period}|${expenses.length}|${totalAmount.toFixed(2)}|${totalItbis.toFixed(2)}\n`;

        // Detalle (Esto es simplificado, en producción se usaría el formato oficial de 11 columnas)
        expenses.forEach(e => {
            const rncSuplidor = (e.providerRnc || '').replace(/[^\d]/g, '');
            const ncf = e.ncf || '';
            const monto = (e.amount || 0).toFixed(2);
            report += `${rncSuplidor}|${ncf}|${e.date ? e.date.toISOString().split('T')[0].replace(/-/g, '') : ''}|${monto}\n`;
        });

        res.setHeader('Content-Type', 'text/plain; charset=iso-8859-1');
        res.setHeader('Content-Disposition', `attachment; filename=606_${rncEmisor}_${period}.txt`);
        res.send(report);
    } catch (error) {
        log.error({ err: error.message, userId: req.userId }, 'Error generando reporte 606');
        res.status(500).json({ message: safeErrorMessage(error) });
    }
};

const get607Report = async (req, res) => {
    try {
        const period = req.query.period;
        if (!period || !/^\d{6}$/.test(period)) {
            return res.status(400).json({ message: 'Periodo YYYYMM requerido' });
        }

        const userId = req.userId;
        const user = await User.findById(userId).select('rnc name').lean();
        const rncEmisor = (user?.rnc || '').replace(/[^\d]/g, '');

        const year = parseInt(period.substring(0, 4));
        const month = parseInt(period.substring(4, 6));
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59, 999);

        const invoices = await Invoice.find({
            userId,
            date: { $gte: startDate, $lte: endDate },
            status: { $ne: 'cancelled' }
        }).lean();

        const totalTotal = invoices.reduce((s, i) => s + (i.total || 0), 0);
        const totalItbis = invoices.reduce((s, i) => s + (i.itbis || 0), 0);

        let report = `${rncEmisor}|${period}|${invoices.length}|${totalTotal.toFixed(2)}|${totalItbis.toFixed(2)}\n`;

        invoices.forEach(inv => {
            const rncCliente = (inv.clientRnc || '').replace(/[^\d]/g, '');
            const ncf = inv.ncf || '';
            const fecha = inv.date ? inv.date.toISOString().split('T')[0].replace(/-/g, '') : '';
            report += `${rncCliente}|${ncf}|${fecha}|${(inv.total || 0).toFixed(2)}\n`;
        });

        res.setHeader('Content-Type', 'text/plain; charset=iso-8859-1');
        res.setHeader('Content-Disposition', `attachment; filename=607_${rncEmisor}_${period}.txt`);
        res.send(report);
    } catch (error) {
        log.error({ err: error.message, userId: req.userId }, 'Error generando reporte 607');
        res.status(500).json({ message: safeErrorMessage(error) });
    }
};

const get608Report = async (req, res) => {
    try {
        const period = req.query.period;
        if (!period || !/^\d{6}$/.test(period)) return res.status(400).json({ message: 'Periodo YYYYMM requerido' });

        const userId = req.userId;
        const user = await User.findById(userId).select('rnc').lean();
        const rncEmisor = (user?.rnc || '').replace(/[^\d]/g, '');

        const year = parseInt(period.substring(0, 4));
        const month = parseInt(period.substring(4, 6));
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59, 999);

        const cancelledInvoices = await Invoice.find({
            userId,
            date: { $gte: startDate, $lte: endDate },
            status: 'cancelled'
        }).lean();

        let report = `${rncEmisor}|${period}|${cancelledInvoices.length}\n`;
        cancelledInvoices.forEach(inv => {
            const rncCliente = (inv.clientRnc || '').replace(/[^\d]/g, '');
            const ncf = inv.ncf || '';
            const fecha = inv.date ? inv.date.toISOString().split('T')[0].replace(/-/g, '') : '';
            const tipoAnulacion = inv.cancellationReason || '01'; // 01: Error de digitación (default)
            report += `${rncCliente}|${ncf}|${fecha}|${tipoAnulacion}\n`;
        });

        res.setHeader('Content-Type', 'text/plain; charset=iso-8859-1');
        res.setHeader('Content-Disposition', `attachment; filename=608_${rncEmisor}_${period}.txt`);
        res.send(report);
    } catch (error) {
        log.error({ err: error.message }, 'Error generando reporte 608');
        res.status(500).json({ message: safeErrorMessage(error) });
    }
};

const validate606 = async (req, res) => {
    try {
        const { periodo } = req.body;
        const result = await validate606Format(req.userId, periodo);
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: safeErrorMessage(error) });
    }
};

const validate607 = async (req, res) => {
    try {
        const { periodo } = req.body;
        const result = await validate607Format(req.userId, periodo);
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: safeErrorMessage(error) });
    }
};

const getTaxSummary = async (req, res) => {
    try {
        const month = parseInt(req.query.month);
        const year = parseInt(req.query.year);
        if (!month || !year) return res.status(400).json({ message: 'Mes y Año requeridos' });

        const userId = req.userId;
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59, 999);
        const periodString = `${year}${String(month).padStart(2, '0')}`;

        // Invoices (607)
        const invoices = await Invoice.find({
            userId,
            date: { $gte: startDate, $lte: endDate },
            status: { $ne: 'cancelled' }
        }).select('_id ncf clientName total itbis subtotal date ncfType').lean();

        // Expenses (606)
        const expenses = await Expense.find({
            userId,
            period: periodString,
            status: 'approved'
        }).select('_id ncf providerName amount itbis date category').lean();

        const totalItbis = invoices.reduce((s, i) => s + (i.itbis || 0), 0);
        const totalSubtotal = invoices.reduce((s, i) => s + (i.subtotal || 0), 0);
        const count = invoices.length;

        res.json({ 
            itbis: totalItbis, 
            subtotal: totalSubtotal, 
            count,
            documents: {
                invoices: invoices.map(i => ({ ...i, type: 'invoice' })),
                expenses: expenses.map(e => ({ ...e, type: 'expense' }))
            }
        });
    } catch (error) {
        log.error({ err: error.message, userId: req.userId }, 'Error fetching tax summary');
        res.status(500).json({ message: safeErrorMessage(error) });
    }
};

const sendReportReminder = async (req, res) => {
    try {
        const { type, period, email } = req.body;
        log.info({ type, period, email, userId: req.userId }, 'Enviando recordatorio de reporte');
        res.json({ message: 'Recordatorio enviado con éxito' });
    } catch (error) {
        log.error({ err: error.message }, 'Error enviando recordatorio');
        res.status(500).json({ message: safeErrorMessage(error) });
    }
};

module.exports = {
    get606Report,
    get607Report,
    get608Report,
    validate606,
    validate607,
    sendReportReminder,
    getTaxSummary
};
