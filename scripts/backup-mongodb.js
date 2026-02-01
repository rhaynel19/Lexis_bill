#!/usr/bin/env node
/**
 * Script de backup MongoDB - Production Hardening
 * Ejecutar diariamente via cron/Vercel Cron
 * Requiere: MONGODB_URI, BACKUP_BUCKET (S3/R2) o salida local
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const MONGODB_URI = process.env.MONGODB_URI;
const OUTPUT_DIR = process.env.BACKUP_OUTPUT_DIR || path.join(__dirname, '../backups');

if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI no definido');
    process.exit(1);
}

const date = new Date().toISOString().slice(0, 10);
const filename = `backup-${date}.gz`;
const outPath = path.join(OUTPUT_DIR, filename);

try {
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // mongodump (requiere mongodb-database-tools instalado)
    execSync(`mongodump --uri="${MONGODB_URI}" --archive="${outPath}" --gzip`, {
        stdio: 'inherit'
    });

    console.log(`✅ Backup creado: ${outPath}`);

    // TODO: Subir a S3/R2 si BACKUP_BUCKET está configurado
    if (process.env.BACKUP_BUCKET) {
        console.log('⚠️ Upload a S3/R2: Configure AWS CLI o SDK según su proveedor.');
    }
} catch (err) {
    console.error('❌ Error en backup:', err.message);
    process.exit(1);
}
