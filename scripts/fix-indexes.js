require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });

const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI no definido');
    process.exit(1);
}

async function fixIndexes() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Conectado a MongoDB');

        const db = mongoose.connection.db;
        const collection = db.collection('invoices');

        // Listar índices actuales
        const indexes = await collection.indexes();
        console.log('Índices actuales:', indexes);

        // Eliminar índice global en ncfSequence si existe
        try {
            await collection.dropIndex('ncfSequence_1');
            console.log('Índice global ncfSequence_1 eliminado');
        } catch (e) {
            console.log('Índice global no existía o error:', e.message);
        }

        // Crear índice compuesto si no existe
        try {
            await collection.createIndex({ userId: 1, ncfSequence: 1 }, { unique: true });
            console.log('Índice compuesto userId_ncfSequence creado');
        } catch (e) {
            console.log('Error creando índice compuesto:', e.message);
        }

        console.log('✅ Índices corregidos');
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await mongoose.disconnect();
    }
}

fixIndexes();