const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

async function checkInvoices() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');
        
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        
        const invoices = await mongoose.connection.db.collection('invoices').find({
            date: { $gte: startOfMonth, $lte: endOfMonth },
            status: { $ne: 'cancelled' }
        }).toArray();
        
        console.log(`Found ${invoices.length} invoices this month.`);
        
        let calculatedCollected = 0;
        let calculatedRevenue = 0;
        
        invoices.forEach(inv => {
            calculatedRevenue += (inv.total || 0);
            
            let amount = 0;
            const paid = Number(inv.montoPagado || 0);
            if (paid > 0) {
                amount = paid;
            } else if (inv.tipoPago !== 'credito' && inv.estadoPago !== 'pendiente' && inv.status !== 'pending') {
                amount = (inv.total || 0);
            }
            
            calculatedCollected += amount;
            
            console.log(`- Invoice ${inv._id}: total=${inv.total}, montoPagado=${inv.montoPagado}, tipoPago=${inv.tipoPago}, estadoPago=${inv.estadoPago}, status=${inv.status} => Evaluated Collected=${amount}`);
        });
        
        console.log(`\nTotals => Revenue: ${calculatedRevenue}, Collected: ${calculatedCollected}`);
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

checkInvoices();
