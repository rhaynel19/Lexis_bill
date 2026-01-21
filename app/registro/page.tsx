"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, User, Lock, Mail, Building2, Briefcase, ArrowRight, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api-service";
import { Suspense } from "react";
import { TermsModal, LegalCheckbox } from "@/components/legal-design";

function RegisterForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const plan = searchParams.get("plan"); // 'pro' or null (trial)

    const [form, setForm] = useState({
        email: "",
        password: "",
        name: "",
        rnc: "",
        profession: "general"
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [showTerms, setShowTerms] = useState(false);
    const [acceptedTerms, setAcceptedTerms] = useState(false);

    const validateRNC = (rnc: string) => {
        const cleanRNC = rnc.replace(/\D/g, "");
        return cleanRNC.length === 9 || cleanRNC.length === 11;
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!validateRNC(form.rnc)) {
            setError("El RNC o Cédula debe tener 9 u 11 dígitos numéricos.");
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

            // If Pro, maybe redirect to a success/payment mockup or just dashboard
            router.push("/");
        } catch (err: any) {
            setError(err.message || "Error al registrarse");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0F172A] px-4 py-12 relative overflow-hidden">
            {/* Background Luxury Effects */}
            <div className="absolute inset-0">
                <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-blue-900/30 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[100px]"></div>
            </div>

            <Card className="w-full max-w-lg bg-white/95 backdrop-blur border-none shadow-2xl relative z-10 overflow-hidden">
                <div className="h-2 w-full bg-gradient-to-r from-blue-600 via-indigo-400 to-blue-900"></div>
                <CardHeader className="text-center pb-2 pt-8">
                    <CardTitle className="text-3xl font-black text-blue-950 tracking-tight">
                        {plan === 'pro' ? 'ACTIVA TU PLAN PRO' : 'COMIENZA TU PRUEBA'}
                    </CardTitle>
                    <CardDescription className="text-slate-500 font-medium">
                        {plan === 'pro'
                            ? 'Suscripción automática por RD$950/mes'
                            : 'Acceso total por 15 días. Sin tarjetas.'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="px-8 pb-8">
                    <form onSubmit={handleRegister} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-blue-900 uppercase tracking-widest">Nombre Completo</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                    <Input
                                        placeholder="Ej: Dr. Pérez"
                                        className="pl-10 bg-slate-50 border-slate-200"
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-blue-900 uppercase tracking-widest">RNC / Cédula</label>
                                <div className="relative">
                                    <Building2 className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                    <Input
                                        placeholder="123456789"
                                        className="pl-10 bg-slate-50 border-slate-200"
                                        value={form.rnc}
                                        onChange={(e) => setForm({ ...form, rnc: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-blue-900 uppercase tracking-widest">Profesión</label>
                            <div className="relative">
                                <Briefcase className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                <select
                                    className="w-full pl-10 h-10 rounded-md border border-slate-200 bg-slate-50 text-sm focus:ring-2 focus:ring-blue-500 transition-all outline-none appearance-none"
                                    value={form.profession}
                                    onChange={(e) => setForm({ ...form, profession: e.target.value })}
                                >
                                    <option value="medico">Médico</option>
                                    <option value="abogado">Abogado</option>
                                    <option value="ingeniero">Ingeniero</option>
                                    <option value="tecnico">Técnico</option>
                                    <option value="general">Freelancer / General</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-blue-900 uppercase tracking-widest">Correo Profesional</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                <Input
                                    type="email"
                                    placeholder="correo@ejemplo.com"
                                    className="pl-10 bg-slate-50 border-slate-200"
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-blue-900 uppercase tracking-widest">Crea una Contraseña</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                <Input
                                    type="password"
                                    placeholder="••••••••"
                                    className="pl-10 bg-slate-50 border-slate-200"
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
                            <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg flex items-start gap-2">
                                <p>{error}</p>
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-7 text-lg shadow-xl shadow-blue-500/20 transition-all hover:scale-[1.01]"
                            disabled={isLoading || !acceptedTerms}
                        >
                            {isLoading ? "Creando Oficina..." : (plan === 'pro' ? 'Pagar y Empezar' : 'Empezar 15 Días Gratis')}
                        </Button>

                        <div className="pt-4 text-center">
                            <p className="text-xs text-slate-400">
                                ¿Ya tienes cuenta? <Link href="/login" className="text-blue-600 font-bold hover:underline">Inicia Sesión</Link>
                            </p>
                        </div>
                    </form>
                </CardContent>
                <div className="bg-slate-50 p-4 border-t border-slate-100 flex items-center justify-center gap-6">
                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                        <ShieldCheck className="w-3 h-3 text-emerald-500" /> DGII Compliant
                    </div>
                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Encriptación SSL
                    </div>
                </div>
            </Card>
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
