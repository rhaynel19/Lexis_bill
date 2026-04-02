
const MEMBERSHIP_PLANS = {
    free: { 
        id: 'free', 
        name: 'Free', 
        price: 0, 
        currency: 'DOP', 
        invoicesPerMonth: 5, 
        features: ['5 facturas / mes', 'Reportes básicos'] 
    },
    pro: {
        id: 'pro',
        name: 'Profesional',
        priceMonthly: 950,
        priceAnnual: 9500,
        currency: 'DOP',
        invoicesPerMonth: -1,
        available: true,
        features: ['Facturas ilimitadas', 'Reportes 606/607', 'Soporte prioritario'],
        annualNote: 'Paga 10 meses y usa 12',
        annualPopular: true
    },
    premium: {
        id: 'premium',
        name: 'Premium',
        price: 2450,
        currency: 'DOP',
        invoicesPerMonth: -1,
        available: false,
        comingSoon: true,
        comingSoonNote: 'Próximamente: multi-negocio y más. Te avisaremos.',
        features: ['Todo Pro', 'Multi-negocio', 'Soporte VIP']
    }
};

module.exports = { MEMBERSHIP_PLANS };
