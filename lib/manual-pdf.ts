/**
 * Genera y descarga el Manual de Uso de Lexis Bill en PDF (cliente).
 * Usa jsPDF; el contenido está alineado con docs/MANUAL_USO_LEXIS_BILL.md.
 */

import jsPDF from "jspdf";

const MARGIN = 20;
const LINE_HEIGHT = 6;
const TITLE_SIZE = 16;
const HEADING_SIZE = 12;
const BODY_SIZE = 10;
const FOOTER_TEXT = "Lexis Bill © " + new Date().getFullYear() + " · República Dominicana";

function getPageWidth(doc: jsPDF) {
    return doc.internal.pageSize.getWidth();
}

function getPageHeight(doc: jsPDF) {
    return doc.internal.pageSize.getHeight();
}

/** Añade texto con salto de línea automático y retorna la Y final */
function addWrappedText(
    doc: jsPDF,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    fontSize: number,
    lineHeight: number
): number {
    const lines = doc.splitTextToSize(text, maxWidth);
    doc.setFontSize(fontSize);
    for (let i = 0; i < lines.length; i++) {
        if (y + lineHeight > getPageHeight(doc) - 25) {
            doc.addPage();
            y = MARGIN;
            doc.setFontSize(10);
            doc.text(FOOTER_TEXT, getPageWidth(doc) / 2, getPageHeight(doc) - 10, { align: "center" });
            doc.setFontSize(fontSize);
        }
        doc.text(lines[i], x, y);
        y += lineHeight;
    }
    return y;
}

/** Añade un bloque (título o párrafo) y retorna la Y final */
function addBlock(
    doc: jsPDF,
    content: string,
    x: number,
    y: number,
    isHeading: boolean,
    isTitle: boolean
): number {
    const pageWidth = getPageWidth(doc);
    const maxWidth = pageWidth - 2 * MARGIN;
    const size = isTitle ? TITLE_SIZE : isHeading ? HEADING_SIZE : BODY_SIZE;
    const lh = isTitle ? 10 : isHeading ? 7 : LINE_HEIGHT;
    if (y + lh > getPageHeight(doc) - 25) {
        doc.addPage();
        y = MARGIN;
        doc.setFontSize(10);
        doc.text(FOOTER_TEXT, pageWidth / 2, getPageHeight(doc) - 10, { align: "center" });
    }
    if (isHeading || isTitle) doc.setFont("helvetica", "bold");
    else doc.setFont("helvetica", "normal");
    const nextY = addWrappedText(doc, content, x, y, maxWidth, size, lh);
    return nextY + (isTitle ? 6 : isHeading ? 4 : 3);
}

export async function generateManualPdf(): Promise<void> {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = getPageWidth(doc);
    let y = MARGIN;

    // Portada
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("Manual de Uso Oficial", pageWidth / 2, y + 20, { align: "center" });
    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.text("Lexis Bill", pageWidth / 2, y + 32, { align: "center" });
    doc.text("República Dominicana · Versión 1", pageWidth / 2, y + 40, { align: "center" });
    doc.setFontSize(10);
    doc.text(FOOTER_TEXT, pageWidth / 2, getPageHeight(doc) - 15, { align: "center" });

    doc.addPage();
    y = MARGIN;

    const sections: { title: string; body: string }[] = [
        {
            title: "Introducción a Lexis Bill",
            body: "Lexis Bill es una plataforma SaaS de facturación y cumplimiento fiscal para profesionales y empresas en República Dominicana. Permite emitir comprobantes fiscales (e-CF y Serie B), gestionar clientes, generar reportes 606 y 607, y administrar suscripciones. Importante: Lexis Bill es una herramienta de apoyo. No sustituye la asesoría contable o tributaria. El usuario es responsable de la veracidad de los datos y del uso correcto de los NCF."
        },
        {
            title: "Cómo crear una factura",
            body: "1) Pulse Nueva Factura en el menú o Dashboard. 2) Seleccione el tipo de comprobante según su lote NCF. 3) Ingrese o seleccione el cliente (nombre y RNC). 4) Añada los ítems (descripción, cantidad, precio). 5) Revise ITBIS, retenciones y total. 6) Elija tipo de pago. 7) Emita o guarde borrador. Advertencia fiscal: Verifique toda la información antes de emitir."
        },
        {
            title: "Cómo generar una Nota de Crédito",
            body: "Vaya a Dashboard → Centro de control de facturas. Localice la factura y pulse Emitir nota de crédito. Confirme en el modal. Se generará la Nota de Crédito (e-CF 34 o B04) y la factura original quedará anulada. Plazo DGII: Dentro de 30 días el ITBIS conserva crédito fiscal; después de 30 días puede emitirse pero el tratamiento fiscal cambia (606/607, sin crédito fiscal ITBIS)."
        },
        {
            title: "Cómo emitir cotizaciones",
            body: "Menú Nueva Cotización. Ingrese cliente e ítems con precios. Defina fecha de validez. Guarde o envíe. Luego puede Convertir a factura desde el listado cuando el cliente acepte."
        },
        {
            title: "Cómo registrar clientes",
            body: "Clientes → Agregar cliente. Nombre, RNC (9 o 11 dígitos), teléfono y correo opcionales. Los clientes aparecen al crear facturas o cotizaciones."
        },
        {
            title: "Cómo subir rangos NCF",
            body: "Configuración → Comprobantes fiscales (NCF). Agregue un lote por tipo (31, 34, 01, etc.). Ingrese rango y fecha de vencimiento. Use solo rangos asignados por la DGII."
        },
        {
            title: "Cómo generar reporte 606",
            body: "Reportes → 606. Seleccione período (año y mes). Revise y valide. Descargue o envíe según su contador."
        },
        {
            title: "Cómo generar reporte 607",
            body: "Reportes → 607. Seleccione período. Incluya los gastos registrados en Gastos. Valide y descargue según normativa DGII."
        },
        {
            title: "Resumen ITBIS",
            body: "En Reportes encontrará Resumen ITBIS por período: Ventas (ITBIS cobrado), Compras (ITBIS a crédito), Balance. Solo referencia; la declaración formal la realiza el contribuyente o su contador."
        },
        {
            title: "Sistema de suscripción",
            body: "Trial 15 días sin tarjeta. Planes Pro/Premium por transferencia o PayPal. En Pagos solicite activación (referencia LEX-XXXX o PayPal). Política de Reembolsos aplica."
        },
        {
            title: "Advertencias obligatorias",
            body: "El sistema no sustituye asesoría contable. El usuario es responsable del uso correcto de los NCF y de la información ingresada. Verifique toda la información antes de emitir facturas, notas de crédito o reportes."
        }
    ];

    for (const section of sections) {
        y = addBlock(doc, section.title, MARGIN, y, true, false);
        y = addBlock(doc, section.body, MARGIN, y, false, false);
    }

    doc.setFontSize(10);
    doc.text(FOOTER_TEXT, pageWidth / 2, getPageHeight(doc) - 10, { align: "center" });

    doc.save("Manual_Lexis_Bill.pdf");
}
