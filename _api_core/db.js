const mongoose = require('mongoose');
const log = require('./logger');

const MONGODB_URI = process.env.MONGODB_URI;

const connectDB = async () => {
    if (mongoose.connection.readyState === 1) return mongoose.connection;

    if (!MONGODB_URI) {
        log.error('MONGODB_URI no definido');
        throw new Error('MONGODB_URI_MISSING');
    }

    try {
        log.info('Conectando a MongoDB...');
        const conn = await mongoose.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 15000,
            dbName: 'lexis_bill',
            maxPoolSize: 25
        });

        // AUTO-FIJO de índices problemáticos que causan duplicate key error #11000
        try {
            await mongoose.connection.db.collection('invoices').dropIndex('ncfSequence_1');
            console.log('✅ Índice global ncfSequence_1 removido con éxito');
        } catch (e) {
            // Ignorar si no existe
        }
        try {
            await mongoose.connection.db.collection('invoices').dropIndex('userId_1_ncfSequence_1');
            console.log('✅ Índice userId_1_ncfSequence_1 removido con éxito');
        } catch (e) {
            // Ignorar si no existe
        }
        
        return conn;
    } catch (err) {
        console.error('❌ Error fatal de conexión:', err.message);
        throw err;
    }
};

module.exports = connectDB;
