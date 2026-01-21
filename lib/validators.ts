/**
 * Validadores para datos dominicanos
 * Incluye validación de RNC y Cédula según formatos de República Dominicana
 */

export interface ValidationResult {
    isValid: boolean;
    error?: string;
}

/**
 * Valida un RNC (Registro Nacional de Contribuyentes)
 * Formato: 9 dígitos sin guiones
 * Ejemplo: 123456789
 */
export function validateRNC(rnc: string): ValidationResult {
    // Remover espacios en blanco
    const cleanRNC = rnc.trim();

    // Verificar que no esté vacío
    if (!cleanRNC) {
        return {
            isValid: false,
            error: "El RNC es requerido",
        };
    }

    // Verificar que solo contenga números
    if (!/^\d+$/.test(cleanRNC)) {
        return {
            isValid: false,
            error: "El RNC debe contener solo números",
        };
    }

    // Verificar que tenga exactamente 9 dígitos
    if (cleanRNC.length !== 9) {
        return {
            isValid: false,
            error: "El RNC debe tener exactamente 9 dígitos",
        };
    }

    return { isValid: true };
}

/**
 * Valida una Cédula dominicana
 * Formato: XXX-XXXXXXX-X (11 dígitos con guiones)
 * Ejemplo: 001-1234567-8 o 40212345678 (se acepta sin guiones)
 */
export function validateCedula(cedula: string): ValidationResult {
    // Remover espacios en blanco
    let cleanCedula = cedula.trim();

    // Verificar que no esté vacío
    if (!cleanCedula) {
        return {
            isValid: false,
            error: "La cédula es requerida",
        };
    }

    // Remover guiones para validar
    const cedulaSinGuiones = cleanCedula.replace(/-/g, "");

    // Verificar que solo contenga números (después de remover guiones)
    if (!/^\d+$/.test(cedulaSinGuiones)) {
        return {
            isValid: false,
            error: "La cédula debe contener solo números",
        };
    }

    // Verificar que tenga exactamente 11 dígitos
    if (cedulaSinGuiones.length !== 11) {
        return {
            isValid: false,
            error: "La cédula debe tener exactamente 11 dígitos",
        };
    }

    // Verificar formato con guiones si los tiene
    if (cleanCedula.includes("-")) {
        const cedulaRegex = /^\d{3}-\d{7}-\d{1}$/;
        if (!cedulaRegex.test(cleanCedula)) {
            return {
                isValid: false,
                error: "Formato de cédula inválido. Use: XXX-XXXXXXX-X",
            };
        }
    }

    return { isValid: true };
}

/**
 * Valida RNC o Cédula (acepta cualquiera de los dos)
 * Útil para campos que pueden aceptar ambos tipos de identificación
 */
export function validateRNCOrCedula(value: string): ValidationResult {
    const cleanValue = value.trim().replace(/-/g, "");

    // Intentar validar como RNC (9 dígitos)
    if (cleanValue.length === 9) {
        return validateRNC(cleanValue);
    }

    // Intentar validar como Cédula (11 dígitos)
    if (cleanValue.length === 11) {
        return validateCedula(value);
    }

    return {
        isValid: false,
        error: "Debe ingresar un RNC válido (9 dígitos) o una Cédula válida (11 dígitos)",
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
