"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CreditCard, Building2, Loader2, CheckCircle2, Upload, X, Copy } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

const STATUS_LABELS: Record<string, { label: string; color: string; dot: string }> = {
    active: { label: "Activo", color: "text-green-600", dot: "🟢" },
    Activo: { label: "Activo", color: "text-green-600", dot: "🟢" },
    pending: { label: "Pendiente de pago", color: "text-amber-600", dot: "🟡" },
    PendienteValidacion: { label: "Pendiente de validación", color: "text-amber-600", dot: "🟡" },
    expired: { label: "Expirado", color: "text-red-600", dot: "🔴" },
};

export function MembershipConfig({ onPaymentReported }: { onPaymentReported?: () => void } = {}) {
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
    const [transferReference, setTransferReference] = useState<{ reference: string } | null>(null);
    const [paymentReportedState, setPaymentReportedState] = useState<{ reference: string } | null>(null);

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
                            Validamos en 24-48 horas. Te notificaremos cuando esté activa.
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
                                {transferReference && (
                                    <div className="p-3 bg-slate-900 rounded-lg border border-slate-700 space-y-1">
                                        <p className="text-xs text-slate-300 uppercase tracking-wider font-semibold">Referencia (ponla en el concepto de la transferencia)</p>
                                        <div className="flex items-center gap-2">
                                            <code className="flex-1 px-3 py-2 bg-slate-800 rounded text-lg font-bold text-amber-400 font-mono tracking-wider">
                                                {transferReference.reference}
                                            </code>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                className="shrink-0 border-slate-600 text-slate-300 hover:bg-slate-700"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(transferReference.reference);
                                                    toast.success("Referencia copiada");
                                                }}
                                            >
                                                <Copy className="w-4 h-4" />
                                            </Button>
                                        </div>
                                        <p className="text-xs text-slate-400">Sin esta referencia no podemos activar tu plan automáticamente.</p>
                                    </div>
                                )}
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
                                {!comprobante && (
                                    <p className="text-xs text-muted-foreground">
                                        Debes subir el comprobante antes de continuar.
                                    </p>
                                )}
                                <p className="text-xs text-slate-500 italic border-l-2 border-amber-300 pl-3">
                                    Tu plan se activa automáticamente una vez validemos el pago (puede tardar hasta 24 horas).
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

                                {!paypalConfirmed && (
                                    <p className="text-xs text-muted-foreground">
                                        Debes confirmar antes de continuar.
                                    </p>
                                )}
                                <p className="text-xs text-slate-500 italic border-l-2 border-amber-300 pl-3">
                                    Tu plan se activa automáticamente una vez validemos el pago (puede tardar hasta 24 horas).
                                </p>
                            </div>
                        )}

                        {canSubmit && !paymentReportedState && !hasPending && (
                            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 space-y-1 text-sm">
                                <p className="font-medium text-slate-700">Resumen de tu solicitud</p>
                                <p className="text-slate-600">Plan Profesional • {selectedBilling === "annual" ? "Anual" : "Mensual"} • RD$ {selectedPrice.toLocaleString()} • {selectedMethod === "transferencia" ? "Transferencia" : "PayPal"}</p>
                                <p className="text-xs text-amber-700 mt-1">Tu plan se activa automáticamente una vez validemos el pago (puede tardar hasta 24 horas).</p>
                            </div>
                        )}

                        {/* Pantalla de tranquilidad: se muestra inmediatamente después de reportar */}
                        {(paymentReportedState || hasPending) && (
                            <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50/80 p-5 space-y-3 animate-in fade-in duration-200">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white">
                                        <CheckCircle2 className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-emerald-900">Pago reportado correctamente</p>
                                        <p className="text-sm text-emerald-800">
                                            Nuestro equipo lo validará en menos de 24 horas. Te notificaremos cuando tu plan esté activo.
                                        </p>
                                    </div>
                                </div>
                                {paymentReportedState?.reference && (
                                    <p className="text-xs text-emerald-700 font-mono">Referencia: {paymentReportedState.reference}</p>
                                )}
                            </div>
                        )}

                        {!paymentReportedState && !hasPending && (
                            <Button
                                onClick={handleRequestPayment}
                                disabled={isSubmitting || !canSubmit}
                                className="w-full bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
                            >
                                {isSubmitting ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</>
                                ) : (
                                    <><CheckCircle2 className="w-4 h-4 mr-2" /> He realizado el pago</>
                                )}
                            </Button>
                        )}

                        {(paymentReportedState || hasPending) && (
                            <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 text-sm font-medium">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                Pago reportado • En validación
                            </div>
                        )}
                    </>
                )}

                {!hasPending && !hasPro && (
                    <p className="text-sm text-muted-foreground">No hay planes disponibles en este momento.</p>
                )}
            </CardContent>
        </Card>
    );
}
