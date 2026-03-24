
require('dotenv').config({ path: './.env.local' });
const mongoose = require('mongoose');
// We need to be careful with api/index.js because it starts a server.
// Let's try to just use the Model if possible, or define it here.
// Looking at api/index.js, it defines the Invoice model.

const invoiceSchema = new mongoose.Schema({
    userId: String,
    clientName: String,
    clientRnc: String,
    ncfSequence: String,
    total: Number,
    montoPagado: Number,
    balancePendiente: Number,
    estadoPago: String,
    status: String,
    tipoPago: String,
    ncfType: String,
    date: Date
}, { strict: false });

const Invoice = mongoose.models.Invoice || mongoose.model('Invoice', invoiceSchema);

async function checkPending() {
    try {
        // Use the connection string from .env.local if possible, but default to localhost
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/lexis_bill';
        await mongoose.connect(mongoUri);
        
        const invoices = await Invoice.find({ 
            status: { $ne: 'cancelled' }, 
            ncfType: { $nin: ['04', '34'] } 
        });

        let total = 0;
        console.log('--- DETALLE DE FACTURAS PENDIENTES ---');
        invoices.forEach(inv => {
            const balanceRaw = inv.balancePendiente ?? 0;
            const paid = inv.montoPagado || 0;
            const totalInv = inv.total || 0;
            const fallbackBalance = totalInv - paid;
            
            let effective = 0;
            if (balanceRaw > 0) {
                effective = balanceRaw;
            } else if (inv.estadoPago === 'pendiente' || inv.estadoPago === 'parcial' || inv.status === 'pending' || inv.tipoPago === 'credito') {
                effective = Math.max(0, fallbackBalance);
            }

            if (effective > 0) {
                console.log(`- ${inv.clientName.padEnd(25)} | NCF: ${(inv.ncfSequence || 'N/A').padEnd(15)} | Pendiente: RD$${effective.toLocaleString('en-US', {minimumFractionDigits: 2})}`);
                total += effective;
            }
        });
        console.log('---------------------------------------');
        console.log('TOTAL CALCULADO POR EL SISTEMA: RD$' + total.toLocaleString('en-US', {minimumFractionDigits: 2}));
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await mongoose.disconnect();
    }
}

checkPending();
