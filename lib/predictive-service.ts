// Service for predictive analytics (real data when provided)

export interface NcfSettingForAlerts {
    type: string;
    currentValue: number;
    finalNumber: number;
    isActive?: boolean;
}

export interface InvoiceForAlerts {
    date: string;
    total?: number;
    status?: string;
    rnc?: string;
    clientRnc?: string;
    clientName?: string;
}

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

    /**
     * Get predictive alerts from real data.
     * When ncfSettings, invoices and pendingCount are provided, returns real alerts.
     * Otherwise returns empty array (caller can fallback to mock or hide).
     */
    getPredictiveAlerts: (params?: {
        ncfSettings?: NcfSettingForAlerts[];
        invoices?: InvoiceForAlerts[];
        pendingCount?: number;
    }): string[] => {
        const alerts: string[] = [];

        if (!params) {
            return alerts;
        }

        const { ncfSettings = [], invoices = [], pendingCount = 0 } = params;

        // NCF depletion: secuencias activas con pocos comprobantes restantes
        for (const s of ncfSettings) {
            if (!s.isActive) continue;
            const remaining = (s.finalNumber ?? 0) - (s.currentValue ?? 0);
            if (remaining <= 0) continue;
            if (remaining < 20) {
                const tipo = s.type === "01" ? "B01" : s.type === "02" ? "B02" : s.type === "31" ? "E31" : s.type === "32" ? "E32" : `tipo ${s.type}`;
                alerts.push(`Tu secuencia de NCF (${tipo}) tiene solo ${remaining} comprobante(s) restante(s). Considera solicitar un nuevo rango.`);
            }
        }

        // Facturas pendientes de cobro
        if (pendingCount > 0) {
            if (pendingCount === 1) {
                alerts.push("Tienes 1 factura pendiente de cobro. Dar seguimiento mejora tu flujo de caja.");
            } else {
                alerts.push(`Tienes ${pendingCount} facturas pendientes de cobro. Dar seguimiento mejora tu flujo de caja.`);
            }
        }

        // Cliente recurrente (opcional): si algún cliente tiene 3+ facturas en los últimos 6 meses, sugerir borrador
        if (invoices.length >= 10) {
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
            const byRnc: Record<string, { count: number; lastDate: string; name?: string }> = {};
            for (const inv of invoices) {
                const d = new Date(inv.date);
                if (d < sixMonthsAgo) continue;
                const rnc = inv.rnc || inv.clientRnc || "";
                if (!rnc) continue;
                if (!byRnc[rnc]) byRnc[rnc] = { count: 0, lastDate: inv.date, name: inv.clientName };
                byRnc[rnc].count++;
                if (inv.date > byRnc[rnc].lastDate) {
                    byRnc[rnc].lastDate = inv.date;
                    if (inv.clientName) byRnc[rnc].name = inv.clientName;
                }
            }
            const recurring = Object.entries(byRnc).filter(([, v]) => v.count >= 3);
            if (recurring.length > 0) {
                const [rnc, data] = recurring[0];
                const name = data.name || `Cliente (${rnc.slice(-4)})`;
                alerts.push(`El cliente "${name}" suele facturarse con frecuencia. Podrías preparar un borrador con anticipación.`);
            }
        }

        return alerts;
    }
};
