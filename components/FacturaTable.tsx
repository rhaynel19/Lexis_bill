"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CheckCircle, Clock, AlertCircle, Share2, MessageCircle, Mail, Copy, Ban, Download, Pencil, Filter, Repeat, Eye, CreditCard, User } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InvoiceData, downloadInvoicePDF } from "@/lib/pdf-generator";
import { DocumentViewer } from "@/components/DocumentViewer";
import { generateInvoiceWhatsAppMessage, openWhatsApp } from "@/lib/whatsapp-utils";

// Definición de Interfaz (Debe coincidir con la del backend o api-service)
export interface Invoice {
    id: string;
    _id?: string;
    clientName: string;
    rnc: string;
    clientRnc?: string;
    ncfSequence?: string;
    ncfType?: string;
    type: string;
    total: number;
    itbis?: number;
    subtotal?: number; // Needed for PDF
    isrRetention?: number;
    itbisRetention?: number;
    date: string;
    status: "pending" | "paid" | "modified" | "cancelled" | "recibida" | "rechazada" | "condicional";
    annulledBy?: string;
    modifiedNcf?: string;
    clientPhone?: string;
    items?: Array<{
        description: string;
        quantity: number;
        price: number;
        isExempt?: boolean;
    }>;
}

interface FacturaTableProps {
    invoices: Invoice[];
    onRefresh: () => void;
}

export function FacturaTable({ invoices, onRefresh }: FacturaTableProps) {
    const router = useRouter();
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [isViewerOpen, setIsViewerOpen] = useState(false);
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

    // Filtrado de facturas
    const filteredInvoices = invoices.filter((inv) => {
        if (statusFilter === "all") return true;
        // Mapping old statuses to new Logic if necessary, or just direct comparison
        if (statusFilter === "recibida") return inv.status === "paid" || inv.status === "recibida";
        if (statusFilter === "condicional") return inv.status === "pending" || inv.status === "condicional";
        if (statusFilter === "rechazada") return inv.status === "cancelled" || inv.status === "rechazada";
        return true;
    });

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("es-DO", {
            style: "currency",
            currency: "DOP",
        }).format(amount);
    };

    // Handlers (mantener compatibilidad con código existente)
    const handleWhatsApp = (inv: Invoice) => {
        handleSendWhatsApp(inv);
    };

    const handleEmail = (inv: Invoice) => {
        const subject = `Factura NCF ${(inv.ncfSequence || inv.id).slice(-11)} - ${new Date(inv.date).toLocaleDateString("es-DO")}`;
        const body = `Estimado ${inv.clientName},\n\nAdjunto encontrará los detalles de su factura por ${formatCurrency(inv.total)}.\n\nSaludos,\nLEXIS BILL`;
        window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
    };

    const handleClone = (inv: Invoice) => {
        localStorage.setItem("invoiceToClone", JSON.stringify(inv));
        router.push("/nueva-factura");
    };

    const handleViewInvoice = (inv: Invoice) => {
        setSelectedInvoice(inv);
        setIsViewerOpen(true);
    };

    const handleDownloadPDF = async (inv?: Invoice) => {
        const invoice = inv || selectedInvoice;
        if (!invoice) return;

        setIsGeneratingPDF(true);
        toast.info("📄 Generando comprobante...");
        try {
            // Preparar datos para el generador
            const invoiceData: InvoiceData = {
                id: invoice._id || invoice.id,
                sequenceNumber: invoice.ncfSequence || invoice.id,
                type: invoice.type || "32",
                clientName: invoice.clientName,
                rnc: invoice.rnc || invoice.clientRnc || "",
                date: invoice.date,
                items: invoice.items || [],
                subtotal: invoice.subtotal || (invoice.total - (invoice.itbis || 0)),
                itbis: invoice.itbis || 0,
                isrRetention: invoice.isrRetention || 0,
                itbisRetention: invoice.itbisRetention || 0,
                total: invoice.total
            };

            await downloadInvoicePDF(invoiceData);
            toast.success("✅ Comprobante descargado");
        } catch (e) {
            console.error("PDF Error:", e);
            toast.error("Error al generar PDF");
        } finally {
            setIsGeneratingPDF(false);
        }
    };

    const handleSendWhatsApp = (inv?: Invoice) => {
        const invoice = inv || selectedInvoice;
        if (!invoice) return;

        const message = generateInvoiceWhatsAppMessage(invoice);
        openWhatsApp(invoice.clientPhone, message);
        toast.info("📲 Abriendo WhatsApp...");
    };

    const renderStatusBadge = (status: string) => {
        return <StatusBadge status={status} />;
    };

    return (
        <>
            <Card className="bg-card border-none shadow-xl shadow-accent/5 rounded-2xl overflow-hidden mt-6">
                <CardHeader className="border-b border-border/10 bg-muted/50 px-4 sm:px-6 md:px-8 py-4 md:py-6">
                    <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
                        <div className="min-w-0">
                            <CardTitle className="text-lg md:text-xl font-bold text-foreground">Transacciones Recientes</CardTitle>
                            <CardDescription className="text-muted-foreground text-sm">Gestión de comprobantes fiscales</CardDescription>
                        </div>
                        <div className="flex flex-wrap gap-2 sm:gap-3 items-center">
                            {/* Filter Dropdown */}
                            <div className="flex items-center gap-2">
                                <Filter className="w-4 h-4 text-muted-foreground" />
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-[140px] h-9 text-sm">
                                        <SelectValue placeholder="Estado" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas</SelectItem>
                                        <SelectItem value="recibida">Recibidas</SelectItem>
                                        <SelectItem value="condicional">Condicionales</SelectItem>
                                        <SelectItem value="rechazada">Rechazadas</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button variant="outline" onClick={() => router.push('/reportes')} className="text-success border-success/20 hover:bg-success/10 shrink-0">
                                <Download className="w-4 h-4 sm:mr-2" />
                                <span className="hidden sm:inline">Reportes </span>606/607
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {filteredInvoices.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <div className="flex justify-center mb-4">
                                <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center">
                                    <Filter className="w-8 h-8 text-muted-foreground/50" />
                                </div>
                            </div>
                            <p className="font-medium text-foreground">No hay facturas en esta vista.</p>
                            <p className="text-sm mt-1 text-muted-foreground">Intenta cambiar el filtro o crea una nueva factura.</p>
                        </div>
                    ) : (
                        <>
                            {/* Desktop View - scroll horizontal en móvil/tablet */}
                            <div className="hidden md:block overflow-x-auto">
                                <Table className="min-w-[640px]">
                                    <TableHeader className="bg-muted/50">
                                        <TableRow className="border-border/10">
                                            <TableHead className="font-semibold text-muted-foreground pl-8">Fecha</TableHead>
                                            <TableHead className="font-semibold text-muted-foreground">Cliente</TableHead>
                                            <TableHead className="font-semibold text-muted-foreground">NCF</TableHead>
                                            <TableHead className="font-semibold text-muted-foreground text-center">Estado</TableHead>
                                            <TableHead className="text-right font-semibold text-muted-foreground">Total</TableHead>
                                            <TableHead className="text-right font-semibold text-muted-foreground pr-8">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredInvoices.map((inv) => (
                                            <TableRow key={inv.id} className="hover:bg-muted/50 border-border/10 transition-colors group">
                                                <TableCell className="font-medium text-foreground pl-8">
                                                    {new Date(inv.date).toLocaleDateString("es-DO", { day: '2-digit', month: 'short' })}
                                                    <div className="text-[10px] text-muted-foreground">{new Date(inv.date).getFullYear()}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-semibold text-foreground">{inv.clientName}</div>
                                                    <div className="text-xs text-muted-foreground font-mono">{inv.rnc || inv.clientRnc}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm font-mono text-foreground bg-accent/10 px-2 py-1 rounded inline-block">
                                                        {(inv.ncfSequence || inv.id).slice(-11)}
                                                    </div>
                                                    <div className="text-[10px] text-muted-foreground mt-0.5 max-w-[120px] truncate" title={inv.type}>
                                                        {inv.type.split('-')[1]?.trim() || inv.type}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {renderStatusBadge(inv.status)}
                                                </TableCell>
                                                <TableCell className="font-bold text-foreground text-right text-base">
                                                    {formatCurrency(inv.total)}
                                                </TableCell>
                                                <TableCell className="text-right pr-8">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-8 w-8 p-0"
                                                            onClick={() => handleViewInvoice(inv)}
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </Button>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                                                    <Share2 className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem onClick={() => handleWhatsApp(inv)}>WhatsApp</DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => handleDownloadPDF(inv)}>PDF</DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Mobile View */}
                            <div className="md:hidden divide-y divide-border/10">
                                {filteredInvoices.map((inv) => (
                                    <div key={inv.id} className="p-5 space-y-4 bg-card hover:bg-muted/30 active:bg-muted/50 transition-colors" onClick={() => handleViewInvoice(inv)}>
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-1.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-mono text-muted-foreground font-bold bg-accent/10 px-2 py-0.5 rounded uppercase">
                                                        No. {(inv.ncfSequence || inv.id).slice(-11)}
                                                    </span>
                                                    <StatusBadge status={inv.status} />
                                                </div>
                                                <h3 className="font-bold text-foreground flex items-center gap-2">
                                                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                                                    {inv.clientName}
                                                </h3>
                                                <p className="text-[10px] text-muted-foreground font-medium">
                                                    {new Date(inv.date).toLocaleDateString("es-DO", { day: '2-digit', month: 'long', year: 'numeric' })}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-black text-accent text-xl tracking-tighter">{formatCurrency(inv.total)}</p>
                                                <p className="text-[10px] text-muted-foreground font-bold uppercase mt-1">Total DOP</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 pt-2">
                                            <Button variant="outline" size="sm" className="flex-1 h-9" onClick={(e) => { e.stopPropagation(); handleViewInvoice(inv); }}>
                                                <Eye className="w-4 h-4 mr-2" /> Ver
                                            </Button>
                                            <Button variant="outline" size="sm" className="flex-1 h-9 text-success border-success/20" onClick={(e) => { e.stopPropagation(); handleWhatsApp(inv); }}>
                                                <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp
                                            </Button>
                                            <Button variant="outline" size="sm" className="h-9 w-10 p-0" onClick={(e) => { e.stopPropagation(); handleDownloadPDF(inv); }}>
                                                <Download className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Document Viewer Modal */}
            <DocumentViewer
                isOpen={isViewerOpen}
                onClose={() => {
                    setIsViewerOpen(false);
                    setSelectedInvoice(null);
                }}
                document={selectedInvoice}
                type="invoice"
                onDownloadPDF={() => handleDownloadPDF()}
                onSendWhatsApp={() => handleSendWhatsApp()}
                isGeneratingPDF={isGeneratingPDF}
            />
        </>
    );
}
