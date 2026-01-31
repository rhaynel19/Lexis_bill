/**
 * Promueve un usuario a admin por email.
 * Uso: node scripts/promote-admin.js usuario@ejemplo.com
 */
const path = require('path');
const projectRoot = path.resolve(__dirname, '..');

// Cargar .env desde la raíz del proyecto (funciona aunque ejecutes desde otra carpeta)
require('dotenv').config({ path: path.join(projectRoot, '.env.local') });
require('dotenv').config({ path: path.join(projectRoot, '.env') });

const mongoose = require('mongoose');
const email = process.argv[2];

if (!email) {
    console.error('Uso: node scripts/promote-admin.js <email>');
    process.exit(1);
}

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
    console.error('');
    console.error('❌ MONGODB_URI no definido.');
    console.error('');
    console.error('Solución: Crea o edita .env.local en la raíz del proyecto y agrega:');
    console.error('');
    console.error('  MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/lexis_bill');
    console.error('');
    console.error('(Usa la misma URL de MongoDB que tu API.)');
    console.error('');
    process.exit(1);
}

async function main() {
    await mongoose.connect(MONGODB_URI, { dbName: 'lexis_bill' });
    const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({ email: String, role: String }, { strict: false }));
    const r = await User.updateOne({ email }, { $set: { role: 'admin' } });
    if (r.matchedCount === 0) {
        console.error('Usuario no encontrado:', email);
        process.exit(1);
    }
    console.log('✅ Usuario', email, 'ahora es admin.');
    process.exit(0);
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
