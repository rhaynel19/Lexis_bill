/**
 * Configuración de PayPal para suscripciones
 * Soporta planes Básico (Gratis) y Pro (RD$950/mes)
 */

const paypal = require('@paypal/checkout-server-sdk');

// Configuración del entorno (Sandbox o Production)
function environment() {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

    if (process.env.PAYPAL_MODE === 'production') {
        return new paypal.core.LiveEnvironment(clientId, clientSecret);
    } else {
        return new paypal.core.SandboxEnvironment(clientId, clientSecret);
    }
}

// Cliente de PayPal
function client() {
    return new paypal.core.PayPalHttpClient(environment());
}

// Planes de suscripción
const SUBSCRIPTION_PLANS = {
    BASIC: {
        id: 'basic',
        name: 'Plan Básico',
        price: 0,
        currency: 'DOP',
        interval: 'MONTH',
        features: [
            '3 facturas por mes',
            '1 usuario',
            'Soporte básico',
        ],
        limits: {
            invoicesPerMonth: 3,
            users: 1,
        }
    },
    GROWTH: {
        id: 'growth',
        name: 'Plan Crecimiento',
        price: 950,
        currency: 'DOP',
        interval: 'MONTH',
        features: [
            'Facturas ilimitadas',
            '1 usuario',
            'Soporte prioritario',
            'Reportes básicos',
        ],
        limits: {
            invoicesPerMonth: -1,
            users: 1,
        }
    },
    CORPORATE: {
        id: 'corporate',
        name: 'Plan Corporativo',
        price: 2450,
        currency: 'DOP',
        interval: 'MONTH',
        features: [
            'Facturas ilimitadas',
            'Múltiples usuarios (hasta 5)',
            'Soporte VIP',
            'Reportes avanzados',
            'API access',
        ],
        limits: {
            invoicesPerMonth: -1,
            users: 5,
        }
    }
};

// Convertir DOP a USD para PayPal (aproximado)
// PayPal requiere USD, EUR u otras monedas soportadas
// Tasa aproximada: 1 USD = 58 DOP
function convertDOPtoUSD(amountDOP) {
    const exchangeRate = 58; // Actualizar según tasa actual
    return (amountDOP / exchangeRate).toFixed(2);
}

module.exports = {
    client,
    environment,
    SUBSCRIPTION_PLANS,
    convertDOPtoUSD,
};
