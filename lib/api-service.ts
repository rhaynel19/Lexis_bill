import { secureFetch } from "./secure-fetch";

// Siempre /api para same-origin (cookies HttpOnly). En dev, next.config rewrites proxy a backend.
const API_URL = "/api";

export interface AdminUser {
    id: string;
    name: string;
    email: string;
    rnc: string;
    role: string;
    profession?: string;
    plan: string;
    subscriptionStatus: string;
    expiryDate?: string;
    onboardingCompleted: boolean;
    createdAt: string;
    lastLoginAt?: string;
    blocked?: boolean;
    adminNotes?: string;
    partner?: { referralCode: string; status: string; tier?: string } | null;
}

export const api = {
    // Auth - credenciales via cookie HttpOnly
    async login(email: string, password: string) {
        return secureFetch<any>(`${API_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
            cacheKey: undefined
        });
    },

    async logout() {
        return secureFetch<any>(`${API_URL}/auth/logout`, { method: "POST" });
    },

    async forgotPassword(email: string) {
        return secureFetch<{ message: string }>(`${API_URL}/auth/forgot-password`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
            cacheKey: undefined,
        });
    },

    async resetPassword(token: string, newPassword: string) {
        return secureFetch<{ message: string }>(`${API_URL}/auth/reset-password`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, newPassword }),
            cacheKey: undefined,
        });
    },

    async register(data: { [key: string]: unknown }) {
        return secureFetch<any>(`${API_URL}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
    },

    async completeOnboarding(data: { name?: string; rnc?: string; address?: string; phone?: string; confirmedFiscalName?: string; logo?: string }) {
        const res = await secureFetch<any>(`${API_URL}/onboarding/complete`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
        if (typeof localStorage !== "undefined") {
            localStorage.removeItem("cache_auth_me");
        }
        return res;
    },

    async confirmFiscalName(confirmedName: string) {
        return secureFetch<any>(`${API_URL}/auth/confirm-fiscal-name`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ confirmedName }),
        });
    },

    async updateProfile(data: { [key: string]: unknown }) {
        return secureFetch<any>(`${API_URL}/auth/profile`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
    },

    // RNC (público)
    async validateRnc(number: string) {
        return secureFetch<any>(`${API_URL}/rnc/${number}`, {
            cacheKey: `rnc_${number}` // Cache RNC lookups
        });
    },

    async validateRncPost(rnc: string) {
        return secureFetch<any>(`${API_URL}/validate-rnc`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rnc }),
            cacheKey: `rnc_post_${rnc}`
        });
    },

    // Invoices (auth via cookie HttpOnly)
    async createInvoice(data: any) {
        return secureFetch<any>(`${API_URL}/invoices`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
    },

    async getInvoices(page = 1, limit = 50) {
        const res = await secureFetch<{ data: any[]; total: number; page: number; limit: number; pages: number }>(
            `${API_URL}/invoices?page=${page}&limit=${limit}`,
            { cacheKey: `invoices_list_${page}_${limit}` }
        );
        return res;
    },

    /** Stats del dashboard por agregación (sin cargar todas las facturas) */
    async getDashboardStats() {
        return secureFetch<{
            monthlyRevenue: number;
            previousMonthRevenue: number;
            monthlyTaxes: number;
            invoiceCount: number;
            pendingInvoices: number;
            totalPorCobrar: number;
            totalClients: number;
            chartData: number[];
            monthLabels: string[];
            targetInvoices: number;
        }>(`${API_URL}/dashboard/stats`, { cacheKey: undefined });
    },

    // NCF Settings
    async getNcfSettings() {
        return secureFetch<any[]>(`${API_URL}/ncf-settings`, {
            cacheKey: "ncf_settings"
        });
    },

    async saveNcfSetting(data: any) {
        const res = await secureFetch<any>(`${API_URL}/ncf-settings`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
        localStorage.removeItem("cache_ncf_settings");
        return res;
    },

    async updateNcfSetting(id: string, data: { initialNumber?: number; finalNumber?: number; expiryDate?: string }) {
        const res = await secureFetch<any>(`${API_URL}/ncf-settings/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
        localStorage.removeItem("cache_ncf_settings");
        return res;
    },

    async deleteNcfSetting(id: string) {
        await secureFetch<void>(`${API_URL}/ncf-settings/${id}`, { method: "DELETE" });
        localStorage.removeItem("cache_ncf_settings");
    },

    // Credit Note
    async createCreditNote(invoiceId: string) {
        return secureFetch<any>(`${API_URL}/invoices/${invoiceId}/credit-note`, { method: "POST" });
    },

    // Customers (CRM)
    async getCustomers() {
        return secureFetch<any[]>(`${API_URL}/customers`, {
            cacheKey: "customers_list"
        });
    },

    async saveCustomer(data: any) {
        const res = await secureFetch<any>(`${API_URL}/customers`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
        localStorage.removeItem("cache_customers_list");
        return res;
    },

    async importCustomers(data: any[]) {
        const res = await secureFetch<any>(`${API_URL}/customers/import`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
        localStorage.removeItem("cache_customers_list");
        return res;
    },

    async getCustomerHistory(rnc: string) {
        return secureFetch<any>(`${API_URL}/customers/${rnc}/history`, {
            cacheKey: `customer_history_${rnc}`
        });
    },

    async deleteCustomer(id: string) {
        const res = await secureFetch<{ success: boolean; message?: string }>(`${API_URL}/customers/${id}`, {
            method: "DELETE",
        });
        localStorage.removeItem("cache_customers_list");
        return res;
    },

    // Reports & Tax
    async getTaxSummary(month: number, year: number) {
        return secureFetch<any>(`${API_URL}/reports/summary?month=${month}&year=${year}`, {
            cacheKey: `tax_summary_${month}_${year}`
        });
    },

    async getTaxHealth(month?: number, year?: number) {
        const now = new Date();
        const m = month ?? now.getMonth() + 1;
        const y = year ?? now.getFullYear();
        return secureFetch<any>(`${API_URL}/reports/tax-health?month=${m}&year=${y}`, {
            cacheKey: `tax_health_${m}_${y}`
        });
    },

    async validateReport607(month: number, year: number): Promise<{ valid: boolean; errors?: string[] }> {
        const res = await fetch(`${API_URL}/reports/607/validate?month=${month}&year=${year}`, { credentials: "include" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return { valid: false, errors: [(data as { message?: string }).message || "Error de validación"] };
        return data;
    },

    async validateReport606(month: number, year: number): Promise<{ valid: boolean; errors?: string[] }> {
        const res = await fetch(`${API_URL}/reports/606/validate?month=${month}&year=${year}`, { credentials: "include" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return { valid: false, errors: [(data as { message?: string }).message || "Error de validación"] };
        return data;
    },

    async downloadReport607(month: number, year: number): Promise<Blob> {
        const res = await fetch(`${API_URL}/reports/607?month=${month}&year=${year}`, { credentials: "include" });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            const details = (err as { details?: string[] }).details;
            throw new Error(details?.length ? details.join("; ") : (err as { message?: string }).message || "Error al descargar reporte 607");
        }
        return res.blob();
    },

    async downloadReport606(month: number, year: number): Promise<Blob> {
        const res = await fetch(`${API_URL}/reports/606?month=${month}&year=${year}`, { credentials: "include" });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            const details = (err as { details?: string[] }).details;
            throw new Error(details?.length ? details.join("; ") : (err as { message?: string }).message || "Error al descargar reporte 606");
        }
        return res.blob();
    },

    /** Envía recordatorio 606/607 por email (máx. 1 por periodo). Llamar al entrar a Reportes. */
    async sendReportReminder(): Promise<{ sent: boolean; period?: string; reason?: string }> {
        const res = await fetch(`${API_URL}/reports/reminder`, { method: "POST", credentials: "include" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return { sent: false, reason: (data as { error?: string }).error || "error" };
        return data as { sent: boolean; period?: string; reason?: string };
    },

    async getQuotes() {
        return secureFetch<any[]>(`${API_URL}/quotes`, { cacheKey: "quotes_list" });
    },

    async createQuote(data: { [key: string]: unknown }) {
        const res = await secureFetch<any>(`${API_URL}/quotes`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
        localStorage.removeItem("cache_quotes_list");
        return res;
    },

    async updateQuote(id: string, data: { [key: string]: unknown }) {
        const res = await secureFetch<any>(`${API_URL}/quotes/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
        localStorage.removeItem("cache_quotes_list");
        return res;
    },

    async convertQuoteToInvoice(quoteId: string) {
        return secureFetch<any>(`${API_URL}/quotes/${quoteId}/convert`, { method: "POST" });
    },

    async deleteQuote(id: string) {
        const res = await secureFetch<{ message?: string }>(`${API_URL}/quotes/${id}`, { method: "DELETE" });
        localStorage.removeItem("cache_quotes_list");
        return res;
    },

    // Expenses (606)
    async getExpenses() {
        return secureFetch<any[]>(`${API_URL}/expenses`);
    },

    async saveExpense(expenseData: any) {
        return secureFetch<any>(`${API_URL}/expenses`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(expenseData)
        });
    },

    async deleteExpense(id: string) {
        return secureFetch<any>(`${API_URL}/expenses/${id}`, { method: "DELETE" });
    },

    // Subscription & Payments
    async getSubscriptionStatus(forceRefresh = false) {
        const cacheKey = forceRefresh ? undefined : "subscription_status";
        const headers = forceRefresh ? { 'Cache-Control': 'no-cache' } : undefined;
        return secureFetch<any>(`${API_URL}/subscription/status`, { 
            cacheKey,
            headers
        });
    },
    
    // ✅ Función para invalidar cache de suscripción
    invalidateSubscriptionCache() {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('cache_subscription_status');
        }
    },

    async getPaymentHistory() {
        return secureFetch<any[]>(`${API_URL}/payments/history`, { cacheKey: "payment_history" });
    },

    // Auth - usuario actual (role, subscription)
    async getMe() {
        return secureFetch<any>(`${API_URL}/auth/me`, { cacheKey: "auth_me" });
    },

    // Membresías (planes y solicitar pago manual)
    async getMembershipPlans() {
        return secureFetch<any>(`${API_URL}/membership/plans`, { cacheKey: "membership_plans" });
    },

    async getMembershipPaymentInfo() {
        return secureFetch<any>(`${API_URL}/membership/payment-info`);
    },

    /** Obtiene referencia única LEX-XXXX para que el cliente la ponga en la transferencia (antes de pagar). No crea solicitud en DB. */
    async prepareTransfer(plan: string, billingCycle: "monthly" | "annual") {
        return secureFetch<{ reference: string }>(`${API_URL}/membership/prepare-transfer`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ plan, billingCycle }),
        });
    },

    async requestMembershipPayment(
        plan: string,
        billingCycle: "monthly" | "annual",
        paymentMethod: "transferencia" | "paypal",
        comprobanteImage?: string,
        reference?: string
    ) {
        const body: Record<string, unknown> = { plan, billingCycle, paymentMethod };
        if (comprobanteImage) body.comprobanteImage = comprobanteImage;
        if (reference) body.reference = reference;
        const res = await secureFetch<{ success: boolean; message: string; payment: any; subscription: any }>(`${API_URL}/membership/request-payment`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        // ✅ Invalidar cache de suscripción y historial después de crear pago
        this.invalidateSubscriptionCache();
        this.invalidatePaymentHistoryCache();
        return res;
    },

    invalidatePaymentHistoryCache() {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('cache_payment_history');
        }
    },

    // Admin - pagos pendientes y validación
    async getPendingPayments() {
        return secureFetch<any[]>(`${API_URL}/admin/pending-payments`);
    },

    async approvePayment(id: string) {
        const result = await secureFetch<any>(`${API_URL}/admin/approve-payment/${id}`, { method: "POST" });
        // ✅ Invalidar cache después de aprobar pago (afecta suscripción)
        this.invalidateSubscriptionCache();
        return result;
    },

    async rejectPayment(id: string) {
        const result = await secureFetch<any>(`${API_URL}/admin/reject-payment/${id}`, { method: "POST" });
        // ✅ Invalidar cache después de rechazar pago
        this.invalidateSubscriptionCache();
        return result;
    },

    async getAdminPaymentsHistory(params?: { page?: number; limit?: number }) {
        const sp = new URLSearchParams();
        if (params?.page) sp.set("page", String(params.page));
        if (params?.limit) sp.set("limit", String(params.limit));
        const query = sp.toString();
        return secureFetch<{ list: Array<{ id: string; reference: string; plan: string; billingCycle: string; paymentMethod: string; amount: number; requestedAt: string; processedAt: string; userName?: string; userEmail?: string; processedByEmail?: string }>; total: number; page: number; limit: number }>(
            `${API_URL}/admin/payments-history${query ? `?${query}` : ""}`
        );
    },

    async getAdminStats(query?: string) {
        return secureFetch<any>(`${API_URL}/admin/stats${query || ""}`);
    },

    async getAdminMetrics(query?: string) {
        return secureFetch<any>(`${API_URL}/admin/metrics${query || ""}`);
    },

    async getAdminChartData(months?: number) {
        return secureFetch<{ monthly: Array<{ month: string; revenue: number; invoices: number }>; usersByPlan: { free: number; pro: number; premium: number } }>(
            `${API_URL}/admin/chart-data${months ? `?months=${months}` : ""}`
        );
    },

    async getAdminUsers(params?: { q?: string; role?: string; plan?: string; status?: string; activity?: string; sortBy?: string; sortOrder?: string; page?: number; limit?: number }) {
        const sp = new URLSearchParams();
        if (params?.q) sp.set("q", params.q);
        if (params?.role) sp.set("role", params.role);
        if (params?.plan) sp.set("plan", params.plan);
        if (params?.status) sp.set("status", params.status);
        if (params?.activity) sp.set("activity", params.activity);
        if (params?.sortBy) sp.set("sortBy", params.sortBy);
        if (params?.sortOrder) sp.set("sortOrder", params.sortOrder);
        if (params?.page) sp.set("page", String(params.page));
        if (params?.limit) sp.set("limit", String(params.limit));
        const query = sp.toString();
        return secureFetch<{ list: AdminUser[]; total: number; page: number; limit: number }>(
            `${API_URL}/admin/users${query ? `?${query}` : ""}`
        );
    },

    async activateUser(userId: string) {
        return secureFetch<{ message: string }>(`${API_URL}/admin/users/${userId}/activate`, { method: "POST" });
    },

    async deactivateUser(userId: string) {
        return secureFetch<{ message: string }>(`${API_URL}/admin/users/${userId}/deactivate`, { method: "POST" });
    },

    async deleteUser(userId: string) {
        return secureFetch<{ message: string }>(`${API_URL}/admin/users/${userId}`, { method: "DELETE" });
    },

    async getAdminUserDetail(userId: string) {
        return secureFetch<AdminUser & { invoices?: Array<{ id: string; clientName: string; total: number; date: string; status: string }>; totalFacturado?: number; totalFacturas?: number }>(
            `${API_URL}/admin/users/${userId}`
        );
    },

    async blockUser(userId: string) {
        return secureFetch<{ message: string }>(`${API_URL}/admin/users/${userId}/block`, { method: "POST" });
    },

    async unblockUser(userId: string) {
        return secureFetch<{ message: string }>(`${API_URL}/admin/users/${userId}/unblock`, { method: "POST" });
    },

    async updateUserNotes(userId: string, notes: string) {
        return secureFetch<{ message: string }>(`${API_URL}/admin/users/${userId}/notes`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ notes }),
        });
    },

    async getAdminAlerts() {
        return secureFetch<{ alerts: Array<{ type: string; count: number; severity: string; message: string }> }>(`${API_URL}/admin/alerts`);
    },

    async getAdminAudit(params?: { page?: number; limit?: number }) {
        const sp = new URLSearchParams();
        if (params?.page) sp.set("page", String(params.page));
        if (params?.limit) sp.set("limit", String(params.limit));
        const query = sp.toString();
        return secureFetch<{ list: Array<{ _id: string; adminId: string; adminEmail?: string; action: string; targetType?: string; targetId?: string; metadata?: unknown; createdAt: string }>; total: number; page: number; limit: number }>(
            `${API_URL}/admin/audit${query ? `?${query}` : ""}`
        );
    },

    async getAlerts() {
        return secureFetch<{ alerts: Array<{ type: string; message: string; severity: string }> }>(`${API_URL}/alerts`);
    },

    /** Lexis Business Copilot: analytics, alertas, scoring, predicción, morosidad */
    async getBusinessCopilot() {
        return secureFetch<{
            insufficientData?: boolean;
            message?: string;
            alerts: Array<{ type: string; severity: string; message: string; count?: number; pct?: number; clientName?: string; service?: string; amount?: number }>;
            clientRadar: Array<{ rnc: string; clientName: string; daysSinceLastInvoice: number; totalRevenue: number; revenuePct: number; status: string; recommendation?: string }>;
            rankings: { topClient?: { name: string; total: number; pct: number } | null; droppedClient?: { name: string; lastMonthTotal: number } | null; topService?: { description: string; totalRevenue: number; totalQuantity: number } | null };
            fiscalAlerts: Array<{ type: string; severity: string; message: string }>;
            prediction: { currentRevenue: number; projectedMonth: number; dailyRate: number; daysRemaining: number; projectedCash15Days?: number };
            businessHealth: { score: number; label: string; concentrationRisk?: string };
            paymentInsights?: { creditPct: number; transferPct: number; totalBalancePendiente: number };
            morosityRadar?: { totalPendiente: number; clientes: Array<{ rnc: string; clientName: string; totalPendiente: number; facturasVencidas: number; diasMayorAntiguedad: number; nivel: string }>; riesgoGeneral: string };
        }>(`${API_URL}/business-copilot`, { timeout: 20000 });
    },

    /** Verificar riesgo del cliente antes de facturar a crédito (modo preventivo) */
    async getClientPaymentRisk(rnc: string) {
        return secureFetch<{ riskScore: number; level: string; message?: string; avgDaysToPay?: number; pendingAmount?: number }>(
            `${API_URL}/client-payment-risk?rnc=${encodeURIComponent(rnc)}`
        );
    },

    // Borrador y plantillas de factura
    async getInvoiceDraft() {
        return secureFetch<any>(`${API_URL}/invoice-draft`);
    },

    async saveInvoiceDraft(data: { items: any[]; clientName?: string; rnc?: string; invoiceType?: string }) {
        return secureFetch<any>(`${API_URL}/invoice-draft`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
    },

    async deleteInvoiceDraft() {
        return secureFetch<any>(`${API_URL}/invoice-draft`, { method: "DELETE" });
    },

    async getServices() {
        return secureFetch<any[]>(`${API_URL}/services`);
    },

    /** Autofill inteligente: sugerencias de clientes, servicios y última factura */
    async getAutofillSuggestions(params: { q?: string; rnc?: string }) {
        const sp = new URLSearchParams();
        if (params.q?.trim()) sp.set("q", params.q.trim());
        if (params.rnc?.trim()) sp.set("rnc", String(params.rnc).replace(/[^\d]/g, ""));
        const qs = sp.toString();
        return secureFetch<{
            clients: Array<{ name: string; rnc: string; phone: string; lastTotal?: number; count?: number; usualTipoPago?: string }>;
            services: Array<{ description: string; price: number; isExempt: boolean; count?: number }>;
            lastInvoice: null | {
                items: Array<{ description: string; quantity: number; price: number; isExempt?: boolean }>;
                tipoPago: string;
                ncfType?: string;
                total?: number;
                date?: string;
            };
        }>(`${API_URL}/autofill/suggestions${qs ? `?${qs}` : ""}`, { cacheKey: undefined });
    },

    async saveServices(services: Array<{ description?: string; quantity?: number; price?: number; isExempt?: boolean }>) {
        return secureFetch<{ services: unknown[] }>(`${API_URL}/services`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ services }),
        });
    },

    async getInvoiceTemplates() {
        return secureFetch<any[]>(`${API_URL}/invoice-templates`);
    },

    async saveInvoiceTemplate(data: { name: string; invoiceType?: string; items: any[]; clientName?: string; rnc?: string }) {
        return secureFetch<any>(`${API_URL}/invoice-templates`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
    },

    // Bóveda de Documentos (MongoDB)
    async getDocuments() {
        return secureFetch<any[]>(`${API_URL}/documents`, { cacheKey: "user_documents" });
    },

    async uploadDocument(name: string, type: string, data: string) {
        const res = await secureFetch<any>(`${API_URL}/documents`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, type, data }),
        });
        if (typeof localStorage !== "undefined") localStorage.removeItem("cache_user_documents");
        return res;
    },

    async getDocument(id: string) {
        return secureFetch<any>(`${API_URL}/documents/${id}`);
    },

    async deleteDocument(id: string) {
        const res = await secureFetch<any>(`${API_URL}/documents/${id}`, { method: "DELETE" });
        if (typeof localStorage !== "undefined") localStorage.removeItem("cache_user_documents");
        return res;
    },

    // Programa Partners
    async validateReferralCode(code: string) {
        return secureFetch<{ valid: boolean; partnerName?: string }>(`${API_URL}/referral/validate?code=${encodeURIComponent(code)}`);
    },

    async validateInviteToken(token: string) {
        return secureFetch<{ valid: boolean; source?: string }>(`${API_URL}/referral/invite?token=${encodeURIComponent(token)}`);
    },

    async applyPartner(data: { name: string; phone?: string; whyPartner?: string; inviteToken?: string }) {
        return secureFetch<any>(`${API_URL}/partners/apply`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
    },

    async getPartnerDashboard() {
        return secureFetch<any>(`${API_URL}/partners/dashboard`);
    },

    async getPartnerMe() {
        return secureFetch<any>(`${API_URL}/partners/me`);
    },

    async getAdminPartners() {
        return secureFetch<any[]>(`${API_URL}/admin/partners`);
    },

    async getAdminPartnersStats() {
        return secureFetch<any>(`${API_URL}/admin/partners/stats`);
    },

    async approvePartner(id: string) {
        return secureFetch<any>(`${API_URL}/admin/partners/${id}/approve`, { method: "POST" });
    },

    async suspendPartner(id: string) {
        return secureFetch<any>(`${API_URL}/admin/partners/${id}/suspend`, { method: "POST" });
    },

    async getPartnerCartera(partnerId: string) {
        return secureFetch<{ partner: { name: string; referralCode: string }; cartera: any[] }>(`${API_URL}/admin/partners/${partnerId}/cartera`);
    },

    async createPartnerInvite(data?: { expiresDays?: number; maxUses?: number }) {
        return secureFetch<{ inviteUrl: string; token: string; expiresAt: string; maxUses: number }>(`${API_URL}/admin/partners/invites`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data || {}),
        });
    },

    async calculatePartnerCommissions(data?: { year?: number; month?: number }) {
        return secureFetch<{ message: string; month: string; partnersProcessed: number; created: number; updated: number }>(`${API_URL}/admin/partners/calculate-commissions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data || {}),
        });
    },

    async reconcileSystem() {
        return secureFetch<{ success: boolean; message: string; results: { payments: { repaired: number; total: number }; subscriptions: { repaired: number; total: number }; grace: { movedToGrace: number; total: number }; suspension: { suspended: number; total: number }; counters: { success: boolean } } }>(`${API_URL}/admin/reconcile`, {
            method: "POST",
        });
    },

    async repairUserBilling(userId: string) {
        return secureFetch<{ success: boolean; message: string; userId: string; subscription: { id: string; status: string; plan: string; periodEnd: string }; repairs: string[]; hasApprovedPayment: boolean }>(`${API_URL}/admin/repair-user-billing/${userId}`, {
            method: "POST",
        });
    },

    async getBillingAlerts() {
        return secureFetch<{ success: boolean; alerts: Array<{ type: string; severity: string; message: string; userId?: string; paymentId?: string; count?: number }> }>(`${API_URL}/admin/billing-alerts`);
    },

    async getBillingHealth() {
        return secureFetch<{ success: boolean; healthScore: number; isHealthy: boolean; metrics: { totalPayments: number; approvedPayments: number; consistentPayments: number; inconsistentPayments: number }; alerts: number; recommendation: string }>(`${API_URL}/admin/billing-health`);
    },
};
