const mongoose = require('mongoose');

/**
 * Valida un ObjectId de MongoDB
 */
const isValidObjectId = (id) => {
    return mongoose.Types.ObjectId.isValid(id) && (new mongoose.Types.ObjectId(id)).toString() === id;
};

/**
 * Valida fortaleza de contraseña
 * Mínimo 8 caracteres, al menos 1 mayúscula, 1 minúscula, 1 número
 */
const validatePassword = (password) => {
    if (typeof password !== 'string') return { valid: false, error: 'La contraseña es requerida' };
    if (password.length < 8) return { valid: false, error: 'La contraseña debe tener al menos 8 caracteres' };
    if (!/[A-Z]/.test(password)) return { valid: false, error: 'La contraseña debe tener al menos una mayúscula' };
    if (!/[a-z]/.test(password)) return { valid: false, error: 'La contraseña debe tener al menos una minúscula' };
    if (!/[0-9]/.test(password)) return { valid: false, error: 'La contraseña debe tener al menos un número' };
    return { valid: true };
};

/**
 * Valida un RNC o Cédula (Algoritmo de módulo 11 y 10)
 */
function validateTaxId(id) {
    const str = id.replace(/[^\d]/g, '');
    if (str.length === 9) {
        let sum = 0;
        const weights = [7, 9, 8, 6, 5, 4, 3, 2];
        for (let i = 0; i < 8; i++) sum += parseInt(str[i]) * weights[i];
        let remainder = sum % 11;
        let digit = remainder === 0 ? 2 : (remainder === 1 ? 1 : 11 - remainder);
        return digit === parseInt(str[8]);
    }
    if (str.length === 11) {
        let sum = 0;
        const weights = [1, 2, 1, 2, 1, 2, 1, 2, 1, 2];
        for (let i = 0; i < 10; i++) {
            let prod = parseInt(str[i]) * weights[i];
            if (prod > 9) prod = Math.floor(prod / 10) + (prod % 10);
            sum += prod;
        }
        let check = (10 - (sum % 10)) % 10;
        return check === parseInt(str[10]);
    }
    return false;
}

const NCF_TYPES_BUSINESS = ['01', '31'];
const NCF_TYPES_GOVERNMENT = ['15', '45'];
const NCF_TYPES_CREDIT_NOTE = ['04', '34'];

/**
 * Valida si un tipo de NCF es apto para un cliente (requiere RNC para crédito fiscal/gub)
 */
function validateNcfForClient(ncfType, clientRnc) {
    if (!clientRnc) {
        if (NCF_TYPES_BUSINESS.includes(ncfType)) return { valid: false, reason: 'Crédito fiscal requiere RNC o Cédula' };
        if (NCF_TYPES_GOVERNMENT.includes(ncfType)) return { valid: false, reason: 'Gubernamental requiere RNC o Cédula' };
        return { valid: true };
    }
    if (NCF_TYPES_CREDIT_NOTE.includes(ncfType)) return { valid: true };

    const cleanRnc = clientRnc.replace(/[^\d]/g, '');

    // Crédito Fiscal requiere un identificador válido en DGII (9 u 11 dígitos)
    if (NCF_TYPES_BUSINESS.includes(ncfType) && cleanRnc.length !== 9 && cleanRnc.length !== 11) {
        return { valid: false, reason: 'Crédito Fiscal requiere un RNC o Cédula válido (9 u 11 dígitos)' };
    }

    return { valid: true };
}

module.exports = {
    isValidObjectId,
    validatePassword,
    validateTaxId,
    validateNcfForClient
};
