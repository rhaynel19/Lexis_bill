-- Esquema de Base de Datos - Web Billig DGII
-- PostgreSQL

-- Usuarios (Administradores, Profesionales, etc.)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user', -- 'admin', 'user', 'accountant'
    rnc VARCHAR(20),
    company_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    subscription_plan_id VARCHAR(50), -- 'basic', 'growth', 'corporate'
    referral_code VARCHAR(20) UNIQUE, -- Código propio para referir
    referred_by_code VARCHAR(20) -- Código de quien lo refirió
);

-- Suscripciones
CREATE TABLE IF NOT EXISTS subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    plan_id VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'cancelled', 'expired'
    start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMP,
    paypal_subscription_id VARCHAR(100)
);

-- Clientes del Profesional
CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id), -- El profesional dueño del cliente
    name VARCHAR(100) NOT NULL,
    rnc VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Facturas
CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    client_id INTEGER REFERENCES clients(id),
    sequence_number VARCHAR(20) NOT NULL, -- NCF (e.g. E3100000001)
    type VARCHAR(2) NOT NULL, -- '31', '32', '33', '34'
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    subtotal DECIMAL(15, 2) NOT NULL,
    itbis DECIMAL(15, 2) NOT NULL,
    isr_retention DECIMAL(15, 2) DEFAULT 0,
    itbis_retention DECIMAL(15, 2) DEFAULT 0,
    total DECIMAL(15, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'paid', 'cancelled'
    pdf_url TEXT, -- URL si se guarda en S3/Cloudinary
    xml_url TEXT -- URL del XML firmado (e-CF)
);

-- Ítems de Factura
CREATE TABLE IF NOT EXISTS invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER REFERENCES invoices(id),
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    price DECIMAL(15, 2) NOT NULL,
    is_exempt BOOLEAN DEFAULT FALSE -- Para gastos legales / no gravables
);

-- Vendedores / Afiliados (Referral System)
CREATE TABLE IF NOT EXISTS sellers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id), -- Un usuario puede ser vendedor
    code VARCHAR(20) UNIQUE NOT NULL, -- Código de referido 
    commission_rate DECIMAL(5, 2) DEFAULT 0.10, -- 10% de comisión por defecto
    total_earnings DECIMAL(15, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Comisiones generadas
CREATE TABLE IF NOT EXISTS commissions (
    id SERIAL PRIMARY KEY,
    seller_id INTEGER REFERENCES sellers(id),
    referred_user_id INTEGER REFERENCES users(id),
    amount DECIMAL(15, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'paid'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
