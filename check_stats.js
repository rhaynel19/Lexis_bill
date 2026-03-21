const mongoose = require('mongoose');

async function checkDiscrepancy() {
    try {
        await mongoose.connect('mongodb+srv://businessftm19_db_user:8095224147Ftm@cluster0.xbcp5bc.mongodb.net/lexisbill?retryWrites=true&w=majority');
        const Invoice = mongoose.model('Invoice', new mongoose.Schema({ 
            userId: mongoose.Schema.Types.ObjectId, 
            total: Number, 
            subtotal: Number, 
            itbis: Number, 
            ncfType: String, 
            date: Date, 
            status: String 
        }));

        const start = new Date(2026, 2, 1);
        const end = new Date(2026, 3, 0, 23, 59, 59, 999);

        // Fetch all non-cancelled invoices for March 2026
        const invoices = await Invoice.find({ 
            date: { $gte: start, $lte: end }, 
            status: { $ne: 'cancelled' } 
        });

        console.log(`Total invoices found: ${invoices.length}`);
        
        let sumTotal = 0;
        let sumSubtotal = 0;
        let sumItbis = 0;

        invoices.forEach(inv => {
            const isCredit = inv.ncfType === '04' || inv.ncfType === '34';
            const sign = isCredit ? -1 : 1;
            sumTotal += (inv.total || 0) * sign;
            sumSubtotal += (inv.subtotal || 0) * sign;
            sumItbis += (inv.itbis || 0) * sign;
        });

        console.log(`Sum Total: ${sumTotal}`);
        console.log(`Sum Subtotal: ${sumSubtotal}`);
        console.log(`Sum ITBIS: ${sumItbis}`);
        console.log(`Sum Sub+ITBIS: ${sumSubtotal + sumItbis}`);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkDiscrepancy();
