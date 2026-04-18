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
    ChevronDown,
    ChevronUp,
    TrendingUp,
    Receipt, Ban,
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
import { api } from "@/lib/api-service";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface Invoice {
    id: string;
    _id?: string;
    clientName: string;
    rnc?: string;
    clientRnc?: string;
    ncfSequence?: string;
    ncf?: string;
    ncfType?: string;
    type: string;
    total: number;
    itbis?: number;
    subtotal?: number;
    isrRetention?: number;
    itbisRetention?: number;
    modifiedNcf?: string;
    date: string;
    status: string;
    annulledBy?: string;
    clientPhone?: string;
    balancePendiente?: number;
    estadoPago?: string;
    tipoPago?: string;
    montoPagado?: number;
    paymentDetails?: Array<{ method: string; amount: number }>;
    items?: Array<{ description: string; quantity: number; price: number; isExempt?: boolean }>;
}

interface InvoiceControlCenterProps {
    invoices: Invoice[];
    onRefresh: () => void;
    onRequestCreditNote?: (inv: Invoice) => void;
    isLoading?: boolean;
    externalStats?: { 
        monthlyRevenue: number; 
        totalRevenue: number;
        monthlyCollected: number; 
        totalPorCobrar: number;
        totalVencido?: number;
        invoiceCount?: number;
        revenueChange?: number;
    };
}

const TIPO_PAGO_LABELS: Record<string, string> = {
    efectivo: "Efectivo",
    transferencia: "Transferencia",
    tarjeta: "Tarjeta",
    credito: "Crédito",
    mixto: "Mixto",
    otro: "Otro",
};

const formatCurrency = (n: number | null | undefined) => {
    const val = (n === null || n === undefined || isNaN(n)) ? 0 : n;
    return new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
};

function getInvoiceStatus(inv: Invoice): "pagada" | "pendiente" | "vencida" | "acreditada" | "parcialmente_acreditada" {
    if (!inv) return "pendiente";
    if (inv.status === "fully_credited") return "acreditada";
    if (inv.status === "partially_credited") return "parcialmente_acreditada";
    
    const bal = inv.balancePendiente ?? (inv.estadoPago === "pendiente" || inv.estadoPago === "parcial" || inv.status === "pending" ? inv.total : 0);
    const isPaid = (bal || 0) <= 0 && inv.status !== "cancelled";
    if (isPaid) return "pagada";
    const daysSince = (Date.now() - new Date(inv.date).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince > 30) return "vencida";
    return "pendiente";
}

function StatusDot({ status }: { status: "pagada" | "pendiente" | "vencida" | "acreditada" | "parcialmente_acreditada" }) {
    const config = {
        pagada: { bg: "bg-emerald-500", ring: "ring-emerald-500/30", label: "Pagada" },
        pendiente: { bg: "bg-amber-500", ring: "ring-amber-500/30", label: "Pendiente" },
        vencida: { bg: "bg-rose-500", ring: "ring-rose-500/30", label: "Vencida" },
        acreditada: { bg: "bg-blue-500", ring: "ring-blue-500/30", label: "Saldada (NC)" },
        parcialmente_acreditada: { bg: "bg-indigo-400", ring: "ring-indigo-400/30", label: "Parcial (NC)" },
    }[status];
    return (
        <span className={cn("inline-flex items-center gap-1.5")}>
            <span className={cn("w-2 h-2 rounded-full", config.bg, "ring-2", config.ring)} />
            <span className="text-xs font-medium text-muted-foreground">{config.label}</span>
        </span>
    );
}

export function InvoiceControlCenter({ 
    invoices, 
    onRefresh, 
    onRequestCreditNote, 
    isLoading,
    externalStats 
}: InvoiceControlCenterProps) {
    const router = useRouter();
    const [quickFilter, setQuickFilter] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [isViewerOpen, setIsViewerOpen] = useState(false);
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const [showCreditNote, setShowCreditNote] = useState(false);
    const [creditNoteInvoice, setCreditNoteInvoice] = useState<Invoice | null>(null);
    const [showPaymentDialog, setShowPaymentDialog] = useState(false);
    const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
    const [paymentAmount, setPaymentAmount] = useState("");
    const [paymentMethod, setPaymentMethod] = useState<"efectivo" | "transferencia" | "tarjeta" | "otro">("transferencia");
    const [paymentNote, setPaymentNote] = useState("");
    const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
    const [hoveredRow, setHoveredRow] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const pageSize = 15;
    const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [amountMin, setAmountMin] = useState("");
    const [amountMax, setAmountMax] = useState("");
    const [filterTipoPago, setFilterTipoPago] = useState<string>("");
    const [showAnnulDialog, setShowAnnulDialog] = useState(false);
    const [annulInvoice, setAnnulInvoice] = useState<Invoice | null>(null);
    const [annulReason, setAnnulReason] = useState("05"); // DGII: 01:Deterioro, 02:Errores Impresión, 03:Impresión Defectuosa, 04:Duplicidad, 05:Otros
    const [isAnnulling, setIsAnnulling] = useState(false);

    const now = useMemo(() => new Date(), []);
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const stats = useMemo(() => {
        const s = { 
            facturadoMes: externalStats?.monthlyRevenue ?? 0, 
            cobrado: externalStats?.monthlyCollected ?? 0, 
            pendiente: externalStats?.totalPorCobrar ?? 0, 
            vencido: 0, 
            vencidasCount: 0, 
            pctChange: externalStats?.revenueChange ?? 0, 
            monthInvs: [] as Invoice[] 
        };
        
        if (!invoices || !Array.isArray(invoices)) return s;

        const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

        let prevFacturado = 0;

        invoices.forEach(inv => {
            if (!inv) return;
            const invDate = new Date(inv.date);
            const isThisMonth = invDate.getMonth() === currentMonth && invDate.getFullYear() === currentYear;
            const isPrevMonth = invDate.getMonth() === prevMonth && invDate.getFullYear() === prevYear;

            if (isThisMonth) {
                if (!externalStats) {
                    const amount = (inv.subtotal || 0);
                    const isCreditNote = inv.ncfType === '04' || inv.ncfType === '34';
                    s.facturadoMes += isCreditNote ? -amount : amount;
                }
                s.monthInvs.push(inv);
            }
            if (isPrevMonth && !externalStats) {
                const amount = (inv.subtotal || 0);
                const isCreditNote = inv.ncfType === '04' || inv.ncfType === '34';
                prevFacturado += isCreditNote ? -amount : amount;
            }

            const status = getInvoiceStatus(inv);
            const bal = inv.balancePendiente ?? (inv.estadoPago === "pendiente" || inv.estadoPago === "parcial" || inv.status === "pending" ? inv.total : 0);
            const valBal = (isNaN(bal) || bal === null) ? 0 : bal;

            // Si no hay stats externos, calculamos basados en la lista (parcial)
            if (!externalStats) {
                const paid = inv.montoPagado || 0;
                const isCreditNote = inv.ncfType === '04' || inv.ncfType === '34';
                s.cobrado += isCreditNote ? -paid : paid;
            }

            if (status !== "pagada") {
                if (!externalStats) s.pendiente += valBal;
                if (status === "vencida") {
                    s.vencido += valBal;
                    s.vencidasCount++;
                }
            }
        });

        if (!externalStats) {
            s.pctChange = prevFacturado > 0 ? ((s.facturadoMes - prevFacturado) / prevFacturado) * 100 : 0;
        }
        return s;
    }, [invoices, currentMonth, currentYear, externalStats]);

    // --- GAMIFICATION & TOP CLIENTS LOGIC ---
    const topClients = useMemo(() => {
        const clients: Record<string, {name: string, total: number}> = {};
        invoices.forEach(inv => {
            const rnc = inv.rnc || inv.clientRnc || inv.clientName || 'default';
            if (!clients[rnc]) {
                 clients[rnc] = { name: inv.clientName, total: 0 };
            }
            clients[rnc].total += inv.total || 0;
        });
        return Object.values(clients).sort((a,b) => b.total - a.total).slice(0,3);
    }, [invoices]);

    const [monthlyGoalStr, setMonthlyGoalStr] = useState<string>("500000");
    const [isEditingGoal, setIsEditingGoal] = useState(false);

    // Initial load for goal from local storage
    useMemo(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem("dashboard_monthlyGoal");
            if (saved) setMonthlyGoalStr(saved);
        }
    }, []);

    const monthlyGoal = Number(monthlyGoalStr) || 1; // Prevent division by zero
    const revTotal = externalStats?.totalRevenue || stats.facturadoMes;
    const progressPct = Math.min(100, Math.max(0, (revTotal / monthlyGoal) * 100));

    const handleSaveGoal = () => {
        localStorage.setItem("dashboard_monthlyGoal", monthlyGoalStr);
        setIsEditingGoal(false);
        toast.success("Meta mensual actualizada 🎉");
    };
    // ----------------------------------------

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
        else if (quickFilter === "notas_credito") {
            list = list.filter((i) => 
                i.ncfType === '04' || 
                i.ncfType === '34' || 
                (i.ncf || i.ncfSequence || "").startsWith("B04") || 
                (i.ncf || i.ncfSequence || "").startsWith("E34")
            );
        }

        if (searchQuery.trim()) {
            const normalize = (s: string) => 
                (s || "").toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
            
            const terms = normalize(searchQuery).split(/\s+/).filter(Boolean);
            list = list.filter(inv => {
                const searchableFields = [
                    inv.clientName,
                    inv.ncf,
                    inv.ncfSequence,
                    inv.rnc,
                    inv.clientRnc,
                    inv.id,
                    inv._id
                ].map(val => normalize(val?.toString() || ""));

                // Cada término buscado debe estar en alguno de los campos
                return terms.every(term => 
                    searchableFields.some(field => field.includes(term))
                );
            });
        }
        if (dateFrom) {
            const from = new Date(dateFrom).getTime();
            list = list.filter((i) => new Date(i.date).getTime() >= from);
        }
        if (dateTo) {
            const to = new Date(dateTo + "T23:59:59").getTime();
            list = list.filter((i) => new Date(i.date).getTime() <= to);
        }
        const min = parseFloat(amountMin);
        if (!isNaN(min) && min > 0) list = list.filter((i) => (i.total || 0) >= min);
        const max = parseFloat(amountMax);
        if (!isNaN(max) && max > 0) list = list.filter((i) => (i.total || 0) <= max);
        if (filterTipoPago) list = list.filter((i) => (i.tipoPago || "").toLowerCase() === filterTipoPago.toLowerCase());
        return list;
    }, [invoices, quickFilter, searchQuery, dateFrom, dateTo, amountMin, amountMax, filterTipoPago, now, currentMonth, currentYear]);

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

    const handleAnnulClick = (inv: Invoice) => {
        setAnnulInvoice(inv);
        setAnnulReason("05");
        setShowAnnulDialog(true);
    };

    const submitAnnul = async () => {
        if (!annulInvoice) return;
        const invoiceId = annulInvoice._id || annulInvoice.id;
        if (!invoiceId) return;
        
        setIsAnnulling(true);
        try {
            await api.annulInvoice(invoiceId, annulReason);
            toast.success("Factura anulada correctamente (Reporte 608)");
            setShowAnnulDialog(false);
            setAnnulInvoice(null);
            onRefresh();
        } catch (e: any) {
            toast.error(e?.message || "No se pudo anular la factura.");
        } finally {
            setIsAnnulling(false);
        }
    };

    const handleDownloadPDF = async (inv?: Invoice) => {
        const invoice = inv || selectedInvoice;
        if (!invoice) return;
        setIsGeneratingPDF(true);
        toast.info("📄 Generando comprobante...");
        try {
            const data: InvoiceData = {
                id: invoice._id || invoice.id,
                sequenceNumber: invoice.ncf || invoice.ncfSequence || invoice._id || invoice.id,
                type: invoice.ncfType || invoice.type || "32",
                clientName: invoice.clientName,
                rnc: invoice.rnc || invoice.clientRnc || "",
                date: invoice.date,
                items: invoice.items || [],
                subtotal: invoice.subtotal ?? (invoice.total - (invoice.itbis || 0)),
                itbis: invoice.itbis || 0,
                isrRetention: invoice.isrRetention || 0,
                itbisRetention: invoice.itbisRetention || 0,
                total: invoice.total,
                paymentMethod: invoice.tipoPago,
                paymentDetails: invoice.paymentDetails,
                balancePendiente: invoice.balancePendiente,
                modifiedNcf: invoice.modifiedNcf,
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

    const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

    const handleDuplicate = async (inv: Invoice) => {
        const id = inv._id || inv.id;
        if (!id || duplicatingId) return;
        setDuplicatingId(id);
        try {
            const res = await api.duplicateInvoice(id);
            router.push(`/nueva-factura?from=${encodeURIComponent(res.fromInvoiceId)}&fromNcf=${encodeURIComponent(res.fromInvoiceNcf || "")}`);
        } catch (e: any) {
            toast.error(e?.message || "No se pudo crear el borrador.");
        } finally {
            setDuplicatingId(null);
        }
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
        const status = getInvoiceStatus(inv);
        const balance = Math.max(0, inv.balancePendiente ?? (status !== "pagada" ? inv.total : 0));
        if (balance <= 0) {
            toast.info("Esta factura ya está saldada.");
            return;
        }
        setPaymentInvoice(inv);
        setPaymentAmount(balance.toFixed(2));
        setPaymentMethod("transferencia");
        setPaymentNote("");
        setShowPaymentDialog(true);
    };

    const submitRegisterPayment = async () => {
        if (!paymentInvoice) return;
        const invoiceId = paymentInvoice._id || paymentInvoice.id;
        const amount = Number(paymentAmount);
        if (!invoiceId || !Number.isFinite(amount) || amount <= 0) {
            toast.error("Indica un monto de pago válido.");
            return;
        }
        setIsSubmittingPayment(true);
        try {
            const res = await api.registerInvoicePayment(invoiceId, {
                amount,
                paymentMethod,
                note: paymentNote.trim() || undefined
            });
            toast.success(res.message || "Pago registrado correctamente.");
            setShowPaymentDialog(false);
            setPaymentInvoice(null);
            onRefresh();
        } catch (e: any) {
            toast.error(e?.message || "No se pudo registrar el pago.");
        } finally {
            setIsSubmittingPayment(false);
        }
    };

    const isEmpty = invoices.length === 0;
    const hasFilters = quickFilter !== "all" || !!searchQuery.trim();
    const emptyFiltered = !isEmpty && filteredInvoices.length === 0;

    return (
        <>
            <div className="relative mt-6 space-y-6">
                
                {/* GAMIFICATION & TOP 3 SECTION */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                    {/* Meta Mensual */}
                    <Card className="col-span-1 lg:col-span-2 bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/20 dark:to-background border-indigo-100 dark:border-indigo-900/50 shadow-sm relative overflow-hidden">
                        <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
                        <CardContent className="p-6">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
                                <div>
                                    <h3 className="font-bold text-lg text-indigo-900 dark:text-indigo-300">Meta del Mes</h3>
                                    <p className="text-sm text-indigo-700/70 dark:text-indigo-400/70">Progreso de facturación vs tu objetivo</p>
                                </div>
                                <div className="text-right flex items-center gap-2">
                                    {isEditingGoal ? (
                                        <div className="flex gap-2 items-center">
                                            <Input 
                                                type="number" 
                                                value={monthlyGoalStr}
                                                onChange={(e) => setMonthlyGoalStr(e.target.value)}
                                                className="w-32 h-8 text-sm"
                                            />
                                            <Button size="sm" onClick={handleSaveGoal} className="h-8">Guardar</Button>
                                        </div>
                                    ) : (
                                        <div 
                                            className="font-mono text-xl font-bold cursor-pointer hover:text-indigo-600 transition-colors"
                                            onClick={() => setIsEditingGoal(true)}
                                            title="Clic para editar meta"
                                        >
                                            {formatCurrency(revTotal)} <span className="text-muted-foreground font-normal text-sm">/ {formatCurrency(monthlyGoal)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="relative h-4 bg-indigo-100 dark:bg-indigo-950/50 rounded-full overflow-hidden">
                                <div 
                                    className={cn(
                                        "absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-1000 ease-out",
                                        progressPct >= 100 && "from-emerald-400 to-emerald-600"
                                    )}
                                    style={{ width: `${progressPct}%` }}
                                />
                            </div>
                            <div className="flex justify-between items-center mt-2">
                                <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                                    {progressPct >= 100 ? "¡Meta alcanzada! 🎉" : "Sigue así"}
                                </span>
                                <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                                    {progressPct.toFixed(1)}%
                                </span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Top 3 Clientes */}
                    <Card className="col-span-1 shadow-sm border-border/50">
                        <CardHeader className="py-4 px-5 border-b border-border/10">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                🌟 Top 3 Clientes Estrella
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {topClients.length > 0 ? (
                                <div className="divide-y divide-border/10">
                                    {topClients.map((client, idx) => (
                                        <div key={idx} className="flex justify-between items-center px-5 py-3 hover:bg-muted/30 transition-colors">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                                                    {idx + 1}
                                                </div>
                                                <span className="text-sm font-medium truncate">{client.name}</span>
                                            </div>
                                            <span className="text-sm font-semibold shrink-0 ml-2">{formatCurrency(client.total)}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-5 text-center text-sm text-muted-foreground">
                                    No hay datos suficientes aún.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {externalStats && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card 
                            className={`bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-background border-emerald-100 dark:border-emerald-900/50 cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all duration-200 ${quickFilter === 'mes' ? 'ring-2 ring-emerald-500 ring-offset-2' : ''}`}
                            onClick={() => setQuickFilter(quickFilter === 'mes' ? 'all' : 'mes')}
                        >
                            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
                                <CardTitle className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Total Facturado</CardTitle>
                                <TrendingUp className="h-4 w-4 text-emerald-500" />
                            </CardHeader>
                            <CardContent className="py-0 px-4 pb-4">
                                <div className="text-xl font-bold">{formatCurrency(externalStats.totalRevenue)}</div>
                                <p className="text-[10px] text-muted-foreground mt-1">Total con impuestos este mes</p>
                            </CardContent>
                        </Card>
                        <Card 
                            className={`bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-background border-blue-100 dark:border-blue-900/50 cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all duration-200 ${quickFilter === 'pagadas' ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
                            onClick={() => setQuickFilter(quickFilter === 'pagadas' ? 'all' : 'pagadas')}
                        >
                            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
                                <CardTitle className="text-xs font-medium text-blue-600 dark:text-blue-400">Cobrado este Mes</CardTitle>
                                <DollarSign className="h-4 w-4 text-blue-500" />
                            </CardHeader>
                            <CardContent className="py-0 px-4 pb-4">
                                <div className="text-xl font-bold">{formatCurrency(externalStats.monthlyCollected)}</div>
                                <p className="text-[10px] text-muted-foreground mt-1">Ingresos reales recibidos</p>
                            </CardContent>
                        </Card>
                        <Card 
                            className={`bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/20 dark:to-background border-amber-100 dark:border-amber-900/50 cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all duration-200 ${quickFilter === 'balance' ? 'ring-2 ring-amber-500 ring-offset-2' : ''}`}
                            onClick={() => setQuickFilter(quickFilter === 'balance' ? 'all' : 'balance')}
                        >
                            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
                                <CardTitle className="text-xs font-medium text-amber-600 dark:text-amber-400">Pendiente de Cobro</CardTitle>
                                <Clock className="h-4 w-4 text-amber-500" />
                            </CardHeader>
                            <CardContent className="py-0 px-4 pb-4">
                                <div className="text-xl font-bold">{formatCurrency(externalStats.totalPorCobrar)}</div>
                                <p className="text-[10px] text-muted-foreground mt-1">Montos por saldar</p>
                            </CardContent>
                        </Card>
                        <Card 
                            className={`bg-gradient-to-br from-red-50 to-white dark:from-red-950/20 dark:to-background border-red-100 dark:border-red-900/50 cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all duration-200 ${quickFilter === 'vencidas' ? 'ring-2 ring-red-500 ring-offset-2' : ''}`}
                            onClick={() => setQuickFilter(quickFilter === 'vencidas' ? 'all' : 'vencidas')}
                        >
                            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
                                <CardTitle className="text-xs font-medium text-red-600 dark:text-red-400">Vencido / Atrasado</CardTitle>
                                <AlertCircle className="h-4 w-4 text-red-500" />
                            </CardHeader>
                            <CardContent className="py-0 px-4 pb-4">
                                <div className="text-xl font-bold">{formatCurrency(externalStats.totalVencido || 0)}</div>
                                <p className="text-[10px] text-muted-foreground mt-1">Requieren atención inmediata</p>
                            </CardContent>
                        </Card>
                        <Card 
                            className={`bg-stone-50/50 dark:bg-stone-900/20 border-stone-100 dark:border-stone-800/50 cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all duration-200 ${quickFilter === 'all' ? 'ring-2 ring-stone-400 ring-offset-2' : ''}`}
                            onClick={() => setQuickFilter('all')}
                        >
                            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
                                <CardTitle className="text-xs font-medium text-stone-600 dark:text-stone-400">Total Facturas</CardTitle>
                                <Receipt className="h-4 w-4 text-stone-500" />
                            </CardHeader>
                            <CardContent className="py-0 px-4 pb-4">
                                <div className="text-xl font-bold">{externalStats.invoiceCount || invoices.length}</div>
                                <p className="text-[10px] text-muted-foreground mt-1">Este período fiscal</p>
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
                                        { id: "notas_credito", label: "Notas de Crédito" },
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
                                <button
                                    type="button"
                                    onClick={() => setShowAdvancedFilter(!showAdvancedFilter)}
                                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <Filter className="w-4 h-4" />
                                    Filtro avanzado
                                    {showAdvancedFilter ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>
                            </div>
                            {showAdvancedFilter && (
                                <div className="mt-4 p-4 rounded-xl border border-border/20 bg-muted/20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div>
                                        <label className="text-xs font-medium text-muted-foreground block mb-1">Desde</label>
                                        <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="h-9" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-muted-foreground block mb-1">Hasta</label>
                                        <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="h-9" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-muted-foreground block mb-1">Monto mín. (RD$)</label>
                                        <Input type="number" placeholder="0" value={amountMin} onChange={(e) => { setAmountMin(e.target.value); setPage(1); }} className="h-9" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-muted-foreground block mb-1">Monto máx. (RD$)</label>
                                        <Input type="number" placeholder="Sin límite" value={amountMax} onChange={(e) => { setAmountMax(e.target.value); setPage(1); }} className="h-9" />
                                    </div>
                                    <div className="sm:col-span-2 lg:col-span-1">
                                        <label className="text-xs font-medium text-muted-foreground block mb-1">Método de pago</label>
                                        <select
                                            value={filterTipoPago}
                                            onChange={(e) => { setFilterTipoPago(e.target.value); setPage(1); }}
                                            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                                            aria-label="Filtrar por método de pago"
                                        >
                                            <option value="">Todos</option>
                                            {Object.entries(TIPO_PAGO_LABELS).map(([k, v]) => (
                                                <option key={k} value={k}>{v}</option>
                                            ))}
                                        </select>
                                    </div>
                                    {(dateFrom || dateTo || amountMin || amountMax || filterTipoPago) && (
                                        <div className="sm:col-span-2 lg:col-span-1 flex items-end">
                                            <Button variant="ghost" size="sm" onClick={() => { setDateFrom(""); setDateTo(""); setAmountMin(""); setAmountMax(""); setFilterTipoPago(""); setPage(1); }}>
                                                Limpiar filtros avanzados
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}
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
                                                const invId = inv._id || inv.id;
                                                if (!inv || !invId) return null; // Defensive check for invoice and its ID
                                                const status = getInvoiceStatus(inv);
                                                const bal = inv.balancePendiente ?? (status !== "pagada" ? inv.total : 0);
                                                const isHovered = hoveredRow === invId;
                                                return (
                                                    <TableRow
                                                        key={invId}
                                                        className={cn(
                                                            "border-border/10 transition-colors group",
                                                            isHovered && "bg-accent/5"
                                                        )}
                                                        onMouseEnter={() => setHoveredRow(invId)}
                                                        onMouseLeave={() => setHoveredRow(null)}
                                                    >
                                                        <TableCell className="font-mono text-sm relative">
                                                            {(inv.ncf || inv.ncfSequence) ? (inv.ncf || inv.ncfSequence) : invId.slice(-11)}
                                                            {(inv.ncfType === '04' || inv.ncfType === '34' || (inv.ncf || "").startsWith("B04") || (inv.ncf || "").startsWith("E34")) && (
                                                                <span className="ml-1.5 px-1 py-0.5 rounded bg-blue-100 text-blue-700 text-[9px] font-bold uppercase tracking-tight">NC</span>
                                                            )}
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
                                                                {inv.status !== "cancelled" && 
                                                                  inv.status !== "fully_credited" && 
                                                                  !inv.annulledBy && 
                                                                  inv.ncfType !== '04' && 
                                                                  inv.ncfType !== '34' && (
                                                                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleCreditNote(inv)} title="Emitir nota de crédito">
                                                                        <FileText className="w-4 h-4" />
                                                                    </Button>
                                                                 )}
                                                                {inv.status !== "cancelled" && !inv.annulledBy && (
                                                                     <>
                                                                         <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50" onClick={() => handleAnnulClick(inv)} title="Anular por Error (Reporte 608)">
                                                                             <Ban className="w-4 h-4" />
                                                                         </Button>
                                                                         <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleDuplicate(inv)} title="Facturar de nuevo" disabled={!!duplicatingId}>
                                                                             <Repeat className="w-4 h-4" />
                                                                         </Button>
                                                                     </>
                                                                 )}
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
                                        const invId = inv._id || inv.id;
                                        if (!inv || !invId) return null; // Defensive check for invoice and its ID
                                        const status = getInvoiceStatus(inv);
                                        const bal = inv.balancePendiente ?? (inv.estadoPago === "pendiente" || inv.estadoPago === "parcial" || inv.status === "pending" ? inv.total : 0);
                                        return (
                                            <div
                                                key={invId}
                                                className="p-3 sm:p-4 space-y-2 sm:space-y-3 active:bg-muted/50 cursor-pointer"
                                                onClick={() => handleView(inv)}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <span className="text-xs font-mono text-muted-foreground">{(inv.ncf || inv.ncfSequence) ? (inv.ncf || inv.ncfSequence) : invId.slice(-11)}</span>
                                                        <h3 className="font-semibold">{inv.clientName}</h3>
                                                        <StatusDot status={status} />
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-black text-base sm:text-lg">{formatCurrency(inv.total)}</p>
                                                        {bal > 0 && <p className="text-[10px] sm:text-xs text-amber-600 font-medium">Pendiente: {formatCurrency(bal)}</p>}
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    <Button size="sm" variant="outline" className="h-8 border-primary/20 text-primary hover:bg-primary/5" onClick={(e) => { e.stopPropagation(); handleView(inv); }}>
                                                        <Eye className="w-3.5 h-3.5 mr-1" /> Ver
                                                    </Button>
                                                    <Button size="sm" variant="outline" className="h-8" onClick={(e) => { e.stopPropagation(); handleDownloadPDF(inv); }}>
                                                        <Download className="w-3.5 h-3.5 mr-1" /> PDF
                                                    </Button>
                                                    
                                                    {/* Botón de Acciones para Móvil */}
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button 
                                                                size="sm" 
                                                                variant="secondary" 
                                                                className="h-8 gap-1 shadow-sm"
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                }}
                                                            >
                                                                <Plus className="w-3.5 h-3.5" /> <span className="text-[11px] font-bold uppercase tracking-tight">Acciones</span>
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-56">
                                                            <DropdownMenuLabel>Gestión de Factura</DropdownMenuLabel>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleWhatsApp(inv); }}>
                                                                <MessageCircle className="w-4 h-4 mr-2 text-emerald-500" /> Enviar por WhatsApp
                                                            </DropdownMenuItem>
                                                            
                                                            {status !== "pagada" && (
                                                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleRegisterPayment(inv); }}>
                                                                    <DollarSign className="w-4 h-4 mr-2 text-blue-500" /> Registrar pago
                                                                </DropdownMenuItem>
                                                            )}
                                                            
                                                            {inv.status !== "cancelled" && 
                                                             inv.status !== "fully_credited" && 
                                                             !inv.annulledBy && 
                                                             inv.ncfType !== '04' && 
                                                             inv.ncfType !== '34' && (
                                                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleCreditNote(inv); }}>
                                                                    <FileText className="w-4 h-4 mr-2 text-indigo-500" /> Emitir Nota de Crédito
                                                                </DropdownMenuItem>
                                                            )}
                                                            
                                                            <DropdownMenuItem 
                                                                onClick={(e) => { 
                                                                    if (!!duplicatingId) return;
                                                                    e.stopPropagation(); 
                                                                    handleDuplicate(inv); 
                                                                }} 
                                                                className={cn(!!duplicatingId && "opacity-50 pointer-events-none")}
                                                            >
                                                                <Repeat className="w-4 h-4 mr-2 text-amber-500" /> Facturar de nuevo
                                                            </DropdownMenuItem>
                                                            
                                                            {inv.status !== "cancelled" && !inv.annulledBy && (
                                                                <>
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem 
                                                                        className="text-rose-600 focus:text-rose-600 focus:bg-rose-50" 
                                                                        onClick={(e) => { e.stopPropagation(); handleAnnulClick(inv); }}
                                                                    >
                                                                        <Ban className="w-4 h-4 mr-2" /> Anulación 608 (Error)
                                                                    </DropdownMenuItem>
                                                                </>
                                                            )}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
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

            <Dialog
                open={showPaymentDialog}
                onOpenChange={(open) => {
                    setShowPaymentDialog(open);
                    if (!open) setPaymentInvoice(null);
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Registrar pago</DialogTitle>
                        <DialogDescription>
                            {paymentInvoice ? `Factura ${(paymentInvoice.ncfSequence || paymentInvoice._id || paymentInvoice.id || "").slice(-11)} - ${paymentInvoice.clientName}` : "Registra un abono o pago total."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium">Monto (RD$)</label>
                            <Input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={paymentAmount}
                                onChange={(e) => setPaymentAmount(e.target.value)}
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Método de pago</label>
                            <select
                                value={paymentMethod}
                                onChange={(e) => setPaymentMethod(e.target.value as "efectivo" | "transferencia" | "tarjeta" | "otro")}
                                className="h-10 mt-1 w-full rounded-md border border-input bg-background px-3 text-sm"
                                aria-label="Método de pago"
                            >
                                <option value="transferencia">Transferencia</option>
                                <option value="efectivo">Efectivo</option>
                                <option value="tarjeta">Tarjeta</option>
                                <option value="otro">Otro</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium">Nota (opcional)</label>
                            <Textarea
                                value={paymentNote}
                                onChange={(e) => setPaymentNote(e.target.value)}
                                placeholder="Referencia de transferencia, banco, etc."
                                className="mt-1"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowPaymentDialog(false);
                                setPaymentInvoice(null);
                            }}
                        >
                            Cancelar
                        </Button>
                        <Button onClick={submitRegisterPayment} disabled={isSubmittingPayment}>
                            {isSubmittingPayment ? "Guardando..." : "Guardar pago"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={showAnnulDialog} onOpenChange={setShowAnnulDialog}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-rose-600">
                            <Ban className="w-5 h-5" /> Anular Factura
                        </DialogTitle>
                        <DialogDescription>
                            Esta acción anulará el NCF y lo reportará como anulado en el reporte 608 de la DGII. Esta acción no se puede deshacer.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Motivo de Anulación (DGII)</label>
                            <select 
                                value={annulReason} 
                                onChange={(e) => setAnnulReason(e.target.value)}
                                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                aria-label="Motivo de anulación"
                            >
                                <option value="01">01 - Deterioro de Factura</option>
                                <option value="02">02 - Errores de Impresión</option>
                                <option value="03">03 - Impresión Defectuosa</option>
                                <option value="04">04 - Duplicidad</option>
                                <option value="05">05 - Otros</option>
                            </select>
                        </div>

                        <div className="flex gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50">
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <p className="text-[11px] leading-tight text-amber-800 dark:text-amber-200">
                                <b>Advertencia Legal:</b> Usted es el responsable final de la veracidad y legalidad de esta anulación ante la DGII. Trinalyze actúa únicamente como herramienta de procesamiento delegado.
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAnnulDialog(false)}>Cancelar</Button>
                        <Button variant="destructive" onClick={submitAnnul} disabled={isAnnulling}>
                            {isAnnulling ? "Anulando..." : "Confirmar Anulación"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* FAB móvil lo maneja el layout global para evitar duplicados */}
        </>
    );
}

