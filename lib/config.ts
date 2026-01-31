/**
 * Configuración de la aplicación
 * Información de la empresa y configuraciones generales
 */

export const APP_CONFIG = {
    // Información de la empresa emisora
    company: {
        name: "TU EMPRESA S.R.L.",
        rnc: "123456789",
        address: "Calle Principal #123, Santo Domingo, República Dominicana",
        phone: "(809) 555-1234",
        email: "contacto@tuempresa.com",
        website: "www.tuempresa.com",
    },

    // Configuración de secuencias e-CF
    // En producción, estos números deben venir de la base de datos
    sequences: {
        "31": 1, // Factura de Crédito Fiscal
        "32": 1, // Factura de Consumo
        "33": 1, // Nota de Débito
        "34": 1, // Nota de Crédito
        "44": 1, // Regímenes Especiales
        "45": 1, // Gastos Menores
    },

    // Configuración de APIs de facturación electrónica
    api: {
        // Alanube
        alanube: {
            enabled: false, // Cambiar a true cuando esté configurado
            endpoint: "https://api.alanube.co/v1",
            apiKey: "", // Agregar tu API key aquí
            environment: "sandbox", // "sandbox" o "production"
        },

        // FacturaDirecta
        facturaDirecta: {
            enabled: false, // Cambiar a true cuando esté configurado
            endpoint: "https://api.facturadirecta.com/v1",
            apiKey: "", // Agregar tu API key aquí
            environment: "sandbox", // "sandbox" o "production"
        },
    },

    // Configuración de PDF
    pdf: {
        // Colores (en formato RGB)
        colors: {
            primary: [30, 58, 138], // Midnight Blue (Azul Medianoche)
            secondary: [16, 185, 129], // Emerald Green (Verde Esmeralda)
            text: [15, 23, 42], // Slate 900 (Gris Oscuro/Casi Negro)
            border: [226, 232, 240], // Slate 200 (Gris Claro)
        },

        // Márgenes del documento (en mm)
        margins: {
            top: 20,
            right: 20,
            bottom: 20,
            left: 20,
        },

        // Tamaño de fuentes
        fontSize: {
            title: 18,
            subtitle: 14,
            normal: 10,
            small: 8,
        },
    },
};

/**
 * Genera el siguiente número de secuencia para un tipo de comprobante
 * En producción, esto debe consultar la base de datos
 */
export function getNextSequenceNumber(type: string): string {
    // Obtener el número actual de la secuencia
    const currentNumber = APP_CONFIG.sequences[type as keyof typeof APP_CONFIG.sequences] || 1;

    // Formatear como E[TIPO][NÚMERO de 8 dígitos]
    // Ejemplo: E3100000001
    const sequenceNumber = `E${type}${currentNumber.toString().padStart(8, "0")}`;

    // Incrementar el contador para la próxima vez
    // NOTA: En producción, esto debe actualizarse en la base de datos
    APP_CONFIG.sequences[type as keyof typeof APP_CONFIG.sequences] = currentNumber + 1;

    return sequenceNumber;
}

/**
 * Obtiene el nombre completo del tipo de comprobante
 */
export function getInvoiceTypeName(type: string): string {
    const types: { [key: string]: string } = {
        "01": "Factura de Crédito Fiscal",
        "02": "Factura de Consumo",
        "04": "Nota de Crédito",
        "14": "Factura de Regímenes Especiales",
        "15": "Factura Gubernamental",
        "31": "Factura de Crédito Fiscal Electrónica",
        "32": "Factura de Consumo Electrónica",
        "33": "Nota de Débito Electrónica",
        "34": "Nota de Crédito Electrónica",
        "44": "e-CF Regímenes Especiales",
        "45": "e-CF Gubernamental",
    };
    return types[type] || type;
}

/**
 * Formatea una fecha en formato dominicano
 * Ejemplo: "11 de enero de 2026"
 */
export function formatDateDominican(date: Date): string {
    return date.toLocaleDateString("es-DO", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    }); // Retorna DD/MM/AAAA
}
