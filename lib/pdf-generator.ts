/**
 * Generador de PDFs para facturas electrónicas
 * Crea documentos PDF profesionales con formato DGII
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";
import { APP_CONFIG, formatDateDominican, getInvoiceTypeName, SERIE_B_TYPES, SERIE_E_TYPES } from "./config";
import { numberToText } from "./number-to-text";

// Interfaz para los datos de la factura
export interface InvoiceData {
    id: string;
    sequenceNumber: string;
    type: string;
    clientName: string;
    rnc: string;
    clientAddress?: string;
    date: string;
    items: Array<{
        description: string;
        quantity: number;
        price: number;
        isExempt?: boolean;
    }>;
    subtotal: number;
    itbis: number;
    isrRetention: number;
    itbisRetention?: number;
    total: number; // Monto comprobante (Subtotal + ITBIS)
    modifiedNcf?: string;
    paymentMethod?: string;
    paymentDetails?: Array<{ method: string; amount: number }>;
    balancePendiente?: number;
    plazoPago?: number;
    dueDate?: string | Date;
}

export interface StatementData {
    customer: {
        name: string;
        rnc: string;
        email?: string;
        phone?: string;
    };
    invoices: Array<{
        id: string;
        date: string;
        ncf: string;
        total: number;
        balance: number;
        type?: string;
        status?: string;
    }>;
    totalPending: number;
    generatedAt: string;
    startDate?: string;
    endDate?: string;
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

type DocumentKind = "quote" | "proforma" | "serie_b" | "serie_e";

/**
 * Determina el tipo de documento para aplicar la lógica correcta (Serie B vs Serie E).
 * - Proforma: borrador (NCF BORRADOR), sin QR, título "Proforma".
 * - Serie B: tipos 01, 02, 14, 15 → sin QR, pie "Comprobante Serie B".
 * - Serie E: tipos 31, 32, 33, 34, 44, 45 → con QR si ya está emitido (NCF real).
 */
function getDocumentKind(invoiceData: InvoiceData): { kind: DocumentKind; isProforma: boolean; isSerieB: boolean; isSerieE: boolean; showQR: boolean } {
    if (invoiceData.type === "quote") {
        return { kind: "quote", isProforma: false, isSerieB: false, isSerieE: false, showQR: false };
    }
    const isProforma = invoiceData.sequenceNumber === "BORRADOR";
    const isSerieB = (SERIE_B_TYPES as readonly string[]).includes(invoiceData.type);
    const isSerieE = (SERIE_E_TYPES as readonly string[]).includes(invoiceData.type);
    // QR solo para Serie E ya emitida (NCF real, no borrador)
    const showQR = isSerieE && !isProforma;
    const kind: DocumentKind = isProforma ? "proforma" : isSerieB ? "serie_b" : "serie_e";
    return { kind, isProforma, isSerieB, isSerieE, showQR };
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
            doc.addImage(logo, "PNG", margin.left, margin.top, 45, 18);
            yPosition += 22;
        } catch (e) {
            console.error("Error cargando logo", e);
            // Fallback texto
            doc.setFontSize(22);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(...blueColor);
            doc.text(appConfig.companyName || APP_CONFIG.company.name, margin.left, yPosition + 5);
            yPosition += 12;
        }
    } else {
        // Fallback texto original
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...blueColor);
        doc.text(appConfig.companyName || APP_CONFIG.company.name, margin.left, yPosition + 5);
        yPosition += 12;
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
    // Lógica separada: Serie B (sin QR) vs Serie E (e-CF, con QR)
    const { kind, isProforma, isSerieB, isSerieE, showQR } = getDocumentKind(invoiceData);

    const titleX = pageWidth - margin.right;

    let invoiceTitle: string;
    if (kind === "quote") invoiceTitle = "COTIZACIÓN";
    else if (kind === "proforma") invoiceTitle = "Proforma";
    else if (kind === "serie_b") invoiceTitle = getInvoiceTypeName(invoiceData.type);
    else invoiceTitle = getInvoiceTypeName(invoiceData.type); // serie_e

    doc.setFontSize(18); // Slighting smaller title to avoid overlap
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...blueColor);
    doc.text(invoiceTitle, titleX, margin.top + 8, { align: "right" });

    doc.setFontSize(11);
    doc.setTextColor(...goldColor);
    if (invoiceData.type === "quote") {
        const quoteNum = invoiceData.sequenceNumber?.length > 8 ? `COT-${invoiceData.sequenceNumber.slice(-8)}` : (invoiceData.sequenceNumber || "COT");
        doc.text(`Número: ${quoteNum}`, titleX, margin.top + 16, { align: "right" });
    } else {
        doc.text(isProforma ? "NCF: BORRADOR" : `NCF: ${invoiceData.sequenceNumber}`, titleX, margin.top + 16, { align: "right" });
    }

    const formattedDate = formatDateDominican(new Date(invoiceData.date));
    let topY = margin.top + 22;
    if (invoiceData.modifiedNcf && invoiceData.type !== "quote") {
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(180, 0, 0); // Clearer red
        doc.text(`AFECTA A NCF: ${invoiceData.modifiedNcf}`, titleX, topY, { align: "right" });
        doc.setFont("helvetica", "normal");
        topY += 6;
    }

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Fecha Emisión: ${formattedDate}`, titleX, topY, { align: "right" });

    if (invoiceData.paymentMethod && invoiceData.type !== "quote") {
        topY += 6;
        const methodLabel = TIPO_PAGO_LABELS[invoiceData.paymentMethod] || invoiceData.paymentMethod.toUpperCase();
        doc.text(`Tipo de Pago: ${methodLabel}`, titleX, topY, { align: "right" });
    }
 
    if (invoiceData.dueDate) {
        topY += 6;
        const dueStr = formatDateDominican(new Date(invoiceData.dueDate));
        doc.setFont("helvetica", "bold");
        doc.setTextColor(180, 0, 0); // Red for emphasis on due date
        doc.text(`Vencimiento: ${dueStr}`, titleX, topY, { align: "right" });
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
    }

    if ((invoiceData as any).validUntil) { // For quotes
        const validDate = formatDateDominican(new Date((invoiceData as any).validUntil));
        doc.text(`Válida hasta: ${validDate}`, titleX, topY + 6, { align: "right" });
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
    if (invoiceData.clientAddress) {
        yPosition += 5;
        doc.text(`Dirección: ${invoiceData.clientAddress}`, margin.left, yPosition);
    }
    yPosition += 15;

    // ===== TABLA DE ÍTEMS =====
    let hasExemptItems = false;
    const tableData = invoiceData.items.map((item) => {
        if (item.isExempt) hasExemptItems = true;
        return [
            item.isExempt ? `${item.description} (E)` : item.description,
            item.quantity.toString(),
            formatCurrency(item.price),
            formatCurrency(item.quantity * item.price),
        ];
    });

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
        // Enforce header alignment for numeric columns
        didParseCell: (data) => {
            if (data.section === 'head' && (data.column.index === 2 || data.column.index === 3)) {
                data.cell.styles.halign = 'right';
            }
        }
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

    // ITBIS (etiqueta según si es 0 = exento)
    const itbisLabel = invoiceData.itbis === 0 ? "ITBIS:" : "ITBIS (18%):";
    doc.text(itbisLabel, summaryLabelX - 5, yPosition);
    doc.text(formatCurrency(invoiceData.itbis), summaryX, yPosition, { align: "right" });
    yPosition += 6;
    if (invoiceData.itbis === 0) {
        doc.setFontSize(APP_CONFIG.pdf.fontSize.small);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(120, 120, 120); // Subtle grey instead of bright green
        doc.text("Operación exenta de ITBIS conforme régimen fiscal aplicable en República Dominicana.", margin.left, yPosition, { maxWidth: pageWidth - margin.left - margin.right });
        doc.setTextColor(APP_CONFIG.pdf.colors.text[0], APP_CONFIG.pdf.colors.text[1], APP_CONFIG.pdf.colors.text[2]);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(APP_CONFIG.pdf.fontSize.normal);
        yPosition += 8;
    } else if (hasExemptItems) {
        doc.setFontSize(APP_CONFIG.pdf.fontSize.small);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(120, 120, 120); // Subtle grey
        doc.text("Los ítems marcados con (E) están exentos de ITBIS.", margin.left, yPosition, { maxWidth: pageWidth - margin.left - margin.right });
        doc.setTextColor(APP_CONFIG.pdf.colors.text[0], APP_CONFIG.pdf.colors.text[1], APP_CONFIG.pdf.colors.text[2]);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(APP_CONFIG.pdf.fontSize.normal);
        yPosition += 8;
    }

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

    // Total según tipo de documento (Proforma vs Factura Serie B/E)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(APP_CONFIG.pdf.fontSize.subtitle);
    doc.setTextColor(...blueColor);
    const totalLabel = kind === "quote" ? "TOTAL COTIZACIÓN:" : kind === "proforma" ? "TOTAL PROFORMA:" : "TOTAL FACTURA:";
    doc.text(totalLabel, summaryX - 45, yPosition, { align: "right" });
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

        const netPayable = (invoiceData.total || 0) - isrRetention - itbisRetention;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(APP_CONFIG.pdf.fontSize.subtitle);
        doc.setTextColor(...blueColor);
        doc.text("NETO A RECIBIR:", summaryLabelX - 15, yPosition);
        doc.text(formatCurrency(netPayable), summaryX, yPosition, { align: "right" });
        yPosition += 10;
    } else {
        yPosition += 4;
    }

    // ===== PAGO Y BALANCE =====
    if (invoiceData.type !== "quote") {
        if (invoiceData.paymentDetails && invoiceData.paymentDetails.length > 0) {
            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(...blueColor);
            doc.text("Detalle de Pago:", margin.left, yPosition);
            yPosition += 5;
            doc.setFont("helvetica", "normal");
            doc.setTextColor(60, 60, 60);
            
            invoiceData.paymentDetails.forEach(p => {
                const label = TIPO_PAGO_LABELS[p.method] || p.method;
                doc.text(`${label}: ${formatCurrency(p.amount)}`, margin.left + 5, yPosition);
                yPosition += 4;
            });
            yPosition += 2;
        }

        if (invoiceData.balancePendiente !== undefined && invoiceData.balancePendiente > 0) {
            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(180, 0, 0);
            doc.text("BALANCE PENDIENTE:", summaryLabelX - 15, yPosition);
            doc.text(formatCurrency(invoiceData.balancePendiente), summaryX, yPosition, { align: "right" });
            yPosition += 8;
        }
    }

    // ===== TOTAL EN LETRAS =====
    doc.setFontSize(APP_CONFIG.pdf.fontSize.small);
    doc.setFont("helvetica", "italic");
    const totalEnLetras = numberToText(invoiceData.total);
    doc.text(`Son: ${totalEnLetras}`, margin.left, yPosition);
    yPosition += 15;

    // ===== CÓDIGO QR (Solo Serie E emitida; Serie B y proforma no llevan QR) =====
    if (showQR) {
        try {
            const qrDataURL = await generateQRCode(invoiceData);
            if (qrDataURL) {
                const qrSize = 40;
                const qrX = pageWidth - margin.right - qrSize;
                const qrY = pageHeight - margin.bottom - qrSize - 15;

                doc.addImage(qrDataURL, "PNG", qrX, qrY, qrSize, qrSize);

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

    // ===== PIE DE PÁGINA (lógica Serie B vs Serie E) =====
    const footerY = pageHeight - margin.bottom - 10;
    doc.setFontSize(APP_CONFIG.pdf.fontSize.small);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(APP_CONFIG.pdf.colors.secondary[0], APP_CONFIG.pdf.colors.secondary[1], APP_CONFIG.pdf.colors.secondary[2]);
    let footerText: string;
    let disclaimerText = "";
    switch (kind) {
        case "quote":
            footerText = "ESTE DOCUMENTO NO TIENE VALOR FISCAL";
            break;
        case "proforma":
            footerText = "Este documento es una PROFORMA. No tiene valor fiscal hasta su formalización.";
            break;
        case "serie_b":
            footerText = "Comprobante Fiscal (Serie B). No es factura electrónica.";
            break;
        case "serie_e":
            footerText = "Este documento es una representación impresa de un Comprobante Fiscal Electrónico.";
            disclaimerText = "Comprobante interno. No constituye e-CF oficial hasta integración PSFE con DGII.";
            break;
    }

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
    return doc;
}

/**
 * Genera un PDF profesional del Estado de Cuenta / Relación de Facturas
 */
export async function generateAccountStatementPDF(data: StatementData, companyOverride?: CompanyOverride): Promise<jsPDF> {
    const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "letter",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = APP_CONFIG.pdf.margins;
    const blueColor: [number, number, number] = [16, 24, 39];
    const goldColor: [number, number, number] = [212, 175, 55];

    let yPosition = margin.top;

    // Cargar configuración de empresa
    const storedConfig = typeof localStorage !== "undefined" ? localStorage.getItem("appConfig") : null;
    const storedUser = typeof localStorage !== "undefined" ? localStorage.getItem("user") : null;
    const appConfig = storedConfig ? JSON.parse(storedConfig) : { ...APP_CONFIG.company };
    const user = storedUser ? JSON.parse(storedUser) : null;

    const companyName = companyOverride?.companyName || user?.fiscalStatus?.confirmed || appConfig.companyName || appConfig.name || APP_CONFIG.company.name;
    const companyRnc = companyOverride?.rnc ?? user?.rnc ?? appConfig.rnc ?? APP_CONFIG.company.rnc;

    // Logo
    const logo = appConfig.logo || null;
    if (logo) {
        try {
            doc.addImage(logo, "PNG", margin.left, margin.top, 45, 18);
            yPosition += 22;
        } catch (e) {
            doc.setFontSize(22);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(...blueColor);
            doc.text(companyName, margin.left, yPosition + 5);
            yPosition += 12;
        }
    } else {
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...blueColor);
        doc.text(companyName, margin.left, yPosition + 5);
        yPosition += 12;
    }

    // Info Empresa
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text(`RNC: ${companyRnc}`, margin.left, yPosition);
    yPosition += 5;
    doc.text(appConfig.address || APP_CONFIG.company.address, margin.left, yPosition);
    yPosition += 5;
    doc.text(`Tel: ${appConfig.phone || APP_CONFIG.company.phone} | ${appConfig.email || APP_CONFIG.company.email}`, margin.left, yPosition);
    yPosition += 8;

    // Línea Dorada
    doc.setDrawColor(...goldColor);
    doc.setLineWidth(1.5);
    doc.line(margin.left, yPosition, pageWidth - margin.right, yPosition);
    yPosition += 12;

    // Título Reporte
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...blueColor);
    doc.text("ESTADO DE CUENTA", pageWidth - margin.right, margin.top + 8, { align: "right" });

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generado: ${formatDateDominican(new Date(data.generatedAt))}`, pageWidth - margin.right, margin.top + 16, { align: "right" });
    
    if (data.startDate && data.endDate) {
        doc.text(`Periodo: ${formatDateDominican(new Date(data.startDate))} al ${formatDateDominican(new Date(data.endDate))}`, pageWidth - margin.right, margin.top + 22, { align: "right" });
    }

    // Datos Cliente
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...blueColor);
    doc.text("CLIENTE:", margin.left, yPosition);
    yPosition += 6;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    doc.text(data.customer.name, margin.left, yPosition);
    yPosition += 5;
    doc.text(`RNC/Cédula: ${data.customer.rnc}`, margin.left, yPosition);
    yPosition += 15;

    // Tabla de Facturas
    const tableData = data.invoices.map(inv => [
        formatDateDominican(new Date(inv.date)),
        inv.ncf || "N/A",
        formatCurrency(inv.total),
        formatCurrency(inv.total - inv.balance),
        formatCurrency(inv.balance)
    ]);

    autoTable(doc, {
        startY: yPosition,
        head: [["Fecha", "NCF", "Monto Original", "Monto Pagado", "Balance Pendiente"]],
        body: tableData,
        theme: "striped",
        headStyles: {
            fillColor: blueColor,
            textColor: [255, 255, 255],
            fontStyle: "bold",
        },
        columnStyles: {
            2: { halign: "right" },
            3: { halign: "right" },
            4: { halign: "right" },
        }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;

    // Resumen Final
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...blueColor);
    const summaryX = pageWidth - margin.right - 60;
    
    doc.text("Resumen Consolidado:", summaryX, finalY);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    
    doc.text("Total Facturado:", summaryX, finalY + 8);
    const totalBilled = data.invoices.reduce((acc, inv) => acc + inv.total, 0);
    doc.text(formatCurrency(totalBilled), pageWidth - margin.right, finalY + 8, { align: "right" });

    doc.text("Total Cobrado:", summaryX, finalY + 14);
    const totalCollected = totalBilled - data.totalPending;
    doc.text(formatCurrency(totalCollected), pageWidth - margin.right, finalY + 14, { align: "right" });

    doc.setFont("helvetica", "bold");
    doc.setTextColor(180, 0, 0);
    doc.text("BALANCE PENDIENTE:", summaryX, finalY + 22);
    doc.text(formatCurrency(data.totalPending), pageWidth - margin.right, finalY + 22, { align: "right" });

    // Pie de página
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
            `Este documento es una relación administrativa de facturación generada por ${APP_CONFIG.company.name}.`,
            pageWidth / 2,
            doc.internal.pageSize.getHeight() - 10,
            { align: "center" }
        );
    }

    return doc;
}

/**
 * Descarga el PDF del estado de cuenta
 */
export async function downloadAccountStatementPDF(data: StatementData, companyOverride?: CompanyOverride): Promise<void> {
    const doc = await generateAccountStatementPDF(data, companyOverride);
    const fileName = `Estado_Cuenta_${data.customer.name.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`;
    doc.save(fileName);
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
        validUntil: quoteData.validUntil,
    } as any;

    // Generar PDF (el manejo de validUntil ya está en generateInvoicePDF)
    const pdf = await generateInvoicePDF(invoiceData);

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
const TIPO_PAGO_LABELS: Record<string, string> = {
    efectivo: "Efectivo",
    transferencia: "Transferencia",
    tarjeta: "Tarjeta",
    credito: "Crédito",
    mixto: "Mixto",
    otro: "Otro",
};
