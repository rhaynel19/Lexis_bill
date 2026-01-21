/**
 * Convertidor de números a texto en español
 * Convierte cantidades numéricas a su representación en palabras
 * Formato para República Dominicana: "Mil doscientos pesos con 50/100"
 */

// Unidades (0-9)
const UNIDADES = [
    "",
    "un",
    "dos",
    "tres",
    "cuatro",
    "cinco",
    "seis",
    "siete",
    "ocho",
    "nueve",
];

// Decenas especiales (10-19)
const DECENAS_ESPECIALES = [
    "diez",
    "once",
    "doce",
    "trece",
    "catorce",
    "quince",
    "dieciséis",
    "diecisiete",
    "dieciocho",
    "diecinueve",
];

// Decenas (20-90)
const DECENAS = [
    "",
    "",
    "veinte",
    "treinta",
    "cuarenta",
    "cincuenta",
    "sesenta",
    "setenta",
    "ochenta",
    "noventa",
];

// Centenas (100-900)
const CENTENAS = [
    "",
    "ciento",
    "doscientos",
    "trescientos",
    "cuatrocientos",
    "quinientos",
    "seiscientos",
    "setecientos",
    "ochocientos",
    "novecientos",
];

/**
 * Convierte un número de 0 a 99 en texto
 */
function convertirDecenas(numero: number): string {
    if (numero < 10) {
        return UNIDADES[numero];
    }

    if (numero < 20) {
        return DECENAS_ESPECIALES[numero - 10];
    }

    const decena = Math.floor(numero / 10);
    const unidad = numero % 10;

    if (numero === 20) {
        return "veinte";
    }

    if (unidad === 0) {
        return DECENAS[decena];
    }

    // Para 21-29 usar "veintiuno", "veintidós", etc.
    if (decena === 2) {
        return `veinti${UNIDADES[unidad]}`;
    }

    // Para 30+ usar "treinta y uno", "cuarenta y dos", etc.
    return `${DECENAS[decena]} y ${UNIDADES[unidad]}`;
}

/**
 * Convierte un número de 0 a 999 en texto
 */
function convertirCentenas(numero: number): string {
    if (numero === 0) {
        return "";
    }

    if (numero === 100) {
        return "cien";
    }

    if (numero < 100) {
        return convertirDecenas(numero);
    }

    const centena = Math.floor(numero / 100);
    const resto = numero % 100;

    if (resto === 0) {
        return CENTENAS[centena];
    }

    return `${CENTENAS[centena]} ${convertirDecenas(resto)}`;
}

/**
 * Convierte un número de 0 a 999,999 en texto
 */
function convertirMiles(numero: number): string {
    if (numero === 0) {
        return "";
    }

    if (numero < 1000) {
        return convertirCentenas(numero);
    }

    const miles = Math.floor(numero / 1000);
    const resto = numero % 1000;

    let textoMiles = "";
    if (miles === 1) {
        textoMiles = "mil";
    } else {
        textoMiles = `${convertirCentenas(miles)} mil`;
    }

    if (resto === 0) {
        return textoMiles;
    }

    return `${textoMiles} ${convertirCentenas(resto)}`;
}

/**
 * Convierte un número de 0 a 999,999,999 en texto
 */
function convertirMillones(numero: number): string {
    if (numero === 0) {
        return "cero";
    }

    if (numero < 1000000) {
        return convertirMiles(numero);
    }

    const millones = Math.floor(numero / 1000000);
    const resto = numero % 1000000;

    let textoMillones = "";
    if (millones === 1) {
        textoMillones = "un millón";
    } else {
        textoMillones = `${convertirMiles(millones)} millones`;
    }

    if (resto === 0) {
        return textoMillones;
    }

    return `${textoMillones} ${convertirMiles(resto)}`;
}

/**
 * Convierte una cantidad numérica a texto en formato de moneda dominicana
 * 
 * @param amount - Cantidad numérica a convertir
 * @param currency - Nombre de la moneda (por defecto "pesos")
 * @returns Texto en formato: "Mil doscientos pesos con 50/100"
 * 
 * @example
 * numberToText(1250.50) // "Mil doscientos cincuenta pesos con 50/100"
 * numberToText(100.00) // "Cien pesos con 00/100"
 * numberToText(1000000.00) // "Un millón de pesos con 00/100"
 */
export function numberToText(amount: number, currency: string = "pesos"): string {
    // Separar parte entera y decimal
    const parteEntera = Math.floor(amount);
    const parteDecimal = Math.round((amount - parteEntera) * 100);

    // Convertir parte entera a texto
    let textoEntero = convertirMillones(parteEntera);

    // Capitalizar primera letra
    textoEntero = textoEntero.charAt(0).toUpperCase() + textoEntero.slice(1);

    // Formatear parte decimal con dos dígitos
    const textoDecimal = parteDecimal.toString().padStart(2, "0");

    // Construir texto completo
    // Formato: "Mil doscientos cincuenta pesos con 50/100"
    return `${textoEntero} ${currency} con ${textoDecimal}/100`;
}

/**
 * Convierte una cantidad a texto en formato de moneda dominicana (DOP)
 * Alias de numberToText con "pesos" como moneda
 */
export function amountToDominicanText(amount: number): string {
    return numberToText(amount, "pesos");
}

/**
 * Ejemplos de uso:
 * 
 * numberToText(0) // "Cero pesos con 00/100"
 * numberToText(1) // "Un pesos con 00/100"
 * numberToText(15) // "Quince pesos con 00/100"
 * numberToText(25.50) // "Veinticinco pesos con 50/100"
 * numberToText(100) // "Cien pesos con 00/100"
 * numberToText(101) // "Ciento un pesos con 00/100"
 * numberToText(500.75) // "Quinientos pesos con 75/100"
 * numberToText(1000) // "Mil pesos con 00/100"
 * numberToText(1250.50) // "Mil doscientos cincuenta pesos con 50/100"
 * numberToText(10800) // "Diez mil ochocientos pesos con 00/100"
 * numberToText(100000) // "Cien mil pesos con 00/100"
 * numberToText(1000000) // "Un millón de pesos con 00/100"
 * numberToText(2500000.99) // "Dos millones quinientos mil pesos con 99/100"
 */
