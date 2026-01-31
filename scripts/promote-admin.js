/**
 * Promueve un usuario a admin por email.
 * Uso: node scripts/promote-admin.js usuario@ejemplo.com
 */
require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env.local') });
require('dotenv').config();

const mongoose = require('mongoose');
const email = process.argv[2];

if (!email) {
    console.error('Uso: node scripts/promote-admin.js <email>');
    process.exit(1);
}

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
    console.error('MONGODB_URI no definido');
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
