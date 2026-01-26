"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, FileText, ArrowRight, Eye, Download, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DocumentViewer, Quote } from "@/components/DocumentViewer";
import { downloadQuotePDF, QuoteData } from "@/lib/pdf-generator";
import { generateQuoteWhatsAppMessage, openWhatsApp } from "@/lib/whatsapp-utils";
import { toast } from "sonner";

export default function Quotes() {
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
    const [isViewerOpen, setIsViewerOpen] = useState(false);
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const stored = localStorage.getItem("quotes");
        if (stored) {
            setQuotes(JSON.parse(stored).reverse());
        }
    }, []);

    const handleConvertToInvoice = (quote: Quote) => {
        // Prepare invoice data sans ID/Date to be fresh
        const invoiceToClone = {
            clientName: quote.clientName,
            rnc: quote.rnc,
            items: quote.items,
            type: "32" // Default to Consumo, user can change
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
                    <h1 className="text-3xl font-bold text-primary">Cotizaciones</h1>
                    <p className="text-gray-500">Gestione sus propuestas comerciales</p>
                </div>
                <Link href="/nueva-cotizacion">
                    <Button className="bg-[#D4AF37] hover:bg-amber-600 text-white gap-2">
                        <Plus className="w-4 h-4" /> Nueva Cotización
                    </Button>
                </Link>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Historial de Cotizaciones</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Total</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {quotes.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                        No hay cotizaciones registradas.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                quotes.map((q) => (
                                    <TableRow key={q.id}>
                                        <TableCell className="font-medium">{q.id}</TableCell>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium">{q.clientName}</p>
                                                <p className="text-xs text-gray-500">{q.rnc}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>{new Date(q.date).toLocaleDateString("es-DO")}</TableCell>
                                        <TableCell className="font-bold">
                                            {new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format(q.total)}
                                        </TableCell>
                                        <TableCell>
                                            <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                                                Abierta
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex gap-2 justify-end">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="gap-2"
                                                    onClick={() => handleViewQuote(q)}
                                                    title="Ver detalles"
                                                >
                                                    <Eye className="w-3 h-3" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="gap-2 text-green-700 hover:text-green-800 hover:bg-green-50 border-green-200"
                                                    onClick={() => handleConvertToInvoice(q)}
                                                    title="Convertir a factura"
                                                >
                                                    Convertir <ArrowRight className="w-3 h-3" />
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

            {/* Document Viewer Modal */}
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
