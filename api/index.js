const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config({ path: '.env.local' });
    require('dotenv').config({ path: '.env' });
}

// Import from _api_core (hidden from Vercel function discovery)
const log = require('../_api_core/logger');
const connectDB = require('../_api_core/db');

// --- FAIL-FAST: Critical environment variables ---
const JWT_SECRET = process.env.JWT_SECRET;
const MONGODB_URI = process.env.MONGODB_URI;
const isProd = process.env.NODE_ENV === 'production';

if (!JWT_SECRET || JWT_SECRET.length < 32) {
    console.error('❌ FATAL: JWT_SECRET must be defined and at least 32 characters long.');
    process.exit(1);
}
if (!MONGODB_URI) {
    console.error('❌ FATAL: MONGODB_URI not defined.');
    process.exit(1);
}

const app = express();
app.set('trust proxy', 1);

// --- GLOBAL MIDDLEWARE ---
app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));
app.use(helmet({ contentSecurityPolicy: false }));

// CORS setup
const corsOrigin = process.env.CORS_ORIGIN;
app.use(cors({
    origin: isProd && corsOrigin ? corsOrigin.split(',').map(o => o.trim()) : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// DB Connection Middleware (Vercel standard)
app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (err) {
        log.error({ err: err.message }, 'Database connection error in request');
        res.status(503).json({
            message: 'Error de conexión fiscal con la base de datos.',
            error: err.message
        });
    }
});

// --- ROUTES ---

// Health & System
app.use('/api', require('../_api_core/routes/system'));

// Modular Domain Routes
app.use('/api/auth', require('../_api_core/routes/auth'));
app.use('/api/invoices', require('../_api_core/routes/invoices'));
app.use('/api/customers', require('../_api_core/routes/customers'));
app.use('/api/reports', require('../_api_core/routes/reports'));
app.use('/api/partners', require('../_api_core/routes/partners'));
app.use('/api/admin', require('../_api_core/routes/admin'));
app.use('/api/billing', require('../_api_core/routes/billing'));

// Root-level aliases for frontend compatibility
const billingRouter = require('../_api_core/routes/billing');
app.use('/api/business-copilot', (req, res, next) => {
    req.url = '/business-copilot'; // Rewrite internally to match the billing router's path
    billingRouter(req, res, next);
});
app.use('/api/collections', (req, res, next) => {
    req.url = '/debtors'; // Rewrite to match invoices.js
    require('../_api_core/routes/invoices')(req, res, next);
});
app.use('/api/quotes', require('../_api_core/routes/quotes')); 
app.use('/api/expenses', require('../_api_core/routes/expenses'));

// Legacy compatibility for login
const authController = require('../_api_core/controllers/auth');
const { authLimiter } = require('../_api_core/middleware/rateLimiter');
app.post('/api/login', authLimiter, authController.login);

// --- CRON JOBS (Vercel) ---
const reconciler = require('../_api_core/services/reconciler');
app.post('/api/cron/reconcile', async (req, res) => {
    // Security check per docs: require CRON_SECRET
    const secret = req.headers['x-cron-secret'] || req.body?.secret;
    const CRON_SECRET = process.env.CRON_SECRET || 'change-me-in-production';
    
    if (secret !== CRON_SECRET) {
        log.warn({ path: req.path }, 'Reconciliation attempt with invalid secret');
        return res.status(401).json({ error: 'Auth required' });
    }
    
    try {
        const results = await reconciler.reconcileSystem();
        res.json({ success: true, results });
    } catch (e) {
        log.error({ err: e.message }, 'Cron job reconcile error');
        res.status(500).send();
    }
});

// Global Error Handler
app.use((err, req, res, next) => {
    log.error({ err: err.message, stack: err.stack, path: req.path }, 'Unhandled API Error');
    res.status(500).json({ 
        message: 'Algo salió mal en nuestro motor fiscal.',
        error: isProd ? 'Internal Server Error' : err.message
    });
});

if (require.main === module) {
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => console.log(`🚀 Backend API local corriendo en puerto ${PORT}`));
}

module.exports = app;
