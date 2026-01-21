/**
 * Servicio de integración con APIs de facturación electrónica
 * Preparado para Alanube y FacturaDirecta
 */

import { APP_CONFIG } from "../config";
import type {
    Invoice,
    APIResponse,
    AlanubeInvoiceRequest,
    AlanubeInvoiceResponse,
    FacturaDirectaInvoiceRequest,
    FacturaDirectaInvoiceResponse,
    APIConfig,
} from "./types";

// ===== CLASE BASE PARA INTEGRACIÓN DE API =====

abstract class InvoiceAPIClient {
    protected config: APIConfig;

    constructor(config: APIConfig) {
        this.config = config;
    }

    /**
     * Método abstracto para enviar factura
     * Cada implementación (Alanube, FacturaDirecta) debe implementar este método
     */
    abstract sendInvoice(invoice: Invoice): Promise<APIResponse>;

    /**
     * Método abstracto para consultar estado de factura
     */
    abstract getInvoiceStatus(invoiceId: string): Promise<APIResponse>;

    /**
     * Método abstracto para cancelar factura
     */
    abstract cancelInvoice(invoiceId: string): Promise<APIResponse>;

    /**
     * Método helper para hacer peticiones HTTP
     */
    protected async makeRequest(
        endpoint: string,
        method: "GET" | "POST" | "PUT" | "DELETE",
        data?: any
    ): Promise<any> {
        const url = `${this.config.endpoint}${endpoint}`;

        try {
            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${this.config.apiKey}`,
                },
                body: data ? JSON.stringify(data) : undefined,
            });

            if (!response.ok) {
                throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error("API Request Error:", error);
            throw error;
        }
    }
}

// ===== IMPLEMENTACIÓN PARA ALANUBE =====

class AlanubeClient extends InvoiceAPIClient {
    /**
     * Convierte una factura al formato de Alanube
     */
    private convertToAlanubeFormat(invoice: Invoice): AlanubeInvoiceRequest {
        return {
            ncf: invoice.sequenceNumber,
            tipo_comprobante: invoice.type,
            cliente: {
                nombre: invoice.client.name,
                rnc_cedula: invoice.client.rncOrCedula,
                email: invoice.client.email,
            },
            items: invoice.items.map((item) => ({
                descripcion: item.description,
                cantidad: item.quantity,
                precio_unitario: item.unitPrice,
            })),
            fecha_emision: invoice.date,
        };
    }

    /**
     * Envía una factura a Alanube
     */
    async sendInvoice(invoice: Invoice): Promise<APIResponse> {
        try {
            const alanubeData = this.convertToAlanubeFormat(invoice);
            const response = await this.makeRequest("/invoices", "POST", alanubeData);

            return {
                success: true,
                data: response,
                message: "Factura enviada exitosamente a Alanube",
            };
        } catch (error) {
            return {
                success: false,
                error: {
                    code: "ALANUBE_ERROR",
                    message: error instanceof Error ? error.message : "Error desconocido",
                },
            };
        }
    }

    /**
     * Consulta el estado de una factura en Alanube
     */
    async getInvoiceStatus(invoiceId: string): Promise<APIResponse> {
        try {
            const response = await this.makeRequest(`/invoices/${invoiceId}`, "GET");

            return {
                success: true,
                data: response,
            };
        } catch (error) {
            return {
                success: false,
                error: {
                    code: "ALANUBE_ERROR",
                    message: error instanceof Error ? error.message : "Error desconocido",
                },
            };
        }
    }

    /**
     * Cancela una factura en Alanube
     */
    async cancelInvoice(invoiceId: string): Promise<APIResponse> {
        try {
            const response = await this.makeRequest(`/invoices/${invoiceId}/cancel`, "POST");

            return {
                success: true,
                data: response,
                message: "Factura cancelada exitosamente",
            };
        } catch (error) {
            return {
                success: false,
                error: {
                    code: "ALANUBE_ERROR",
                    message: error instanceof Error ? error.message : "Error desconocido",
                },
            };
        }
    }
}

// ===== IMPLEMENTACIÓN PARA FACTURADIRECTA =====

class FacturaDirectaClient extends InvoiceAPIClient {
    /**
     * Convierte una factura al formato de FacturaDirecta
     */
    private convertToFacturaDirectaFormat(invoice: Invoice): FacturaDirectaInvoiceRequest {
        return {
            invoice_number: invoice.sequenceNumber,
            invoice_type: invoice.type,
            customer: {
                name: invoice.client.name,
                tax_id: invoice.client.rncOrCedula,
                email: invoice.client.email,
            },
            line_items: invoice.items.map((item) => ({
                description: item.description,
                quantity: item.quantity,
                unit_price: item.unitPrice,
            })),
            issue_date: invoice.date,
        };
    }

    /**
     * Envía una factura a FacturaDirecta
     */
    async sendInvoice(invoice: Invoice): Promise<APIResponse> {
        try {
            const facturaDirectaData = this.convertToFacturaDirectaFormat(invoice);
            const response = await this.makeRequest("/invoices", "POST", facturaDirectaData);

            return {
                success: true,
                data: response,
                message: "Factura enviada exitosamente a FacturaDirecta",
            };
        } catch (error) {
            return {
                success: false,
                error: {
                    code: "FACTURADIRECTA_ERROR",
                    message: error instanceof Error ? error.message : "Error desconocido",
                },
            };
        }
    }

    /**
     * Consulta el estado de una factura en FacturaDirecta
     */
    async getInvoiceStatus(invoiceId: string): Promise<APIResponse> {
        try {
            const response = await this.makeRequest(`/invoices/${invoiceId}`, "GET");

            return {
                success: true,
                data: response,
            };
        } catch (error) {
            return {
                success: false,
                error: {
                    code: "FACTURADIRECTA_ERROR",
                    message: error instanceof Error ? error.message : "Error desconocido",
                },
            };
        }
    }

    /**
     * Cancela una factura en FacturaDirecta
     */
    async cancelInvoice(invoiceId: string): Promise<APIResponse> {
        try {
            const response = await this.makeRequest(`/invoices/${invoiceId}/cancel`, "POST");

            return {
                success: true,
                data: response,
                message: "Factura cancelada exitosamente",
            };
        } catch (error) {
            return {
                success: false,
                error: {
                    code: "FACTURADIRECTA_ERROR",
                    message: error instanceof Error ? error.message : "Error desconocido",
                },
            };
        }
    }
}

// ===== FACTORY PARA CREAR CLIENTES DE API =====

/**
 * Crea un cliente de API según la configuración
 * Por defecto usa Alanube si está habilitado, sino FacturaDirecta
 */
export function createInvoiceAPIClient(): InvoiceAPIClient | null {
    // Verificar si Alanube está habilitado
    if (APP_CONFIG.api.alanube.enabled) {
        return new AlanubeClient({
            endpoint: APP_CONFIG.api.alanube.endpoint,
            apiKey: APP_CONFIG.api.alanube.apiKey,
            environment: APP_CONFIG.api.alanube.environment as "sandbox" | "production",
        });
    }

    // Verificar si FacturaDirecta está habilitado
    if (APP_CONFIG.api.facturaDirecta.enabled) {
        return new FacturaDirectaClient({
            endpoint: APP_CONFIG.api.facturaDirecta.endpoint,
            apiKey: APP_CONFIG.api.facturaDirecta.apiKey,
            environment: APP_CONFIG.api.facturaDirecta.environment as "sandbox" | "production",
        });
    }

    // Ninguna API está habilitada
    console.warn("No hay ninguna API de facturación habilitada en la configuración");
    return null;
}

// ===== FUNCIONES DE UTILIDAD =====

/**
 * Envía una factura a la API configurada
 */
export async function sendInvoiceToAPI(invoice: Invoice): Promise<APIResponse> {
    const client = createInvoiceAPIClient();

    if (!client) {
        return {
            success: false,
            error: {
                code: "NO_API_CONFIGURED",
                message: "No hay ninguna API de facturación configurada",
            },
        };
    }

    return await client.sendInvoice(invoice);
}

/**
 * Consulta el estado de una factura
 */
export async function getInvoiceStatusFromAPI(invoiceId: string): Promise<APIResponse> {
    const client = createInvoiceAPIClient();

    if (!client) {
        return {
            success: false,
            error: {
                code: "NO_API_CONFIGURED",
                message: "No hay ninguna API de facturación configurada",
            },
        };
    }

    return await client.getInvoiceStatus(invoiceId);
}

/**
 * Cancela una factura
 */
export async function cancelInvoiceInAPI(invoiceId: string): Promise<APIResponse> {
    const client = createInvoiceAPIClient();

    if (!client) {
        return {
            success: false,
            error: {
                code: "NO_API_CONFIGURED",
                message: "No hay ninguna API de facturación configurada",
            },
        };
    }

    return await client.cancelInvoice(invoiceId);
}
