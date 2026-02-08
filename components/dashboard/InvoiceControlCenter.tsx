"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
    Eye,
    Download,
    MessageCircle,
    Repeat,
    FileText,
    Plus,
    Filter,
    Search,
    AlertTriangle,
    Clock,
    DollarSign,
    ArrowDownLeft,
    AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { InvoiceData, downloadInvoicePDF } from "@/lib/pdf-generator";
import { DocumentViewer } from "@/components/DocumentViewer";
import { generateInvoiceWhatsAppMessage, openWhatsApp } from "@/lib/whatsapp-utils";
import { CreditNoteModal } from "@/components/CreditNoteModal";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Link from "next/link";

export interface Invoice {
    id: string;
    _id?: string;
    clientName: string;
    rnc?: string;
    clientRnc?: string;
    ncfSequence?: string;
    ncfType?: string;
    type: string;
    total: number;
    itbis?: number;
    subtotal?: number;
    isrRetention?: number;
    itbisRetention?: number;
    date: string;
    status: string;
    annulledBy?: string;
    modifiedNcf?: string;
    clientPhone?: string;
    balancePendiente?: number;
    estadoPago?: string;
    tipoPago?: string;
    montoPagado?: number;
    items?: Array<{ description: string; quantity: number; price: number; isExempt?: boolean }>;
}

interface InvoiceControlCenterProps {
    invoices: Invoice[];
    onRefresh: () => void;
    onRequestCreditNote?: (inv: Invoice) => void;
    isLoading?: boolean;
}

const TIPO_PAGO_LABELS: Record<string, string> = {
    efectivo: "Efectivo",
    transferencia: "Transferencia",
    tarjeta: "Tarjeta",
    credito: "Crédito",
    mixto: "Mixto",
    otro: "Otro",
};

const formatCurrency = (n: number) =>
    new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP", maximumFractionDigits: 0 }).format(n);

function getInvoiceStatus(inv: Invoice): "pagada" | "pendiente" | "vencida" {
    const bal = inv.balancePendiente ?? (inv.estadoPago === "pendiente" || inv.estadoPago === "parcial" || inv.status === "pending" ? inv.total : 0);
    const isPaid = bal <= 0 && inv.status !== "cancelled";
    if (isPaid) return "pagada";
    const daysSince = (Date.now() - new Date(inv.date).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince > 30) return "vencida";
    return "pendiente";
}

function StatusDot({ status }: { status: "pagada" | "pendiente" | "vencida" }) {
    const config = {
        pagada: { bg: "bg-emerald-500", ring: "ring-emerald-500/30", label: "Pagada" },
        pendiente: { bg: "bg-amber-500", ring: "ring-amber-500/30", label: "Pendiente" },
        vencida: { bg: "bg-rose-500", ring: "ring-rose-500/30", label: "Vencida" },
    }[status];
    return (
        <span className={cn("inline-flex items-center gap-1.5")}>
            <span className={cn("w-2 h-2 rounded-full", config.bg, "ring-2", config.ring)} />
            <span className="text-xs font-medium text-muted-foreground">{config.label}</span>
        </span>
    );
}

export function InvoiceControlCenter({ invoices, onRefresh, onRequestCreditNote, isLoading }: InvoiceControlCenterProps) {
    const router = useRouter();
    const [quickFilter, setQuickFilter] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [isViewerOpen, setIsViewerOpen] = useState(false);
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const [showCreditNote, setShowCreditNote] = useState(false);
    const [creditNoteInvoice, setCreditNoteInvoice] = useState<Invoice | null>(null);
    const [hoveredRow, setHoveredRow] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const pageSize = 15;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const stats = useMemo(() => {
        const monthInvs = invoices.filter((i) => {
            const d = new Date(i.date);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });
        const facturadoMes = monthInvs.reduce((s, i) => s + (i.total || 0), 0);
        const cobrado = invoices.filter((i) => getInvoiceStatus(i) === "pagada").reduce((s, i) => s + (i.total || 0), 0);
        const pendiente = invoices.reduce((s, i) => {
            const bal = i.balancePendiente ?? (getInvoiceStatus(i) !== "pagada" ? i.total : 0);
            return s + (bal > 0 ? bal : 0);
        }, 0);
        const vencidas = invoices.filter((i) => getInvoiceStatus(i) === "vencida");
        const vencido = vencidas.reduce((s, i) => s + (i.balancePendiente ?? i.total), 0);

        const prevMonthInvs = invoices.filter((i) => {
            const d = new Date(i.date);
            return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
        });
        const prevFacturado = prevMonthInvs.reduce((s, i) => s + (i.total || 0), 0);
        const pctChange = prevFacturado > 0 ? ((facturadoMes - prevFacturado) / prevFacturado) * 100 : 0;

        return { facturadoMes, cobrado, pendiente, vencido, vencidasCount: vencidas.length, pctChange, monthInvs };
    }, [invoices, currentMonth, currentYear, prevMonth, prevYear]);

    const filteredInvoices = useMemo(() => {
        let list = invoices;
        if (quickFilter === "hoy") {
            const today = now.toISOString().slice(0, 10);
            list = list.filter((i) => (i.date || "").toString().startsWith(today));
        } else if (quickFilter === "mes") {
            list = list.filter((i) => {
                const d = new Date(i.date);
                return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            });
        } else if (quickFilter === "vencidas") list = list.filter((i) => getInvoiceStatus(i) === "vencida");
        else if (quickFilter === "pendientes") list = list.filter((i) => getInvoiceStatus(i) === "pendiente");
        else if (quickFilter === "pagadas") list = list.filter((i) => getInvoiceStatus(i) === "pagada");
        else if (quickFilter === "balance") list = list.filter((i) => (i.balancePendiente ?? 0) > 0);

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(
                (i) =>
                    (i.clientName || "").toLowerCase().includes(q) ||
                    (i.ncfSequence || i.id || "").toLowerCase().includes(q) ||
                    (i.rnc || i.clientRnc || "").replace(/\D/g, "").includes(q.replace(/\D/g, ""))
            );
        }
        return list;
    }, [invoices, quickFilter, searchQuery, now, currentMonth, currentYear]);

    const paginatedInvoices = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filteredInvoices.slice(start, start + pageSize);
    }, [filteredInvoices, page, pageSize]);
    const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / pageSize));

    const alerts = useMemo(() => {
        const a: string[] = [];
        if (stats.vencidasCount > 0)
            a.push(`Tienes ${stats.vencidasCount} factura${stats.vencidasCount > 1 ? "s" : ""} vencida${stats.vencidasCount > 1 ? "s" : ""} — ${formatCurrency(stats.vencido)} sin cobrar.`);
        if (stats.pctChange > 0) a.push(`Tu facturación subió ${Math.round(stats.pctChange)}% vs el mes pasado.`);
        const oldestVencida = invoices.filter((i) => getInvoiceStatus(i) === "vencida").sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
        if (oldestVencida) {
            const days = Math.floor((Date.now() - new Date(oldestVencida.date).getTime()) / (1000 * 60 * 60 * 24));
            a.push(`El cliente ${oldestVencida.clientName} tiene ${days} días sin pagar.`);
        }
        return a;
    }, [stats, invoices]);

    const handleView = (inv: Invoice) => {
        setSelectedInvoice(inv);
        setIsViewerOpen(true);
    };

    const handleDownloadPDF = async (inv?: Invoice) => {
        const invoice = inv || selectedInvoice;
        if (!invoice) return;
        setIsGeneratingPDF(true);
        toast.info("📄 Generando comprobante...");
        try {
            const data: InvoiceData = {
                id: invoice._id || invoice.id,
                sequenceNumber: invoice.ncfSequence || invoice.id,
                type: invoice.ncfType || invoice.type || "32",
                clientName: invoice.clientName,
                rnc: invoice.rnc || invoice.clientRnc || "",
                date: invoice.date,
                items: invoice.items || [],
                subtotal: invoice.subtotal ?? invoice.total - (invoice.itbis || 0),
                itbis: invoice.itbis || 0,
                isrRetention: invoice.isrRetention || 0,
                itbisRetention: invoice.itbisRetention || 0,
                total: invoice.total,
            };
            await downloadInvoicePDF(data);
            toast.success("✅ Comprobante descargado");
        } catch (e) {
            toast.error("Error al generar PDF");
        } finally {
            setIsGeneratingPDF(false);
        }
    };

    const handleWhatsApp = (inv: Invoice) => {
        const msg = generateInvoiceWhatsAppMessage(inv);
        openWhatsApp(inv.clientPhone, msg);
        toast.info("📲 Abriendo WhatsApp. Adjunta el PDF antes de enviar.", { duration: 4000 });
    };

    const handleClone = (inv: Invoice) => {
        localStorage.setItem("invoiceToClone", JSON.stringify(inv));
        router.push("/nueva-factura");
    };

    const handleCreditNote = (inv: Invoice) => {
        setCreditNoteInvoice(inv);
        setShowCreditNote(true);
        onRequestCreditNote?.(inv);
    };

    const handleCreditNoteSuccess = () => {
        setShowCreditNote(false);
        setCreditNoteInvoice(null);
        onRefresh();
        toast.success("Nota de crédito aplicada correctamente.");
    };

    const handleRegisterPayment = (inv: Invoice) => {
        toast.info("Registrar pago: próximamente podrás registrar cobros desde aquí.");
    };

    const isEmpty = invoices.length === 0;
    const hasFilters = quickFilter !== "all" || !!searchQuery.trim();
    const emptyFiltered = !isEmpty && filteredInvoices.length === 0;

    return (
        <>
            <div className="relative mt-6 space-y-6">
                {/* Tarjetas Resumen Financiero */}
                {!isEmpty && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="border-border/20 shadow-sm overflow-hidden">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Facturado este mes</p>
                                        <p className="text-xl font-bold text-foreground mt-1">{formatCurrency(stats.facturadoMes)}</p>
                                    </div>
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                        <DollarSign className="w-5 h-5 text-primary" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-border/20 shadow-sm overflow-hidden">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Cobrado</p>
                                        <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{formatCurrency(stats.cobrado)}</p>
                                    </div>
                                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                        <ArrowDownLeft className="w-5 h-5 text-emerald-600" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-border/20 shadow-sm overflow-hidden">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pendiente</p>
                                        <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">{formatCurrency(stats.pendiente)}</p>
                                    </div>
                                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                                        <Clock className="w-5 h-5 text-amber-600" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-border/20 shadow-sm overflow-hidden">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Vencido</p>
                                        <p className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-1">{formatCurrency(stats.vencido)}</p>
                                    </div>
                                    <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
                                        <AlertTriangle className="w-5 h-5 text-rose-600" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Alertas Inteligentes */}
                {alerts.length > 0 && (
                    <div className="space-y-2">
                        {alerts.map((msg, i) => (
                            <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-200 text-sm">
                                <AlertCircle className="w-5 h-5 shrink-0" />
                                <span>{msg}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Card Principal */}
                <Card className="border-none shadow-xl shadow-accent/5 rounded-2xl overflow-hidden">
                    <CardHeader className="border-b border-border/10 bg-muted/30 px-4 sm:px-6 py-4">
                        <div className="flex flex-col gap-4">
                            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
                                <div>
                                    <CardTitle className="text-lg md:text-xl font-bold">Centro de Control — Facturas</CardTitle>
                                    <CardDescription>Gestiona toda tu facturación desde una sola pantalla</CardDescription>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Button variant="outline" size="sm" onClick={() => router.push("/reportes")} className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-900 dark:hover:bg-emerald-950/30">
                                        <Download className="w-4 h-4 mr-2" />
                                        Reportes 606/607
                                    </Button>
                                </div>
                            </div>

                            {/* Filtros rápidos + Búsqueda */}
                            <div className="flex flex-col sm:flex-row gap-3">
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        { id: "all", label: "Todas" },
                                        { id: "hoy", label: "Hoy" },
                                        { id: "mes", label: "Este mes" },
                                        { id: "vencidas", label: "Vencidas" },
                                        { id: "pendientes", label: "Pendientes" },
                                        { id: "pagadas", label: "Pagadas" },
                                        { id: "balance", label: "Con balance" },
                                    ].map((f) => (
                                        <button
                                            key={f.id}
                                            onClick={() => setQuickFilter(f.id)}
                                            className={cn(
                                                "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                                                quickFilter === f.id
                                                    ? "bg-primary text-primary-foreground"
                                                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                                            )}
                                        >
                                            {f.label}
                                        </button>
                                    ))}
                                </div>
                                <div className="relative flex-1 min-w-[200px]">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Buscar por cliente, NCF o RNC..."
                                        value={searchQuery}
                                        onChange={(e) => {
                                            setSearchQuery(e.target.value);
                                            setPage(1);
                                        }}
                                        className="pl-9 h-9"
                                    />
                                </div>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="p-0">
                        {isLoading ? (
                            <div className="py-16 px-6 flex flex-col items-center gap-4">
                                <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                <p className="text-sm text-muted-foreground">Cargando facturas...</p>
                            </div>
                        ) : isEmpty ? (
                            /* Empty State — Bloque de Activación */
                            <div className="py-16 px-6 text-center">
                                <div className="max-w-md mx-auto space-y-6">
                                    <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                                        <FileText className="w-10 h-10 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-foreground mb-2">¿Creamos tu primera factura?</h3>
                                        <p className="text-muted-foreground text-sm mb-6">
                                            Las empresas que facturan en las primeras 24 horas tienen mayor organización financiera.
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4 mb-8 text-left">
                                        <div className="p-4 rounded-xl bg-muted/30 border border-border/20">
                                            <span className="text-2xl font-black text-primary">1</span>
                                            <p className="text-sm font-medium mt-1">Crea tu cliente</p>
                                            <p className="text-xs text-muted-foreground">Agrega datos fiscales</p>
                                        </div>
                                        <div className="p-4 rounded-xl bg-muted/30 border border-border/20">
                                            <span className="text-2xl font-black text-primary">2</span>
                                            <p className="text-sm font-medium mt-1">Emite la factura</p>
                                            <p className="text-xs text-muted-foreground">En menos de 15 segundos</p>
                                        </div>
                                        <div className="p-4 rounded-xl bg-muted/30 border border-border/20">
                                            <span className="text-2xl font-black text-primary">3</span>
                                            <p className="text-sm font-medium mt-1">Recibe el pago</p>
                                            <p className="text-xs text-muted-foreground">Gestiona cobros fácil</p>
                                        </div>
                                    </div>
                                    <Link href="/nueva-factura">
                                        <Button size="lg" className="gap-2 h-12 px-8 text-base font-semibold">
                                            <Plus className="w-5 h-5" /> Crear mi primera factura
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        ) : emptyFiltered ? (
                            <div className="py-16 text-center">
                                <Filter className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                                <p className="font-medium text-foreground">No hay facturas con este filtro.</p>
                                <p className="text-sm text-muted-foreground mt-1">Cambia los filtros o crea una nueva.</p>
                                <Button variant="outline" className="mt-4" onClick={() => { setQuickFilter("all"); setSearchQuery(""); }}>
                                    Limpiar filtros
                                </Button>
                            </div>
                        ) : (
                            <>
                                <div className="hidden md:block overflow-x-auto">
                                    <Table>
                                        <TableHeader className="bg-muted/30">
                                            <TableRow className="border-border/10">
                                                <TableHead className="font-semibold text-muted-foreground">Nº Factura</TableHead>
                                                <TableHead className="font-semibold text-muted-foreground">Cliente</TableHead>
                                                <TableHead className="font-semibold text-muted-foreground">Fecha</TableHead>
                                                <TableHead className="font-semibold text-muted-foreground text-right">Monto</TableHead>
                                                <TableHead className="font-semibold text-muted-foreground text-right">Balance</TableHead>
                                                <TableHead className="font-semibold text-muted-foreground">Estado</TableHead>
                                                <TableHead className="font-semibold text-muted-foreground">Tipo pago</TableHead>
                                                <TableHead className="font-semibold text-muted-foreground text-right w-[180px]">Acciones</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {paginatedInvoices.map((inv) => {
                                                const status = getInvoiceStatus(inv);
                                                const bal = inv.balancePendiente ?? (status !== "pagada" ? inv.total : 0);
                                                const isHovered = hoveredRow === inv.id;
                                                return (
                                                    <TableRow
                                                        key={inv.id}
                                                        className={cn(
                                                            "border-border/10 transition-colors group",
                                                            isHovered && "bg-accent/5"
                                                        )}
                                                        onMouseEnter={() => setHoveredRow(inv.id)}
                                                        onMouseLeave={() => setHoveredRow(null)}
                                                    >
                                                        <TableCell className="font-mono text-sm">
                                                            {(inv.ncfSequence || inv.id).slice(-11)}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="font-medium">{inv.clientName}</div>
                                                            <div className="text-xs text-muted-foreground font-mono">{inv.rnc || inv.clientRnc}</div>
                                                        </TableCell>
                                                        <TableCell className="text-muted-foreground">
                                                            {new Date(inv.date).toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" })}
                                                        </TableCell>
                                                        <TableCell className="text-right font-semibold">{formatCurrency(inv.total)}</TableCell>
                                                        <TableCell className={cn("text-right", bal > 0 ? "font-medium text-amber-600" : "text-muted-foreground")}>
                                                            {formatCurrency(bal)}
                                                        </TableCell>
                                                        <TableCell>
                                                            <StatusDot status={status} />
                                                        </TableCell>
                                                        <TableCell className="text-muted-foreground text-sm">
                                                            {TIPO_PAGO_LABELS[inv.tipoPago || ""] || inv.tipoPago || "—"}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className={cn("flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity", isHovered && "opacity-100")}>
                                                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleView(inv)} title="Ver factura">
                                                                    <Eye className="w-4 h-4" />
                                                                </Button>
                                                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleDownloadPDF(inv)} title="Descargar PDF">
                                                                    <Download className="w-4 h-4" />
                                                                </Button>
                                                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleWhatsApp(inv)} title="Enviar por WhatsApp">
                                                                    <MessageCircle className="w-4 h-4" />
                                                                </Button>
                                                                {status !== "pagada" && (
                                                                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleRegisterPayment(inv)} title="Registrar pago">
                                                                        <DollarSign className="w-4 h-4" />
                                                                    </Button>
                                                                )}
                                                                {inv.status !== "cancelled" && (
                                                                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleCreditNote(inv)} title="Emitir nota de crédito">
                                                                        <FileText className="w-4 h-4" />
                                                                    </Button>
                                                                )}
                                                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleClone(inv)} title="Duplicar factura">
                                                                    <Repeat className="w-4 h-4" />
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>

                                {/* Mobile */}
                                <div className="md:hidden divide-y divide-border/10">
                                    {paginatedInvoices.map((inv) => {
                                        const status = getInvoiceStatus(inv);
                                        const bal = inv.balancePendiente ?? (status !== "pagada" ? inv.total : 0);
                                        return (
                                            <div
                                                key={inv.id}
                                                className="p-4 space-y-3 active:bg-muted/50"
                                                onClick={() => handleView(inv)}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <span className="text-xs font-mono text-muted-foreground">{(inv.ncfSequence || inv.id).slice(-11)}</span>
                                                        <h3 className="font-semibold">{inv.clientName}</h3>
                                                        <StatusDot status={status} />
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-bold text-lg">{formatCurrency(inv.total)}</p>
                                                        {bal > 0 && <p className="text-xs text-amber-600">Pendiente: {formatCurrency(bal)}</p>}
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    <Button size="sm" variant="outline" className="h-8" onClick={(e) => { e.stopPropagation(); handleView(inv); }}>
                                                        <Eye className="w-3.5 h-3.5 mr-1" /> Ver
                                                    </Button>
                                                    <Button size="sm" variant="outline" className="h-8" onClick={(e) => { e.stopPropagation(); handleDownloadPDF(inv); }}>
                                                        <Download className="w-3.5 h-3.5 mr-1" /> PDF
                                                    </Button>
                                                    <Button size="sm" variant="outline" className="h-8" onClick={(e) => { e.stopPropagation(); handleWhatsApp(inv); }}>
                                                        <MessageCircle className="w-3.5 h-3.5 mr-1" /> WhatsApp
                                                    </Button>
                                                    <Button size="sm" variant="outline" className="h-8" onClick={(e) => { e.stopPropagation(); handleClone(inv); }}>
                                                        <Repeat className="w-3.5 h-3.5 mr-1" /> Duplicar
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {totalPages > 1 && (
                                    <div className="flex items-center justify-between px-4 py-3 border-t border-border/10">
                                        <p className="text-sm text-muted-foreground">
                                            {filteredInvoices.length} factura{filteredInvoices.length !== 1 ? "s" : ""}
                                        </p>
                                        <div className="flex gap-2">
                                            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                                                Anterior
                                            </Button>
                                            <span className="flex items-center px-3 text-sm text-muted-foreground">
                                                {page} / {totalPages}
                                            </span>
                                            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                                                Siguiente
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            <DocumentViewer
                isOpen={isViewerOpen}
                onClose={() => { setIsViewerOpen(false); setSelectedInvoice(null); }}
                document={selectedInvoice ? { ...selectedInvoice, rnc: selectedInvoice.rnc ?? selectedInvoice.clientRnc ?? "" } : null}
                type="invoice"
                onDownloadPDF={() => handleDownloadPDF()}
                onSendWhatsApp={() => selectedInvoice && handleWhatsApp(selectedInvoice)}
                isGeneratingPDF={isGeneratingPDF}
            />

            <CreditNoteModal
                isOpen={showCreditNote}
                onClose={() => { setShowCreditNote(false); setCreditNoteInvoice(null); }}
                invoice={creditNoteInvoice}
                onSuccess={handleCreditNoteSuccess}
            />
        </>
    );
}
