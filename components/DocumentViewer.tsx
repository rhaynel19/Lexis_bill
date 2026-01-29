"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, MessageCircle, X, Pencil } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { generateQuoteWhatsAppMessage, generateInvoiceWhatsAppMessage } from "@/lib/whatsapp-utils";

// Interfaz para cotizaciones
export interface Quote {
    id: string;
    clientName: string;
    rnc: string;
    clientPhone?: string;
    items: Array<{
        id: string;
        description: string;
        quantity: number;
        price: number;
        isExempt?: boolean;
    }>;
    subtotal: number;
    itbis: number;
    total: number;
    date: string;
    validUntil?: string;
    status?: string;
}

// Interfaz para facturas (compatible con Invoice de FacturaTable)
export interface Invoice {
    id: string;
    _id?: string;
    clientName: string;
    rnc: string;
    clientRnc?: string;
    ncfSequence?: string;
    type?: string;
    total: number;
    itbis?: number;
    subtotal?: number;
    items?: Array<{
        description: string;
        quantity: number;
        price: number;
        isExempt?: boolean;
    }>;
    date: string;
    clientPhone?: string;
    isrRetention?: number;
    itbisRetention?: number;
    status?: string;
}

interface DocumentViewerProps {
    isOpen: boolean;
    onClose: () => void;
    document: Quote | Invoice | null;
    type: "quote" | "invoice";
    onDownloadPDF?: () => void;
    onSendWhatsApp?: () => void;
    isGeneratingPDF?: boolean;
    onEdit?: () => void; // Optional if not provided manually
}

export function DocumentViewer({
    isOpen,
    onClose,
    document,
    type,
    onDownloadPDF,
    onSendWhatsApp,
    isGeneratingPDF = false,
    onEdit
}: DocumentViewerProps) {
    const router = useRouter();
    if (!document) return null;

    const handleEdit = () => {
        if (onEdit) {
            onEdit();
        } else {
            // Default behavior if no custom handler
            if (type === "quote") {
                router.push(`/nueva-cotizacion?edit=${document.id}`);
            } else {
                // For invoices, edit might be a different flow, but we can enable it later
                toast.info("Función de edición de facturas estará disponible pronto.");
            }
        }
        onClose();
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("es-DO", {
            style: "currency",
            currency: "DOP",
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("es-DO", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };

    // Obtener nombre de la empresa desde localStorage
    const getCompanyName = () => {
        if (typeof window === "undefined") return "Lexis Bill";

        try {
            const storedConfig = localStorage.getItem("appConfig");
            const storedUser = localStorage.getItem("user");

            if (storedUser) {
                const user = JSON.parse(storedUser);
                if (user?.fiscalStatus?.confirmed) {
                    return user.fiscalStatus.confirmed;
                }
            }

            if (storedConfig) {
                const config = JSON.parse(storedConfig);
                return config.companyName || "Lexis Bill";
            }

            return "Lexis Bill";
        } catch {
            return "Lexis Bill";
        }
    };

    const getCompanyRnc = () => {
        if (typeof window === "undefined") return "N/A";

        try {
            const storedUser = localStorage.getItem("user");
            if (storedUser) {
                const user = JSON.parse(storedUser);
                return user?.rnc || "N/A";
            }
            return "N/A";
        } catch {
            return "N/A";
        }
    };

    const companyName = getCompanyName();
    const companyRnc = getCompanyRnc();
    const documentNumber = type === "quote"
        ? (document as Quote).id
        : (document as Invoice).ncfSequence || (document as Invoice).id;

    const documentDate = document.date;
    const clientName = document.clientName;
    const clientRnc = document.rnc || (document as Invoice).clientRnc || "";

    // Calcular items y totales
    const items = type === "quote"
        ? (document as Quote).items.map(item => ({
            description: item.description,
            quantity: item.quantity,
            price: item.price,
            subtotal: item.quantity * item.price
        }))
        : (document as Invoice).items?.map(item => ({
            description: item.description,
            quantity: item.quantity,
            price: item.price,
            subtotal: item.quantity * item.price
        })) || [];

    const subtotal = type === "quote"
        ? (document as Quote).subtotal
        : (document as Invoice).subtotal || ((document as Invoice).total - ((document as Invoice).itbis || 0));

    const itbis = type === "quote"
        ? (document as Quote).itbis
        : (document as Invoice).itbis || 0;

    const total = document.total;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl h-[95vh] md:h-[90vh] p-0 flex flex-col overflow-hidden bg-background border-border/20 shadow-2xl">
                {/* Header Fijo */}
                <div className="p-6 border-b border-border/10 bg-secondary flex-shrink-0 z-20">
                    <div className="flex justify-between items-center">
                        <div>
                            <DialogTitle className="text-xl md:text-2xl font-serif font-black text-foreground flex items-center gap-3">
                                {type === "quote" ? "Cotización" : "Factura"}
                                <StatusBadge status={document.status || (type === "quote" ? "borrador" : "emitida")} />
                            </DialogTitle>
                            <DialogDescription className="text-muted-foreground mt-1 font-medium">
                                No. {documentNumber} • {type === "quote" ? "Propuesta comercial" : "Comprobante fiscal"}
                            </DialogDescription>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className="text-muted-foreground hover:text-foreground hover:bg-accent/10 rounded-full h-10 w-10 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </Button>
                    </div>
                </div>

                {/* Body con Scroll */}
                <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-12 bg-background">
                    {/* Sección 1: Encabezado del Documento (Empresa y Cliente) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-4">
                            <div>
                                <h4 className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">Emisor</h4>
                                <h3 className="text-xl font-bold text-foreground leading-tight">{companyName}</h3>
                                <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                                    <span className="font-semibold text-muted-foreground/60">RNC:</span> {companyRnc}
                                </p>
                            </div>
                            <div className="pt-2">
                                <h4 className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">Fecha de Emisión</h4>
                                <p className="text-foreground font-medium">{formatDate(documentDate)}</p>
                            </div>
                        </div>

                        <div className="space-y-4 bg-secondary p-6 rounded-2xl border border-border/50">
                            <div>
                                <h4 className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">Cliente</h4>
                                <h3 className="text-lg font-bold text-foreground">{clientName}</h3>
                                <p className="text-sm text-foreground/80 mt-1 flex items-center gap-2">
                                    <span className="font-semibold text-muted-foreground/60">RNC/Cédula:</span> {clientRnc}
                                </p>
                            </div>
                            {type === "quote" && (document as Quote).validUntil && (
                                <div className="pt-2 border-t border-border/10">
                                    <h4 className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">Válida hasta</h4>
                                    <p className="text-foreground/80 font-medium">{formatDate((document as Quote).validUntil!)}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Tabla de Items */}
                    <div className="space-y-4">
                        <h4 className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Detalle de Productos / Servicios</h4>
                        <div className="border border-border/30 rounded-xl overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-muted/50">
                                        <TableRow className="hover:bg-transparent border-border/10">
                                            <TableHead className="text-foreground font-bold py-4">Descripción</TableHead>
                                            <TableHead className="text-center text-foreground font-bold py-4">Cant.</TableHead>
                                            <TableHead className="text-right text-foreground font-bold py-4">Precio Unit.</TableHead>
                                            <TableHead className="text-right text-foreground font-bold py-4">Subtotal</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {items.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center text-muted-foreground py-10 italic">
                                                    No hay conceptos registrados en este documento
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            items.map((item, index) => (
                                                <TableRow key={index} className="border-b border-border/5 last:border-0">
                                                    <TableCell className="py-4 text-foreground font-medium">{item.description || "Sin descripción"}</TableCell>
                                                    <TableCell className="text-center py-4 text-muted-foreground">{item.quantity}</TableCell>
                                                    <TableCell className="text-right py-4 text-muted-foreground">{formatCurrency(item.price)}</TableCell>
                                                    <TableCell className="text-right py-4 text-foreground font-bold">
                                                        {formatCurrency(item.quantity * item.price)}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Fijo con Totales y Botones */}
                <div className="flex-shrink-0 bg-secondary border-t border-border/30 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)]">
                    {/* Bloque de Totales */}
                    <div className="bg-muted/30 px-6 py-4 md:px-10 border-b border-border/10">
                        <div className="flex flex-col items-end space-y-2">
                            <div className="flex justify-between w-full md:w-80 text-sm text-muted-foreground">
                                <span className="font-medium lowercase">Subtotal Gravado</span>
                                <span className="font-bold text-foreground">{formatCurrency(subtotal)}</span>
                            </div>
                            <div className="flex justify-between w-full md:w-80 text-sm text-muted-foreground">
                                <span className="font-medium lowercase">ITBIS (18%)</span>
                                <span className="font-bold text-foreground">{formatCurrency(itbis)}</span>
                            </div>
                            <div className="flex justify-between items-center w-full md:w-80 pt-2 mt-2 border-t border-border/20">
                                <span className="text-foreground font-black uppercase tracking-tighter">Total General</span>
                                <span className="text-3xl md:text-4xl font-black text-accent tracking-tight drop-shadow-sm">
                                    {formatCurrency(total)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Botones de Acción */}
                    <div className="p-4 md:p-6 bg-secondary flex grid grid-cols-4 sm:flex gap-2 sm:gap-3 justify-end items-center">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            className="col-span-1 h-12 order-4 sm:order-1 border-border/40 text-muted-foreground hover:bg-muted/20 hover:text-foreground flex items-center justify-center p-0 sm:px-4"
                            title="Cerrar"
                        >
                            <X className="w-5 h-5 sm:hidden" />
                            <span className="hidden sm:inline">Cerrar</span>
                        </Button>

                        {type === "quote" && (
                            <Button
                                variant="outline"
                                onClick={handleEdit}
                                className="col-span-1 h-12 order-3 sm:order-2 border-accent/20 text-accent hover:bg-accent/5 font-bold flex items-center justify-center p-0 sm:px-4"
                                title="Editar"
                            >
                                <Pencil className="w-5 h-5 sm:w-4 sm:h-4 sm:mr-2" />
                                <span className="hidden sm:inline">Editar</span>
                            </Button>
                        )}

                        {onSendWhatsApp && (
                            <Button
                                onClick={() => {
                                    const message = type === "quote"
                                        ? generateQuoteWhatsAppMessage(document as Quote, companyName)
                                        : generateInvoiceWhatsAppMessage(document as Invoice, companyName);

                                    const { openWhatsApp } = require("@/lib/whatsapp-utils");
                                    openWhatsApp(document.clientPhone, message);
                                    toast.info("📲 Abriendo WhatsApp...");
                                }}
                                variant="outline"
                                className="col-span-1 h-12 text-success border-success/20 hover:bg-success/5 order-2 sm:order-2 font-bold flex items-center justify-center p-0 sm:px-4"
                                title="WhatsApp"
                            >
                                <MessageCircle className="w-6 h-6 sm:w-5 sm:h-5 sm:mr-2" />
                                <span className="hidden sm:inline">WhatsApp</span>
                            </Button>
                        )}

                        {onDownloadPDF && (
                            <Button
                                onClick={onDownloadPDF}
                                disabled={isGeneratingPDF}
                                className="col-span-1 sm:col-span-auto h-12 bg-primary hover:bg-primary/90 text-primary-foreground order-1 sm:order-3 font-bold shadow-lg shadow-primary/20 flex items-center justify-center p-0 sm:px-8"
                                title="Descargar PDF"
                            >
                                <Download className="w-6 h-6 sm:w-5 sm:h-5 sm:mr-2" />
                                <span className="hidden sm:inline">{isGeneratingPDF ? "..." : "PDF"}</span>
                                <span className="hidden md:inline ml-1">{!isGeneratingPDF && "Descargar PDF"}</span>
                            </Button>
                        )}
                    </div>

                </div>
            </DialogContent>
        </Dialog>
    );
}
