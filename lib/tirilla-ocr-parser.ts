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
    // 1) Pago / Total facturado (más fiable)
    const pagoMatch = text.match(/(?:PAGO|TOTAL\s*FACTURADO|TOTAL\s*FACTURA)\s*[:\s]*R?D?\$?\s*([\d.,]+)/i);
    if (pagoMatch) {
        const n = parseFloat(cleanNumber(pagoMatch[1]));
        if (!isNaN(n) && n > 0) return n;
    }
    // 2) TOTAL RD$, Monto, Grand Total
    const totalMatch = normalized.match(
        /(?:TOTAL|MONTO|TOTAL\s*RD\$?|R\.?D\.?\s*\$?|GRAND\s*TOTAL|TOTAL)\s*[:\s]*([\d.,]+)/i
    );
    if (totalMatch) {
        const num = parseFloat(cleanNumber(totalMatch[1]));
        if (!isNaN(num) && num > 0) return num;
    }
    // 3) "Food" / "Subtotal" + RD$ (tirillas en inglés)
    const foodMatch = text.match(/(?:FOOD|SUBTOTAL|SUBTOTAL\s*NETO)\s*[:\s]*R?D?\$?\s*([\d.,]+)/i);
    if (foodMatch) {
        const n = parseFloat(cleanNumber(foodMatch[1]));
        if (!isNaN(n) && n > 0) return n;
    }
    // 4) Cualquier RD$ 123.45
    const rdMatch = text.match(/R\.?D\.?\s*\$?\s*([\d.,]+)/gi);
    if (rdMatch && rdMatch.length > 0) {
        const amounts = rdMatch.map((m) => parseFloat(cleanNumber(m.replace(/R\.?D\.?\s*\$?/gi, "")))).filter((n) => !isNaN(n) && n > 0);
        if (amounts.length > 0) return Math.max(...amounts);
    }
    // 5) Último número que parezca monto
    const numbers = text.match(/[\d.,]+/g) || [];
    for (let i = numbers.length - 1; i >= 0; i--) {
        const n = parseFloat(cleanNumber(numbers[i]));
        if (!isNaN(n) && n >= 1 && n < 100_000_000) return n;
    }
    return 0;
}

function parseItbisFromText(text: string): number {
    const normalized = text.toUpperCase();
    // ITBIS 18% RD$ 81.00 o ITBIS: 81
    const itbisMatch = normalized.match(/(?:ITBIS|IMPUESTO|TAX)\s*(?:18\s*%?\s*)?[:\s]*R?D?\$?\s*([\d.,]+)/i);
    if (itbisMatch) {
        const n = parseFloat(cleanNumber(itbisMatch[1]));
        if (!isNaN(n)) return n;
    }
    const itbisRd = text.match(/ITBIS\s*18\s*%?\s*R?D?\$?\s*([\d.,]+)/i);
    if (itbisRd) {
        const n = parseFloat(cleanNumber(itbisRd[1]));
        if (!isNaN(n)) return n;
    }
    // 18% y número cercano
    const pctMatch = text.match(/18\s*%?\s*[\s:]*R?D?\$?\s*([\d.,]+)/i);
    if (pctMatch) {
        const n = parseFloat(cleanNumber(pctMatch[1]));
        if (!isNaN(n)) return n;
    }
    return 0;
}

function parseRncFromText(text: string): string {
    // Preferir RNC que aparece explícitamente (RNC: 123456789 o RNC 123456789)
    const rncLabel = text.match(/\bRNC\s*[:\-]?\s*(\d{9})\b/i);
    if (rncLabel) return rncLabel[1];
    const rncLabel11 = text.match(/\bRNC\s*[:\-]?\s*(\d{11})\b/i);
    if (rncLabel11) return rncLabel11[1];
    // RNC empresa: 9 dígitos; cédula: 11 dígitos (evitar NCF que suele tener letra B/E al inicio)
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

const MONTH_NAMES: Record<string, string> = { jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06", jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12" };

function parseDateFromText(text: string): string {
    const today = new Date().toISOString().split("T")[0];
    // "3 Feb '26" / "03 Feb 2026" (tirillas en inglés)
    const enDate = text.match(/\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+['']?(\d{2,4})\b/i);
    if (enDate) {
        const [, day, monthName, year] = enDate;
        const month = MONTH_NAMES[monthName.slice(0, 3).toLowerCase()] || "01";
        const y = year.length === 2 ? `20${year}` : year;
        return `${y}-${month}-${day.padStart(2, "0")}`;
    }
    // DD/MM/YYYY o DD-MM-YYYY
    const d1 = text.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/);
    if (d1) {
        const [, day, month, year] = d1;
        const y = year.length === 2 ? `20${year}` : year;
        return `${y}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
    const d2 = text.match(/\b(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\b/);
    if (d2) return `${d2[1]}-${d2[2].padStart(2, "0")}-${d2[3].padStart(2, "0")}`;
    return today;
}

const RECEIPT_NOISE = /^(CHK|TBL|CHECK|CLOSED|SERVICE|CHARGE|ROOM|DUE|EXEMPT|FECHA|TOTAL|ITBIS|PAGO|FOOD|DESCRIPCIÓN|CANTIDAD|PRECIO|SUBTOTAL)$/i;

function parseSupplierNameFromText(text: string): string {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const skip = /^[\d\s\-\/\.\$]+$|^RNC\s*:|^NCF\s*:|^TOTAL|^ITBIS|^FECHA|^PAGO|^FOOD/i;
    for (const line of lines) {
        if (line.length < 3 || skip.test(line) || RECEIPT_NOISE.test(line)) continue;
        // Nombre de negocio: letras, espacios, puntos, guiones, acentos (y opcional S.A., etc.)
        if (line.length <= 70 && /^[a-záéíóúñü\s\.\-]+(?:S\.?A\.?|S\.?R\.?L\.?|INC\.?)?$/i.test(line)) return line;
        // Línea que parece nombre (empieza con letras, puede tener números al final como dirección)
        if (line.length >= 4 && line.length <= 70 && /^[a-záéíóúñü]/i.test(line) && !/^\d+$/.test(line)) {
            const withoutTrailingNumbers = line.replace(/\s*\d[\d\s\-]*$/, "").trim();
            if (withoutTrailingNumbers.length >= 3) return withoutTrailingNumbers;
            return line;
        }
        if (/RNC|NCF/i.test(line)) break;
    }
    for (const line of lines) {
        if (line.length >= 2 && line.length <= 60 && !/^\d+$/.test(line) && !RECEIPT_NOISE.test(line)) return line;
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
