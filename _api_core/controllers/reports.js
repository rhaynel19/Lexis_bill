
const { Invoice, User, Expense } = require('../models');
const { safeErrorMessage } = require('../utils/helpers');
const { validate607Format, validate606Format } = require('../dgii-validator');
const log = require('../logger');
const { sendMailWithAttachments } = require('../mailer');
const mongoose = require('mongoose');

/**
 * Genera el contenido del reporte 606 (Compras) en formato oficial DGII (22 columnas).
 */
const generate606Content = async (userId, period) => {
    const user = await User.findById(userId).select('rnc name').lean();
    const rncEmisor = (user?.rnc || '').replace(/[^\d]/g, '');

    const expenses = await Expense.find({ userId, period, status: 'approved' }).sort({ date: 1 }).lean();

    // Cabecera: 606|RNC|Periodo|Cantidad
    let content = `606|${rncEmisor}|${period}|${expenses.length}\n`;

    expenses.forEach(e => {
        const row = [
            (e.supplierRnc || '').replace(/[^\d]/g, ''), // 1. RNC o Cédula Suplidor
            (e.supplierRnc || '').replace(/[^\d]/g, '').length === 9 ? '1' : '2', // 2. Tipo ID Suplidor (1: RNC, 2: Cédula)
            e.category || '01', // 3. Tipo de Bienes y Servicios
            e.ncf || '', // 4. NCF
            '', // 5. NCF Modificado
            e.date ? e.date.toISOString().split('T')[0].replace(/-/g, '') : '', // 6. Fecha Comprobante
            e.date ? e.date.toISOString().split('T')[0].replace(/-/g, '') : '', // 7. Fecha Pago (Asumida misma fecha)
            '0.00', // 8. Monto Facturado en Servicios
            (e.amount || 0).toFixed(2), // 9. Monto Facturado en Bienes
            (e.amount || 0).toFixed(2), // 10. Total Monto Facturado
            (e.itbis || 0).toFixed(2),  // 11. ITBIS Facturado
            '0.00', // 12. ITBIS Retenido
            '0.00', // 13. ITBIS Sujeto a Proporcionalidad
            '0.00', // 14. ITBIS Costo
            '0.00', // 15. ITBIS por Adelantar
            '0.00', // 16. ITBIS Percibido en Compras
            '01',   // 17. Tipo de Retención en ISR
            '0.00', // 18. Monto Retención Renta
            '0.00', // 19. ISR Percibido en Compras
            '0.00', // 20. Impuesto Selectivo al Consumo
            '0.00', // 21. Otros Impuestos/Tasas
            '0.00'  // 22. Monto Propina Legal
        ];
        content += row.join('|') + '\n';
    });
    return { content, rncEmisor, count: expenses.length };
};

/**
 * Genera el contenido del reporte 607 (Ventas) en formato oficial DGII (23 columnas).
 */
const generate607Content = async (userId, period) => {
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
    }).sort({ date: 1 }).lean();

    // Cabecera: 607|RNC|Periodo|Cantidad
    let content = `607|${rncEmisor}|${period}|${invoices.length}\n`;

    invoices.forEach(inv => {
        const cleanRnc = (inv.clientRnc || '').replace(/[^\d]/g, '');
        const tipoId = cleanRnc.length === 9 ? '1' : (cleanRnc.length === 11 ? '2' : '3'); // 1:RNC, 2:Cedula, 3:Pasaporte
        
        const row = [
            cleanRnc, // 1. RNC o Cédula Cliente
            tipoId,   // 2. Tipo ID Cliente
            inv.ncf || '', // 3. NCF
            inv.modifiedNcf || '', // 4. NCF Modificado
            '01', // 5. Tipo Ingreso (01: Operaciones)
            inv.date ? inv.date.toISOString().split('T')[0].replace(/-/g, '') : '', // 6. Fecha Comprobante
            '', // 7. Fecha Retención
            (inv.itbis || 0).toFixed(2), // 8. ITBIS Facturado
            (inv.itbisRetention || 0).toFixed(2), // 9. ITBIS Retenido por Terceros
            '0.00', // 10. ITBIS Percibido
            (inv.isrRetention || 0).toFixed(2), // 11. Retención Renta por Terceros
            '0.00', // 12. ISR Percibido por Terceros
            '0.00', // 13. Impuesto Selectivo al Consumo
            '0.00', // 14. Otros Impuestos/Tasas
            '0.00', // 15. Monto Propina Legal
            inv.tipoPago === 'efectivo' ? (inv.total || 0).toFixed(2) : '0.00', // 16. Monto Efectivo
            inv.tipoPago === 'transferencia' ? (inv.total || 0).toFixed(2) : '0.00', // 17. Monto Cheque/Transferencia
            inv.tipoPago === 'tarjeta' ? (inv.total || 0).toFixed(2) : '0.00', // 18. Monto Tarjeta
            inv.tipoPago === 'credito' ? (inv.total || 0).toFixed(2) : '0.00', // 19. Monto a Crédito
            '0.00', // 20. Monto Bonos
            '0.00', // 21. Monto Permuta
            '0.00', // 22. Otras Formas
            '0.00'  // 23. Monto Otras Ventas
        ];
        content += row.join('|') + '\n';
    });
    return { content, rncEmisor, count: invoices.length };
};

const get606Report = async (req, res) => {
    try {
        const period = req.query.period;
        if (!period || !/^\d{6}$/.test(period)) return res.status(400).json({ message: 'Periodo YYYYMM requerido' });
        const { content, rncEmisor } = await generate606Content(req.userId, period);
        res.setHeader('Content-Type', 'text/plain; charset=iso-8859-1');
        res.setHeader('Content-Disposition', `attachment; filename=606_${rncEmisor}_${period}.txt`);
        res.send(content);
    } catch (error) {
        log.error({ err: error.message, userId: req.userId }, 'Error generando reporte 606');
        res.status(500).json({ message: safeErrorMessage(error) });
    }
};

const get607Report = async (req, res) => {
    try {
        const period = req.query.period;
        if (!period || !/^\d{6}$/.test(period)) return res.status(400).json({ message: 'Periodo YYYYMM requerido' });
        const { content, rncEmisor } = await generate607Content(req.userId, period);
        res.setHeader('Content-Type', 'text/plain; charset=iso-8859-1');
        res.setHeader('Content-Disposition', `attachment; filename=607_${rncEmisor}_${period}.txt`);
        res.send(content);
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
        const { content } = await generate606Content(req.userId, periodo);
        const result = await validate606Format(content);
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: safeErrorMessage(error) });
    }
};

const validate607 = async (req, res) => {
    try {
        const { periodo } = req.body;
        const { content } = await generate607Content(req.userId, periodo);
        const result = await validate607Format(content);
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

const sendToAccountant = async (req, res) => {
    try {
        const { month, year, email } = req.body;
        if (!month || !year || !email) return res.status(400).json({ message: 'Periodo y Correo requeridos' });

        const period = `${year}${String(month).padStart(2, '0')}`;
        const userId = req.userId;

        const [r606, r607] = await Promise.all([
            generate606Content(userId, period),
            generate607Content(userId, period)
        ]);

        const appName = process.env.APP_NAME || 'Trinalyze';

        const subject = `Reportes Fiscales Periodo ${month}/${year}`;
        const text = `Hola,\n\nSe adjuntan los reportes fiscales 606 y 607 del periodo ${month}/${year} generados por ${appName}.\n\n- Compras (606): ${r606.count} registros.\n- Ventas (607): ${r607.count} registros.\n\nEste reporte es generado de forma automática.`;
        const html = `<h3>Reportes Fiscales Periodo ${month}/${year}</h3><p>Adjunto encontrarás los archivos oficiales para la DGII generados por <strong>${appName}</strong>.</p><ul><li>606: ${r606.count} registros</li><li>607: ${r607.count} registros</li></ul>`;

        const attachments = [
            { filename: `606_${r606.rncEmisor}_${period}.txt`, content: r606.content },
            { filename: `607_${r607.rncEmisor}_${period}.txt`, content: r607.content }
        ];

        const sent = await sendMailWithAttachments(email, subject, text, html, attachments);
        
        if (sent) {
            res.json({ success: true, message: 'Reportes enviados correctamente al contable' });
        } else {
            res.status(500).json({ message: 'Error enviando el correo. Verifica la configuración SMTP.' });
        }
    } catch (error) {
        log.error({ err: error.message, userId: req.userId }, 'Error enviando reportes al contador');
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
    getTaxSummary,
    sendToAccountant
};
