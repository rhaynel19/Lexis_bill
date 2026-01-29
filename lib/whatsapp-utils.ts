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
}, companyName?: string): string {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("es-DO", {
            style: "currency",
            currency: "DOP",
        }).format(amount);
    };

    const fromText = companyName ? ` de parte de *${companyName}*` : "";

    return `Hola *${quote.clientName}*! 🇩🇴${fromText}\n\nEs un placer saludarle. Le envío formalmente su *propuesta comercial* con el número *${quote.id}* por valor de *${formatCurrency(quote.total)}*.\n\nQuedo a su disposición para cualquier consulta. ¡Feliz resto del día!`;
}

/**
 * Genera un mensaje de WhatsApp para factura
 */
export function generateInvoiceWhatsAppMessage(invoice: {
    clientName: string;
    ncfSequence?: string;
    id: string;
    total: number;
}, companyName?: string): string {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("es-DO", {
            style: "currency",
            currency: "DOP",
        }).format(amount);
    };

    const fromText = companyName ? ` de parte de *${companyName}*` : "";
    const documentNumber = (invoice.ncfSequence || invoice.id).slice(-11);

    return `Hola *${invoice.clientName}*! 🇩🇴${fromText}\n\nLe envío su *recibo/comprobante fiscal* con numeración *${documentNumber}* por el monto de *${formatCurrency(invoice.total)}*. Muchas gracias por su confianza.\n\nQuedo atento ante cualquier duda. ¡Saludos!`;
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
