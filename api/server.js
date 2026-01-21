/**
 * Servidor Express para manejar suscripciones y webhooks de PayPal
 */

require('dotenv').config({ path: './api/.env' });
const express = require('express');
const cors = require('cors');
const subscriptionRoutes = require('./routes/subscriptions');
const webhookRoutes = require('./routes/webhooks');

const app = express();
// Create Support Ticket
app.post('/api/tickets', async (req, res) => {
    try {
        const { userId, rnc, type, description } = req.body;

        const newTicket = new SupportTicket({
            userId, // Optional
            rnc,
            type,
            description
        });

        await newTicket.save();

        // Simulate Email Sending (Production: Connect to SendGrid/AWS SES)
        if (process.env.NODE_ENV !== 'production') {
            console.log(`📧 [MOCK EMAIL] To: admin@lexisbill.com | Subject: New ${type} from ${rnc}`);
        }

        res.status(201).json({ message: 'Ticket creado exitosamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3001;
const API_URL = process.env.NEXT_PUBLIC_API_URL || `http://localhost:${PORT}`;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware (Only in Dev)
if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
        console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
        next();
    });
}

// Routes
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/webhooks', webhookRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
});

// Error handling
app.use((err, req, res, next) => {
    console.error('Error:', err.message); // Keep error logs minimal
    res.status(500).json({
        success: false,
        error: {
            message: 'Internal server error',
            code: 'SERVER_ERROR'
        }
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    if (process.env.NODE_ENV !== 'production') {
        console.log(`📊 Health check: ${API_URL}/health`);
    }
});

module.exports = app;
