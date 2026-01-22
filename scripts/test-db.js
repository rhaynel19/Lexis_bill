const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });
require('dotenv').config();

const MONGODB_URI = process.argv[2] || process.env.MONGODB_URI;

async function testConnection() {
    console.log('--- Diagnóstico de Conexión MongoDB ---');
    console.log(`Entorno: ${process.env.NODE_ENV || 'development'}`);

    if (!MONGODB_URI) {
        console.error('❌ ERROR: MONGODB_URI no está definido en .env o .env.local');
        process.exit(1);
    }

    const maskedUri = MONGODB_URI.replace(/:([^@]+)@/, ':****@');
    console.log(`URI detectada: ${maskedUri}`);

    try {
        console.log('Intentando conectar...');
        await mongoose.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
            dbName: 'lexis_bill'
        });
        console.log('✅ EXITO: Conexión establecida correctamente.');

        // Verificar acceso a colecciones
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log(`Colecciones encontradas: ${collections.map(c => c.name).join(', ') || 'Ninguna (BD vacía)'}`);

        await mongoose.disconnect();
        console.log('Desconectado.');
    } catch (err) {
        console.error('❌ ERROR DE CONEXIÓN:');
        console.error(`Mensaje: ${err.message}`);
        console.error(`Código: ${err.code || 'N/A'}`);

        if (err.message.includes('IP address')) {
            console.log('\n💡 SUGERENCIA: Tu IP actual no está permitida en MongoDB Atlas.');
        } else if (err.message.includes('authentication failed')) {
            console.log('\n💡 SUGERENCIA: Usuario o contraseña incorrectos en el MONGODB_URI.');
        } else {
            console.log('\n💡 SUGERENCIA: Verifica que MongoDB esté corriendo o que el Host sea accesible.');
        }
        process.exit(1);
    }
}

testConnection();
