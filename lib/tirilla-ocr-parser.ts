/**
 * Parser de texto OCR para tirillas / comprobantes fiscales (República Dominicana).
 * Extrae suplidor, RNC, NCF, monto, ITBIS y fecha a partir del texto leído por Tesseract.
 */

export interface TirillaParsed {
    supplierName: string;
    supplierRnc: string;
    ncf: string;
    amount: number;
    itbis: number;
    category: string;
    date: string;
}

function cleanNumber(s: string): string {
    return (s || "").replace(/[^\d.,]/g, "").replace(",", ".");
}

function parseAmountFromText(text: string): number {
    const normalized = text.toUpperCase().replace(/\s+/g, " ");
    // Patrones comunes en tirillas RD: "Total 1,234.56", "TOTAL RD$ 1234.56", "Monto: 500.00", "Grand Total 100"
    const totalMatch = normalized.match(
        /(?:TOTAL|MONTO|TOTAL\s*RD\$?|R\.?D\.?\s*\$?|GRAND\s*TOTAL)\s*[:\s]*([\d.,]+)/i
    );
    if (totalMatch) {
        const num = parseFloat(cleanNumber(totalMatch[1]));
        if (!isNaN(num) && num > 0) return num;
    }
    // Último número que parezca monto (2+ dígitos, opcional decimal)
    const numbers = text.match(/[\d.,]+/g) || [];
    for (let i = numbers.length - 1; i >= 0; i--) {
        const n = parseFloat(cleanNumber(numbers[i]));
        if (!isNaN(n) && n >= 1 && n < 100_000_000) return n;
    }
    return 0;
}

function parseItbisFromText(text: string): number {
    const normalized = text.toUpperCase();
    const itbisMatch = normalized.match(/(?:ITBIS|IMPUESTO|TAX)\s*[:\s]*([\d.,]+)/i);
    if (itbisMatch) {
        const n = parseFloat(cleanNumber(itbisMatch[1]));
        if (!isNaN(n)) return n;
    }
    // Buscar "18%" y un número cercano
    const pctMatch = text.match(/18\s*%?\s*[\s:]*([\d.,]+)/i);
    if (pctMatch) {
        const n = parseFloat(cleanNumber(pctMatch[1]));
        if (!isNaN(n)) return n;
    }
    return 0;
}

function parseRncFromText(text: string): string {
    // RNC empresa: 9 dígitos; cédula: 11 dígitos. Evitar números de NCF (más largos o con letras)
    const nine = text.match(/\b(\d{9})\b/);
    if (nine) return nine[1];
    const eleven = text.match(/\b(\d{11})\b/);
    if (eleven) return eleven[1];
    return "";
}

function parseNcfFromText(text: string): string {
    // NCF: B01, B02, E31, E32, B14, B15, E15, E44 + 8-10 dígitos
    const ncfMatch = text.match(/\b([BE])(0[12]|1[45]|31|32|44)\s*(\d{8,11})\b/i);
    if (ncfMatch) return `${ncfMatch[1].toUpperCase()}${ncfMatch[2]}${ncfMatch[3]}`;
    const alt = text.match(/([BE]\d{10,12})\b/i);
    if (alt) return alt[1].toUpperCase().replace(/\s/g, "");
    return "";
}

function parseDateFromText(text: string): string {
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    // DD/MM/YYYY o DD-MM-YYYY
    const d1 = text.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/);
    if (d1) {
        const [, day, month, year] = d1;
        const y = year.length === 2 ? `20${year}` : year;
        return `${y}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
    // YYYY-MM-DD
    const d2 = text.match(/\b(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\b/);
    if (d2) return `${d2[1]}-${d2[2].padStart(2, "0")}-${d2[3].padStart(2, "0")}`;
    return today;
}

function parseSupplierNameFromText(text: string): string {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    // Evitar líneas que son solo números o códigos
    const skip = /^[\d\s\-\/\.\$]+$|^RNC\s*:|^NCF\s*:|^TOTAL|^ITBIS|^FECHA/i;
    for (const line of lines) {
        if (line.length < 3 || skip.test(line)) continue;
        // Si la línea tiene solo letras y espacios (nombre de negocio), usarla
        if (line.length <= 60 && /^[a-záéíóúñü\s\.\-]+$/i.test(line)) return line;
        // Si contiene "RNC" o "NCF", el nombre suele estar antes (líneas anteriores)
        if (/RNC|NCF/i.test(line)) break;
    }
    // Primera línea no numérica como fallback
    for (const line of lines) {
        if (line.length >= 2 && line.length <= 60 && !/^\d+$/.test(line)) return line;
    }
    return "Suplidor (revisar)";
}

/**
 * Parsea el texto extraído de una tirilla/comprobante y devuelve los campos para el formulario 606.
 */
export function parseTirillaText(rawText: string): TirillaParsed {
    const t = (rawText || "").trim();
    const supplierName = parseSupplierNameFromText(t);
    const supplierRnc = parseRncFromText(t);
    const ncf = parseNcfFromText(t);
    const amount = parseAmountFromText(t);
    const itbis = parseItbisFromText(t);
    const date = parseDateFromText(t);
    return {
        supplierName,
        supplierRnc,
        ncf,
        amount,
        itbis,
        category: "02",
        date,
    };
}

/**
 * Indica si el resultado del parser tiene datos mínimos útiles (al menos monto o RNC/NCF).
 */
export function hasUsefulData(parsed: TirillaParsed): boolean {
    if (parsed.amount > 0) return true;
    if (parsed.supplierRnc || parsed.ncf) return true;
    if (parsed.supplierName && parsed.supplierName !== "Suplidor (revisar)") return true;
    return false;
}
