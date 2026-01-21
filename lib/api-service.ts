import { secureFetch } from "./secure-fetch";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
const API_URL = (typeof window !== "undefined" && window.location.hostname !== "localhost")
    ? `${baseUrl}/api`
    : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api");

export const api = {
    // Auth
    async login(email: string, password: string) {
        return secureFetch<any>(`${API_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
            cacheKey: undefined // No cache for login
        });
    },

    async register(data: any) {
        return secureFetch<any>(`${API_URL}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
    },

    // RNC
    async validateRnc(number: string) {
        return secureFetch<any>(`${API_URL}/rnc/${number}`, {
            cacheKey: `rnc_${number}` // Cache RNC lookups
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
        const token = localStorage.getItem("token");
        return secureFetch<any>(`${API_URL}/reports/summary?month=${month}&year=${year}`, {
            headers: { "Authorization": `Bearer ${token}` },
            cacheKey: `tax_summary_${month}_${year}`
        });
    },

    getReport607Url(month: number, year: number) {
        const token = localStorage.getItem("token");
        return `${API_URL}/reports/607?month=${month}&year=${year}&token=${token}`;
    },

    // Subscription & Payments
    async getSubscriptionStatus() {
        const token = localStorage.getItem("token");
        return secureFetch<any>(`${API_URL}/subscription/status`, {
            headers: { "Authorization": `Bearer ${token}` },
            // Important: Do NOT cache subscription status too aggressively or handle expiry carefully
            // But for robustness, caching it for offline viewing is actually good as long as we don't block access improperly.
            // Let's cache it but maybe logic elsewhere handles "if too old check online".
            // For now, let's cache it to show status even if offline.
            cacheKey: "subscription_status"
        });
    },

    async getPaymentHistory() {
        const token = localStorage.getItem("token");
        return secureFetch<any[]>(`${API_URL}/payments/history`, {
            headers: { "Authorization": `Bearer ${token}` },
            cacheKey: "payment_history"
        });
    }
};
