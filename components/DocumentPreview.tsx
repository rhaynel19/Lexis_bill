"use client";

import { Button } from "@/components/ui/button";
import { Download, Edit2, Share2, CheckCircle, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/ui/StatusBadge";

interface DocumentPreviewProps {
    data: any; // Invoice or Quote Data
    type: "invoice" | "quote";
    onEdit: () => void;
    onConfirm: () => void;
    isProcessing?: boolean;
    isOpen?: boolean;
    onClose?: () => void;
}

export function DocumentPreview({
    data,
    type,
    onEdit,
    onConfirm,
    isProcessing,
    isOpen = false,
    onClose
}: DocumentPreviewProps) {
    const handleClose = () => {
        if (onClose) onClose();
    };

    const content = (
        <div className="max-w-4xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500 pb-10 overflow-y-auto max-h-full px-1">
            {/* Action Bar */}
            <div className="flex flex-col md:flex-row justify-between items-center bg-secondary text-secondary-foreground p-4 rounded-xl shadow-2xl gap-4 border border-border/10">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-success/10 rounded-lg text-success">
                        <CheckCircle className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg">Vista Previa</h3>
                        <p className="text-xs text-muted-foreground">Revisa los datos antes de finalizar.</p>
                    </div>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <Button variant="outline" className="bg-background text-foreground border-border/20 hover:bg-muted flex-1 md:flex-initial" onClick={onEdit}>
                        <Edit2 className="w-4 h-4 mr-2" /> Editar
                    </Button>
                    <Button className="bg-success hover:bg-success/90 text-success-foreground font-bold flex-1 md:flex-initial shadow-lg shadow-success/20" onClick={onConfirm} disabled={isProcessing}>
                        {isProcessing ? "Procesando..." : (type === "invoice" ? "Confirmar y Emitir" : "Guardar Cotización")}
                    </Button>
                </div>
            </div>

            {/* Document Paper Representation */}
            <div className="bg-card p-4 sm:p-8 md:p-12 rounded-xl shadow-xl border border-border/20 min-h-[600px] relative overflow-hidden transition-colors">
                {/* Watermark */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none text-foreground">
                    <h1 className="text-[120px] font-serif font-bold -rotate-45">LEXIS</h1>
                </div>

                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start mb-12 relative z-10 gap-6">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-2">{type === "invoice" ? "FACTURA" : "COTIZACIÓN"}</h1>
                        <p className="text-muted-foreground text-sm uppercase tracking-widest">{type === "invoice" ? "E-CF (Borrador)" : "Propuesta Comercial"}</p>
                    </div>
                    <div className="text-left sm:text-right">
                        <h2 className="text-xl font-bold text-foreground">{data.clientName}</h2>
                        <p className="text-muted-foreground text-sm">{data.rnc}</p>
                        <p className="text-muted-foreground text-sm">{new Date().toLocaleDateString("es-DO")}</p>
                    </div>
                </div>

                {/* Items */}
                <div className="mt-12 relative z-10 -mx-4 sm:mx-0 overflow-x-auto">
                    <div className="min-w-[500px] sm:min-w-full px-4 sm:px-0">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-border/10 text-xs text-muted-foreground uppercase tracking-wider">
                                    <th className="py-3">Descripción</th>
                                    <th className="py-3 text-right">Cant</th>
                                    <th className="py-3 text-right">Precio</th>
                                    <th className="py-3 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/5">
                                {data.items.map((item: any, i: number) => (
                                    <tr key={i}>
                                        <td className="py-4 text-foreground font-medium">{item.description}</td>
                                        <td className="py-4 text-right text-muted-foreground">{item.quantity}</td>
                                        <td className="py-4 text-right text-muted-foreground">{item.price.toLocaleString("es-DO", { minimumFractionDigits: 2 })}</td>
                                        <td className="py-4 text-right text-foreground font-bold">{(item.quantity * item.price).toLocaleString("es-DO", { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Totals */}
                <div className="mt-12 flex justify-end relative z-10">
                    <div className="w-64 space-y-3">
                        <div className="flex justify-between text-muted-foreground text-sm">
                            <span>Subtotal</span>
                            <span className="text-foreground">{data.subtotal.toLocaleString("es-DO", { style: "currency", currency: "DOP" })}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground text-sm">
                            <span>ITBIS (18%)</span>
                            <span className="text-success">{data.itbis.toLocaleString("es-DO", { style: "currency", currency: "DOP" })}</span>
                        </div>
                        <div className="border-t border-border/20 pt-3 flex justify-between font-bold text-2xl text-accent">
                            <span>Total</span>
                            <span>{data.total.toLocaleString("es-DO", { style: "currency", currency: "DOP" })}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions (Beneath Preview) */}
            <div className="grid grid-cols-2 gap-4">
                <Button variant="outline" className="h-16 flex flex-col items-center justify-center gap-1 border-border/30 hover:border-success hover:bg-success/5 hover:text-success transition-all">
                    <Share2 className="w-5 h-5" />
                    <span className="text-xs font-bold uppercase">Enviar WhatsApp</span>
                </Button>
                <Button variant="outline" className="h-16 flex flex-col items-center justify-center gap-1 border-border/30 hover:border-accent hover:bg-accent/5 hover:text-accent transition-all">
                    <Download className="w-5 h-5" />
                    <span className="text-xs font-bold uppercase">Solo Descargar PDF</span>
                </Button>
            </div>
        </div>
    );

    if (onClose) {
        return (
            <Dialog open={isOpen} onOpenChange={handleClose}>
                <DialogContent className="max-w-5xl h-[95vh] p-0 md:p-6 overflow-hidden bg-background/95 backdrop-blur border-border/10 shadow-2xl flex flex-col justify-center items-center">
                    <div className="w-full h-full overflow-y-auto py-6 px-2 md:px-0">
                        {content}
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    return content;
}
