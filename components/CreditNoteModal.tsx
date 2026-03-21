"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api-service";
import { FileText, AlertCircle, Loader2, CheckCircle, Calculator } from "lucide-react";
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
    const [amount, setAmount] = useState<number>(0);
    const [reason, setReason] = useState("devolucion");
    const [otherReason, setOtherReason] = useState("");

    const router = useRouter();

    // Initialize amount when invoice is loaded
    useState(() => {
        if (invoice) setAmount(invoice.balancePendiente ?? invoice.total);
    });

    const handleConfirm = async () => {
        if (amount <= 0) {
            toast.error("El monto a acreditar debe ser mayor a cero.");
            return;
        }
        if (amount > (invoice.balancePendiente ?? invoice.total)) {
            toast.error("El monto no puede exceder el balance pendiente de la factura.");
            return;
        }

        setIsProcessing(true);
        try {
            const finalReason = reason === "otro" ? otherReason : reason;
            const res = await api.createCreditNote(invoice._id || invoice.id, {
                amount: Number(amount),
                reason: finalReason,
                requestId: typeof window !== 'undefined' && window.crypto?.randomUUID ? window.crypto.randomUUID() : `cn_${Date.now()}`
            });
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
    const maxAmount = invoice.balancePendiente ?? invoice.total;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] border-none shadow-2xl overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-indigo-600"></div>

                {step === 'confirm' ? (
                    <>
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                                <FileText className="text-red-500 w-6 h-6" /> Emitir Nota de Crédito
                            </DialogTitle>
                            <DialogDescription className="text-slate-500">
                                Se generará una <strong>Nota de Crédito</strong> para afectar esta factura.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="py-4 space-y-4">
                            {isOver30Days && (
                                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800 flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                    <div className="text-[11px] text-amber-800 dark:text-amber-200 leading-relaxed">
                                        <p className="font-semibold mb-0.5">Factura con más de 30 días</p>
                                        <p>Según la DGII (Regl. 293-11), después de 30 días el ITBIS de esta NC no genera crédito fiscal.</p>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-muted/30 p-3 rounded-xl border border-border/20">
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">NCF Original</p>
                                    <p className="font-mono text-xs font-semibold">{(invoice.ncfSequence || invoice.ncfType || invoice.id || "").toString().slice(-11)}</p>
                                </div>
                                <div className="bg-muted/30 p-3 rounded-xl border border-border/20">
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Total Factura</p>
                                    <p className="text-xs font-semibold">RD$ {invoice.total.toLocaleString()}</p>
                                </div>
                            </div>

                            <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                                <div className="space-y-1.5">
                                    <Label htmlFor="amount" className="text-xs font-bold uppercase text-slate-500">Monto a acreditar</Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">RD$</span>
                                        <Input
                                            id="amount"
                                            type="number"
                                            step="0.01"
                                            value={amount}
                                            onChange={(e) => setAmount(Number(e.target.value))}
                                            className="pl-12 h-11 text-lg font-bold border-slate-300 focus:border-primary focus:ring-primary shadow-sm"
                                            max={maxAmount}
                                        />
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] h-7 px-2 text-primary border border-primary/20 hover:bg-primary/5"
                                            onClick={() => setAmount(maxAmount)}
                                        >
                                            MAX
                                        </Button>
                                    </div>
                                    <p className="text-[10px] text-slate-400">Balance pendiente: RD$ {maxAmount.toLocaleString()}</p>
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="reason" className="text-xs font-bold uppercase text-slate-500">Motivo</Label>
                                    <Select value={reason} onValueChange={setReason}>
                                        <SelectTrigger className="h-10 bg-white border-slate-300">
                                            <SelectValue placeholder="Seleccione un motivo" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="devolucion">Devolución de productos</SelectItem>
                                            <SelectItem value="error">Error en facturación</SelectItem>
                                            <SelectItem value="ajuste">Ajuste de precio / Descuento</SelectItem>
                                            <SelectItem value="reemplazo">Reemplazo de mercancía</SelectItem>
                                            <SelectItem value="otro">Otro motivo...</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {reason === "otro" && (
                                    <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                                        <Input
                                            placeholder="Describa el motivo..."
                                            value={otherReason}
                                            onChange={(e) => setOtherReason(e.target.value)}
                                            className="h-10 bg-white border-slate-300"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0 mt-2">
                            <Button variant="ghost" onClick={onClose} disabled={isProcessing}>Cancelar</Button>
                            <Button variant="destructive" onClick={handleConfirm} disabled={isProcessing} className="gap-2 h-11 px-6">
                                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
                                Aplicar Nota de Crédito
                            </Button>
                        </DialogFooter>
                    </>
                ) : (
                    <div className="py-10 flex flex-col items-center text-center space-y-6 animate-in zoom-in duration-300">
                        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 shadow-inner">
                            <CheckCircle className="w-10 h-10" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-slate-900">Nota de Crédito Emitida</h3>
                            <p className="text-slate-500 mt-2">Se ha generado el comprobante fiscal:</p>
                        </div>
                        <div className="px-6 py-3 bg-slate-900 text-white rounded-xl font-mono text-xl tracking-widest shadow-lg border-2 border-slate-700">
                            {newNcf}
                        </div>
                        <Button className="w-full h-12 text-lg font-bold shadow-xl shadow-primary/20 transition-all hover:scale-[1.02]" onClick={onClose}>
                            Regresar al Listado
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
