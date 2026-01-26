
// Silent validator for background checks
export const ValidatorService = {
    // Check if RNC format looks valid (soft check)
    checkRNCFormat: (rnc: string): string | null => {
        const clean = rnc.replace(/[^0-9]/g, "");
        if (clean.length > 0 && clean.length !== 9 && clean.length !== 11) {
            return "El RNC/Cédula parece tener una longitud incorrecta (debe ser 9 u 11 dígitos).";
        }
        return null;
    },

    // Check consistency between Invoice Type and RNC
    checkTypeConsistency: (type: string, rnc: string): string | null => {
        const clean = rnc.replace(/[^0-9]/g, "");
        if (type === "31" && clean.length === 11) {
            return "Estás emitiendo Crédito Fiscal (B01) a una Cédula (Persona Física). Asegúrate de que este cliente requiere este tipo de comprobante.";
        }
        return null;
    },

    // Check price consistency
    checkPriceAnomalies: (items: any[]): string | null => {
        const zeroPrice = items.find(i => i.price === 0 && i.description.length > 0);
        if (zeroPrice) {
            return "Tienes ítems con precio 0. Asegúrate de que esto sea intencional (bonificación o regalo).";
        }
        return null;
    }
};
