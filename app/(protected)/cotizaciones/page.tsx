"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, FileText, ArrowRight, Eye, Pencil, Loader2, Trash2 } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DocumentViewer, Quote } from "@/components/DocumentViewer";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { downloadQuotePDF, QuoteData } from "@/lib/pdf-generator";
import { generateQuoteWhatsAppMessage, openWhatsApp } from "@/lib/whatsapp-utils";
import { toast } from "sonner";
import { api } from "@/lib/api-service";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

export default function Quotes() {
    const router = useRouter();
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
    const [isViewerOpen, setIsViewerOpen] = useState(false);
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [convertingId, setConvertingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);

    useEffect(() => {
        loadQuotes();
    }, []);

    const loadQuotes = async () => {
        setIsLoading(true);
        setLoadError(null);
        try {
            const data = await api.getQuotes();
            const normalized = (data || []).map((q: { _id?: { toString: () => string }; id?: string; [key: string]: unknown }) => ({
                ...q,
                id: q.id || (q._id as { toString?: () => string })?.toString?.() || String(q._id)
            })) as Quote[];
            setQuotes(normalized);
        } catch {
            setQuotes([]);
            setLoadError("No se pudieron cargar las cotizaciones. Revisa tu conexión e intenta de nuevo.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleConvertToInvoice = async (quote: Quote) => {
        if (quote.status === "converted") {
            toast.error("Esta cotización ya fue facturada");
            return;
        }
        setConvertingId(quote.id);
        try {
            const res = await api.convertQuoteToInvoice(quote.id);
            toast.success("Factura creada exitosamente");
            router.push("/dashboard");
        } catch (e: unknown) {
            toast.error((e as { message?: string })?.message || "Error al convertir");
        } finally {
            setConvertingId(null);
        }
    };

    const handleViewQuote = (quote: Quote) => {
        setSelectedQuote(quote);
        setIsViewerOpen(true);
    };

    const handleDownloadPDF = async () => {
        if (!selectedQuote) return;

        setIsGeneratingPDF(true);
        try {
            const quoteData: QuoteData = {
                id: selectedQuote.id,
                clientName: selectedQuote.clientName,
                rnc: selectedQuote.rnc,
                date: selectedQuote.date,
                validUntil: selectedQuote.validUntil,
                items: selectedQuote.items.map(item => ({
                    description: item.description,
                    quantity: item.quantity,
                    price: item.price
                })),
                subtotal: selectedQuote.subtotal,
                itbis: selectedQuote.itbis,
                total: selectedQuote.total
            };

            await downloadQuotePDF(quoteData);
            toast.success("✅ PDF descargado exitosamente");
        } catch (error) {
            console.error("Error generando PDF:", error);
            toast.error("Error al generar PDF", {
                action: { label: "Reintentar", onClick: () => handleDownloadPDF() },
            });
        } finally {
            setIsGeneratingPDF(false);
        }
    };

    const handleSendWhatsApp = () => {
        if (!selectedQuote) return;

        const message = generateQuoteWhatsAppMessage(selectedQuote);
        openWhatsApp(selectedQuote.clientPhone, message);
        toast.info("📲 Abriendo WhatsApp. Recuerda adjuntar el PDF antes de enviar.", { duration: 4000 });
    };

    const handleDeleteQuote = async (quote: Quote) => {
        if (quote.status === "converted") {
            toast.error("No se puede eliminar una cotización ya facturada.");
            return;
        }
        if (!confirm("¿Estás seguro de eliminar esta cotización? Esta acción no se puede deshacer.")) return;
        setDeletingId(quote.id);
        try {
            await api.deleteQuote(quote.id);
            toast.success("Cotización eliminada");
            loadQuotes();
        } catch (e: unknown) {
            toast.error((e as { message?: string })?.message || "Error al eliminar");
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl">
            <Breadcrumbs items={[{ label: "Inicio", href: "/dashboard" }, { label: "Cotizaciones" }]} className="mb-4 text-slate-500" />
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-foreground font-serif lowercase tracking-tighter">Cotizaciones</h1>
                    <p className="text-slate-500 dark:text-muted-foreground font-medium">Gestione sus propuestas comerciales</p>
                </div>
                <Link href="/nueva-cotizacion">
                    <Button className="bg-[#D4AF37] hover:bg-amber-600 text-white gap-2 font-bold shadow-lg shadow-amber-100">
                        <Plus className="w-4 h-4" /> Nueva Cotización
                    </Button>
                </Link>
            </div>

            <Card className="border-none shadow-xl shadow-slate-200/50 rounded-2xl overflow-hidden">
                <CardHeader className="bg-slate-50 border-b border-slate-100">
                    <CardTitle className="text-lg font-bold text-slate-800">Historial de Cotizaciones</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 overflow-x-auto">
                    {loadError && (
                        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                            <p className="text-sm text-destructive font-medium">{loadError}</p>
                            <Button variant="outline" size="sm" onClick={loadQuotes} className="shrink-0">Reintentar</Button>
                        </div>
                    )}
                    {isLoading ? (
                        <div className="space-y-3">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <Skeleton key={i} className="h-14 w-full rounded-lg" />
                            ))}
                        </div>
                    ) : (
                    <Table className="min-w-[640px]">
                        <TableHeader>
                            <TableRow className="bg-slate-50/50 hover:bg-transparent">
                                <TableHead className="font-bold text-slate-700">ID</TableHead>
                                <TableHead className="font-bold text-slate-700">Cliente</TableHead>
                                <TableHead className="font-bold text-slate-700">Fecha</TableHead>
                                <TableHead className="font-bold text-slate-700">Total</TableHead>
                                <TableHead className="text-center font-bold text-slate-700">Estado</TableHead>
                                <TableHead className="text-right font-bold text-slate-700">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {quotes.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="p-0">
                                        <EmptyState
                                            icon={FileText}
                                            title="Aún no hay cotizaciones"
                                            description="Crea tu primera cotización para enviar propuestas profesionales a tus clientes."
                                            actionLabel="Nueva cotización"
                                            actionHref="/nueva-cotizacion"
                                        />
                                    </TableCell>
                                </TableRow>
                            ) : (
                                quotes.map((q) => (
                                    <TableRow key={q.id} className="hover:bg-slate-50/50 border-b border-slate-50 last:border-0 transition-colors">
                                        <TableCell className="font-mono text-xs text-slate-500 dark:text-slate-400 font-bold">{q.id?.length > 8 ? `COT-${q.id.slice(-8)}` : q.id}</TableCell>
                                        <TableCell>
                                            <div>
                                                <p className="font-bold text-slate-800 dark:text-slate-200">{q.clientName}</p>
                                                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono uppercase">{q.rnc}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm text-slate-600 dark:text-slate-400 font-medium">{new Date(q.date).toLocaleDateString("es-DO")}</TableCell>
                                        <TableCell className="font-black text-slate-900 dark:text-white">
                                            {new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format(q.total)}
                                        </TableCell>

                                        <TableCell className="text-center">
                                            <StatusBadge status={q.status === "converted" ? "converted" : q.status === "sent" ? "sent" : "borrador"} />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex gap-2 justify-end flex-wrap">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="w-9 h-9 p-0 min-w-[36px] min-h-[36px] border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                                                    onClick={() => handleViewQuote(q)}
                                                    title="Ver detalles"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                                {q.status !== "converted" && (
                                                    <>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="w-9 h-9 p-0 min-w-[36px] min-h-[36px] text-blue-600 border-blue-100 hover:bg-blue-50"
                                                            onClick={() => router.push(`/nueva-cotizacion?edit=${q.id}`)}
                                                            title="Editar cotización"
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="w-9 h-9 p-0 min-w-[36px] min-h-[36px] text-destructive border-destructive/30 hover:bg-destructive/10"
                                                            onClick={() => handleDeleteQuote(q)}
                                                            disabled={!!deletingId}
                                                            title="Eliminar cotización"
                                                        >
                                                            {deletingId === q.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="gap-1 sm:gap-2 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border-emerald-100 font-bold min-h-[36px]"
                                                            onClick={() => handleConvertToInvoice(q)}
                                                            disabled={!!convertingId}
                                                            title="Convertir a factura"
                                                        >
                                                            {convertingId === q.id ? <><Loader2 className="w-4 h-4 animate-spin" /> <span className="hidden sm:inline">Convirtiendo…</span></> : <><span className="hidden sm:inline">Facturar</span> <ArrowRight className="w-3 h-3" /></>}
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                    )}
                </CardContent>
            </Card>

            <DocumentViewer
                isOpen={isViewerOpen}
                onClose={() => {
                    setIsViewerOpen(false);
                    setSelectedQuote(null);
                }}
                document={selectedQuote}
                type="quote"
                onDownloadPDF={handleDownloadPDF}
                onSendWhatsApp={handleSendWhatsApp}
                isGeneratingPDF={isGeneratingPDF}
            />
        </div>
    );
}
