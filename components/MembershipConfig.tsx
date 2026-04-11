"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CreditCard, Building2, Loader2, CheckCircle2, Upload, X, Copy, Sparkles, Trophy, Wallet } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<string, { label: string; color: string; dot: string; icon: any }> = {
    active: { label: "Activo", color: "text-emerald-600 bg-emerald-50 border-emerald-100", dot: "🟢", icon: CheckCircle2 },
    Activo: { label: "Activo", color: "text-emerald-600 bg-emerald-50 border-emerald-100", dot: "🟢", icon: CheckCircle2 },
    pending: { label: "Pendiente", color: "text-primary bg-primary/5 border-primary/20", dot: "🔵", icon: Loader2 },
    PendienteValidacion: { label: "Validando", color: "text-primary bg-primary/5 border-primary/20", dot: "🔵", icon: Loader2 },
    expired: { label: "Expirado", color: "text-red-600 bg-red-50 border-red-100", dot: "🔴", icon: X },
};

function ProgressStatus({ subscription }: { subscription: any }) {
    if (!subscription || subscription.daysRemaining == null) return null;
    const days = subscription.daysRemaining;
    const pct = Math.min(100, Math.max(0, (days / 30) * 100));
    let colorClass = "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]";
    if (days <= 5) colorClass = "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]";
    else if (days <= 10) colorClass = "bg-primary shadow-[0_0_10px_rgba(59,130,246,0.5)]";

    return (
        <div className="space-y-3 p-6 bg-white dark:bg-slate-900 rounded-2xl border border-border shadow-sm">
            <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-bold text-foreground">Tu Membresía</span>
                <span className={cn("text-xs font-black px-2 py-0.5 rounded-full uppercase tracking-tighter", 
                    days > 10 ? "text-emerald-700 bg-emerald-50" : days > 5 ? "text-primary bg-primary/5" : "text-red-700 bg-red-50"
                )}>
                    {days <= 0 ? "Expirada" : `${days} días`}
                </span>
            </div>
            <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700 relative">
                <div 
                    className={cn("h-full transition-all duration-1000 ease-out animate-shimmer", colorClass)}
                    style={{ width: `${pct}%` }}
                />
            </div>
            {days <= 10 && (
                <p className="text-[11px] font-medium text-muted-foreground italic flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-primary" /> Sugerencia: Renueva hoy para mantener tus facturas ilimitadas.
                </p>
            )}
        </div>
    );
}

export function MembershipConfig({ onPaymentReported }: { onPaymentReported?: () => void } = {}) {
    const [plans, setPlans] = useState<any[]>([]);
    const [paymentInfo, setPaymentInfo] = useState<{ bankName: string; bankAccount: string; bankHolder?: string; bankHolderDoc?: string; paypalEmail: string; paypalMeUrl?: string } | null>(null);
    const [subscription, setSubscription] = useState<any>(null);
    const [selectedPlan, setSelectedPlan] = useState<string>("pro");
    const [selectedBilling, setSelectedBilling] = useState<"monthly" | "annual">("annual");
    const [selectedMethod, setSelectedMethod] = useState<"transferencia" | "paypal">("transferencia");
    const [comprobante, setComprobante] = useState<string | null>(null);
    const [paypalConfirmed, setPaypalConfirmed] = useState(false);
    const [userEmail, setUserEmail] = useState<string>("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [transferReference, setTransferReference] = useState<{ reference: string } | null>(null);
    const [paymentReportedState, setPaymentReportedState] = useState<{ reference: string } | null>(null);

    useEffect(() => {
        const load = async () => {
            try {
                const { api } = await import("@/lib/api-service");
                const [plansRes, infoRes, statusRes, meRes] = await Promise.all([
                    api.getMembershipPlans().catch(() => null),
                    api.getMembershipPaymentInfo().catch(() => null),
                    api.getSubscriptionStatus().catch(() => null),
                    api.getMe().catch(() => null),
                ]);
                if (plansRes?.plans) setPlans(plansRes.plans);
                setPaymentInfo(infoRes || null);
                setSubscription(statusRes || null);
                setUserEmail(meRes?.email || "");
            } catch {
                console.error("Error cargando componentes de membresía");
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, []);

    const statusInfo = subscription?.status ? STATUS_LABELS[subscription.status] || STATUS_LABELS.pending : STATUS_LABELS.active;
    const proPlan = plans.find((p: any) => p.id === "pro");
    const hasPro = proPlan?.available !== false;
    const selectedPrice = selectedBilling === "annual" ? (proPlan?.priceAnnual ?? 9500) : (proPlan?.priceMonthly ?? 950);
    const hasPending = !!(
        subscription?.hasPendingPayment ||
        subscription?.internalStatus === "PENDING_PAYMENT" ||
        subscription?.status === "pending" ||
        subscription?.status === "PendienteValidacion"
    );

    useEffect(() => {
        if (selectedMethod !== "transferencia" || selectedPlan === "free" || hasPending) {
            setTransferReference(null);
            return;
        }
        const prepare = async () => {
            try {
                const { api } = await import("@/lib/api-service");
                const data = await api.prepareTransfer(selectedPlan, selectedBilling);
                setTransferReference({ reference: data.reference });
            } catch {
                setTransferReference(null);
            }
        };
        prepare();
    }, [selectedMethod, selectedPlan, selectedBilling, hasPending]);

    const handleRequestPayment = async () => {
        if (selectedPlan === "free") {
            toast.info("El plan Free ya está incluido.");
            return;
        }
        if (selectedMethod === "transferencia" && !comprobante) {
            toast.error("Debes subir el comprobante de transferencia para continuar.");
            return;
        }
        if (selectedMethod === "paypal" && !paypalConfirmed) {
            toast.error("Debes confirmar que realizaste el pago por PayPal.");
            return;
        }
        setIsSubmitting(true);
        try {
            const { api } = await import("@/lib/api-service");
            const res = await api.requestMembershipPayment(
                selectedPlan,
                selectedBilling,
                selectedMethod,
                selectedMethod === "transferencia" ? comprobante || undefined : undefined,
                selectedMethod === "transferencia" ? transferReference?.reference : undefined
            );
            const reference = res?.payment?.reference || transferReference?.reference || "";
            setPaymentReportedState({ reference });
            if (res?.subscription) setSubscription(res.subscription);
            else {
                const status = await api.getSubscriptionStatus();
                setSubscription(status);
            }
            setComprobante(null);
            setPaypalConfirmed(false);
            toast.success("Solicitud registrada. Validamos tu pago en 24-48 horas laborables.");
            onPaymentReported?.();
        } catch (e: unknown) {
            const msg = e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : "Error al registrar solicitud.";
            toast.error(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const premiumPlan = plans.find((p: any) => p.id === "premium");
    const canSubmit =
        (selectedMethod === "transferencia" && !!comprobante && !!transferReference) ||
        (selectedMethod === "paypal" && paypalConfirmed);

    if (isLoading) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div id="membresia" className="space-y-8 scroll-mt-24">
            {/* Header Moderno con Barra de Progreso Integrada */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3 space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center shadow-inner">
                            <Wallet className="w-7 h-7" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-foreground tracking-tighter">Plan y Facturación</h2>
                            <p className="text-muted-foreground font-medium italic">Acceso ilimitado a herramientas inteligentes</p>
                        </div>
                    </div>
                    {/* Badge de Estado Actual */}
                    <div className={cn("inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold shadow-sm transition-all", statusInfo.color)}>
                        <div className={cn("w-2 h-2 rounded-full animate-pulse bg-current")} />
                        {statusInfo.label.toUpperCase()}
                        {subscription?.plan && (
                            <span className="ml-2 border-l border-current/20 pl-2 opacity-80">PLAN {subscription.plan.toUpperCase()}</span>
                        )}
                    </div>
                </div>
                <div className="lg:col-span-2">
                    <ProgressStatus subscription={subscription} />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                {/* Selección de Plan */}
                <div className="space-y-6">
                    <div className="space-y-2">
                        <h3 className="text-lg font-black text-foreground flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-primary" /> Elige tu Plan Trinalyze
                        </h3>
                        <p className="text-sm text-muted-foreground">Obtén todas las funciones sin límites anuales.</p>
                    </div>

                    <div className="grid gap-4">
                        {/* Profesional Anual (Recomendado) */}
                        <button
                            onClick={() => { setSelectedPlan("pro"); setSelectedBilling("annual"); }}
                            className={cn(
                                "relative p-6 text-left rounded-3xl border-2 transition-all group overflow-hidden",
                                selectedPlan === "pro" && selectedBilling === "annual" 
                                    ? "border-primary bg-primary/5 shadow-xl shadow-primary/10 ring-1 ring-primary/20" 
                                    : "border-border bg-card hover:border-primary/40 hover:bg-primary/5"
                            )}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h4 className="text-xl font-black text-foreground">Profesional Anual</h4>
                                    <p className="text-xs text-primary font-bold uppercase tracking-widest mt-1">El más popular</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-3xl font-black text-foreground">RD$ 9,500</span>
                                    <p className="text-[10px] text-muted-foreground font-medium">un solo pago anual</p>
                                </div>
                            </div>
                            <div className="space-y-2 mt-4">
                                <p className="text-sm font-bold text-emerald-600 flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4" /> 🎁 2 meses gratis (RD$ 1,900 ahorro)
                                </p>
                                <p className="text-sm font-medium text-muted-foreground">Facturación electrónica ilimitada y Business Copilot</p>
                            </div>
                            {selectedPlan === "pro" && selectedBilling === "annual" && (
                                <div className="absolute top-0 right-0 p-2 bg-primary text-white rounded-bl-xl">
                                    <CheckCircle2 className="w-4 h-4" />
                                </div>
                            )}
                        </button>

                        {/* Profesional Mensual */}
                        <button
                            onClick={() => { setSelectedPlan("pro"); setSelectedBilling("monthly"); }}
                            className={cn(
                                "p-6 text-left rounded-3xl border-2 transition-all group",
                                selectedPlan === "pro" && selectedBilling === "monthly" 
                                    ? "border-primary bg-primary/5 shadow-xl shadow-primary/10" 
                                    : "border-border bg-card hover:border-primary/40"
                            )}
                        >
                            <div className="flex justify-between items-center">
                                <div>
                                    <h4 className="text-lg font-bold text-foreground">Profesional Mensual</h4>
                                    <p className="text-xs text-muted-foreground">Sin compromisos</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-2xl font-black text-foreground">RD$ 950</span>
                                    <p className="text-[10px] text-muted-foreground font-medium">por mes</p>
                                </div>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Métodos de Pago y Acción */}
                <div className="space-y-6">
                    <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-6">
                        <div className="space-y-2">
                            <h3 className="text-lg font-bold text-foreground">Selecciona Método de Pago</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setSelectedMethod("transferencia")}
                                    className={cn(
                                        "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
                                        selectedMethod === "transferencia" 
                                            ? "border-primary bg-primary/5 text-primary" 
                                            : "border-border hover:bg-muted/50 text-muted-foreground"
                                    )}
                                >
                                    <Building2 className="w-6 h-6" />
                                    <span className="text-xs font-black uppercase tracking-tighter">Transferencia</span>
                                </button>
                                <button
                                    onClick={() => setSelectedMethod("paypal")}
                                    className={cn(
                                        "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
                                        selectedMethod === "paypal" 
                                            ? "border-primary bg-primary/5 text-primary" 
                                            : "border-border hover:bg-muted/50 text-muted-foreground"
                                    )}
                                >
                                    <CreditCard className="w-6 h-6" />
                                    <span className="text-xs font-black uppercase tracking-tighter">PayPal</span>
                                </button>
                            </div>
                        </div>

                        {/* Contenido dinámico según el método */}
                        {selectedMethod === "transferencia" && paymentInfo && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-4">
                                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 space-y-2">
                                    <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-2">Instrucciones</p>
                                    <p className="text-xs text-slate-600 mb-4 italic">Realiza transferencia por <strong>RD$ {selectedPrice.toLocaleString()}</strong> y sube el comprobante.</p>
                                    
                                    <div className="space-y-1.5 font-mono text-xs">
                                        <div className="flex justify-between border-b pb-1">
                                            <span>Banco:</span> <span className="font-bold">{paymentInfo.bankName}</span>
                                        </div>
                                        <div className="flex justify-between border-b pb-1">
                                            <span>Cuenta:</span> <span className="font-bold">{paymentInfo.bankAccount}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Nombre:</span> <span className="font-bold truncate max-w-[150px]">{paymentInfo.bankHolder}</span>
                                        </div>
                                    </div>
                                    
                                    {transferReference && (
                                        <div className="mt-4 p-3 bg-primary text-white rounded-xl text-center space-y-1">
                                            <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">Concepto / Referencia</p>
                                            <p className="text-xl font-black tracking-widest">{transferReference.reference}</p>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    {!comprobante ? (
                                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-primary/20 rounded-2xl cursor-pointer bg-primary/5 hover:bg-primary/10 transition-colors">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        const reader = new FileReader();
                                                        reader.onload = () => setComprobante(reader.result as string);
                                                        reader.readAsDataURL(file);
                                                    }
                                                }}
                                            />
                                            <Upload className="w-10 h-10 text-primary/40 mb-2" />
                                            <span className="text-xs font-black text-primary uppercase">Subir Comprobante</span>
                                        </label>
                                    ) : (
                                        <div className="relative group">
                                            <img src={comprobante} alt="Pago" className="w-full h-32 object-cover rounded-2xl border border-border" />
                                            <button 
                                                onClick={() => setComprobante(null)}
                                                className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full shadow-lg"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {selectedMethod === "paypal" && paymentInfo && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-4">
                                <div className="bg-[#0070ba]/5 rounded-2xl p-4 border border-[#0070ba]/20 space-y-4">
                                    <p className="text-xs font-black text-[#0070ba] uppercase tracking-widest">Instrucciones PayPal</p>
                                    <p className="text-sm font-medium text-slate-700 italic">Paga <strong>RD$ {selectedPrice.toLocaleString()}</strong> via PayPal.Me</p>
                                    
                                    <a 
                                        href={paymentInfo.paypalMeUrl} 
                                        target="_blank" 
                                        className="flex items-center justify-center gap-2 w-full py-3 bg-[#0070ba] text-white rounded-xl font-black text-sm shadow-md"
                                    >
                                        <CreditCard className="w-4 h-4" /> BOTÓN DE PAGO PAYPAL
                                    </a>

                                    <label className="flex items-start gap-2 cursor-pointer pt-2">
                                        <input 
                                            type="checkbox" 
                                            className="mt-1 accent-[#0070ba]" 
                                            checked={paypalConfirmed} 
                                            onChange={(e) => setPaypalConfirmed(e.target.checked)} 
                                        />
                                        <span className="text-xs font-bold text-slate-600">Confirmo que completé el envío del monto acordado</span>
                                    </label>
                                </div>
                            </div>
                        )}

                        <Button
                            onClick={handleRequestPayment}
                            disabled={isSubmitting || !canSubmit || hasPending}
                            className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-black text-lg transition-transform active:scale-95 shadow-xl shadow-primary/20 rounded-2xl"
                        >
                            {isSubmitting ? <Loader2 className="animate-spin" /> : <><CheckCircle2 className="w-5 h-5 mr-2" /> REPORTAR PAGO</>}
                        </Button>
                        
                        {!canSubmit && !hasPending && (
                            <p className="text-center text-[10px] text-muted-foreground font-medium uppercase tracking-widest mt-2 animate-pulse">
                                Complete los requerimientos arriba para habilitar el botón
                            </p>
                        )}
                        
                        {hasPending && (
                            <div className="text-center p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                                <p className="text-[11px] font-black text-emerald-800 uppercase tracking-tighter">Estamos validando tu última solicitud</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
