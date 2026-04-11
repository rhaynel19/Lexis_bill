"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    FileText,
    Download,
    Calendar,
    Info,
    CheckCircle2,
    TrendingUp,
    PieChart,
    ArrowUpRight,
    Loader2,
    DollarSign,
    Calculator,
    Ban
} from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api-service";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { FiscalDisclaimerModal } from "@/components/FiscalDisclaimerModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DocumentViewer, Invoice as ViewerInvoice } from "@/components/DocumentViewer";
import { downloadInvoicePDF } from "@/lib/pdf-generator";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useAuth } from "@/components/providers/AuthContext";

export default function ReportsPage() {
    const { user: authUser } = useAuth();
    const [summary, setSummary] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [disclaimerOpen, setDisclaimerOpen] = useState(false);
    const [reportToDownload, setReportToDownload] = useState<"606" | "607" | "608" | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [itbisSummaryOpen, setItbisSummaryOpen] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    
    // Interactive document viewing
    const [selectedInvoice, setSelectedInvoice] = useState<ViewerInvoice | null>(null);
    const [isViewerOpen, setIsViewerOpen] = useState(false);
    const [selectedExpense, setSelectedExpense] = useState<any | null>(null);
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    
    // Accountant Share
    const [accountantEmail, setAccountantEmail] = useState("");
    const [accountantModalOpen, setAccountantModalOpen] = useState(false);
    const [isSendingToAccountant, setIsSendingToAccountant] = useState(false);

    useEffect(() => {
        if (authUser?.email) {
            // Predeterminar el correo guardado o el del usuario si no hay otro
            const saved = localStorage.getItem(`accountant_email_${authUser.id}`);
            if (saved) setAccountantEmail(saved);
        }
    }, [authUser]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("es-DO", {
            style: "currency",
            currency: "DOP",
        }).format(amount);
    };

    const months = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    useEffect(() => {
        loadSummary();
    }, [selectedMonth, selectedYear]);

    // Recordatorio 606/607 por email al entrar (máx. 1 por periodo)
    useEffect(() => {
        api.sendReportReminder().then((r) => {
            if (r.sent) toast.info("Te enviamos un recordatorio por email para presentar tus reportes 606/607.");
        }).catch(() => {});
    }, []);

    const loadSummary = async () => {
        setIsLoading(true);
        setLoadError(null);
        try {
            const data = await api.getTaxSummary(selectedMonth, selectedYear);
            setSummary(data);
        } catch (error: any) {
            const msg = error?.message || "Error de conexión";
            setLoadError(msg);
            toast.error("No pudimos cargar el resumen. Revisa tu conexión e intenta de nuevo.");
        } finally {
            setIsLoading(false);
        }
    };

    const doDownload607 = async () => {
        const blob = await api.downloadReport607(selectedMonth, selectedYear);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `0607_${selectedYear}${selectedMonth.toString().padStart(2, "0")}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const doDownload606 = async () => {
        const blob = await api.downloadReport606(selectedMonth, selectedYear);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `606_${selectedYear}${selectedMonth.toString().padStart(2, "0")}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const doDownload608 = async () => {
        const blob = await api.downloadReport608(selectedMonth, selectedYear);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `0608_${selectedYear}${selectedMonth.toString().padStart(2, "0")}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleDisclaimerConfirm = async () => {
        if (!reportToDownload) return;
        setIsDownloading(true);
        setValidationErrors([]);
        try {
            // Pre-validación obligatoria antes de descargar
            const validateRes = reportToDownload === "607"
                ? await api.validateReport607(selectedMonth, selectedYear)
                : reportToDownload === "606"
                    ? await api.validateReport606(selectedMonth, selectedYear)
                    : await api.validateReport608(selectedMonth, selectedYear);

            if (!validateRes.valid && validateRes.errors?.length) {
                setValidationErrors(validateRes.errors);
                return;
            }

            if (reportToDownload === "607") await doDownload607();
            else if (reportToDownload === "606") await doDownload606();
            else await doDownload608();
            toast.success(`Reporte ${reportToDownload} descargado correctamente`);
            setDisclaimerOpen(false);
            setReportToDownload(null);
        } catch (e: any) {
            console.error(e);
            const errorMessage = e instanceof Error ? e.message : (typeof e === 'string' ? e : "Error al descargar el reporte");
            toast.error(errorMessage);
        } finally {
            setIsDownloading(false);
        }
    };

    const openDisclaimer = (report: "606" | "607" | "608") => {
        setReportToDownload(report);
        setValidationErrors([]);
        setDisclaimerOpen(true);
    };

    const isMonthClosed = (mIndex: number) => {
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        if (selectedYear < currentYear) return true;
        if (selectedYear === currentYear && mIndex < currentMonth) return true;
        return false;
    };

    const handleViewInvoice = (inv: any) => {
        const viewerInv: ViewerInvoice = {
            id: inv._id,
            clientName: inv.clientName || 'Cliente',
            rnc: inv.ncfType === '01' || inv.ncfType === '31' ? (inv.clientRnc || 'N/A') : 'Consumidor Final',
            clientRnc: inv.clientRnc,
            ncfSequence: inv.ncf,
            total: inv.total,
            itbis: inv.itbis,
            subtotal: inv.subtotal,
            date: inv.date,
            status: 'emitida'
        };
        setSelectedInvoice(viewerInv);
        setIsViewerOpen(true);
    };

    const handleViewExpense = (exp: any) => {
        setSelectedExpense(exp);
        setIsExpenseModalOpen(true);
    };

    const handleSendToAccountant = async () => {
        if (!accountantEmail || !accountantEmail.includes("@")) {
            toast.error("Por favor ingresa un correo válido");
            return;
        }

        setIsSendingToAccountant(true);
        try {
            await api.sendToAccountant(selectedMonth, selectedYear, accountantEmail);
            toast.success("Reportes enviados correctamente al contable");
            localStorage.setItem(`accountant_email_${authUser?.id}`, accountantEmail);
            setAccountantModalOpen(false);
        } catch (error: any) {
            toast.error(error.message || "Error al enviar los reportes");
        } finally {
            setIsSendingToAccountant(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8 bg-background transition-colors duration-300">
            {/* Header section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
                <div>
                    <h1 className="text-3xl font-extrabold text-foreground flex items-center gap-3 tracking-tight">
                        <TrendingUp className="w-8 h-8 text-accent" /> Mis Reportes DGII
                    </h1>
                    <p className="text-muted-foreground mt-1 font-medium italic">
                        Gestión fiscal inteligente y transparente
                    </p>
                </div>
                <div className="flex gap-3 bg-secondary text-white p-2 rounded-2xl shadow-sm border border-border/10 transition-colors">
                    <label htmlFor="year-select" className="sr-only">Año fiscal</label>
                    <select
                        id="year-select"
                        className="bg-transparent border-none text-sm font-bold text-white outline-none focus:ring-0 cursor-pointer px-2"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        aria-label="Seleccionar año fiscal"
                    >
                        <option value={2026}>2026</option>
                        <option value={2025}>2025</option>
                    </select>
                </div>
            </div>

            {loadError && (
                <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <p className="text-sm font-medium text-destructive">{loadError}</p>
                    <Button variant="outline" size="sm" onClick={loadSummary} className="border-destructive/30 text-destructive hover:bg-destructive/10 shrink-0">
                        Reintentar
                    </Button>
                </div>
            )}

            {/* Tax Dashboard Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <Card className="border-none shadow-2xl bg-secondary text-white overflow-hidden relative group transition-colors">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform text-white">
                        <DollarSign className="w-24 h-24" />
                    </div>
                    <CardHeader className="pb-2">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white">
                                <PieChart className="w-4 h-4" />
                            </div>
                            <span className="text-xs font-black uppercase tracking-widest opacity-80">ITBIS Cobrado</span>
                        </div>
                        <CardTitle className="text-4xl font-black">
                            {isLoading ? <Loader2 className="animate-spin" /> : formatCurrency(summary?.itbis || 0)}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs font-medium text-white/80">
                            Total para presentar en el IT-1 de {months[selectedMonth - 1]}
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-xl bg-card border border-border/10 transition-colors">
                    <CardHeader className="pb-2">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                                <Calculator className="w-4 h-4" />
                            </div>
                            <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Subtotal Neto</span>
                        </div>
                        <CardTitle className="text-3xl font-black text-foreground">
                            {isLoading ? <Loader2 className="animate-spin text-accent" /> : formatCurrency(summary?.subtotal || 0)}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs font-medium text-muted-foreground">
                            Ingresos gravables antes de impuestos
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-xl bg-card border border-border/10 transition-colors">
                    <CardHeader className="pb-2">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center text-success">
                                <FileText className="w-4 h-4" />
                            </div>
                            <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Comprobantes</span>
                        </div>
                        <CardTitle className="text-3xl font-black text-foreground">
                            {isLoading ? <Loader2 className="animate-spin text-accent" /> : `${summary?.count || 0} Docs`}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs font-medium text-muted-foreground">
                            Total de e-CF emitidos este mes
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Monthly Reports Grid */}
            <h3 className="text-lg font-black text-foreground uppercase tracking-widest mb-6 px-1">Periodos</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {months.map((monthName, index) => {
                    const mNum = index + 1;
                    const active = selectedMonth === mNum;
                    const closed = isMonthClosed(index);

                    return (
                        <Card
                            key={index}
                            className={cn(
                                "cursor-pointer transition-all duration-300 border-none shadow-lg",
                                active ? "ring-2 ring-accent bg-card scale-105 z-10" : "bg-card/50 hover:bg-card hover:shadow-xl hover:-translate-y-1 opacity-80"
                            )}
                            onClick={() => setSelectedMonth(mNum)}
                        >
                            <CardHeader className="pb-4">
                                <div className="flex justify-between items-start">
                                    <div className={cn("p-2 rounded-xl", active ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground")}>
                                        <Calendar className="w-5 h-5" />
                                    </div>
                                    {closed ? (
                                        <Badge variant="secondary" className="bg-success/10 text-success border-success/20 font-bold text-[10px] gap-1 px-2">
                                            <CheckCircle2 className="w-3 h-3" /> COMPLETADO
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-accent border-accent/20 font-bold text-[10px] px-2">
                                            EN CURSO
                                        </Badge>
                                    )}
                                </div>
                                <div className="mt-4">
                                    <CardTitle className="text-xl font-black text-foreground">{monthName}</CardTitle>
                                    <CardDescription className="font-bold text-muted-foreground">{selectedYear}</CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3 pt-0">
                                {active && (
                                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                        <Button
                                            variant="secondary"
                                            className="w-full justify-between font-bold h-10 group bg-accent/10 hover:bg-accent/20 text-accent border-accent/20"
                                            onClick={(e) => { e.stopPropagation(); openDisclaimer("607"); }}
                                        >
                                            607 - Ventas <Download className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="w-full justify-between font-bold h-10 border-border/20 text-muted-foreground hover:text-foreground hover:bg-muted"
                                            onClick={(e) => { e.stopPropagation(); openDisclaimer("606"); }}
                                        >
                                            606 - Compras <Download className="w-4 h-4" />
                                        </Button>
                                        <Link href="/gastos" className="text-xs text-accent hover:underline px-2 py-1 block">
                                            ¿Faltan gastos? Ir a Gastos 606
                                        </Link>
                                        <Button
                                            variant="ghost"
                                            className="w-full justify-between font-bold h-10 text-rose-600 hover:bg-rose-50 hover:text-rose-700 border-0"
                                            onClick={(e) => { e.stopPropagation(); openDisclaimer("608"); }}
                                        >
                                            608 - Anulaciones <Ban className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            className="w-full justify-between font-bold h-10 text-muted-foreground hover:bg-muted/80 hover:text-accent border-0"
                                            onClick={(e) => { e.stopPropagation(); setItbisSummaryOpen(true); }}
                                        >
                                            Resumen ITBIS <ArrowUpRight className="w-4 h-4" />
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Document Details Section */}
            {!isLoading && (summary?.documents?.invoices?.length > 0 || summary?.documents?.expenses?.length > 0) && (
                <div className="mt-12 space-y-6">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-lg font-black text-foreground uppercase tracking-widest">
                            Detalle del Periodo: {months[selectedMonth - 1]}
                        </h3>
                        <Badge variant="outline" className="text-[10px] font-bold">
                            {(summary?.documents?.invoices?.length || 0) + (summary?.documents?.expenses?.length || 0)} DOCUMENTOS
                        </Badge>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Invoices Table */}
                        <div className="space-y-4">
                            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                <ArrowUpRight className="w-3.5 h-3.5 text-accent" /> Ventas (607)
                            </h4>
                            <div className="bg-card rounded-2xl border border-border/10 overflow-hidden shadow-sm">
                                <Table>
                                    <TableHeader className="bg-muted/30">
                                        <TableRow>
                                            <TableHead className="text-[10px] font-black uppercase">NCF</TableHead>
                                            <TableHead className="text-[10px] font-black uppercase">Cliente</TableHead>
                                            <TableHead className="text-[10px] font-black uppercase text-right">Total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {summary?.documents?.invoices?.map((inv: any) => (
                                            <TableRow 
                                                key={inv._id} 
                                                className="cursor-pointer hover:bg-muted/50 transition-colors"
                                                onClick={() => handleViewInvoice(inv)}
                                            >
                                                <TableCell className="font-mono text-xs font-bold text-accent">{inv.ncf}</TableCell>
                                                <TableCell className="text-xs font-medium truncate max-w-[120px]">{inv.clientName}</TableCell>
                                                <TableCell className="text-xs font-bold text-right">{formatCurrency(inv.total)}</TableCell>
                                            </TableRow>
                                        ))}
                                        {(!summary?.documents?.invoices || summary?.documents?.invoices.length === 0) && (
                                            <TableRow>
                                                <TableCell colSpan={3} className="text-center py-8 text-xs text-muted-foreground italic">
                                                    No hay ventas registradas este mes
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>

                        {/* Expenses Table */}
                        <div className="space-y-4">
                            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                <Calculator className="w-3.5 h-3.5 text-rose-500" /> Gastos (606)
                            </h4>
                            <div className="bg-card rounded-2xl border border-border/10 overflow-hidden shadow-sm">
                                <Table>
                                    <TableHeader className="bg-muted/30">
                                        <TableRow>
                                            <TableHead className="text-[10px] font-black uppercase">Suplidor</TableHead>
                                            <TableHead className="text-[10px] font-black uppercase">NCF</TableHead>
                                            <TableHead className="text-[10px] font-black uppercase text-right">Monto</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {summary?.documents?.expenses?.map((exp: any) => (
                                            <TableRow 
                                                key={exp._id} 
                                                className="cursor-pointer hover:bg-muted/50 transition-colors"
                                                onClick={() => handleViewExpense(exp)}
                                            >
                                                <TableCell className="text-xs font-medium truncate max-w-[120px]">{exp.providerName}</TableCell>
                                                <TableCell className="font-mono text-xs font-bold text-muted-foreground">{exp.ncf}</TableCell>
                                                <TableCell className="text-xs font-bold text-right text-rose-600">{formatCurrency(exp.amount)}</TableCell>
                                            </TableRow>
                                        ))}
                                        {(!summary?.documents?.expenses || summary?.documents?.expenses.length === 0) && (
                                            <TableRow>
                                                <TableCell colSpan={3} className="text-center py-8 text-xs text-muted-foreground italic">
                                                    No hay gastos registrados este mes
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Accountant Share Section */}
            <div className="mt-12 bg-secondary rounded-3xl p-8 md:p-12 relative overflow-hidden border border-white/20 transition-colors">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white blur-[120px] opacity-10 rounded-full pointer-events-none"></div>
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8 text-white">
                    <div className="space-y-4 max-w-xl">
                        <Badge className="bg-white text-secondary hover:bg-white/90">NUEVO</Badge>
                        <h3 className="text-3xl font-serif font-bold text-white">
                            Tu Contador, Feliz.
                        </h3>
                        <p className="text-white/80 text-lg leading-relaxed">
                            Envía los reportes 606 y 607 del mes de <span className="text-white font-bold">{months[selectedMonth - 1]}</span> directamente a tu contable con un solo clic. Incluye resumen de ITBIS y Retenciones.
                        </p>
                    </div>
                    <div className="flex flex-col gap-3 w-full md:w-auto">
                        <Button
                            size="lg"
                            className="h-14 px-8 text-lg bg-white text-secondary hover:bg-white/90 font-bold shadow-xl transition-all hover:scale-105"
                            onClick={() => setAccountantModalOpen(true)}
                        >
                            <TrendingUp className="w-5 h-5 mr-2" />
                            Enviar a Contador
                        </Button>
                        <p className="text-center text-xs text-white/60 uppercase tracking-widest font-black">Email con adjuntos automáticos</p>
                    </div>
                </div>
            </div>

            {/* Modal Enviar a Contador */}
            <Dialog open={accountantModalOpen} onOpenChange={setAccountantModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-accent" />
                            Enviar al Contable
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <p className="text-sm text-muted-foreground">
                            Se enviarán los reportes <strong>606 y 607</strong> del periodo <strong>{months[selectedMonth - 1]} {selectedYear}</strong> como archivos adjuntos oficiales (.txt).
                        </p>

                        {/* Resumen de datos para validación visual */}
                        <div className="bg-muted/50 rounded-2xl p-4 border border-border/50 space-y-3">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Resumen del Periodo</h4>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground font-medium">ITBIS Cobrado (607)</span>
                                <span className="font-bold text-foreground">{formatCurrency(summary?.itbis || 0)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground font-medium">Ventas Netas</span>
                                <span className="font-bold text-foreground">{formatCurrency(summary?.subtotal || 0)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground font-medium">Gastos Registrados (606)</span>
                                <span className="font-bold text-rose-600">
                                    {formatCurrency(summary?.documents?.expenses?.reduce((acc: number, e: any) => acc + (e.amount || 0), 0) || 0)}
                                </span>
                            </div>
                            <div className="pt-2 border-t border-border/20 flex justify-between items-center text-xs">
                                <span className="text-muted-foreground">Total Documentos</span>
                                <span className="font-black text-accent">
                                    {(summary?.documents?.invoices?.length || 0) + (summary?.documents?.expenses?.length || 0)}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase text-slate-500">Correo del Contable</label>
                            <input 
                                type="email"
                                value={accountantEmail}
                                onChange={(e) => setAccountantEmail(e.target.value)}
                                placeholder="contable@ejemplo.com"
                                className="w-full h-12 px-4 rounded-xl border border-border bg-muted/30 focus:outline-none focus:ring-2 focus:ring-accent/20 font-medium"
                            />
                        </div>
                        <Button 
                            className="w-full h-12 font-bold text-base"
                            disabled={isSendingToAccountant || !accountantEmail}
                            onClick={handleSendToAccountant}
                        >
                            {isSendingToAccountant ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Generando y enviando...
                                </>
                            ) : (
                                "Enviar Reportes Ahora"
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Modal Resumen ITBIS */}
            <Dialog open={itbisSummaryOpen} onOpenChange={setItbisSummaryOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Calculator className="w-5 h-5 text-accent" />
                            Resumen ITBIS — {months[selectedMonth - 1]} {selectedYear}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-2">
                        <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                            <span className="text-sm font-medium text-muted-foreground">ITBIS cobrado</span>
                            <span className="font-bold">RD$ {(summary?.itbis ?? 0).toLocaleString("es-DO")}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                            <span className="text-sm font-medium text-muted-foreground">Subtotal neto</span>
                            <span className="font-bold">RD$ {(summary?.subtotal ?? 0).toLocaleString("es-DO")}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                            <span className="text-sm font-medium text-muted-foreground">Comprobantes</span>
                            <span className="font-bold">{summary?.count ?? 0}</span>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {reportToDownload && (
                <FiscalDisclaimerModal
                    open={disclaimerOpen}
                    onOpenChange={(open) => { setDisclaimerOpen(open); if (!open) { setReportToDownload(null); setValidationErrors([]); } }}
                    reportType={reportToDownload}
                    reportLabel={reportToDownload === "607" ? "Ventas de Bienes y Servicios" : reportToDownload === "606" ? "Compras y Gastos" : "Facturas Anuladas"}
                    onConfirmDownload={handleDisclaimerConfirm}
                    isDownloading={isDownloading}
                    validationErrors={validationErrors}
                />
            )}

            <div className="mt-8 p-6 bg-accent/5 rounded-2xl border border-accent/10 flex items-start gap-4 transition-colors">
                <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-accent-foreground shrink-0 shadow-lg shadow-accent/20">
                    <Info className="w-5 h-5" />
                </div>
                <div>
                    <h4 className="font-black text-foreground text-sm italic">Recordatorio Fiscal</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                        Los reportes 606 y 607 deben presentarse antes del día 15 del mes siguiente. Pre-valida los archivos con la herramienta oficial de la DGII antes de enviarlos. Los correlativos NCF se mantienen en orden en el sistema.
                    </p>
                </div>
            </div>

            {/* Invoice Viewer */}
            <DocumentViewer
                isOpen={isViewerOpen}
                onClose={() => setIsViewerOpen(false)}
                document={selectedInvoice}
                type="invoice"
                onDownloadPDF={async () => {
                   if (!selectedInvoice) return;
                   const companyDetails = { 
                       companyName: (authUser as any)?.fiscalStatus?.confirmed || 'Mi Empresa',
                       rnc: (authUser as any)?.rnc || 'N/A'
                   };
                   await downloadInvoicePDF(selectedInvoice as any, companyDetails);
                }}
            />

            {/* Expense Detail Modal */}
            <Dialog open={isExpenseModalOpen} onOpenChange={setIsExpenseModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Calculator className="w-5 h-5 text-rose-500" />
                            Detalle de Gasto
                        </DialogTitle>
                    </DialogHeader>
                    {selectedExpense && (
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Suplidor</p>
                                    <p className="text-sm font-bold">{selectedExpense.providerName}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground">NCF</p>
                                    <p className="text-sm font-mono">{selectedExpense.ncf}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Fecha</p>
                                    <p className="text-sm">{format(new Date(selectedExpense.date), "dd/MM/yyyy", { locale: es })}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Categoría</p>
                                    <p className="text-sm capitalize">{selectedExpense.category || 'General'}</p>
                                </div>
                            </div>
                            <div className="border-t pt-4 flex justify-between items-center">
                                <p className="text-sm font-bold uppercase">Total del Gasto</p>
                                <p className="text-xl font-black text-rose-600">{formatCurrency(selectedExpense.amount)}</p>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
