"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users, DollarSign, Zap, CheckCircle2, Loader2, Handshake, Mail, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

const TERMS_SUMMARY = "La cartera de clientes referidos pertenece a Lexis Bill. Recibes comisión mientras el cliente permanezca activo. Pago mensual 30 días después del cobro. Lexis Bill puede modificar tasas con 30 días de anticipación o suspender por incumplimiento.";

const TERMS_FULL = `Términos del Programa de Partners Lexis Bill

• La cartera de clientes referidos pertenece a Lexis Bill. El partner recibe comisión mientras el cliente permanezca activo dentro del programa.

• La comisión se paga mensualmente, 30 días después del cobro efectivo al cliente.

• El partner se compromete a brindar soporte básico de onboarding a sus referidos.

• Lexis Bill se reserva el derecho de modificar tasas de comisión con 30 días de anticipación.

• Lexis Bill puede suspender al partner por incumplimiento de términos o conducta fraudulenta.`;

function UnirseComoPartnerContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const inviteParam = searchParams.get("invite") || "";
    const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
    const [form, setForm] = useState({ name: "", phone: "", whyPartner: "", termsAccepted: false });
    const [isLoading, setIsLoading] = useState(false);
    const [inviteValid, setInviteValid] = useState<boolean | null>(null);
    const [termsOpen, setTermsOpen] = useState(false);

    useEffect(() => {
        const check = async () => {
            try {
                const { api } = await import("@/lib/api-service");
                const me = await api.getMe();
                setIsLoggedIn(!!me);
                if (me) setForm((f) => ({ ...f, name: me.name || "" }));
            } catch {
                setIsLoggedIn(false);
            }
        };
        check();
    }, []);

    useEffect(() => {
        if (!inviteParam) {
            setInviteValid(false);
            return;
        }
        const validate = async () => {
            try {
                const { api } = await import("@/lib/api-service");
                const res = await api.validateInviteToken(inviteParam);
                setInviteValid(res?.valid ?? false);
            } catch {
                setInviteValid(false);
            }
        };
        validate();
    }, [inviteParam]);

    const handleApply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.termsAccepted) {
            toast.error("Debes aceptar los términos del Programa de Partners.");
            return;
        }
        setIsLoading(true);
        try {
            const { api } = await import("@/lib/api-service");
            await api.applyPartner({
                name: form.name,
                phone: form.phone,
                whyPartner: form.whyPartner.trim() || undefined,
                inviteToken: inviteValid ? inviteParam : undefined
            });
            toast.success("Solicitud enviada. Te contactaremos cuando sea aprobada.");
            router.push("/dashboard");
        } catch (err: unknown) {
            const msg = err && typeof err === "object" && "message" in err ? String((err as { message: unknown }).message) : "Error al enviar solicitud";
            toast.error(msg);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoggedIn === null) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0F172A]">
                <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
            </div>
        );
    }

    if (!isLoggedIn) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0F172A] px-4 py-8">
                <div className="w-full max-w-lg">
                    <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-400 hover:text-amber-400 mb-6 text-sm">
                        <ArrowLeft className="w-4 h-4" /> Volver
                    </button>
                    <Card className="bg-white/95 dark:bg-card border-none shadow-2xl overflow-hidden rounded-2xl">
                        <div className="h-2 w-full bg-gradient-to-r from-blue-600 via-amber-500 to-blue-950" />
                        <CardHeader className="text-center pb-2 pt-8">
                            <Handshake className="w-14 h-14 mx-auto text-amber-500 mb-2" />
                            <CardTitle className="text-2xl font-black text-slate-900 dark:text-foreground">Programa Partners Lexis Bill</CardTitle>
                            <CardDescription className="text-slate-500 font-medium pt-1">
                                Gana comisiones recurrentes por cada cliente que refieras
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="px-6 md:px-10 pb-10">
                            <p className="text-center text-slate-600 dark:text-muted-foreground mb-6">
                                Debes tener una cuenta en Lexis Bill para aplicar como partner.
                            </p>
                            <div className="flex flex-col gap-3">
                                {inviteParam && (
                                    <p className="text-center text-amber-600 dark:text-amber-400 text-sm font-medium">
                                        {inviteValid === true ? "Tienes una invitación válida. " : ""}Crea cuenta o inicia sesión para aplicar.
                                    </p>
                                )}
                                <div className="flex gap-3">
                                    <Link href={inviteParam ? `/registro?invite=${inviteParam}` : "/registro"} className="flex-1">
                                        <Button className="w-full bg-amber-500 hover:bg-amber-600 text-white">Crear cuenta</Button>
                                    </Link>
                                    <Link href={inviteParam ? `/login?redirect=${encodeURIComponent(`/unirse-como-partner?invite=${inviteParam}`)}` : "/login"} className="flex-1">
                                        <Button variant="outline" className="w-full">Ya tengo cuenta</Button>
                                    </Link>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0F172A] px-4 py-8">
            <div className="w-full max-w-2xl">
                <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-400 hover:text-amber-400 mb-6 text-sm">
                    <ArrowLeft className="w-4 h-4" /> Volver
                </button>
                <Card className="bg-white/95 dark:bg-card border-none shadow-2xl overflow-hidden rounded-2xl">
                    <div className="h-2 w-full bg-gradient-to-r from-blue-600 via-amber-500 to-blue-950" />
                    <CardHeader className="text-center pb-2 pt-8">
                        <Handshake className="w-14 h-14 mx-auto text-amber-500 mb-2" />
                        <CardTitle className="text-2xl font-black text-slate-900 dark:text-foreground">Programa Partners Lexis Bill</CardTitle>
                        <CardDescription className="text-slate-500 font-medium pt-1">
                            Gana comisiones recurrentes por cada cliente activo
                        </CardDescription>
                        {inviteValid && (
                            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 text-xs font-semibold border border-amber-300 dark:border-amber-700">
                                <Mail className="w-3.5 h-3.5" />
                                Invitación válida — Prioridad en aprobación
                            </div>
                        )}
                    </CardHeader>
                    <CardContent className="px-6 md:px-10 pb-10 space-y-8">
                        {/* Sección: Beneficios */}
                        <section aria-label="Beneficios del programa">
                            <h3 className="text-sm font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-3">Beneficios</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40">
                                    <Users className="w-8 h-8 text-amber-600" />
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-foreground">5-20 clientes</p>
                                        <p className="text-xs text-muted-foreground">7% comisión</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40">
                                    <Zap className="w-8 h-8 text-amber-600" />
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-foreground">21-50 clientes</p>
                                        <p className="text-xs text-muted-foreground">9% comisión</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40">
                                    <DollarSign className="w-8 h-8 text-amber-600" />
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-foreground">51+ clientes</p>
                                        <p className="text-xs text-muted-foreground">10% comisión</p>
                                    </div>
                                </div>
                            </div>
                            <ul className="mt-4 space-y-2 text-sm text-slate-600 dark:text-muted-foreground">
                                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" /> Comisión mensual sobre clientes activos</li>
                                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" /> Pago 30 días después del cobro</li>
                                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" /> La cartera pertenece a Lexis Bill</li>
                                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" /> Dashboard para ver métricas en tiempo real</li>
                            </ul>
                        </section>

                        {/* Sección: Términos */}
                        <section aria-label="Términos del programa" className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 p-4">
                            <h3 className="text-sm font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                                <FileText className="w-4 h-4" /> Términos del Programa
                            </h3>
                            <p className="text-sm text-slate-600 dark:text-muted-foreground mb-3">{TERMS_SUMMARY}</p>
                            <button
                                type="button"
                                onClick={() => setTermsOpen(!termsOpen)}
                                className="flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400 hover:underline"
                            >
                                {termsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                {termsOpen ? "Ocultar términos completos" : "Ver términos completos"}
                            </button>
                            {termsOpen && (
                                <pre className="mt-3 p-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-sans max-h-48 overflow-y-auto">
                                    {TERMS_FULL}
                                </pre>
                            )}
                            <label className="mt-4 flex items-start gap-3 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={form.termsAccepted}
                                    onChange={(e) => setForm({ ...form, termsAccepted: e.target.checked })}
                                    className="mt-1 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                                    aria-required
                                />
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-foreground">
                                    Acepto los términos del Programa de Partners Lexis Bill (cartera de Lexis Bill, comisión mientras activo, pago 30 días después del cobro).
                                </span>
                            </label>
                        </section>

                        {/* Sección: Tu solicitud */}
                        <section aria-label="Tu solicitud">
                            <h3 className="text-sm font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-4">Tu solicitud</h3>
                            <form onSubmit={handleApply} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="partner-name" className="text-muted-foreground">Nombre completo</Label>
                                    <Input
                                        id="partner-name"
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        placeholder="Tu nombre completo"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="partner-phone" className="text-muted-foreground">Teléfono (opcional)</Label>
                                    <Input
                                        id="partner-phone"
                                        value={form.phone}
                                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                        placeholder="(809) 000-0000"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="partner-why" className="text-muted-foreground">¿Por qué quieres ser partner?</Label>
                                    <Textarea
                                        id="partner-why"
                                        value={form.whyPartner}
                                        onChange={(e) => setForm({ ...form, whyPartner: e.target.value })}
                                        placeholder="Cuéntanos brevemente: tu perfil (contador, consultor, etc.) y cómo planeas referir clientes."
                                        rows={3}
                                        maxLength={2000}
                                        className="resize-none"
                                    />
                                    <p className="text-xs text-muted-foreground">{form.whyPartner.length}/2000</p>
                                </div>
                                <Button type="submit" disabled={isLoading || !form.termsAccepted} className="w-full bg-amber-500 hover:bg-amber-600 text-white">
                                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                    Enviar solicitud
                                </Button>
                            </form>
                        </section>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default function UnirseComoPartnerPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-[#0F172A]">
                <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
            </div>
        }>
            <UnirseComoPartnerContent />
        </Suspense>
    );
}
