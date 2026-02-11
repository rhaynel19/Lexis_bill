/**
 * BILLING BRAIN - Motor de Inteligencia Financiera
 * 
 * Procesa continuamente datos financieros y genera insights proactivos
 * que el Copilot consume y presenta al usuario.
 * 
 * Arquitectura: Backend invisible → Frontend visible (Copilot)
 */

const log = require('pino')({ level: process.env.LOG_LEVEL || 'info' });

/**
 * Prioridades de insights
 */
const INSIGHT_PRIORITY = {
    CRITICAL: 'critical',    // 🔴 Mostrar inmediatamente
    IMPORTANT: 'important',  // 🟠 Mostrar en dashboard/feed
    OPPORTUNITY: 'opportunity' // 🔵 Sugerencias suaves
};

/**
 * Motor de análisis financiero
 */
class BillingBrain {
    constructor(userId, invoices, customers, ncfSettings) {
        this.userId = userId;
        this.invoices = invoices || [];
        this.customers = customers || [];
        this.ncfSettings = ncfSettings || [];
        this.now = new Date();
        this.insights = [];
    }

    /**
     * Analiza todos los datos y genera insights priorizados
     */
    async analyze() {
        this.insights = [];

        // Análisis críticos (dinero en riesgo)
        this._analyzeUnpaidInvoices();
        this._analyzeOverdueInvoices();
        this._analyzeRevenueDrop();

        // Análisis importantes (tendencias)
        this._analyzeInactiveClients();
        this._analyzeClientConcentration();
        this._analyzePaymentMethods();

        // Oportunidades (crecimiento)
        this._analyzeGrowthOpportunities();
        this._analyzeRecurringPatterns();

        // Ordenar por prioridad
        this.insights.sort((a, b) => {
            const priorityOrder = { [INSIGHT_PRIORITY.CRITICAL]: 0, [INSIGHT_PRIORITY.IMPORTANT]: 1, [INSIGHT_PRIORITY.OPPORTUNITY]: 2 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        });

        return this.insights;
    }

    /**
     * 🔴 CRÍTICO: Facturas sin cobrar
     */
    _analyzeUnpaidInvoices() {
        const unpaid = this.invoices.filter(inv => {
            const bal = (inv.balancePendiente != null && inv.balancePendiente > 0)
                ? inv.balancePendiente
                : (inv.estadoPago === 'pendiente' || inv.estadoPago === 'parcial' || inv.status === 'pending')
                    ? (inv.total || 0) : 0;
            return bal > 0;
        });

        if (unpaid.length === 0) return;

        const totalUnpaid = unpaid.reduce((sum, inv) => {
            const bal = (inv.balancePendiente != null && inv.balancePendiente > 0)
                ? inv.balancePendiente
                : (inv.total || 0);
            return sum + bal;
        }, 0);

        if (totalUnpaid > 0) {
            this.insights.push({
                id: 'unpaid_invoices',
                priority: INSIGHT_PRIORITY.CRITICAL,
                type: 'unpaid_invoices',
                title: 'Facturas sin cobrar',
                message: `Detecté RD$${this._formatCurrency(totalUnpaid)} en facturas pendientes.`,
                humanMessage: `Detecté RD$${this._formatCurrency(totalUnpaid)} en facturas pendientes. ¿Quieres enviar recordatorios por WhatsApp ahora?`,
                action: {
                    label: 'Enviar recordatorios',
                    url: '/documentos',
                    type: 'whatsapp_reminders',
                    data: { invoiceIds: unpaid.map(inv => inv._id.toString()) }
                },
                metadata: {
                    count: unpaid.length,
                    total: totalUnpaid,
                    oldestDays: this._getOldestUnpaidDays(unpaid)
                }
            });
        }
    }

    /**
     * 🔴 CRÍTICO: Facturas vencidas
     */
    _analyzeOverdueInvoices() {
        const overdue = this.invoices.filter(inv => {
            const bal = (inv.balancePendiente != null && inv.balancePendiente > 0)
                ? inv.balancePendiente
                : (inv.estadoPago === 'pendiente' || inv.status === 'pending')
                    ? (inv.total || 0) : 0;
            
            if (bal === 0) return false;
            
            const invoiceDate = new Date(inv.date);
            const daysSince = Math.floor((this.now - invoiceDate) / (1000 * 60 * 60 * 24));
            return daysSince > 30; // Más de 30 días
        });

        if (overdue.length === 0) return;

        const totalOverdue = overdue.reduce((sum, inv) => {
            const bal = (inv.balancePendiente != null && inv.balancePendiente > 0)
                ? inv.balancePendiente
                : (inv.total || 0);
            return sum + bal;
        }, 0);

        const oldestDays = Math.max(...overdue.map(inv => {
            const invoiceDate = new Date(inv.date);
            return Math.floor((this.now - invoiceDate) / (1000 * 60 * 60 * 24));
        }));

        this.insights.push({
            id: 'overdue_invoices',
            priority: INSIGHT_PRIORITY.CRITICAL,
            type: 'overdue_invoices',
            title: 'Facturas vencidas',
            message: `Tienes ${overdue.length} factura${overdue.length > 1 ? 's' : ''} vencida${overdue.length > 1 ? 's' : ''} por más de 30 días (RD$${this._formatCurrency(totalOverdue)}).`,
            humanMessage: `Tienes ${overdue.length} factura${overdue.length > 1 ? 's' : ''} vencida${overdue.length > 1 ? 's' : ''} por más de 30 días. La más antigua tiene ${oldestDays} días. ¿Quieres contactar a estos clientes?`,
            action: {
                label: 'Ver facturas vencidas',
                url: '/documentos?filter=overdue',
                type: 'view_overdue'
            },
            metadata: {
                count: overdue.length,
                total: totalOverdue,
                oldestDays
            }
        });
    }

    /**
     * 🔴 CRÍTICO: Caída de ingresos
     */
    _analyzeRevenueDrop() {
        const currentMonth = this.now.getMonth();
        const currentYear = this.now.getFullYear();
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

        const currentMonthRevenue = this.invoices
            .filter(inv => {
                const invDate = new Date(inv.date);
                return invDate.getMonth() === currentMonth && invDate.getFullYear() === currentYear;
            })
            .reduce((sum, inv) => sum + (inv.total || 0), 0);

        const lastMonthRevenue = this.invoices
            .filter(inv => {
                const invDate = new Date(inv.date);
                return invDate.getMonth() === lastMonth && invDate.getFullYear() === lastMonthYear;
            })
            .reduce((sum, inv) => sum + (inv.total || 0), 0);

        if (lastMonthRevenue > 0 && currentMonthRevenue < lastMonthRevenue) {
            const dropPct = Math.round(((lastMonthRevenue - currentMonthRevenue) / lastMonthRevenue) * 100);
            
            if (dropPct >= 20) { // Solo alertar si la caída es significativa
                this.insights.push({
                    id: 'revenue_drop',
                    priority: INSIGHT_PRIORITY.CRITICAL,
                    type: 'revenue_drop',
                    title: 'Caída de ingresos',
                    message: `Tu facturación bajó ${dropPct}% respecto al mes pasado.`,
                    humanMessage: `Tu facturación bajó ${dropPct}% respecto al mes pasado. ¿Quieres ver qué clientes dejaron de comprar?`,
                    action: {
                        label: 'Ver análisis',
                        url: '/dashboard',
                        type: 'view_analysis'
                    },
                    metadata: {
                        currentMonth: currentMonthRevenue,
                        lastMonth: lastMonthRevenue,
                        dropPct
                    }
                });
            }
        }
    }

    /**
     * 🟠 IMPORTANTE: Clientes inactivos
     */
    _analyzeInactiveClients() {
        const clientMap = new Map();
        
        this.invoices.forEach(inv => {
            if (!inv.clientRnc) return;
            const key = inv.clientRnc;
            if (!clientMap.has(key)) {
                clientMap.set(key, {
                    rnc: key,
                    name: inv.clientName || 'Sin nombre',
                    lastInvoiceDate: new Date(inv.date),
                    totalRevenue: 0
                });
            }
            const client = clientMap.get(key);
            const invDate = new Date(inv.date);
            if (invDate > client.lastInvoiceDate) {
                client.lastInvoiceDate = invDate;
            }
            client.totalRevenue += (inv.total || 0);
        });

        const inactiveClients = Array.from(clientMap.values())
            .filter(client => {
                const daysSince = Math.floor((this.now - client.lastInvoiceDate) / (1000 * 60 * 60 * 24));
                return daysSince >= 60 && client.totalRevenue > 0; // Inactivo más de 60 días pero con historial
            })
            .sort((a, b) => b.totalRevenue - a.totalRevenue);

        if (inactiveClients.length > 0) {
            const topInactive = inactiveClients[0];
            const daysSince = Math.floor((this.now - topInactive.lastInvoiceDate) / (1000 * 60 * 60 * 24));

            this.insights.push({
                id: 'inactive_clients',
                priority: INSIGHT_PRIORITY.IMPORTANT,
                type: 'inactive_clients',
                title: 'Cliente inactivo',
                message: `El cliente "${topInactive.name}" no recibe facturas desde hace ${daysSince} días.`,
                humanMessage: `El cliente "${topInactive.name}" no recibe facturas desde hace ${daysSince} días. Antes facturaba regularmente. ¿Quieres contactarlo?`,
                action: {
                    label: 'Ver cliente',
                    url: `/clientes?rnc=${topInactive.rnc}`,
                    type: 'view_client'
                },
                metadata: {
                    clientName: topInactive.name,
                    rnc: topInactive.rnc,
                    daysSince,
                    totalRevenue: topInactive.totalRevenue,
                    totalInactive: inactiveClients.length
                }
            });
        }
    }

    /**
     * 🟠 IMPORTANTE: Concentración de ingresos
     */
    _analyzeClientConcentration() {
        const clientMap = new Map();
        let totalRevenue = 0;

        this.invoices.forEach(inv => {
            if (!inv.clientRnc) return;
            totalRevenue += (inv.total || 0);
            const key = inv.clientRnc;
            if (!clientMap.has(key)) {
                clientMap.set(key, {
                    name: inv.clientName || 'Sin nombre',
                    revenue: 0
                });
            }
            clientMap.get(key).revenue += (inv.total || 0);
        });

        if (totalRevenue === 0) return;

        const clients = Array.from(clientMap.values())
            .sort((a, b) => b.revenue - a.revenue);

        if (clients.length === 0) return;

        const topClient = clients[0];
        const topClientPct = (topClient.revenue / totalRevenue) * 100;

        if (topClientPct >= 70) {
            this.insights.push({
                id: 'client_concentration',
                priority: INSIGHT_PRIORITY.IMPORTANT,
                type: 'client_concentration',
                title: 'Alta dependencia de un cliente',
                message: `El ${Math.round(topClientPct)}% de tus ingresos provienen de un solo cliente.`,
                humanMessage: `El ${Math.round(topClientPct)}% de tus ingresos provienen de un solo cliente. Esto puede ser un riesgo financiero. ¿Quieres diversificar tu cartera?`,
                action: {
                    label: 'Ver clientes',
                    url: '/clientes',
                    type: 'view_clients'
                },
                metadata: {
                    topClientName: topClient.name,
                    concentrationPct: Math.round(topClientPct)
                }
            });
        }
    }

    /**
     * 🟠 IMPORTANTE: Métodos de pago
     */
    _analyzePaymentMethods() {
        const paymentMethods = {};
        let totalRevenue = 0;

        this.invoices.forEach(inv => {
            const method = inv.tipoPago || 'efectivo';
            if (!paymentMethods[method]) {
                paymentMethods[method] = { count: 0, revenue: 0 };
            }
            paymentMethods[method].count++;
            paymentMethods[method].revenue += (inv.total || 0);
            totalRevenue += (inv.total || 0);
        });

        // Insight: Si hay muchas facturas a crédito sin cobrar
        const creditUnpaid = this.invoices.filter(inv => {
            const isCredit = (inv.tipoPago === 'credito' || inv.tipoPago === 'crédito');
            const hasBalance = (inv.balancePendiente != null && inv.balancePendiente > 0) ||
                (inv.estadoPago === 'pendiente' || inv.status === 'pending');
            return isCredit && hasBalance;
        });

        if (creditUnpaid.length >= 5) {
            const totalCreditUnpaid = creditUnpaid.reduce((sum, inv) => {
                const bal = (inv.balancePendiente != null && inv.balancePendiente > 0)
                    ? inv.balancePendiente
                    : (inv.total || 0);
                return sum + bal;
            }, 0);

            this.insights.push({
                id: 'credit_payment_risk',
                priority: INSIGHT_PRIORITY.IMPORTANT,
                type: 'credit_payment_risk',
                title: 'Muchas facturas a crédito pendientes',
                message: `Tienes ${creditUnpaid.length} facturas a crédito sin cobrar (RD$${this._formatCurrency(totalCreditUnpaid)}).`,
                humanMessage: `Tienes ${creditUnpaid.length} facturas a crédito sin cobrar. Considera revisar tu política de crédito.`,
                action: {
                    label: 'Ver facturas',
                    url: '/documentos?filter=credit',
                    type: 'view_credit'
                },
                metadata: {
                    count: creditUnpaid.length,
                    total: totalCreditUnpaid
                }
            });
        }
    }

    /**
     * 🔵 OPORTUNIDAD: Oportunidades de crecimiento
     */
    _analyzeGrowthOpportunities() {
        // Clientes recurrentes que podrían facturar más
        const clientMap = new Map();
        
        this.invoices.forEach(inv => {
            if (!inv.clientRnc) return;
            const key = inv.clientRnc;
            if (!clientMap.has(key)) {
                clientMap.set(key, {
                    name: inv.clientName || 'Sin nombre',
                    invoiceCount: 0,
                    totalRevenue: 0,
                    lastInvoiceDate: new Date(inv.date)
                });
            }
            const client = clientMap.get(key);
            client.invoiceCount++;
            client.totalRevenue += (inv.total || 0);
            const invDate = new Date(inv.date);
            if (invDate > client.lastInvoiceDate) {
                client.lastInvoiceDate = invDate;
            }
        });

        const recurringClients = Array.from(clientMap.values())
            .filter(client => {
                const daysSince = Math.floor((this.now - client.lastInvoiceDate) / (1000 * 60 * 60 * 24));
                return client.invoiceCount >= 3 && daysSince >= 30 && daysSince <= 60; // Recurrente pero podría facturar más
            })
            .sort((a, b) => b.totalRevenue - a.totalRevenue);

        if (recurringClients.length > 0) {
            const topRecurring = recurringClients[0];
            this.insights.push({
                id: 'growth_opportunity',
                priority: INSIGHT_PRIORITY.OPPORTUNITY,
                type: 'growth_opportunity',
                title: 'Oportunidad de crecimiento',
                message: `${topRecurring.name} es un cliente recurrente que podría facturar más.`,
                humanMessage: `${topRecurring.name} es un cliente recurrente que podría facturar más. ¿Quieres crear una cotización?`,
                action: {
                    label: 'Crear cotización',
                    url: `/nueva-cotizacion?client=${topRecurring.name}`,
                    type: 'create_quote'
                },
                metadata: {
                    clientName: topRecurring.name,
                    invoiceCount: topRecurring.invoiceCount,
                    totalRevenue: topRecurring.totalRevenue
                }
            });
        }
    }

    /**
     * 🔵 OPORTUNIDAD: Patrones recurrentes
     */
    _analyzeRecurringPatterns() {
        // Detectar servicios más vendidos que podrían ser recurrentes
        const serviceMap = new Map();

        this.invoices.forEach(inv => {
            if (!inv.items || !Array.isArray(inv.items)) return;
            inv.items.forEach(item => {
                if (!item.description) return;
                const key = item.description.toLowerCase().trim();
                if (!serviceMap.has(key)) {
                    serviceMap.set(key, {
                        description: item.description,
                        count: 0,
                        revenue: 0
                    });
                }
                const service = serviceMap.get(key);
                service.count++;
                service.revenue += ((item.quantity || 1) * (item.price || 0));
            });
        });

        const topServices = Array.from(serviceMap.values())
            .sort((a, b) => b.count - a.count)
            .slice(0, 3);

        if (topServices.length > 0 && topServices[0].count >= 5) {
            this.insights.push({
                id: 'recurring_service',
                priority: INSIGHT_PRIORITY.OPPORTUNITY,
                type: 'recurring_service',
                title: 'Servicio recurrente detectado',
                message: `"${topServices[0].description}" es tu servicio más vendido (${topServices[0].count} veces).`,
                humanMessage: `"${topServices[0].description}" es tu servicio más vendido. ¿Quieres crear un servicio frecuente para facturar más rápido?`,
                action: {
                    label: 'Configurar servicio',
                    url: '/configuracion',
                    type: 'configure_service'
                },
                metadata: {
                    service: topServices[0].description,
                    count: topServices[0].count,
                    revenue: topServices[0].revenue
                }
            });
        }
    }

    /**
     * Utilidades
     */
    _formatCurrency(amount) {
        return new Intl.NumberFormat('es-DO', {
            style: 'currency',
            currency: 'DOP',
            maximumFractionDigits: 0
        }).format(amount);
    }

    _getOldestUnpaidDays(invoices) {
        if (invoices.length === 0) return 0;
        const oldest = invoices.reduce((oldest, inv) => {
            const invDate = new Date(inv.date);
            return invDate < oldest ? invDate : oldest;
        }, new Date(invoices[0].date));
        return Math.floor((this.now - oldest) / (1000 * 60 * 60 * 24));
    }
}

module.exports = { BillingBrain, INSIGHT_PRIORITY };
