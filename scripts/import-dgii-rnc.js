/**
 * Script para importar el listado de RNC de la DGII a MongoDB (colección RncContribuyente).
 * Uso: node scripts/import-dgii-rnc.js <ruta-archivo>
 *
 * Formatos soportados:
 * - TXT/CSV con cabecera. Delimitadores: coma, punto y coma, tab, pipe (|).
 * - Columnas esperadas: RNC (o rnc, Cédula) y Nombre (o name, Nombre/Razón Social, RazonSocial).
 *
 * Ejemplo de cabecera DGII: RNC\tNombre/Razón Social\t...
 * Ejemplo CSV: rnc,name
 */
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

function validateTaxId(str) {
    const s = String(str).replace(/\D/g, '');
    if (s.length === 9) {
        let sum = 0;
        const weights = [7, 9, 8, 6, 5, 4, 3, 2];
        for (let i = 0; i < 8; i++) sum += parseInt(s[i], 10) * weights[i];
        let remainder = sum % 11;
        let digit = remainder === 0 ? 2 : (remainder === 1 ? 1 : 11 - remainder);
        return digit === parseInt(s[8], 10);
    }
    if (s.length === 11) {
        let sum = 0;
        const weights = [1, 2, 1, 2, 1, 2, 1, 2, 1, 2];
        for (let i = 0; i < 10; i++) {
            let prod = parseInt(s[i], 10) * weights[i];
            if (prod > 9) prod = Math.floor(prod / 10) + (prod % 10);
            sum += prod;
        }
        const check = (10 - (sum % 10)) % 10;
        return check === parseInt(s[10], 10);
    }
    return false;
}

function detectDelimiter(line) {
    if (line.includes('|')) return '|';
    if (line.includes('\t')) return '\t';
    if (line.includes(';')) return ';';
    return ',';
}

function findColumnIndex(headers, names) {
    const normalized = headers.map(h => String(h).toLowerCase().trim());
    for (const name of names) {
        const i = normalized.findIndex(h => h.includes(name) || name.includes(h));
        if (i !== -1) return i;
    }
    return -1;
}

const rncContribuyenteSchema = new mongoose.Schema({
    rnc: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    type: { type: String, enum: ['JURIDICA', 'FISICA'], default: 'JURIDICA' },
    source: { type: String, enum: ['dgii_list', 'external_api'], default: 'dgii_list' },
    updatedAt: { type: Date, default: Date.now }
});
rncContribuyenteSchema.index({ rnc: 1 });
const RncContribuyente = mongoose.model('RncContribuyente', rncContribuyenteSchema);

const BATCH_SIZE = 1000;

async function run() {
    const filePath = process.argv[2];
    if (!filePath || !fs.existsSync(filePath)) {
        console.error('Uso: node scripts/import-dgii-rnc.js <ruta-archivo>');
        console.error('Ejemplo: node scripts/import-dgii-rnc.js ./DGII_RNC.txt');
        process.exit(1);
    }

    if (!MONGODB_URI) {
        console.error('MONGODB_URI no definido en .env o .env.local');
        process.exit(1);
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) {
        console.error('El archivo debe tener al menos cabecera y una fila de datos.');
        process.exit(1);
    }

    const delimiter = detectDelimiter(lines[0]);
    const headers = lines[0].split(delimiter).map(h => h.replace(/^["']|["']$/g, '').trim());
    const rncCol = findColumnIndex(headers, ['rnc', 'cedula', 'cédula', 'numero', 'número']);
    const nameCol = findColumnIndex(headers, ['nombre', 'name', 'razon', 'razón', 'razon social', 'razón social', 'razonsocial']);

    if (rncCol === -1 || nameCol === -1) {
        console.error('No se encontraron columnas RNC y Nombre. Cabecera detectada:', headers.join(' | '));
        process.exit(1);
    }

    console.log('Delimitador:', JSON.stringify(delimiter));
    console.log('Columna RNC (índice %d), Nombre (índice %d)', rncCol, nameCol);

    await mongoose.connect(MONGODB_URI, { dbName: 'lexis_bill' });
    console.log('Conectado a MongoDB.');

    let imported = 0;
    let skipped = 0;
    let errors = 0;
    let batch = [];

    for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(delimiter);
        if (parts.length <= Math.max(rncCol, nameCol)) {
            skipped++;
            continue;
        }
        const rawRnc = String(parts[rncCol] || '').replace(/\D/g, '');
        const name = String(parts[nameCol] || '').trim().slice(0, 500);
        if (!rawRnc || !name) {
            skipped++;
            continue;
        }
        if (!validateTaxId(rawRnc)) {
            skipped++;
            continue;
        }
        const type = rawRnc.length === 9 ? 'JURIDICA' : 'FISICA';
        batch.push({
            updateOne: {
                filter: { rnc: rawRnc },
                update: { $set: { name, type, source: 'dgii_list', updatedAt: new Date() } },
                upsert: true
            }
        });
        if (batch.length >= BATCH_SIZE) {
            try {
                await RncContribuyente.bulkWrite(batch);
                imported += batch.length;
                process.stdout.write('\rImportados: ' + imported);
            } catch (e) {
                errors += batch.length;
                console.error('\nError en lote:', e.message);
            }
            batch = [];
        }
    }

    if (batch.length) {
        try {
            await RncContribuyente.bulkWrite(batch);
            imported += batch.length;
        } catch (e) {
            errors += batch.length;
            console.error('\nError en último lote:', e.message);
        }
    }

    console.log('\nListo. Importados: %d, omitidos: %d, errores: %d', imported, skipped, errors);
    await mongoose.disconnect();
    process.exit(errors > 0 ? 1 : 0);
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
