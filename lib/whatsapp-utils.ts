/**
 * Utilidades para envío de documentos por WhatsApp
 *
 * Nota: El enlace wa.me solo permite prellenar el mensaje de texto; no se puede adjuntar
 * un archivo (PDF) por URL. Por eso el mensaje incluye "📎 Te envío adjunto el PDF" para
 * recordar al usuario que debe adjuntar el PDF manualmente en WhatsApp antes de enviar.
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

    const quoteRef = quote.id?.length > 8 ? `COT-${quote.id.slice(-8)}` : quote.id;
    return `Estimado/a cliente *${quote.clientName}*, saludos cordiales${fromText}.\n\nPara nosotros es un placer saludarle. De acuerdo a nuestra comunicación, procedemos a remitirle formalmente la *cotización #${quoteRef}* por un monto total de *${formatCurrency(quote.total)}*.\n\n📎 A continuación, le adjuntamos el documento en formato PDF con el desglose detallado.\n\nQuedamos a su entera disposición para cualquier consulta o ajuste requerido.\n\nAtentamente.`;
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

    return `Estimado/a cliente *${invoice.clientName}*, saludos cordiales${fromText}.\n\nPor esta vía le remitimos formalmente su *comprobante fiscal (Factura #${documentNumber})* por el monto total de *${formatCurrency(invoice.total)}*.\n\n📎 A continuación, le adjuntamos el documento en formato PDF debidamente detallado.\n\nAgradecemos de antemano su confianza en nuestros servicios. En caso de requerir asistencia adicional, quedamos a su entera disposición.\n\nAtentamente.`;
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
