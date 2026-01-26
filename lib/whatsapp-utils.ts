/**
 * Utilidades para envío de documentos por WhatsApp
 */

/**
 * Formatea un número de teléfono dominicano para WhatsApp
 */
export function formatPhoneForWhatsApp(phone: string | undefined): string {
    if (!phone) return "";
    
    // Remover caracteres no numéricos
    let cleanPhone = phone.replace(/\D/g, "");
    
    // Si tiene 10 dígitos y empieza con código de área dominicano, agregar 1
    if (cleanPhone.length === 10 && (cleanPhone.startsWith("809") || cleanPhone.startsWith("829") || cleanPhone.startsWith("849"))) {
        cleanPhone = "1" + cleanPhone;
    }
    
    return cleanPhone;
}

/**
 * Genera un mensaje de WhatsApp para cotización
 */
export function generateQuoteWhatsAppMessage(quote: {
    id: string;
    clientName: string;
    total: number;
}): string {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("es-DO", {
            style: "currency",
            currency: "DOP",
        }).format(amount);
    };

    return `Hola *${quote.clientName}*! 🇩🇴\n\nLe envío su cotización *${quote.id}* por valor de *${formatCurrency(quote.total)}*.\n\nSaludos.`;
}

/**
 * Genera un mensaje de WhatsApp para factura
 */
export function generateInvoiceWhatsAppMessage(invoice: {
    clientName: string;
    ncfSequence?: string;
    id: string;
    total: number;
}): string {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("es-DO", {
            style: "currency",
            currency: "DOP",
        }).format(amount);
    };

    const documentNumber = (invoice.ncfSequence || invoice.id).slice(-11);
    
    return `Hola *${invoice.clientName}*! 🇩🇴\n\nLe envío su factura *${documentNumber}* por valor de *${formatCurrency(invoice.total)}*.\n\nSaludos.`;
}

/**
 * Abre WhatsApp con el mensaje prellenado
 */
export function openWhatsApp(phone: string | undefined, message: string): void {
    const formattedPhone = formatPhoneForWhatsApp(phone);
    if (!formattedPhone) {
        // Si no hay teléfono, abrir WhatsApp sin número (usuario selecciona contacto)
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    } else {
        window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`, '_blank');
    }
}
