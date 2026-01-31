"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CreditCard, Building2, Loader2, CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

const STATUS_LABELS: Record<string, { label: string; color: string; dot: string }> = {
    active: { label: "Activo", color: "text-green-600", dot: "🟢" },
    pending: { label: "Pendiente de pago", color: "text-amber-600", dot: "🟡" },
    expired: { label: "Expirado", color: "text-red-600", dot: "🔴" },
};

export function MembershipConfig() {
    const [plans, setPlans] = useState<any[]>([]);
    const [paymentInfo, setPaymentInfo] = useState<{ bankName: string; bankAccount: string; paypalEmail: string } | null>(null);
    const [subscription, setSubscription] = useState<any>(null);
    const [selectedPlan, setSelectedPlan] = useState<string>("pro");
    const [selectedMethod, setSelectedMethod] = useState<"transferencia" | "paypal">("transferencia");
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const { api } = await import("@/lib/api-service");
                const [plansRes, infoRes, statusRes] = await Promise.all([
                    api.getMembershipPlans(),
                    api.getMembershipPaymentInfo(),
                    api.getSubscriptionStatus().catch(() => null),
                ]);
                setPlans(plansRes?.plans || []);
                setPaymentInfo(infoRes || null);
                setSubscription(statusRes || null);
            } catch {
                toast.error("Error al cargar planes.");
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, []);

    const handleRequestPayment = async () => {
        if (selectedPlan === "free") {
            toast.info("El plan Free ya está incluido.");
            return;
        }
        setIsSubmitting(true);
        try {
            const { api } = await import("@/lib/api-service");
            await api.requestMembershipPayment(selectedPlan, selectedMethod);
            toast.success("Tu solicitud fue registrada. Tu membresía será activada una vez validemos el pago.");
            const status = await api.getSubscriptionStatus();
            setSubscription(status);
        } catch (e: any) {
            toast.error(e.message || "Error al registrar solicitud.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const statusInfo = subscription?.status ? STATUS_LABELS[subscription.status] || STATUS_LABELS.pending : STATUS_LABELS.active;
    const paidPlans = plans.filter((p: any) => p.price > 0);
    const hasPending = subscription?.status === "pending";

    if (isLoading) {
        return (
            <Card className="border-none shadow-lg bg-amber-50/50 backdrop-blur-sm border-amber-100">
                <CardContent className="py-12 flex justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card id="membresia" className="border-none shadow-lg bg-amber-50/50 backdrop-blur-sm border-amber-100 scroll-mt-24">
            <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-amber-600" /> Membresía
                </CardTitle>
                <CardDescription>
                    Actualiza tu plan para facturas ilimitadas. Pagos por transferencia o PayPal.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Estado actual */}
                <div className="p-4 bg-white rounded-xl border border-amber-100">
                    <p className="text-sm font-medium text-slate-600">Estado actual</p>
                    <p className={`text-lg font-bold ${statusInfo.color}`}>
                        {statusInfo.dot} {statusInfo.label}
                        {subscription?.plan && (
                            <span className="ml-2 text-slate-700 font-normal">— Plan {subscription.plan}</span>
                        )}
                    </p>
                    {subscription?.daysRemaining != null && subscription.daysRemaining < 999 && (
                        <p className="text-sm text-muted-foreground mt-1">
                            {subscription.daysRemaining} días restantes
                        </p>
                    )}
                </div>

                {hasPending && (
                    <div className="p-4 bg-amber-100/80 rounded-xl border border-amber-200">
                        <p className="text-sm font-medium text-amber-900">
                            Estamos validando tu pago manualmente para mayor seguridad.
                        </p>
                        <p className="text-sm text-amber-800 mt-1">
                            Tu membresía será activada pronto. Te notificaremos cuando esté lista.
                        </p>
                    </div>
                )}

                {paidPlans.length > 0 && (
                    <>
                        <div>
                            <Label className="text-slate-700">Elige tu plan</Label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                                {paidPlans.map((p: any) => (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => setSelectedPlan(p.id)}
                                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                                            selectedPlan === p.id
                                                ? "border-amber-500 bg-amber-50"
                                                : "border-slate-200 hover:border-amber-200"
                                        }`}
                                    >
                                        <p className="font-bold text-slate-800">{p.name}</p>
                                        <p className="text-lg font-bold text-amber-600">
                                            {p.price === 0 ? "Gratis" : `RD$ ${p.price}/mes`}
                                        </p>
                                        <ul className="text-xs text-slate-600 mt-2 space-y-1">
                                            {p.features?.slice(0, 3).map((f: string, i: number) => (
                                                <li key={i}>• {f}</li>
                                            ))}
                                        </ul>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <Label className="text-slate-700">Método de pago</Label>
                            <div className="flex gap-4 mt-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="method"
                                        checked={selectedMethod === "transferencia"}
                                        onChange={() => setSelectedMethod("transferencia")}
                                        className="accent-amber-600"
                                    />
                                    <span>🏦 Transferencia bancaria</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="method"
                                        checked={selectedMethod === "paypal"}
                                        onChange={() => setSelectedMethod("paypal")}
                                        className="accent-amber-600"
                                    />
                                    <span>💲 PayPal</span>
                                </label>
                            </div>
                        </div>

                        {selectedMethod === "transferencia" && paymentInfo && (
                            <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2">
                                <p className="font-medium text-slate-700 flex items-center gap-2">
                                    <Building2 className="w-4 h-4" /> Datos para transferencia
                                </p>
                                <p className="text-sm"><strong>Banco:</strong> {paymentInfo.bankName}</p>
                                <p className="text-sm font-mono"><strong>Cuenta:</strong> {paymentInfo.bankAccount}</p>
                                <p className="text-xs text-muted-foreground mt-2">
                                    Realiza la transferencia y haz clic en &quot;He realizado el pago&quot;.
                                </p>
                            </div>
                        )}

                        {selectedMethod === "paypal" && paymentInfo && (
                            <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2">
                                <p className="font-medium text-slate-700 flex items-center gap-2">
                                    <CreditCard className="w-4 h-4" /> Envía a PayPal
                                </p>
                                <p className="text-sm font-mono"><strong>Email:</strong> {paymentInfo.paypalEmail}</p>
                                <p className="text-xs text-muted-foreground mt-2">
                                    Envía el pago y haz clic en &quot;He realizado el pago&quot;.
                                </p>
                            </div>
                        )}

                        <Button
                            onClick={handleRequestPayment}
                            disabled={isSubmitting || hasPending}
                            className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                        >
                            {isSubmitting ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</>
                            ) : (
                                <><CheckCircle2 className="w-4 h-4 mr-2" /> He realizado el pago</>
                            )}
                        </Button>
                    </>
                )}

                {!hasPending && paidPlans.length === 0 && (
                    <p className="text-sm text-muted-foreground">No hay planes disponibles en este momento.</p>
                )}
            </CardContent>
        </Card>
    );
}
