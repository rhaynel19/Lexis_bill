/**
 * Tipos TypeScript para la integración con APIs de facturación electrónica
 */

// ===== TIPOS DE DATOS DE FACTURA =====

export interface InvoiceItem {
    description: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    taxAmount?: number;
}

export interface InvoiceClient {
    name: string;
    rncOrCedula: string;
    email?: string;
    phone?: string;
    address?: string;
}

export interface InvoiceTaxes {
    itbis: number;
    isrRetention: number;
}

export interface Invoice {
    id: string;
    sequenceNumber: string;
    type: string; // "31", "32", "33", "34"
    client: InvoiceClient;
    items: InvoiceItem[];
    taxes: InvoiceTaxes;
    subtotal: number;
    total: number;
    date: string;
    status: "draft" | "pending" | "sent" | "approved" | "rejected";
}

// ===== TIPOS DE RESPUESTA DE API =====

export interface APIResponse<T = any> {
    success: boolean;
    data?: T;
    error?: APIError;
    message?: string;
}

export interface APIError {
    code: string;
    message: string;
    details?: any;
}

// ===== TIPOS ESPECÍFICOS DE ALANUBE =====

export interface AlanubeInvoiceRequest {
    ncf: string;
    tipo_comprobante: string;
    cliente: {
        nombre: string;
        rnc_cedula: string;
        email?: string;
    };
    items: Array<{
        descripcion: string;
        cantidad: number;
        precio_unitario: number;
    }>;
    fecha_emision: string;
}

export interface AlanubeInvoiceResponse {
    id: string;
    ncf: string;
    estado: "aprobado" | "rechazado" | "pendiente";
    codigo_validacion: string;
    fecha_aprobacion?: string;
    mensaje?: string;
}

// ===== TIPOS ESPECÍFICOS DE FACTURADIRECTA =====

export interface FacturaDirectaInvoiceRequest {
    invoice_number: string;
    invoice_type: string;
    customer: {
        name: string;
        tax_id: string;
        email?: string;
    };
    line_items: Array<{
        description: string;
        quantity: number;
        unit_price: number;
    }>;
    issue_date: string;
}

export interface FacturaDirectaInvoiceResponse {
    invoice_id: string;
    ncf: string;
    status: "approved" | "rejected" | "pending";
    validation_code: string;
    approved_at?: string;
    error_message?: string;
}

// ===== TIPOS DE CONFIGURACIÓN =====

export interface APIConfig {
    endpoint: string;
    apiKey: string;
    environment: "sandbox" | "production";
    timeout?: number;
}

export interface WebhookPayload {
    event: "invoice.approved" | "invoice.rejected" | "invoice.cancelled";
    invoice_id: string;
    ncf: string;
    timestamp: string;
    data: any;
}
