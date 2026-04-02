/**
 * Sanitiza un string: remueve caracteres peligrosos y limita longitud
 */
const sanitizeString = (str, maxLength = 500) => {
    if (typeof str !== 'string') return '';
    return str
        .trim()
        .slice(0, maxLength)
        .replace(/<[^>]*>/g, '') // Remueve tags HTML
        .replace(/\$/g, '') // Previene operadores MongoDB
        .replace(/\{|\}/g, ''); // Previene objetos maliciosos
};

/**
 * Sanitiza un email: valida formato y limpia
 */
const sanitizeEmail = (email) => {
    if (typeof email !== 'string') return '';
    const cleaned = email.trim().toLowerCase().slice(0, 254);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(cleaned) ? cleaned : '';
};

/**
 * Sanitiza un objeto de items de factura/cotización.
 * Acepta price o unitPrice; taxCategory/taxRate o isExempt. Normaliza para almacenar.
 */
const sanitizeItems = (items, isTaxExemptCompany = false) => {
    if (!Array.isArray(items)) return [];
    return items.slice(0, 100).map(item => {
        const taxCategory = item?.taxCategory === 'exempt' || item?.isExempt ? 'exempt' : 'taxable';
        const parsedTax = Number(item?.taxRate);
        const taxRate = taxCategory === 'exempt' ? 0 : Math.min(0.18, Math.max(0, isNaN(parsedTax) ? 0.18 : parsedTax));
        const finalRate = isTaxExemptCompany ? 0 : taxRate;
        return {
            description: sanitizeString(item?.description || '', 500),
            quantity: Math.max(0, Math.min(Number(item?.quantity) || 0, 999999)),
            price: Math.max(0, Math.min(Number(item?.price ?? item?.unitPrice) || 0, 999999999)),
            isExempt: taxCategory === 'exempt',
            taxCategory: taxCategory,
            taxRate: finalRate
        };
    }).filter(item => item.description && item.quantity > 0);
};

/**
 * Escapa caracteres especiales de RegExp para evitar ReDoS (búsqueda admin)
 */
const escapeRegex = (str) => {
    if (typeof str !== 'string') return '';
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

module.exports = {
    sanitizeString,
    sanitizeEmail,
    sanitizeItems,
    escapeRegex
};
