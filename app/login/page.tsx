"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Fingerprint, Lock, Mail, MessageCircle, AlertCircle, ArrowRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    // Recovery States
    const [showRecovery, setShowRecovery] = useState(false);
    const [recoveryStep, setRecoveryStep] = useState(1); // 1: Choose Channel, 2: Enter OTP
    const [recoveryChannel, setRecoveryChannel] = useState<"whatsapp" | "email" | null>(null);
    const [otp, setOtp] = useState("");
    const [generatedOtp, setGeneratedOtp] = useState("");

    // Biometric State
    const [showBiometric, setShowBiometric] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            const { api } = await import("@/lib/api-service");
            const data = await api.login(email, password);

            // Save Token and User
            localStorage.setItem("token", data.accessToken);
            localStorage.setItem("user", JSON.stringify({
                name: data.name,
                email: data.email,
                role: data.profession,
                rnc: data.rnc,
                biometric: false
            }));

            // Biometric Prompt Mock (only if first time or configured)
            // For now, redirect directly or show prompt
            setShowBiometric(true);

        } catch (err: any) {
            setError(err.message || "Error al iniciar sesión");
        } finally {
            setIsLoading(false);
        }
    };

    const handleBiometricDecision = (decision: boolean) => {
        // Here we would save the preference
        setShowBiometric(false);
        const userStr = localStorage.getItem("user");
        if (userStr) {
            const user = JSON.parse(userStr);
            user.biometric = decision;
            localStorage.setItem("user", JSON.stringify(user));
        }
        router.push("/");
    };

    const startRecovery = (channel: "whatsapp" | "email") => {
        setRecoveryChannel(channel);
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        setGeneratedOtp(code);

        // Simulación de envío
        if (channel === "whatsapp") {
            alert(`💬 [WhatsApp API Mock]:\n"Tu código de seguridad para Lexis Bill es: ${code}. No lo compartas con nadie."`);
        } else {
            alert(`📧 [Email API Mock]:\n"Código de recuperación enviado a ${email}: ${code}"`);
        }

        setRecoveryStep(2);
    };

    const verifyOtp = () => {
        if (otp === generatedOtp) {
            alert("✅ Código verificado correctamente. Puede restablecer su contraseña.");
            setShowRecovery(false);
            setRecoveryStep(1);
            setOtp("");
        } else {
            alert("⚠️ El código que pusiste es incorrecto o ya venció, solicita uno nuevo.");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0F172A] px-4 relative overflow-hidden">
            {/* Background Luxury Effects */}
            <div className="absolute inset-0">
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
                <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-blue-900/30 rounded-full blur-[120px]"></div>
                <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] bg-[#D4AF37]/10 rounded-full blur-[100px]"></div>
            </div>

            <Card className="w-full max-w-md bg-white/95 backdrop-blur border-none shadow-2xl relative z-10 overflow-hidden">
                <div className="h-2 w-full bg-gradient-to-r from-blue-900 via-[#D4AF37] to-blue-900"></div>
                <CardHeader className="text-center pb-2 pt-8">
                    <div className="mx-auto w-16 h-16 bg-blue-950 rounded-2xl flex items-center justify-center mb-4 shadow-xl shadow-blue-900/20 transform rotate-3">
                        <span className="text-3xl font-bold text-[#D4AF37]">L</span>
                    </div>
                    <CardTitle className="text-3xl font-serif font-bold tracking-tighter">
                        <span className="text-[#D4AF37]">LEXIS</span>{" "}
                        <span className="text-blue-950">BILL</span>
                    </CardTitle>
                    <CardDescription className="text-slate-500 font-medium">Oficina Fiscal Inteligente</CardDescription>
                </CardHeader>
                <CardContent className="px-8 pb-8">
                    <form onSubmit={handleLogin} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-blue-900 uppercase tracking-wider">Credenciales de Acceso</label>
                            <Input
                                type="email"
                                placeholder="Correo Profesional"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="bg-slate-50 border-slate-200 h-12 focus:ring-[#D4AF37]"
                                required
                            />
                            <Input
                                type="password"
                                placeholder="Contraseña"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="bg-slate-50 border-slate-200 h-12 focus:ring-[#D4AF37]"
                            />
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
                                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                <p>{error}</p>
                            </div>
                        )}

                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={() => setShowRecovery(true)}
                                className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
                            >
                                ¿Olvidó su contraseña?
                            </button>
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-[#1e293b] hover:bg-[#0f172a] text-white font-bold py-6 text-lg shadow-lg shadow-blue-900/20 transition-all hover:scale-[1.01] hover:shadow-blue-900/30"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <span className="flex items-center gap-2"><Lock className="w-4 h-4 animate-spin" /> Verificando...</span>
                            ) : (
                                "Entrar a mi Oficina Fiscal"
                            )}
                        </Button>

                        <div className="pt-2 text-center">
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest">
                                <CheckCircle2 className="w-3 h-3 inline mr-1 text-green-500" />
                                Conexión Encriptada • Grado Bancario
                            </p>
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* Recovery Modal */}
            <Dialog open={showRecovery} onOpenChange={setShowRecovery}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Recuperación de Seguridad</DialogTitle>
                        <DialogDescription>
                            {recoveryStep === 1
                                ? "¿Dónde desea recibir su código de acceso temporal?"
                                : "Introduce el código de 6 dígitos que acabamos de enviar."}
                        </DialogDescription>
                    </DialogHeader>

                    {recoveryStep === 1 ? (
                        <div className="grid grid-cols-2 gap-4 py-4">
                            <Button variant="outline" className="h-24 flex flex-col gap-2 hover:border-green-500 hover:bg-green-50" onClick={() => startRecovery("whatsapp")}>
                                <MessageCircle className="w-8 h-8 text-green-600" />
                                <span className="font-semibold text-slate-700">WhatsApp</span>
                            </Button>
                            <Button variant="outline" className="h-24 flex flex-col gap-2 hover:border-blue-500 hover:bg-blue-50" onClick={() => startRecovery("email")}>
                                <Mail className="w-8 h-8 text-blue-600" />
                                <span className="font-semibold text-slate-700">Correo</span>
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4 py-4">
                            <div className="bg-slate-50 p-4 rounded-lg text-center">
                                <p className="text-sm text-slate-500 mb-2">Código enviado vía {recoveryChannel === "whatsapp" ? "WhatsApp" : "Email"}</p>
                                <Input
                                    className="text-center text-2xl tracking-[1em] font-mono h-14"
                                    maxLength={6}
                                    placeholder="000000"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                />
                            </div>
                            <Button className="w-full" onClick={verifyOtp}>Verificar Código</Button>
                            <button className="text-xs text-slate-500 w-full text-center hover:underline" onClick={() => setRecoveryStep(1)}>Volver a elegir método</button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Biometric Prompt Mock (Post-Login) */}
            <Dialog open={showBiometric} onOpenChange={() => { }}>
                <DialogContent className="sm:max-w-sm text-center">
                    <div className="mx-auto w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                        <Fingerprint className="w-8 h-8 text-blue-600" />
                    </div>
                    <DialogHeader>
                        <DialogTitle className="text-center">Acceso Rápido</DialogTitle>
                        <DialogDescription className="text-center">
                            ¿Desea entrar con Huella o FaceID la próxima vez?
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-2 mt-4">
                        <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={() => handleBiometricDecision(true)}>
                            Sí, activar biometría
                        </Button>
                        <Button variant="ghost" className="w-full" onClick={() => handleBiometricDecision(false)}>
                            Ahora no
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

        </div>
    );
}
