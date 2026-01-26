
// Service for predictive analytics
export const PredictiveService = {
    // Estimate days left for NCF sequence based on usage rate
    estimateSequenceDepletion: (currentSequence: number, limit: number, dailyUsage: number): number => {
        const remaining = limit - currentSequence;
        if (dailyUsage <= 0) return 999;
        return Math.floor(remaining / dailyUsage);
    },

    // Predict when a client might need a new invoice (Recurring logic)
    predictNextInvoiceDate: (lastInvoiceDate: string, frequencyDays: number = 30): Date => {
        const date = new Date(lastInvoiceDate);
        date.setDate(date.getDate() + frequencyDays);
        return date;
    },

    // Get alerts
    getPredictiveAlerts: (): string[] => {
        // Mock data logic
        const alerts = [];

        // Mock Sequence Logic
        const daysLeft = 12; // Calculated
        if (daysLeft < 15) {
            alerts.push(`Tu secuencia de NCF (B01) se agotará en aproximadamente ${daysLeft} días basándonos en tu ritmo actual.`);
        }

        // Mock Client Logic
        alerts.push("El cliente 'Farmacia Central' suele pedir factura los días 28. Podrías preparar el borrador.");

        return alerts;
    }
};
