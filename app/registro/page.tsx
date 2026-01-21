"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, User, Lock, Mail, Building2, Briefcase, ShieldCheck, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api-service";
import { Suspense } from "react";
import { TermsModal, LegalCheckbox } from "@/components/legal-design";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

function RegisterForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const plan = searchParams.get("plan"); // 'pro' or null (trial)

    const [form, setForm] = useState({
        email: "",
        password: "",
        name: "",
        rnc: "",
        profession: "general",
        hasRnc: "yes" // Question filter
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [showTerms, setShowTerms] = useState(false);
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [rncStatus, setRncStatus] = useState<{ loading: boolean; valid: boolean | null; name?: string }>({
        loading: false,
        valid: null
    });

    // Silent RNC Validation
    useEffect(() => {
        const timer = setTimeout(async () => {
            const cleanRNC = form.rnc.replace(/\D/g, "");
            if (cleanRNC.length === 9 || cleanRNC.length === 11) {
                setRncStatus(prev => ({ ...prev, loading: true }));
                try {
                    const data = await api.validateRnc(cleanRNC);
                    setRncStatus({ loading: false, valid: !!data, name: data?.nombre });
                } catch (err) {
                    setRncStatus({ loading: false, valid: null }); // Don't block on API error
                }
            } else {
                setRncStatus({ loading: false, valid: null });
            }
        }, 800);

        return () => clearTimeout(timer);
    }, [form.rnc]);

    const validateRNC = (rnc: string) => {
        const cleanRNC = rnc.replace(/\D/g, "");
        return cleanRNC.length === 9 || cleanRNC.length === 11;
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!validateRNC(form.rnc)) {
            setError("Por favor, ingresa un RNC o Cédula válido (9 o 11 dígitos).");
            return;
        }

        setIsLoading(true);

        try {
            await api.register({ ...form, plan });

            // Auto login after register
            const loginData = await api.login(form.email, form.password);
            localStorage.setItem("token", loginData.accessToken);
            localStorage.setItem("user", JSON.stringify({
                name: loginData.name,
                email: loginData.email,
                role: loginData.profession,
                rnc: loginData.rnc
            }));

            router.push("/dashboard");
        } catch (err: any) {
            // Manejo de errores amigable
            if (err.message === "Failed to fetch") {
                setError("Tenemos un pequeño inconveniente técnico de conexión. Por favor, reintenta en un momento.");
            } else {
                setError(err.message || "No pudimos completar el registro. Verifica tus datos.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0F172A] px-4 py-8 relative overflow-hidden">
            {/* Background Luxury Effects */}
            <div className="absolute inset-0">
                <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-blue-900/30 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[100px]"></div>
            </div>

            <div className="w-full max-w-lg relative z-10">
                {/* Back Button */}
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-slate-400 hover:text-[#D4AF37] transition-colors mb-6 text-sm font-medium group"
                    type="button"
                >
                    <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" /> Volver atrás
                </button>

                <Card className="w-full bg-white/95 backdrop-blur border-none shadow-2xl overflow-hidden rounded-2xl">
                    <div className="h-2 w-full bg-gradient-to-r from-blue-600 via-[#D4AF37] to-blue-950"></div>
                    <CardHeader className="text-center pb-2 pt-8">
                        <CardTitle className="text-2xl font-black text-blue-950 tracking-tight uppercase">
                            {plan === 'pro' ? 'ACTIVA TU PLAN PRO' : 'COMIENZA TU PRUEBA'}
                        </CardTitle>
                        <CardDescription className="text-slate-500 font-medium pt-1">
                            {plan === 'pro'
                                ? 'Suscripción automática por RD$950/mes'
                                : 'Acceso total por 15 días. Sin tarjetas.'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="px-6 md:px-10 pb-10">
                        <form onSubmit={handleRegister} className="space-y-5">
                            <div className="space-y-1.5 transition-all">
                                <label className="text-[10px] font-black text-blue-900 uppercase tracking-widest pl-1">Nombre Completo</label>
                                <div className="relative">
                                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <Input
                                        placeholder="Tu nombre y apellido"
                                        className="pl-11 h-12 bg-slate-50 border-slate-200 focus:bg-white transition-colors text-base"
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-blue-900 uppercase tracking-widest pl-1">Correo Profesional</label>
                                <div className="relative">
                                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <Input
                                        type="email"
                                        placeholder="ejemplo@correo.com"
                                        className="pl-11 h-12 bg-slate-50 border-slate-200 focus:bg-white transition-colors text-base"
                                        value={form.email}
                                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Question Filter */}
                            <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100/50 space-y-3">
                                <label className="text-[11px] font-bold text-blue-800 uppercase tracking-tight">¿Tienes RNC activo en República Dominicana?</label>
                                <div className="flex gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setForm({ ...form, hasRnc: "yes" })}
                                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all border ${form.hasRnc === "yes" ? "bg-blue-600 text-white border-blue-600 shadow-md" : "bg-white text-slate-500 border-slate-200 hover:border-blue-300"}`}
                                    >
                                        Sí, lo tengo
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setForm({ ...form, hasRnc: "no" })}
                                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all border ${form.hasRnc === "no" ? "bg-blue-600 text-white border-blue-600 shadow-md" : "bg-white text-slate-500 border-slate-200 hover:border-blue-300"}`}
                                    >
                                        No, todavía no
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-1.5 relative">
                                <label className="text-[10px] font-black text-blue-900 uppercase tracking-widest pl-1">RNC / Cédula</label>
                                <div className="relative">
                                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <Input
                                        placeholder="Sin guiones (9 o 11 dígitos)"
                                        className={`pl-11 h-12 bg-slate-50 transition-all text-base ${rncStatus.valid === true ? 'border-emerald-300 bg-emerald-50/20' : 'border-slate-200'}`}
                                        value={form.rnc}
                                        onChange={(e) => setForm({ ...form, rnc: e.target.value })}
                                        required
                                    />
                                    {rncStatus.loading && <div className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin w-3 h-3 border-2 border-[#D4AF37] border-t-transparent rounded-full" />}
                                    {rncStatus.valid === true && <div className="mt-1 text-[10px] text-emerald-600 font-medium pl-1">✓ RNC: {rncStatus.name}</div>}
                                </div>
                                <p className="text-[9px] text-slate-400 pt-1 pl-1 italic">"Usas tu propio RNC. Lexis Bill solo te ayuda a gestionarlo mejor."</p>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-blue-900 uppercase tracking-widest pl-1">Profesión</label>
                                <div className="relative">
                                    <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
                                    <Select
                                        value={form.profession}
                                        onValueChange={(val) => setForm({ ...form, profession: val })}
                                    >
                                        <SelectTrigger className="w-full pl-11 h-12 bg-slate-50 border-slate-200 text-base focus:ring-blue-500 transition-shadow">
                                            <SelectValue placeholder="Selecciona tu área" />
                                        </SelectTrigger>
                                        <SelectContent position="popper" className="bg-white border-slate-200 shadow-xl z-[100] min-w-[var(--radix-select-trigger-width)]">
                                            <SelectItem value="medico" className="text-blue-950 font-medium py-3">Médico / Salud</SelectItem>
                                            <SelectItem value="abogado" className="text-blue-950 font-medium py-3">Abogado / Legal</SelectItem>
                                            <SelectItem value="ingeniero" className="text-blue-950 font-medium py-3">Ingeniero / Arquitecto</SelectItem>
                                            <SelectItem value="tecnico" className="text-blue-950 font-medium py-3">Técnico / Especialista</SelectItem>
                                            <SelectItem value="general" className="text-blue-950 font-medium py-3">Freelancer / General</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-blue-900 uppercase tracking-widest pl-1">Crea una Contraseña</label>
                                <div className="relative">
                                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <Input
                                        type="password"
                                        placeholder="Tu clave segura"
                                        className="pl-11 h-12 bg-slate-50 border-slate-200 focus:bg-white transition-colors text-base"
                                        value={form.password}
                                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Legal Design Integration */}
                            <LegalCheckbox
                                id="terms"
                                checked={acceptedTerms}
                                onChange={(e) => setAcceptedTerms(e.target.checked)}
                                onOpenModal={() => setShowTerms(true)}
                            />
                            <TermsModal
                                isOpen={showTerms}
                                onClose={() => setShowTerms(false)}
                            />

                            {error && (
                                <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl border border-red-100 flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
                                    <p className="font-medium">{error}</p>
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-7 text-lg shadow-xl shadow-blue-500/20 transition-all active:scale-[0.98] rounded-xl"
                                disabled={isLoading || !acceptedTerms}
                            >
                                {isLoading ? "Creando Oficina..." : (plan === 'pro' ? 'Activar Plan Elite' : 'Empezar 15 Días Gratis')}
                            </Button>

                            <div className="pt-2 text-center">
                                <p className="text-xs text-slate-400">
                                    ¿Ya tienes cuenta? <Link href="/login" className="text-blue-600 font-bold hover:underline underline-offset-4">Inicia Sesión</Link>
                                </p>
                            </div>
                        </form>
                    </CardContent>
                    <div className="bg-slate-50/80 p-4 border-t border-slate-100 flex items-center justify-center gap-6">
                        <div className="flex items-center gap-1.5 text-[9px] font-extrabold text-slate-400 uppercase tracking-tighter">
                            <ShieldCheck className="w-3 h-3 text-emerald-500" /> DGII Compliant RD
                        </div>
                        <div className="flex items-center gap-1.5 text-[9px] font-extrabold text-slate-400 uppercase tracking-tighter">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Encriptación Militar
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}

export default function RegisterPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#0F172A] flex items-center justify-center text-white">Cargando...</div>}>
            <RegisterForm />
        </Suspense>
    );
}
