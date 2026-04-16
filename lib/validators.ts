/**
 * Validadores para datos dominicanos
 * Incluye validación de RNC y Cédula según formatos de República Dominicana
 */

export interface ValidationResult {
    isValid: boolean;
    error?: string;
}

/**
 * Valida un RNC (Registro Nacional de Contribuyentes) con algoritmo Algoritmo Módulo 11
 * Formato: 9 dígitos sin guiones
 */
export function validateRNC(rnc: string): ValidationResult {
    const cleanRNC = rnc.trim();

    if (!cleanRNC) return { isValid: false, error: "El RNC es requerido" };
    if (!/^\d+$/.test(cleanRNC)) return { isValid: false, error: "El RNC debe contener solo números" };
    if (cleanRNC.length !== 9) return { isValid: false, error: "El RNC debe tener 9 dígitos" };

    // Algoritmo Módulo 11 para RNC
    const weights = [7, 9, 8, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < 8; i++) {
        sum += parseInt(cleanRNC[i]) * weights[i];
    }

    const remainder = sum % 11;
    let digit;
    if (remainder === 0) digit = 2;
    else if (remainder === 1) digit = 1;
    else digit = 11 - remainder;

    if (digit !== parseInt(cleanRNC[8])) {
        return { isValid: false, error: "RNC inválido (Error de comprobación)" };
    }

    return { isValid: true };
}

/**
 * Valida una Cédula dominicana con Algoritmo Módulo 10 (Luhn-like)
 * Formato: 11 dígitos
 */
export function validateCedula(cedula: string): ValidationResult {
    const cleanCedula = cedula.trim().replace(/-/g, "");

    if (!cleanCedula) return { isValid: false, error: "La cédula es requerida" };
    if (!/^\d+$/.test(cleanCedula)) return { isValid: false, error: "La cédula debe contener solo números" };
    if (cleanCedula.length !== 11) return { isValid: false, error: "La cédula debe tener 11 dígitos" };

    // Algoritmo Módulo 10 para Cédula
    const weights = [1, 2, 1, 2, 1, 2, 1, 2, 1, 2];
    let sum = 0;
    for (let i = 0; i < 10; i++) {
        let prod = parseInt(cleanCedula[i]) * weights[i];
        if (prod >= 10) {
            prod = Math.floor(prod / 10) + (prod % 10);
        }
        sum += prod;
    }

    const checkDigit = (10 - (sum % 10)) % 10;

    if (checkDigit !== parseInt(cleanCedula[10])) {
        return { isValid: false, error: "Cédula inválida (Error de comprobación)" };
    }

    return { isValid: true };
}

/**
 * Valida RNC o Cédula (acepta cualquiera de los dos con validación matemática)
 */
export function validateRNCOrCedula(value: string): ValidationResult {
    const cleanValue = value.trim().replace(/-/g, "");

    if (cleanValue.length === 9) return validateRNC(cleanValue);
    if (cleanValue.length === 11) return validateCedula(cleanValue);

    return {
        isValid: false,
        error: "Ingrese un RNC (9 dígitos) o Cédula (11 dígitos) con formato válido",
    };
}

/**
 * Formatea una cédula agregando los guiones en las posiciones correctas
 * Ejemplo: 40212345678 -> 402-1234567-8
 */
export function formatCedula(cedula: string): string {
    // Remover cualquier guión existente
    const cleanCedula = cedula.replace(/-/g, "");

    // Si no tiene 11 dígitos, retornar sin formatear
    if (cleanCedula.length !== 11) {
        return cedula;
    }

    // Formatear: XXX-XXXXXXX-X
    return `${cleanCedula.slice(0, 3)}-${cleanCedula.slice(3, 10)}-${cleanCedula.slice(10)}`;
}

/**
 * Formatea un RNC agregando guiones para mejor legibilidad (opcional)
 * Ejemplo: 123456789 -> 1-23-45678-9
 * Nota: Este formato es opcional y no es el estándar oficial
 */
export function formatRNC(rnc: string): string {
    // Remover cualquier guión existente
    const cleanRNC = rnc.replace(/-/g, "");

    // Si no tiene 9 dígitos, retornar sin formatear
    if (cleanRNC.length !== 9) {
        return rnc;
    }

    // Por defecto, retornar sin guiones (formato oficial)
    return cleanRNC;
}

/**
 * Detecta automáticamente si el valor es RNC o Cédula y lo formatea
 */
export function autoFormatRNCOrCedula(value: string): string {
    const cleanValue = value.replace(/-/g, "");

    if (cleanValue.length === 11) {
        return formatCedula(cleanValue);
    }

    if (cleanValue.length === 9) {
        return formatRNC(cleanValue);
    }

    return value;
}
