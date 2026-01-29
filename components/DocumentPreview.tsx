"use client";

import { Button } from "@/components/ui/button";
import { Download, Edit2, Share2, CheckCircle, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

interface DocumentPreviewProps {
    data: any; // Invoice or Quote Data
    type: "invoice" | "quote";
    onEdit: () => void;
    onConfirm: () => void;
    isProcessing?: boolean;
}

export function DocumentPreview({ data, type, onEdit, onConfirm, isProcessing }: DocumentPreviewProps) {

    const handleWhatsApp = () => {
        const title = type === "invoice" ? "Factura" : "Cotización";
        const message = `Hola ${data.clientName}, adjunto su ${title} por valor de RD$${data.total.toLocaleString('es-DO')}.`;
        const phone = data.clientPhone ? data.clientPhone.replace(/\D/g, '') : '';
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
        toast.info("WhatsApp abierto. Recuerda adjuntar el PDF si lo descargaste.");
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500 pb-10">
            {/* Action Bar */}
            <div className="flex flex-col md:flex-row justify-between items-center bg-slate-900 text-white p-4 rounded-xl shadow-2xl gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
                        <CheckCircle className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg">Vista Previa</h3>
                        <p className="text-xs text-slate-400">Revisa los datos antes de finalizar.</p>
                    </div>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <Button variant="outline" className="text-slate-900 bg-white border-none hover:bg-slate-200 flex-1 md:flex-initial" onClick={onEdit}>
                        <Edit2 className="w-4 h-4 mr-2" /> Editar
                    </Button>
                    <Button className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold flex-1 md:flex-initial shadow-lg shadow-emerald-500/20" onClick={onConfirm} disabled={isProcessing}>
                        {isProcessing ? "Procesando..." : (type === "invoice" ? "Confirmar y Emitir" : "Guardar Cotización")}
                    </Button>
                </div>
            </div>

            {/* Document Paper Representation */}
            <div className="bg-white p-4 sm:p-8 md:p-12 rounded-xl shadow-xl border border-slate-200 min-h-[600px] relative overflow-hidden">
                {/* Watermark */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none">
                    <h1 className="text-[120px] font-serif font-bold -rotate-45">LEXIS</h1>
                </div>

                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start mb-12 relative z-10 gap-6">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-serif font-bold text-slate-900 mb-2">{type === "invoice" ? "FACTURA" : "COTIZACIÓN"}</h1>
                        <p className="text-slate-500 text-sm uppercase tracking-widest">{type === "invoice" ? "E-CF (Borrador)" : "Propuesta Comercial"}</p>
                    </div>
                    <div className="text-left sm:text-right">
                        <h2 className="text-xl font-bold text-slate-800">{data.clientName}</h2>
                        <p className="text-slate-500 text-sm">{data.rnc}</p>
                        <p className="text-slate-500 text-sm">{new Date().toLocaleDateString("es-DO")}</p>
                    </div>
                </div>

                {/* Items */}
                <div className="mt-12 relative z-10 -mx-4 sm:mx-0 overflow-x-auto">
                    <div className="min-w-[500px] sm:min-w-full px-4 sm:px-0">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider">
                                    <th className="py-3">Descripción</th>
                                    <th className="py-3 text-right">Cant</th>
                                    <th className="py-3 text-right">Precio</th>
                                    <th className="py-3 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {data.items.map((item: any, i: number) => (
                                    <tr key={i}>
                                        <td className="py-4 text-slate-700 font-medium">{item.description}</td>
                                        <td className="py-4 text-right text-slate-500">{item.quantity}</td>
                                        <td className="py-4 text-right text-slate-500">{item.price.toLocaleString("es-DO", { minimumFractionDigits: 2 })}</td>
                                        <td className="py-4 text-right text-slate-900 font-bold">{(item.quantity * item.price).toLocaleString("es-DO", { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Totals */}
                <div className="mt-12 flex justify-end relative z-10">
                    <div className="w-64 space-y-3">
                        <div className="flex justify-between text-slate-500 text-sm">
                            <span>Subtotal</span>
                            <span>{data.subtotal.toLocaleString("es-DO", { style: "currency", currency: "DOP" })}</span>
                        </div>
                        <div className="flex justify-between text-slate-500 text-sm">
                            <span>ITBIS (18%)</span>
                            <span>{data.itbis.toLocaleString("es-DO", { style: "currency", currency: "DOP" })}</span>
                        </div>
                        <div className="border-t border-slate-200 pt-3 flex justify-between font-bold text-2xl text-primary">
                            <span>Total</span>
                            <span>{data.total.toLocaleString("es-DO", { style: "currency", currency: "DOP" })}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions (Beneath Preview) */}
            <div className="grid grid-cols-2 gap-4">
                <Button variant="outline" className="h-16 flex flex-col items-center justify-center gap-1 border-slate-200 hover:border-green-500 hover:bg-green-50 hover:text-green-700 transition-all" onClick={handleWhatsApp}>
                    <Share2 className="w-5 h-5" />
                    <span className="text-xs font-bold uppercase">Enviar WhatsApp</span>
                </Button>
                <Button variant="outline" className="h-16 flex flex-col items-center justify-center gap-1 border-slate-200 hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700 transition-all">
                    <Download className="w-5 h-5" />
                    <span className="text-xs font-bold uppercase">Solo Descargar PDF</span>
                </Button>
            </div>
        </div>
    );
}
