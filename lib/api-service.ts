import { secureFetch } from "./secure-fetch";

// Siempre /api para same-origin (cookies HttpOnly). En dev, next.config rewrites proxy a backend.
const API_URL = "/api";

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

    async register(data: { [key: string]: unknown }) {
        return secureFetch<any>(`${API_URL}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
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

    // Invoices
    async createInvoice(data: any) {
        const token = localStorage.getItem("token");
        return secureFetch<any>(`${API_URL}/invoices`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(data),
        });
    },

    async getInvoices() {
        const token = localStorage.getItem("token");
        return secureFetch<any[]>(`${API_URL}/invoices`, {
            headers: {
                "Authorization": `Bearer ${token}`
            },
            cacheKey: "invoices_list" // Cache invoice list for dashboard robustness
        });
    },

    // NCF Settings
    async getNcfSettings() {
        const token = localStorage.getItem("token");
        return secureFetch<any[]>(`${API_URL}/ncf-settings`, {
            headers: { "Authorization": `Bearer ${token}` },
            cacheKey: "ncf_settings"
        });
    },

    async saveNcfSetting(data: any) {
        const token = localStorage.getItem("token");
        const res = await secureFetch<any>(`${API_URL}/ncf-settings`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(data),
        });
        // Invalidate cache manually ideally, or just wait for next fetch override
        localStorage.removeItem("cache_ncf_settings");
        return res;
    },

    // Credit Note
    async createCreditNote(invoiceId: string) {
        const token = localStorage.getItem("token");
        return secureFetch<any>(`${API_URL}/invoices/${invoiceId}/credit-note`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` }
        });
    },

    // Customers (CRM)
    async getCustomers() {
        const token = localStorage.getItem("token");
        return secureFetch<any[]>(`${API_URL}/customers`, {
            headers: { "Authorization": `Bearer ${token}` },
            cacheKey: "customers_list"
        });
    },

    async saveCustomer(data: any) {
        const token = localStorage.getItem("token");
        const res = await secureFetch<any>(`${API_URL}/customers`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(data),
        });
        localStorage.removeItem("cache_customers_list");
        return res;
    },

    async importCustomers(data: any[]) {
        const token = localStorage.getItem("token");
        const res = await secureFetch<any>(`${API_URL}/customers/import`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(data),
        });
        localStorage.removeItem("cache_customers_list");
        return res;
    },

    async getCustomerHistory(rnc: string) {
        const token = localStorage.getItem("token");
        return secureFetch<any>(`${API_URL}/customers/${rnc}/history`, {
            headers: { "Authorization": `Bearer ${token}` },
            cacheKey: `customer_history_${rnc}`
        });
    },

    // Reports & Tax
    async getTaxSummary(month: number, year: number) {
        return secureFetch<any>(`${API_URL}/reports/summary?month=${month}&year=${year}`, {
            cacheKey: `tax_summary_${month}_${year}`
        });
    },

    async downloadReport607(month: number, year: number): Promise<Blob> {
        const res = await fetch(`${API_URL}/reports/607?month=${month}&year=${year}`, { credentials: "include" });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error((err as { message?: string }).message || "Error al descargar reporte 607");
        }
        return res.blob();
    },

    async downloadReport606(month: number, year: number): Promise<Blob> {
        const res = await fetch(`${API_URL}/reports/606?month=${month}&year=${year}`, { credentials: "include" });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error((err as { message?: string }).message || "Error al descargar reporte 606");
        }
        return res.blob();
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

    // Expenses (606)
    async getExpenses() {
        return secureFetch<any[]>(`${API_URL}/expenses`);
    },

    async saveExpense(expenseData: any) {
        const token = localStorage.getItem("token");
        return secureFetch<any>(`${API_URL}/expenses`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(expenseData)
        });
    },

    async deleteExpense(id: string) {
        return secureFetch<any>(`${API_URL}/expenses/${id}`, { method: "DELETE" });
    },

    // Subscription & Payments
    async getSubscriptionStatus() {
        return secureFetch<any>(`${API_URL}/subscription/status`, { cacheKey: "subscription_status" });
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

    async requestMembershipPayment(plan: string, paymentMethod: "transferencia" | "paypal") {
        const res = await secureFetch<any>(`${API_URL}/membership/request-payment`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ plan, paymentMethod }),
        });
        if (typeof localStorage !== "undefined") localStorage.removeItem("cache_subscription_status");
        return res;
    },

    // Admin - pagos pendientes y validación
    async getPendingPayments() {
        return secureFetch<any[]>(`${API_URL}/admin/pending-payments`);
    },

    async approvePayment(id: string) {
        return secureFetch<any>(`${API_URL}/admin/approve-payment/${id}`, { method: "POST" });
    },

    async rejectPayment(id: string) {
        return secureFetch<any>(`${API_URL}/admin/reject-payment/${id}`, { method: "POST" });
    },

    async getAdminStats() {
        return secureFetch<any>(`${API_URL}/admin/stats`);
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

    async getInvoiceTemplates() {
        return secureFetch<any[]>(`${API_URL}/invoice-templates`);
    },

    async saveInvoiceTemplate(data: { name: string; invoiceType?: string; items: any[]; clientName?: string; rnc?: string }) {
        return secureFetch<any>(`${API_URL}/invoice-templates`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
    }
};
