/**
 * Motor de Validación DGII - Reportes 606/607
 * Cumplimiento Norma General 07-2018 / 05-2019
 */

const DGII_EXPENSE_CATEGORIES = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11'];

function maskNcf(ncf) {
    if (!ncf || ncf.length < 6) return '***';
    return ncf.slice(0, 2) + '***' + ncf.slice(-4);
}

function validateNcfStructure(ncf) {
    const errors = [];
    if (!ncf || typeof ncf !== 'string') {
        return { valid: false, errors: ['NCF requerido'] };
    }
    const clean = ncf.replace(/[^\dA-Za-z]/g, '');
    if (clean.length < 11) errors.push(`NCF "${maskNcf(ncf)}" debe tener al menos 11 caracteres`);
    if (!clean.startsWith('B') && !clean.startsWith('E')) errors.push(`NCF "${maskNcf(ncf)}" debe iniciar con B o E`);
    const tipo = clean.slice(1, 3);
    if (!/^\d{2}$/.test(tipo)) errors.push(`NCF "${maskNcf(ncf)}" tipo debe ser 2 dígitos`);
    const sec = clean.slice(3);
    if (!/^\d+$/.test(sec)) errors.push(`NCF "${maskNcf(ncf)}" secuencia debe ser numérica`);
    return { valid: errors.length === 0, errors };
}

function validate607Format(content) {
    const errors = [];
    const lines = content.trim().split('\n').filter(l => l.length > 0);
    if (lines.length === 0) return { valid: false, errors: ['Archivo vacío'] };

    const headerParts = lines[0].split('|');
    if (headerParts.length < 4) errors.push('Cabecera 607: debe tener formato 607|RNC|periodo|cantidad');
    if (headerParts[0] !== '607') errors.push('Cabecera 607: debe iniciar con 607');
    if (headerParts[1] && !/^\d{9,11}$/.test(headerParts[1].replace(/\D/g, ''))) errors.push('Cabecera 607: RNC emisor inválido');
    if (headerParts[2] && !/^\d{6}$/.test(headerParts[2])) errors.push('Cabecera 607: periodo debe ser YYYYMM');

    const expectedCols = 19;
    lines.slice(1).forEach((line, idx) => {
        const parts = line.split('|');
        if (parts.length !== expectedCols) errors.push(`Línea ${idx + 2}: se esperan ${expectedCols} columnas, hay ${parts.length}`);
        if (parts.length >= 6 && parts[5] && !/^\d{8}$/.test(parts[5])) errors.push(`Línea ${idx + 2}: fecha comprobante debe ser YYYYMMDD`);
        if (parts.length >= 8 && parts[7] && isNaN(parseFloat(parts[7]))) errors.push(`Línea ${idx + 2}: monto facturado debe ser numérico`);
        if (parts.length >= 9 && parts[8] && isNaN(parseFloat(parts[8]))) errors.push(`Línea ${idx + 2}: ITBIS facturado debe ser numérico`);
        if (parts.length >= 16 && parts[15] && isNaN(parseFloat(parts[15]))) errors.push(`Línea ${idx + 2}: monto total debe ser numérico`);
    });

    return { valid: errors.length === 0, errors };
}

function validate606Format(content) {
    const errors = [];
    const lines = content.trim().split('\n').filter(l => l.length > 0);
    if (lines.length === 0) return { valid: false, errors: ['Archivo vacío'] };

    const headerParts = lines[0].split('|');
    if (headerParts.length < 4) errors.push('Cabecera 606: debe tener formato 606|RNC|periodo|cantidad');
    if (headerParts[0] !== '606') errors.push('Cabecera 606: debe iniciar con 606');
    if (headerParts[2] && !/^\d{6}$/.test(headerParts[2])) errors.push('Cabecera 606: periodo debe ser YYYYMM');

    lines.slice(1).forEach((line, idx) => {
        const parts = line.split('|');
        if (parts.length < 10) errors.push(`Línea ${idx + 2}: columnas insuficientes (mínimo 10)`);
        if (parts.length >= 4 && parts[2] && !DGII_EXPENSE_CATEGORIES.includes(parts[2])) errors.push(`Línea ${idx + 2}: categoría ${parts[2]} inválida (01-11)`);
        if (parts.length >= 5) {
            const ncfRes = validateNcfStructure(parts[3] || '');
            if (!ncfRes.valid) errors.push(`Línea ${idx + 2}: ${ncfRes.errors.join('; ')}`);
        }
        if (parts.length >= 7 && parts[5] && !/^\d{8}$/.test(parts[5])) errors.push(`Línea ${idx + 2}: fecha debe ser YYYYMMDD`);
    });

    return { valid: errors.length === 0, errors };
}

module.exports = { validate607Format, validate606Format, validateNcfStructure };
