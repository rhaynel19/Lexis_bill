"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, FileText, ArrowRight, Eye, Download, MessageCircle, Pencil } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DocumentViewer, Quote } from "@/components/DocumentViewer";
import { downloadQuotePDF, QuoteData } from "@/lib/pdf-generator";
import { generateQuoteWhatsAppMessage, openWhatsApp } from "@/lib/whatsapp-utils";
import { toast } from "sonner";

export default function Quotes() {
    const router = useRouter();
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
    const [isViewerOpen, setIsViewerOpen] = useState(false);
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem("quotes");
        if (stored) {
            setQuotes(JSON.parse(stored).reverse());
        }
    }, []);

    const handleConvertToInvoice = (quote: Quote) => {
        const invoiceToClone = {
            clientName: quote.clientName,
            rnc: quote.rnc,
            items: quote.items,
            type: "32"
        };
        localStorage.setItem("invoiceToClone", JSON.stringify(invoiceToClone));
        router.push("/nueva-factura");
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
            toast.error("Error al generar PDF");
        } finally {
            setIsGeneratingPDF(false);
        }
    };

    const handleSendWhatsApp = () => {
        if (!selectedQuote) return;

        const message = generateQuoteWhatsAppMessage(selectedQuote);
        openWhatsApp(selectedQuote.clientPhone, message);
        toast.info("📲 Abriendo WhatsApp...");
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 font-serif lowercase tracking-tighter">Cotizaciones</h1>
                    <p className="text-slate-500 font-medium">Gestione sus propuestas comerciales</p>
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
                <CardContent className="pt-6">
                    <Table>
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
                                    <TableCell colSpan={6} className="text-center py-12 text-slate-400 italic">
                                        No hay cotizaciones registradas aún.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                quotes.map((q) => (
                                    <TableRow key={q.id} className="hover:bg-slate-50/50 border-b border-slate-50 last:border-0 transition-colors">
                                        <TableCell className="font-mono text-xs text-slate-500 font-bold">{q.id}</TableCell>
                                        <TableCell>
                                            <div>
                                                <p className="font-bold text-slate-800">{q.clientName}</p>
                                                <p className="text-[10px] text-slate-400 font-mono uppercase">{q.rnc}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm text-slate-600 font-medium">{new Date(q.date).toLocaleDateString("es-DO")}</TableCell>
                                        <TableCell className="font-black text-slate-900">
                                            {new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format(q.total)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <StatusBadge status={q.status || "borrador"} />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex gap-2 justify-end">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="w-9 h-9 p-0 border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                                                    onClick={() => handleViewQuote(q)}
                                                    title="Ver detalles"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="w-9 h-9 p-0 text-blue-600 border-blue-100 hover:bg-blue-50"
                                                    onClick={() => router.push(`/nueva-cotizacion?edit=${q.id}`)}
                                                    title="Editar cotización"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="gap-2 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border-emerald-100 font-bold hidden md:flex"
                                                    onClick={() => handleConvertToInvoice(q)}
                                                    title="Convertir a factura"
                                                >
                                                    Facturar <ArrowRight className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
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
