/**
 * Generador de PDFs para facturas electrónicas
 * Crea documentos PDF profesionales con formato DGII
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";
import { APP_CONFIG, formatDateDominican, getInvoiceTypeName } from "./config";
import { numberToText } from "./number-to-text";

// Interfaz para los datos de la factura
export interface InvoiceData {
    id: string;
    sequenceNumber: string;
    type: string;
    clientName: string;
    rnc: string;
    date: string;
    items: Array<{
        description: string;
        quantity: number;
        price: number;
    }>;
    subtotal: number;
    itbis: number;
    isrRetention: number;
    itbisRetention?: number;
    total: number; // Monto comprobante (Subtotal + ITBIS)
}

/**
 * Genera un código QR con la información de la factura
 * En producción, esto debe incluir el código de validación de DGII
 */
async function generateQRCode(invoiceData: InvoiceData): Promise<string> {
    // Datos a codificar en el QR
    const qrData = {
        rnc: APP_CONFIG.company.rnc,
        ncf: invoiceData.sequenceNumber,
        fecha: invoiceData.date,
        total: invoiceData.total.toFixed(2),
        // En producción, agregar el código de validación de DGII
        // validacion: "CODIGO_DGII_AQUI"
    };

    // Convertir a JSON string
    const qrString = JSON.stringify(qrData);

    // Generar QR code como data URL
    try {
        const qrDataURL = await QRCode.toDataURL(qrString, {
            width: 150,
            margin: 1,
        });
        return qrDataURL;
    } catch (error) {
        console.error("Error generando QR:", error);
        return "";
    }
}

/**
 * Formatea un número como moneda dominicana
 */
function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("es-DO", {
        style: "currency",
        currency: "DOP",
    }).format(amount);
}

/** Override de datos de empresa (cuando el usuario viene del contexto, no de localStorage) */
export interface CompanyOverride {
    companyName?: string;
    rnc?: string;
}

/**
 * Genera un PDF profesional de la factura
 */
export async function generateInvoicePDF(invoiceData: InvoiceData, companyOverride?: CompanyOverride): Promise<jsPDF> {
    // Crear nuevo documento PDF (tamaño carta)
    const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "letter",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = APP_CONFIG.pdf.margins;
    const blueColor: [number, number, number] = [16, 24, 39];

    let yPosition = margin.top;

    // ===== BARRA SUPERIOR: solo para facturas; cotizaciones sin barra oscura ni LEXIS BILL =====
    if (invoiceData.type !== "quote") {
        doc.setFillColor(...blueColor);
        doc.rect(0, 0, pageWidth, 14, "F");
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(212, 175, 55);
        doc.text("LEXIS BILL", margin.left, 9);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(255, 255, 255);
        doc.text("Comprobante fiscal", pageWidth - margin.right, 9, { align: "right" });
        yPosition = 20;
    }

    // Cargar configuración dinámica (contexto o localStorage)
    const storedConfig = typeof localStorage !== "undefined" ? localStorage.getItem("appConfig") : null;
    const storedUser = typeof localStorage !== "undefined" ? localStorage.getItem("user") : null;

    const appConfig = storedConfig ? JSON.parse(storedConfig) : { ...APP_CONFIG.company };
    const user = storedUser ? JSON.parse(storedUser) : null;

    // Prioridad: override (contexto) > Nombre Fiscal Confirmado > Config > Default
    const companyName = companyOverride?.companyName || user?.fiscalStatus?.confirmed || appConfig.companyName || appConfig.name || APP_CONFIG.company.name;
    const companyRnc = companyOverride?.rnc ?? user?.rnc ?? appConfig.rnc ?? APP_CONFIG.company.rnc;

    appConfig.companyName = companyName;
    appConfig.rnc = companyRnc;

    // Fallback if logo not uploaded
    const logo = appConfig.logo || null;

    // Colores de Lujo (Gold & Blue)
    const goldColor: [number, number, number] = [212, 175, 55];

    // ===== HEADER =====
    // Si hay logo, usarlo
    if (logo) {
        try {
            doc.addImage(logo, "PNG", margin.left, margin.top, 50, 20); // Ajustar tamaño según necesidad
            yPosition += 25;
        } catch (e) {
            console.error("Error cargando logo", e);
            // Fallback texto
            doc.setFontSize(24);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(...blueColor);
            doc.text(appConfig.companyName || APP_CONFIG.company.name, margin.left, yPosition + 5);
            yPosition += 15;
        }
    } else {
        // Fallback texto original
        doc.setFontSize(24);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...blueColor);
        doc.text(appConfig.companyName || APP_CONFIG.company.name, margin.left, yPosition + 5);
        yPosition += 15;
    }

    // Información de la empresa (Dynamic)
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text(`RNC: ${appConfig.rnc || APP_CONFIG.company.rnc}`, margin.left, yPosition);
    if (appConfig.exequatur) {
        doc.text(`Exequátur: ${appConfig.exequatur}`, margin.left + 50, yPosition);
    }
    yPosition += 5;
    doc.text(appConfig.address || APP_CONFIG.company.address, margin.left, yPosition);
    yPosition += 5;
    doc.text(`Tel: ${appConfig.phone || APP_CONFIG.company.phone} | ${appConfig.email || APP_CONFIG.company.email}`, margin.left, yPosition);
    yPosition += 8;

    // ===== LÍNEA DORADA ELEGANTE =====
    doc.setDrawColor(...goldColor);
    doc.setLineWidth(1.5);
    doc.line(margin.left, yPosition, pageWidth - margin.right, yPosition);
    yPosition += 12;

    // ===== DATOS DEL COMPROBANTE (Derecha) =====
    // Movemos el título a la derecha para estilo "Moderno"
    const titleX = pageWidth - margin.right;

    let invoiceTitle = getInvoiceTypeName(invoiceData.type);
    if (invoiceData.type === "quote") invoiceTitle = "COTIZACIÓN";

    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...blueColor);
    doc.text(invoiceTitle, titleX, margin.top + 10, { align: "right" });

    doc.setFontSize(12);
    doc.setTextColor(...goldColor);
    if (invoiceData.type === "quote") {
        const quoteNum = invoiceData.sequenceNumber?.length > 8 ? `COT-${invoiceData.sequenceNumber.slice(-8)}` : (invoiceData.sequenceNumber || "COT");
        doc.text(`Número: ${quoteNum}`, titleX, margin.top + 20, { align: "right" });
    } else {
        doc.text(`NCF: ${invoiceData.sequenceNumber}`, titleX, margin.top + 20, { align: "right" });
    }

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    const formattedDate = formatDateDominican(new Date(invoiceData.date));
    doc.text(`Fecha Emisión: ${formattedDate}`, titleX, margin.top + 26, { align: "right" });
    if ((invoiceData as any).validUntil) { // For quotes
        const validDate = formatDateDominican(new Date((invoiceData as any).validUntil));
        doc.text(`Válida hasta: ${validDate}`, titleX, margin.top + 32, { align: "right" });
    }

    // ===== INFORMACIÓN DEL CLIENTE (Izquierda, debajo de header) =====
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...blueColor);
    doc.text("FACTURADO A:", margin.left, yPosition);
    yPosition += 6;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    const displayClientName = (invoiceData.clientName || "").trim();
    doc.text(displayClientName || "— Indicar nombre del cliente —", margin.left, yPosition);
    yPosition += 5;
    doc.text(`RNC/Cédula: ${invoiceData.rnc || "—"}`, margin.left, yPosition);
    yPosition += 8;
    doc.setDrawColor(...goldColor);
    doc.setLineWidth(1);
    doc.line(margin.left, yPosition, pageWidth - margin.right, yPosition);
    yPosition += 12;

    // ===== TABLA DE ÍTEMS =====
    const tableData = invoiceData.items.map((item) => [
        item.description,
        item.quantity.toString(),
        formatCurrency(item.price),
        formatCurrency(item.quantity * item.price),
    ]);

    autoTable(doc, {
        startY: yPosition,
        head: [["Descripción", "Cantidad", "Precio Unit.", "Subtotal"]],
        body: tableData,
        theme: "striped",
        headStyles: {
            fillColor: blueColor,
            textColor: [255, 255, 255],
            fontStyle: "bold",
            fontSize: APP_CONFIG.pdf.fontSize.normal,
        },
        bodyStyles: {
            fontSize: APP_CONFIG.pdf.fontSize.normal,
            textColor: APP_CONFIG.pdf.colors.text as [number, number, number],
        },
        columnStyles: {
            0: { cellWidth: 80 }, // Descripción
            1: { cellWidth: 25, halign: "center" }, // Cantidad
            2: { cellWidth: 35, halign: "right" }, // Precio
            3: { cellWidth: 35, halign: "right" }, // Subtotal
        },
        margin: { left: margin.left, right: margin.right },
    });

    // Obtener la posición Y después de la tabla
    yPosition = (doc as any).lastAutoTable.finalY + 10;

    // ===== RESUMEN DE TOTALES =====
    // Ajustamos para que los totales estén alineados a la derecha de la página
    const summaryX = pageWidth - margin.right;
    const summaryLabelX = summaryX - 60; // 60mm de espacio para el valor

    doc.setFontSize(APP_CONFIG.pdf.fontSize.normal);
    doc.setFont("helvetica", "normal");

    // Subtotal
    doc.text("Subtotal:", summaryLabelX - 5, yPosition); // Un pequeño ajuste extra para el label
    doc.text(formatCurrency(invoiceData.subtotal), summaryX, yPosition, { align: "right" });
    yPosition += 6;

    // ITBIS
    doc.text("ITBIS (18%):", summaryLabelX - 5, yPosition);
    doc.text(formatCurrency(invoiceData.itbis), summaryX, yPosition, { align: "right" });
    yPosition += 6;

    // Retención ISR (si aplica)
    if (invoiceData.isrRetention > 0) {
        doc.text("Retención ISR (10%):", summaryLabelX - 5, yPosition);
        doc.text(`-${formatCurrency(invoiceData.isrRetention)}`, summaryX, yPosition, { align: "right" });
        yPosition += 6;
    }

    // Línea separadora superior del total
    doc.setLineWidth(0.5);
    doc.setDrawColor(...goldColor);
    doc.line(summaryLabelX - 10, yPosition, summaryX, yPosition);
    yPosition += 8;

    // Total Invoice (Subtotal + ITBIS)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(APP_CONFIG.pdf.fontSize.subtitle);
    doc.setTextColor(...blueColor); // Azul fuerte para el total
    doc.text("TOTAL FACTURA:", summaryLabelX - 15, yPosition);
    doc.text(formatCurrency(invoiceData.total), summaryX, yPosition, { align: "right" });
    yPosition += 8;

    // Retenciones
    doc.setFont("helvetica", "normal");
    const isrRetention = invoiceData.isrRetention || 0;
    const itbisRetention = invoiceData.itbisRetention || 0;

    if (isrRetention > 0 || itbisRetention > 0) {
        yPosition += 2;
        doc.setFontSize(APP_CONFIG.pdf.fontSize.small);
        doc.setTextColor(APP_CONFIG.pdf.colors.secondary[0], APP_CONFIG.pdf.colors.secondary[1], APP_CONFIG.pdf.colors.secondary[2]);
        doc.text("Retenciones de Ley:", summaryLabelX, yPosition);
        doc.setTextColor(APP_CONFIG.pdf.colors.text[0], APP_CONFIG.pdf.colors.text[1], APP_CONFIG.pdf.colors.text[2]);
        doc.setFontSize(APP_CONFIG.pdf.fontSize.normal);
        yPosition += 6;

        if (isrRetention > 0) {
            doc.text("Retención ISR (10%):", summaryLabelX - 5, yPosition);
            doc.text(`-${formatCurrency(isrRetention)}`, summaryX, yPosition, { align: "right" });
            yPosition += 6;
        }

        if (itbisRetention > 0) {
            doc.text("Retención ITBIS:", summaryLabelX - 5, yPosition);
            doc.text(`-${formatCurrency(itbisRetention)}`, summaryX, yPosition, { align: "right" });
            yPosition += 6;
        }

        // Net Payable
        doc.setLineWidth(0.3);
        doc.line(summaryLabelX - 10, yPosition, summaryX, yPosition);
        yPosition += 6;

        const netPayable = invoiceData.total - isrRetention - itbisRetention;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(APP_CONFIG.pdf.fontSize.subtitle);
        doc.setTextColor(...blueColor);
        doc.text("NETO A PAGAR:", summaryLabelX - 15, yPosition);
        doc.text(formatCurrency(netPayable), summaryX, yPosition, { align: "right" });
        yPosition += 10;
    } else {
        yPosition += 4;
    }

    // ===== TOTAL EN LETRAS =====
    doc.setFontSize(APP_CONFIG.pdf.fontSize.small);
    doc.setFont("helvetica", "italic");
    const totalEnLetras = numberToText(invoiceData.total);
    doc.text(`Son: ${totalEnLetras}`, margin.left, yPosition);
    yPosition += 15;

    // ===== CÓDIGO QR (Solo para Facturas) =====
    if (invoiceData.type !== "quote") {
        try {
            const qrDataURL = await generateQRCode(invoiceData);
            if (qrDataURL) {
                // Posicionar QR en la esquina inferior derecha
                const qrSize = 40;
                const qrX = pageWidth - margin.right - qrSize;
                const qrY = pageHeight - margin.bottom - qrSize - 15;

                doc.addImage(qrDataURL, "PNG", qrX, qrY, qrSize, qrSize);

                // Texto debajo del QR
                doc.setFontSize(APP_CONFIG.pdf.fontSize.small);
                doc.setFont("helvetica", "normal");
                const qrLabel = invoiceData.sequenceNumber.startsWith("E")
                    ? "Código de Validación DGII"
                    : "Código QR de Validación";
                doc.text(qrLabel, qrX + qrSize / 2, qrY + qrSize + 5, { align: "center" });
            }
        } catch (error) {
            console.error("Error agregando QR al PDF:", error);
        }
    }

    // ===== PIE DE PÁGINA =====
    const footerY = pageHeight - margin.bottom - 10;
    doc.setFontSize(APP_CONFIG.pdf.fontSize.small);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(APP_CONFIG.pdf.colors.secondary[0], APP_CONFIG.pdf.colors.secondary[1], APP_CONFIG.pdf.colors.secondary[2]);
    const isElectronic = invoiceData.sequenceNumber.startsWith("E");
    const footerText = invoiceData.type === "quote"
        ? "ESTE DOCUMENTO NO TIENE VALOR FISCAL"
        : `Este documento es una representación impresa de un Comprobante Fiscal ${isElectronic ? "Electrónico" : ""}`;
    const disclaimerText = invoiceData.type !== "quote"
        ? "Comprobante interno. No constituye e-CF oficial hasta integración PSFE con DGII."
        : "";

    doc.text(
        footerText,
        pageWidth / 2,
        footerY,
        { align: "center" }
    );
    if (disclaimerText) {
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text(disclaimerText, pageWidth / 2, footerY + 5, { align: "center" });
    }
    doc.setFontSize(8);
    doc.setTextColor(...goldColor);
    doc.text("Generado por Lexis Bill", pageWidth / 2, footerY + 10, { align: "center" });

    return doc;
}

/**
 * Descarga el PDF de la factura
 */
export async function downloadInvoicePDF(invoiceData: InvoiceData, companyOverride?: CompanyOverride): Promise<void> {
    const pdf = await generateInvoicePDF(invoiceData, companyOverride);
    const fileName = `Factura_${invoiceData.sequenceNumber}.pdf`;
    pdf.save(fileName);
}

/**
 * Abre el PDF en una nueva ventana para vista previa
 */
export async function previewInvoicePDF(invoiceData: InvoiceData, companyOverride?: CompanyOverride): Promise<void> {
    const pdf = await generateInvoicePDF(invoiceData, companyOverride);
    const pdfBlob = pdf.output("blob");
    const pdfUrl = URL.createObjectURL(pdfBlob);
    window.open(pdfUrl, "_blank");
}

/**
 * Interfaz para datos de cotización
 */
export interface QuoteData {
    id: string;
    clientName: string;
    rnc: string;
    date: string;
    validUntil?: string;
    items: Array<{
        description: string;
        quantity: number;
        price: number;
    }>;
    subtotal: number;
    itbis: number;
    total: number;
}

/**
 * Genera un PDF de cotización usando la misma función de factura
 */
export async function generateQuotePDF(quoteData: QuoteData): Promise<jsPDF> {
    // Convertir QuoteData a InvoiceData para reutilizar la función existente
    const invoiceData: InvoiceData = {
        id: quoteData.id,
        sequenceNumber: quoteData.id,
        type: "quote",
        clientName: quoteData.clientName,
        rnc: quoteData.rnc,
        date: quoteData.date,
        items: quoteData.items,
        subtotal: quoteData.subtotal,
        itbis: quoteData.itbis,
        isrRetention: 0,
        itbisRetention: 0,
        total: quoteData.total,
    };

    // Generar PDF y agregar fecha de validez si existe
    const pdf = await generateInvoicePDF(invoiceData);

    // Si hay fecha de validez, agregarla al PDF
    if (quoteData.validUntil) {
        const pageWidth = pdf.internal.pageSize.getWidth();
        const margin = APP_CONFIG.pdf.margins;
        const formattedDate = formatDateDominican(new Date(quoteData.validUntil));
        pdf.setFontSize(10);
        pdf.setTextColor(100, 100, 100);
        pdf.text(`Válida hasta: ${formattedDate}`, pageWidth - margin.right, margin.top + 32, { align: "right" });
    }

    return pdf;
}

/**
 * Descarga el PDF de la cotización
 */
export async function downloadQuotePDF(quoteData: QuoteData): Promise<void> {
    const pdf = await generateQuotePDF(quoteData);
    const ref = quoteData.id?.length > 8 ? `COT-${quoteData.id.slice(-8)}` : quoteData.id || "COT";
    const fileName = `Cotizacion_${ref}.pdf`;
    pdf.save(fileName);
}
