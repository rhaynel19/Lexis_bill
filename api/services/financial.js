/**
 * Lógica financiera centralizada — Lexis Bill
 * ITBIS RD: empresas exentas, ítems exentos, facturas mixtas.
 * Nunca confiar en totales del frontend.
 */

const DEFAULT_TAX_RATE = 0.18;
const MAX_TAX_RATE = 0.18;

/**
 * Normaliza un ítem para cálculo (compatibilidad con price/isExempt y taxCategory/taxRate/unitPrice)
 */
function normalizeItemForCalculation(item) {
    if (!item || typeof item !== 'object') return null;
    const quantity = Math.max(0, Math.min(999999, Number(item.quantity) || 0));
    const unitPrice = Math.max(0, Math.min(999999999, Number(item.price ?? item.unitPrice) || 0));
    const taxCategory = item.taxCategory === 'exempt' ? 'exempt' : (item.isExempt ? 'exempt' : 'taxable');
    let taxRate = taxCategory === 'exempt' ? 0 : Math.min(MAX_TAX_RATE, Math.max(0, Number(item.taxRate) ?? DEFAULT_TAX_RATE));
    return { quantity, unitPrice, taxCategory, taxRate };
}

/**
 * Calcula subtotal, ITBIS y total desde ítems.
 * @param {Array} items - Array de ítems (con price o unitPrice, isExempt o taxCategory/taxRate)
 * @param {Object} companyTaxSettings - { isTaxExemptCompany?: boolean, defaultTaxRate?: number }
 * @returns { { subtotal, itbis, total } }
 */
function computeAmountsFromItems(items, companyTaxSettings = {}) {
    if (!Array.isArray(items) || items.length === 0) {
        return { subtotal: 0, itbis: 0, total: 0 };
    }
    const isTaxExemptCompany = Boolean(companyTaxSettings?.isTaxExemptCompany);
    const defaultTaxRate = Math.min(MAX_TAX_RATE, Math.max(0, Number(companyTaxSettings?.defaultTaxRate) ?? DEFAULT_TAX_RATE));

    let subtotal = 0;
    let itbis = 0;

    for (const raw of items) {
        const item = normalizeItemForCalculation(raw);
        if (!item || item.quantity <= 0) continue;

        const base = Math.round(item.quantity * item.unitPrice * 100) / 100;
        subtotal += base;

        let taxRateFinal = 0;
        if (!isTaxExemptCompany) {
            if (item.taxCategory === 'exempt') {
                taxRateFinal = 0;
            } else {
                taxRateFinal = item.taxRate;
            }
        }
        itbis += Math.round(base * taxRateFinal * 100) / 100;
    }

    subtotal = Math.round(subtotal * 100) / 100;
    itbis = Math.round(itbis * 100) / 100;
    const total = Math.round((subtotal + itbis) * 100) / 100;

    return { subtotal, itbis, total };
}

module.exports = {
    computeAmountsFromItems,
    normalizeItemForCalculation,
    DEFAULT_TAX_RATE,
    MAX_TAX_RATE
};
