"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-service";
import { FileText, AlertCircle, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface CreditNoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    invoice: any;
    onSuccess: () => void;
}

export function CreditNoteModal({ isOpen, onClose, invoice, onSuccess }: CreditNoteModalProps) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [step, setStep] = useState<'confirm' | 'success'>('confirm');
    const [newNcf, setNewNcf] = useState("");

    const router = useRouter();
    const handleConfirm = async () => {
        setIsProcessing(true);
        try {
            const res = await api.createCreditNote(invoice._id || invoice.id);
            setNewNcf(res.ncf);
            setStep('success');
            onSuccess();
            if (res.warning) {
                toast.warning("Aviso fiscal", { description: res.warning, duration: 8000 });
            }
        } catch (error: any) {
            const msg = error?.message || error?.error || "No se pudo generar la nota de crédito.";
            const needsConfig = msg.includes("lote") || msg.includes("E34") || msg.includes("B04") || msg.includes("Configuración");
            toast.error(needsConfig ? "Configuración requerida" : "Error", {
                description: msg,
                action: needsConfig ? { label: "Ir a Configuración", onClick: () => { onClose(); router.push("/configuracion"); } } : undefined
            });
        } finally {
            setIsProcessing(false);
        }
    };

    if (!invoice) return null;

    const invoiceDate = invoice.date ? new Date(invoice.date) : null;
    const daysSince = invoiceDate ? Math.floor((Date.now() - invoiceDate.getTime()) / (24 * 60 * 60 * 1000)) : 0;
    const isOver30Days = daysSince > 30;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] border-none shadow-2xl overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-indigo-600"></div>

                {step === 'confirm' ? (
                    <>
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                                <AlertCircle className="text-red-500 w-6 h-6" /> Anular Factura
                            </DialogTitle>
                            <DialogDescription className="text-slate-500">
                                Se generará una <strong>Nota de Crédito (e-CF 34)</strong> para anular este monto.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="py-6 space-y-4">
                            {isOver30Days && (
                                <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800 flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                    <div className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                                        <p className="font-semibold mb-1">Factura con más de 30 días</p>
                                        <p>Puede emitir la nota de crédito. Según la DGII (Regl. 293-11), después de 30 días el ITBIS de esta NC no genera crédito fiscal y debe reportarse en 606/607 según corresponda.</p>
                                    </div>
                                </div>
                            )}
                            <div className="bg-muted/30 p-4 rounded-xl border border-border/20">
                                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-2">Factura original</p>
                                <p className="font-mono text-sm font-semibold">{(invoice.ncfSequence || invoice.ncfType || invoice.id || "").toString().slice(-11)}</p>
                                <p className="text-xs text-muted-foreground mt-1">{invoice.clientName}</p>
                            </div>
                            {(invoice.items || []).length > 0 && (
                                <div className="border border-border/20 rounded-xl overflow-hidden">
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider px-4 py-2 bg-muted/30">Ítems</p>
                                    <ul className="divide-y divide-border/10 max-h-28 overflow-y-auto">
                                        {(invoice.items || []).map((item: any, i: number) => (
                                            <li key={i} className="px-4 py-2 flex justify-between text-sm">
                                                <span className="truncate pr-2">{item.description}</span>
                                                <span className="font-mono shrink-0">RD$ {((item.quantity || 1) * (item.price || 0)).toLocaleString()}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            <div className="flex justify-between items-center p-4 bg-primary/5 rounded-xl border border-primary/20">
                                <span className="font-medium">Total a creditar</span>
                                <span className="text-xl font-bold text-primary">RD$ {invoice.total.toLocaleString()}</span>
                            </div>

                            <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                                <p className="text-xs text-amber-800 leading-relaxed">
                                    Esta acción es irreversible en el sistema fiscal. Asegúrese de que la devolución o anulación sea correcta.
                                </p>
                            </div>
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button variant="ghost" onClick={onClose} disabled={isProcessing}>Cancelar</Button>
                            <Button variant="destructive" onClick={handleConfirm} disabled={isProcessing} className="gap-2">
                                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                Confirmar Anulación
                            </Button>
                        </DialogFooter>
                    </>
                ) : (
                    <div className="py-12 flex flex-col items-center text-center space-y-6 animate-in zoom-in duration-300">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 shadow-inner">
                            <CheckCircle className="w-10 h-10" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-slate-900">Anulación Exitosa</h3>
                            <p className="text-slate-500 mt-2">Se ha emitido la Nota de Crédito:</p>
                        </div>
                        <div className="px-6 py-3 bg-slate-900 text-white rounded-lg font-mono text-xl tracking-widest shadow-lg">
                            {newNcf}
                        </div>
                        <Button className="w-full h-12 text-lg font-bold" onClick={onClose}>
                            Regresar al Listado
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
