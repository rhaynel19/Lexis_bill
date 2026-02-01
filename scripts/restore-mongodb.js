#!/usr/bin/env node
/**
 * Script de restore MongoDB - Production Hardening
 * Uso: node scripts/restore-mongodb.js [archivo.gz]
 * Ejemplo: node scripts/restore-mongodb.js backups/backup-2026-01-31.gz
 *
 * IMPORTANTE: MONGODB_URI debe apuntar a la DB destino (staging o recovery).
 * No restaurar sobre producción sin confirmación explícita.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const MONGODB_URI = process.env.MONGODB_URI;
const archivePath = process.argv[2] || path.join(__dirname, '../backups/backup-' + new Date().toISOString().slice(0, 10) + '.gz');

if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI no definido');
    process.exit(1);
}

if (!fs.existsSync(archivePath)) {
    console.error(`❌ Archivo no encontrado: ${archivePath}`);
    console.error('Uso: node scripts/restore-mongodb.js [ruta/backup-YYYY-MM-DD.gz]');
    process.exit(1);
}

console.log(`Restaurando desde ${archivePath} a ${MONGODB_URI.replace(/:[^:@]+@/, ':****@')}`);

try {
    execSync(`mongorestore --uri="${MONGODB_URI}" --archive="${archivePath}" --gzip --drop`, {
        stdio: 'inherit'
    });
    console.log('✅ Restore completado correctamente');
} catch (err) {
    console.error('❌ Error en restore:', err.message);
    process.exit(1);
}
