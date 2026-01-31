
/**
 * Utility to parse Dominican Republic DGII QR code URLs for electronic invoices (e-CF)
 * Example URL: https://dgii.gov.do/verificaeCF?RncEmisor=101001614&NCF=E310000000001&MontoTotal=100.00&ITBIS=18.00&Fecha=30-01-2026&CodigoSeguridad=XYZ
 */
export const DGIIQRParser = {
    parseURL(url: string) {
        try {
            const urlObj = new URL(url);
            const params = new URLSearchParams(urlObj.search);

            return {
                supplierRnc: params.get("RncEmisor") || "",
                ncf: params.get("NCF") || "",
                amount: params.get("MontoTotal") || "0",
                itbis: params.get("ITBIS") || "0",
                date: params.get("Fecha") || "",
                // We could also get CodigoSeguridad if needed
            };
        } catch (e) {
            console.error("Failed to parse DGII QR URL", e);
            return null;
        }
    },

    isValidDGIIUrl(url: string) {
        return url.includes("dgii.gov.do/verificaeCF");
    }
};
