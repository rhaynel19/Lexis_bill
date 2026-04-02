const path = require('path');
// Load local env if exists
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const log = require('./logger');
const connectDB = require('./db');

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
app.use('/api', require('./routes/system'));

// Modular Domain Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/partners', require('./routes/partners'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/billing', require('./routes/billing'));

// Legacy compatibility for login
const authController = require('./controllers/auth');
const { authLimiter } = require('./middleware/rateLimiter');
app.post('/api/login', authLimiter, authController.login);

// Global Error Handler
app.use((err, req, res, next) => {
    log.error({ err: err.message, stack: err.stack, path: req.path }, 'Unhandled API Error');
    res.status(500).json({ 
        message: 'Algo salió mal en nuestro motor fiscal.',
        error: isProd ? 'Internal Server Error' : err.message
    });
});

module.exports = app;
