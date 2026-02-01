"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CreditCard, Building2, Loader2, CheckCircle2, Upload, X, Copy } from "lucide-react";
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
    const [selectedBilling, setSelectedBilling] = useState<"monthly" | "annual">("annual");
    const [selectedMethod, setSelectedMethod] = useState<"transferencia" | "paypal">("transferencia");
    const [comprobante, setComprobante] = useState<string | null>(null);
    const [paypalConfirmed, setPaypalConfirmed] = useState(false);
    const [userEmail, setUserEmail] = useState<string>("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const { api } = await import("@/lib/api-service");
                const [plansRes, infoRes, statusRes, meRes] = await Promise.all([
                    api.getMembershipPlans(),
                    api.getMembershipPaymentInfo(),
                    api.getSubscriptionStatus().catch(() => null),
                    api.getMe().catch(() => null),
                ]);
                setPlans(plansRes?.plans || []);
                setPaymentInfo(infoRes || null);
                setSubscription(statusRes || null);
                setUserEmail(meRes?.email || "");
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
            await api.requestMembershipPayment(selectedPlan, selectedBilling, selectedMethod, selectedMethod === "transferencia" ? comprobante || undefined : undefined);
            toast.success("Tu solicitud fue registrada. Tu membresía será activada una vez validemos el pago.");
            setComprobante(null);
            setPaypalConfirmed(false);
            const status = await api.getSubscriptionStatus();
            setSubscription(status);
        } catch (e: any) {
            toast.error(e.message || "Error al registrar solicitud.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const canSubmit =
        (selectedMethod === "transferencia" && !!comprobante) ||
        (selectedMethod === "paypal" && paypalConfirmed);

    const statusInfo = subscription?.status ? STATUS_LABELS[subscription.status] || STATUS_LABELS.pending : STATUS_LABELS.active;
    const proPlan = plans.find((p: any) => p.id === "pro");
    const premiumPlan = plans.find((p: any) => p.id === "premium");
    const hasPro = proPlan?.available !== false;
    const selectedPrice = selectedBilling === "annual" ? (proPlan?.priceAnnual ?? 9500) : (proPlan?.priceMonthly ?? 950);
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

                {hasPro && (
                    <>
                        <div>
                            <Label className="text-slate-700">Elige tu plan</Label>
                            <div className="space-y-3 mt-2">
                                {/* Plan Profesional: Mensual + Anual */}
                                <div className="rounded-xl border-2 border-amber-200 bg-white overflow-hidden">
                                    <div className="p-4 bg-amber-50/50 border-b border-amber-100">
                                        <p className="font-bold text-slate-800">{proPlan?.name || "Profesional"}</p>
                                        <ul className="text-xs text-slate-600 mt-1 space-y-0.5">
                                            {(proPlan?.features || []).slice(0, 3).map((f: string, i: number) => (
                                                <li key={i}>• {f}</li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div className="grid grid-cols-2 gap-0">
                                        <button
                                            type="button"
                                            onClick={() => setSelectedBilling("monthly")}
                                            className={`p-4 text-left transition-all border-r border-slate-200 ${
                                                selectedBilling === "monthly"
                                                    ? "bg-amber-50 border-amber-500 ring-2 ring-amber-500 ring-inset"
                                                    : "hover:bg-slate-50"
                                            }`}
                                        >
                                            <p className="text-sm font-medium text-slate-600">Mensual</p>
                                            <p className="text-xl font-bold text-amber-600">RD$ {proPlan?.priceMonthly ?? 950}</p>
                                            <p className="text-xs text-muted-foreground">/mes</p>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedBilling("annual")}
                                            className={`p-4 text-left transition-all relative ${
                                                selectedBilling === "annual"
                                                    ? "bg-amber-50 ring-2 ring-amber-500 ring-inset"
                                                    : "hover:bg-slate-50"
                                            }`}
                                        >
                                            {proPlan?.annualPopular && (
                                                <span className="absolute top-2 right-2 text-xs font-semibold text-amber-700 bg-amber-200/80 px-2 py-0.5 rounded">
                                                    ⭐ Más popular
                                                </span>
                                            )}
                                            <p className="text-sm font-medium text-slate-600">Anual</p>
                                            <p className="text-xl font-bold text-amber-600">RD$ {proPlan?.priceAnnual ?? 9500}</p>
                                            <p className="text-xs text-amber-700 font-medium">
                                                🎁 {proPlan?.annualNote || "Paga 10 meses y usa 12"}
                                            </p>
                                        </button>
                                    </div>
                                </div>

                                {/* Premium: Próximamente */}
                                {premiumPlan && (
                                    <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-4 opacity-75 cursor-not-allowed">
                                        <p className="font-bold text-slate-600">{premiumPlan.name}</p>
                                        <p className="text-sm text-amber-700 font-medium mt-1">
                                            {premiumPlan.comingSoonNote || "Próximamente"}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Se agregará en el futuro.
                                        </p>
                                    </div>
                                )}
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
                                        onChange={() => { setSelectedMethod("transferencia"); setComprobante(null); setPaypalConfirmed(false); }}
                                        className="accent-amber-600"
                                    />
                                    <span>🏦 Transferencia bancaria</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="method"
                                        checked={selectedMethod === "paypal"}
                                        onChange={() => { setSelectedMethod("paypal"); setComprobante(null); setPaypalConfirmed(false); }}
                                        className="accent-amber-600"
                                    />
                                    <span>💲 PayPal</span>
                                </label>
                            </div>
                        </div>

                        {selectedMethod === "transferencia" && paymentInfo && (
                            <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-4">
                                <p className="font-medium text-slate-700 flex items-center gap-2">
                                    <Building2 className="w-4 h-4" /> Datos para transferencia
                                </p>
                                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                                    <p className="text-sm text-amber-900 font-semibold">Monto a transferir</p>
                                    <p className="text-2xl font-bold text-amber-700">RD$ {selectedPrice}</p>
                                </div>
                                <p className="text-sm"><strong>Banco:</strong> {paymentInfo.bankName}</p>
                                <p className="text-sm font-mono"><strong>Cuenta:</strong> {paymentInfo.bankAccount}</p>
                                <div className="space-y-2">
                                    <Label className="text-slate-700">Comprobante de pago *</Label>
                                    <p className="text-xs text-muted-foreground">Sube una captura de pantalla o foto del comprobante.</p>
                                    {!comprobante ? (
                                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-amber-300 rounded-xl cursor-pointer bg-amber-50/50 hover:bg-amber-50 transition-colors">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file && file.size <= 5 * 1024 * 1024) {
                                                        const reader = new FileReader();
                                                        reader.onload = () => setComprobante(reader.result as string);
                                                        reader.readAsDataURL(file);
                                                    } else if (file) {
                                                        toast.error("La imagen no debe superar 5 MB.");
                                                    }
                                                }}
                                            />
                                            <Upload className="w-8 h-8 text-amber-600 mb-2" />
                                            <span className="text-sm font-medium text-amber-700">Haz clic para subir</span>
                                            <span className="text-xs text-slate-500">PNG, JPG (máx. 5 MB)</span>
                                        </label>
                                    ) : (
                                        <div className="relative inline-block">
                                            <img src={comprobante} alt="Comprobante" className="max-h-40 rounded-lg border border-slate-200 object-contain" />
                                            <button
                                                type="button"
                                                onClick={() => setComprobante(null)}
                                                className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                                                aria-label="Quitar comprobante"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                            <p className="text-xs text-green-600 mt-1 font-medium">✓ Comprobante cargado</p>
                                        </div>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Debes subir el comprobante antes de continuar.
                                </p>
                            </div>
                        )}

                        {selectedMethod === "paypal" && paymentInfo && (
                            <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-4">
                                <p className="font-medium text-slate-700 flex items-center gap-2">
                                    <CreditCard className="w-4 h-4" /> Envía a PayPal
                                </p>

                                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                                    <p className="text-sm text-amber-900 font-semibold">Monto a enviar</p>
                                    <p className="text-2xl font-bold text-amber-700 mt-0.5">
                                        RD$ {selectedPrice}
                                    </p>
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-slate-600 text-sm">Email de PayPal</Label>
                                    <div className="flex items-center gap-2">
                                        <code className="flex-1 px-3 py-2 bg-slate-100 rounded-lg text-sm font-mono truncate">
                                            {paymentInfo.paypalEmail}
                                        </code>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            className="shrink-0"
                                            onClick={() => {
                                                navigator.clipboard.writeText(paymentInfo.paypalEmail);
                                                toast.success("Email copiado");
                                            }}
                                        >
                                            <Copy className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-slate-600 text-sm">Incluye en la nota del pago</Label>
                                    <p className="text-xs text-muted-foreground">
                                        Para identificar tu solicitud, escribe esto en el concepto/nota:
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <code className="flex-1 px-3 py-2 bg-slate-100 rounded-lg text-sm font-mono truncate">
                                            LexisBill {selectedPlan} {userEmail ? `- ${userEmail}` : ""}
                                        </code>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            className="shrink-0"
                                            onClick={() => {
                                                const note = `LexisBill ${selectedPlan}${userEmail ? ` - ${userEmail}` : ""}`;
                                                navigator.clipboard.writeText(note);
                                                toast.success("Nota copiada");
                                            }}
                                        >
                                            <Copy className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>

                                <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-amber-200 bg-amber-50/50 hover:bg-amber-50 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={paypalConfirmed}
                                        onChange={(e) => setPaypalConfirmed(e.target.checked)}
                                        className="mt-0.5 accent-amber-600"
                                    />
                                    <span className="text-sm text-slate-700">
                                        Confirmo que envié el pago por <strong>RD$ {selectedPrice}</strong> a{" "}
                                        <strong>{paymentInfo.paypalEmail}</strong> e incluí mi correo en la nota del pago.
                                    </span>
                                </label>

                                <p className="text-xs text-muted-foreground">
                                    Debes confirmar antes de continuar.
                                </p>
                            </div>
                        )}

                        <Button
                            onClick={handleRequestPayment}
                            disabled={isSubmitting || hasPending || !canSubmit}
                            className="w-full bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</>
                            ) : (
                                <><CheckCircle2 className="w-4 h-4 mr-2" /> He realizado el pago</>
                            )}
                        </Button>
                    </>
                )}

                {!hasPending && !hasPro && (
                    <p className="text-sm text-muted-foreground">No hay planes disponibles en este momento.</p>
                )}
            </CardContent>
        </Card>
    );
}
