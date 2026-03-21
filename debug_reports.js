const mongoose = require('mongoose');

async function debugDiscrepancy() {
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

        const lastInv = await Invoice.findOne().sort({_id: -1});
        if (!lastInv) {
            console.log("No invoices found");
            process.exit(0);
        }
        const userId = lastInv.userId;
        console.log(`Analyzing for User: ${userId}`);

        const now = new Date(); // Using same date logic as backend
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        // --- Method 1: Find (Tax Summary) ---
        const findInvoices = await Invoice.find({
            userId: userId,
            date: { $gte: start, $lte: end },
            status: { $ne: 'cancelled' }
        });

        let findTotal = 0;
        let findSubtotal = 0;
        findInvoices.forEach(inv => {
            const isCredit = inv.ncfType === '04' || inv.ncfType === '34';
            const sign = isCredit ? -1 : 1;
            findTotal += (inv.total || 0) * sign;
            findSubtotal += (inv.subtotal || 0) * sign;
        });

        console.log(`\nMethod 1 (Find):`);
        console.log(`Count: ${findInvoices.length}`);
        console.log(`Total Sum: ${findTotal}`);
        console.log(`Subtotal Sum: ${findSubtotal}`);

        // --- Method 2: Aggregate (Dashboard Stats) ---
        const agg = await Invoice.aggregate([
            { $match: { userId: userId, date: { $gte: start, $lte: end }, status: { $ne: 'cancelled' } } },
            {
                $group: {
                    _id: null,
                    revenue: { 
                        $sum: { 
                            $cond: [
                                { $in: ['$ncfType', ['04', '34']] }, 
                                { $multiply: [{ $convert: { input: { $ifNull: ['$total', 0] }, to: 'double', onError: 0 } }, -1] }, 
                                { $convert: { input: { $ifNull: ['$total', 0] }, to: 'double', onError: 0 } }
                            ] 
                        } 
                    },
                    count: { $sum: 1 }
                }
            }
        ]);

        console.log(`\nMethod 2 (Aggregate):`);
        if (agg.length > 0) {
            console.log(`Count: ${agg[0].count}`);
            console.log(`Revenue (Total sum): ${agg[0].revenue}`);
        } else {
            console.log(`No data in aggregate`);
        }

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

debugDiscrepancy();
