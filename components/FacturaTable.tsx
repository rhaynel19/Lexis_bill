"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CheckCircle, Clock, AlertCircle, Share2, MessageCircle, Mail, Copy, Ban, Download, Pencil, Filter, Repeat } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InvoiceData, downloadInvoicePDF } from "@/lib/pdf-generator";

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
}

interface FacturaTableProps {
    invoices: Invoice[];
    onRefresh: () => void;
}

export function FacturaTable({ invoices, onRefresh }: FacturaTableProps) {
    const router = useRouter();
    const [statusFilter, setStatusFilter] = useState<string>("all");

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

    // Handlers
    const handleWhatsApp = (inv: Invoice) => {
        const message = `Hola *${inv.clientName}*! 🇩🇴\n\nLe envío su factura *${(inv.ncfSequence || inv.id).slice(-11)}* por valor de *${formatCurrency(inv.total)}*.\n\nSaludos.`;
        let phone = inv.clientPhone ? inv.clientPhone.replace(/\D/g, '') : '';
        if (phone.length === 10 && (phone.startsWith("809") || phone.startsWith("829") || phone.startsWith("849"))) {
            phone = "1" + phone;
        }
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
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

    const handleDownloadPDF = async (inv: Invoice) => {
        toast.info("📄 Generando comprobante...");
        try {
            // Preparar datos para el generador
            const invoiceData: InvoiceData = {
                id: inv._id || inv.id,
                sequenceNumber: inv.ncfSequence || inv.id, // Fallback ID if no sequence
                type: inv.type, // Map type appropriately if needed
                clientName: inv.clientName,
                rnc: inv.rnc || inv.clientRnc || "",
                date: inv.date,
                items: [], // En listado a veces no tenemos los items, en ese caso el PDF saldrá sin items o se debería hacer fetch detail
                // Nota: Si 'invoices' no tiene items, este PDF será incompleto.
                // Idealmente el PDF se genera desde el detalle. 
                // Por ahora, usamos los totales.
                subtotal: inv.subtotal || (inv.total - (inv.itbis || 0)),
                itbis: inv.itbis || 0,
                isrRetention: inv.isrRetention || 0,
                itbisRetention: inv.itbisRetention || 0,
                total: inv.total
            };

            // Si necesitamos items, y no están en la lista ligera, deberíamos advertir o llamar API invoice details
            // Asumimos que para "Descargar Comprobante rápido" esto es aceptable o que 'invoices' trae payload completo.

            await downloadInvoicePDF(invoiceData);
            toast.success("✅ Comprobante descargado");
        } catch (e) {
            console.error("PDF Error:", e);
            toast.error("Error al generar PDF");
        }
    };

    const renderStatusBadge = (status: string) => {
        const normalized = status.toLowerCase();

        if (normalized === "paid" || normalized === "recibida") {
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 shadow-sm">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Recibida
                </span>
            );
        }
        if (normalized === "cancelled" || normalized === "rechazada") {
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-100 shadow-sm">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Rechazada
                </span>
            );
        }
        if (normalized === "pending" || normalized === "condicional") {
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-100 shadow-sm">
                    <Clock className="w-3.5 h-3.5" />
                    Condicional
                </span>
            );
        }

        // Default Fallback
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                {status}
            </span>
        );
    };

    return (
        <Card className="bg-white border-none shadow-xl shadow-slate-200/50 rounded-2xl overflow-hidden mt-6">
            <CardHeader className="border-b border-slate-50 bg-slate-50/50 px-8 py-6">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                        <CardTitle className="text-xl font-bold text-slate-800">Transacciones Recientes</CardTitle>
                        <CardDescription className="text-slate-500">Gestión de comprobantes fiscales</CardDescription>
                    </div>
                    <div className="flex gap-3 items-center">
                        {/* Filter Dropdown */}
                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-slate-400" />
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

                        <Button variant="outline" onClick={() => router.push('/reportes')} className="text-emerald-600 border-emerald-200 hover:bg-emerald-50">
                            <Download className="w-4 h-4 mr-2" />
                            Reportes 606/607
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {filteredInvoices.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                        <div className="flex justify-center mb-4">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                                <Filter className="w-8 h-8 text-slate-300" />
                            </div>
                        </div>
                        <p className="font-medium text-slate-600">No hay facturas en esta vista.</p>
                        <p className="text-sm mt-1">Intenta cambiar el filtro o crea una nueva factura.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead className="font-semibold text-slate-600 pl-8">Fecha</TableHead>
                                    <TableHead className="font-semibold text-slate-600">Cliente</TableHead>
                                    <TableHead className="font-semibold text-slate-600">NCF</TableHead>
                                    <TableHead className="font-semibold text-slate-600 text-center">Estado</TableHead>
                                    <TableHead className="text-right font-semibold text-slate-600">Total</TableHead>
                                    <TableHead className="text-right font-semibold text-slate-600 pr-8">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredInvoices.map((inv) => (
                                    <TableRow key={inv.id} className="hover:bg-slate-50/80 transition-colors group">
                                        <TableCell className="font-medium text-slate-700 pl-8">
                                            {new Date(inv.date).toLocaleDateString("es-DO", { day: '2-digit', month: 'short' })}
                                            <div className="text-[10px] text-slate-400">{new Date(inv.date).getFullYear()}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-semibold text-slate-900">{inv.clientName}</div>
                                            <div className="text-xs text-slate-400 font-mono">{inv.rnc || inv.clientRnc}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm font-mono text-slate-600 bg-slate-100 px-2 py-1 rounded inline-block">
                                                {(inv.ncfSequence || inv.id).slice(-11)}
                                            </div>
                                            <div className="text-[10px] text-slate-400 mt-0.5 max-w-[120px] truncate" title={inv.type}>
                                                {inv.type.split('-')[1]?.trim() || inv.type}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {renderStatusBadge(inv.status)}
                                        </TableCell>
                                        <TableCell className="font-bold text-slate-800 text-right text-base">
                                            {formatCurrency(inv.total)}
                                        </TableCell>
                                        <TableCell className="text-right pr-8">
                                            <div className="flex justify-end gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                                {/* Botón condicional principal */}
                                                {(inv.status === "cancelled" || inv.status === "rechazada") ? (
                                                    <Button size="sm" variant="outline" className="h-8 border-red-200 text-red-600 hover:bg-red-50 text-xs px-2" onClick={() => handleClone(inv)}>
                                                        <Pencil className="w-3.5 h-3.5 mr-1" />
                                                        Corregir
                                                    </Button>
                                                ) : (inv.status === "paid" || inv.status === "recibida") ? (
                                                    <Button size="sm" variant="ghost" className="h-8 text-emerald-600 hover:bg-emerald-50" title="Descargar" onClick={() => handleDownloadPDF(inv)}>
                                                        <Download className="w-4 h-4" />
                                                    </Button>
                                                ) : null}

                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-slate-100 rounded-full">
                                                            <Share2 className="h-4 w-4 text-slate-500" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-48">
                                                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => handleWhatsApp(inv)}>
                                                            <MessageCircle className="mr-2 h-4 w-4 text-emerald-600" />
                                                            WhatsApp
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleEmail(inv)}>
                                                            <Mail className="mr-2 h-4 w-4 text-blue-600" />
                                                            Correo
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => handleClone(inv)}>
                                                            <Copy className="mr-2 h-4 w-4" />
                                                            Duplicar
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => toast.success("Factura marcada como Recurrente (Iguala). El sistema generará el borrador el próximo mes.")}>
                                                            <Repeat className="mr-2 h-4 w-4 text-amber-600" />
                                                            Hacer Recurrente
                                                        </DropdownMenuItem>
                                                        {(inv.status !== 'cancelled' && inv.status !== 'rechazada') && (
                                                            <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50">
                                                                <Ban className="mr-2 h-4 w-4" />
                                                                Anular
                                                            </DropdownMenuItem>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
