"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-service";
import { FileText, AlertCircle, Loader2, CheckCircle } from "lucide-react";

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

    const handleConfirm = async () => {
        setIsProcessing(true);
        try {
            const res = await api.createCreditNote(invoice._id || invoice.id);
            setNewNcf(res.ncf);
            setStep('success');
            onSuccess();
        } catch (error: any) {
            alert("Error: " + (error.message || "No se pudo generar la nota de crédito"));
        } finally {
            setIsProcessing(false);
        }
    };

    if (!invoice) return null;

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
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between items-center">
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Factura Original</p>
                                    <p className="font-mono text-slate-700">{invoice.ncfSequence || invoice.type.split(" - ")[0]}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Monto Total</p>
                                    <p className="font-bold text-primary">RD$ {invoice.total.toLocaleString()}</p>
                                </div>
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
