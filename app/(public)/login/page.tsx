"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Fingerprint, Lock, Mail, MessageCircle, AlertCircle, ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { LexisWord } from "@/components/LexisWord";
import { useAuth } from "@/components/providers/AuthContext";
import { toast } from "sonner";

const LAST_EMAIL_KEY = "lexis_last_email";

/** Rutas internas permitidas para redirect post-login (evita open redirect). */
const ALLOWED_REDIRECT_PREFIXES = ["/dashboard", "/nueva-factura", "/nueva-cotizacion", "/cotizaciones", "/reportes", "/configuracion", "/clientes", "/gastos", "/pagos", "/documentos", "/partners", "/partner-dashboard", "/onboarding", "/ayuda"];

function getSafeRedirect(redirect: string | null): string {
    if (!redirect || typeof redirect !== "string") return "/dashboard";
    const path = redirect.trim().split("?")[0];
    if (!path.startsWith("/") || path.startsWith("//")) return "/dashboard";
    const allowed = ALLOWED_REDIRECT_PREFIXES.some((p) => path === p || path.startsWith(p + "/"));
    return allowed ? path : "/dashboard";
}

/** Redirect post-login: admin → dashboard (acceso admin desde sidebar); partner activo (y no admin) → /partner/dashboard; resto → dashboard o redirect. */
function getPostLoginPath(me: { role?: string; partner?: { status?: string } | null } | null, redirect: string | null): string {
    if (me?.role === "admin") return getSafeRedirect(redirect) || "/dashboard";
    const isPartner = me?.role === "partner" || me?.partner?.status === "active";
    if (isPartner) {
        const path = redirect?.trim().split("?")[0] ?? "";
        if (path.startsWith("/partner-dashboard")) return getSafeRedirect(redirect);
        return "/partner-dashboard";
    }
    return getSafeRedirect(redirect);
}

/** Mensaje seguro según tipo de error (sin exponer datos sensibles). */
function getLoginErrorMessage(err: { status?: number; message?: string; code?: string } | null): string {
    if (!err) return "Error desconocido. Por favor intenta nuevamente.";
    const status = err.status;
    const msg = (err.message || "").toLowerCase();

    if (status === 404 || status === 405 || status === 503 || status === 502 || (status != null && status >= 500 && status < 600)) return "Error temporal del servidor. Estamos trabajando para solucionarlo. Intenta nuevamente en unos minutos.";
    if (status === 401 || msg.includes("credencial") || msg.includes("invalid") || msg.includes("unauthorized") || msg.includes("contraseña")) return "Correo o contraseña incorrectos. Verifica e intenta de nuevo.";
    if (status === 403 || err.code === "ACCOUNT_BLOCKED") return "Cuenta bloqueada. Contacte a soporte.";
    if (msg.includes("timeout") || msg.includes("tardando") || msg.includes("abort") || msg.includes("conexión") || msg.includes("no responde") || msg.includes("failed to fetch") || msg.includes("network")) return "Problema de conexión. Verifica tu internet o intenta nuevamente.";

    return err.message && err.message.length < 120 ? err.message : "Error desconocido. Por favor intenta nuevamente.";
}

function LoginForm() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { setUser } = useAuth();
    const [email, setEmail] = useState(() => {
        if (typeof window === "undefined") return "";
        return localStorage.getItem(LAST_EMAIL_KEY) || "";
    });
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [apiUnavailable, setApiUnavailable] = useState(false);
    const [emailNotVerified, setEmailNotVerified] = useState(false);
    const [resendingVerify, setResendingVerify] = useState(false);

    // Redirigir /logir → /login en cliente (fallback si el middleware no aplicó, p. ej. caché)
    useEffect(() => {
        if (typeof window !== "undefined" && (pathname === "/logir" || pathname === "/logir/")) {
            const search = window.location.search || "";
            router.replace("/login" + search);
            return;
        }
    }, [pathname, router]);

    // Comprobar disponibilidad del API al cargar (evita intentar login si el proxy no está configurado)
    useEffect(() => {
        let cancelled = false;
        fetch("/api/health", { method: "GET", credentials: "include" })
            .then((res) => {
                if (cancelled) return;
                if (res.status === 404 || res.status === 405 || res.status === 503) setApiUnavailable(true);
            })
            .catch(() => {
                if (!cancelled) setApiUnavailable(true);
            });
        return () => { cancelled = true; };
    }, []);

    // Recovery States
    const [showRecovery, setShowRecovery] = useState(false);
    const [recoveryStep, setRecoveryStep] = useState(1); // 1: Choose Channel, 2: Enter OTP
    const [recoveryChannel, setRecoveryChannel] = useState<"whatsapp" | "email" | null>(null);
    const [otp, setOtp] = useState("");
    const [generatedOtp, setGeneratedOtp] = useState("");

    const handleResendVerify = async () => {
        if (!email.trim()) return;
        setResendingVerify(true);
        setError("");
        try {
            const { api } = await import("@/lib/api-service");
            await api.resendVerifyEmail(email.trim());
            toast.success("Si el correo está registrado y sin verificar, recibirás un nuevo enlace. Revisa también spam.");
        } catch (e: unknown) {
            toast.error(e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : "Error al reenviar.");
        } finally {
            setResendingVerify(false);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setEmailNotVerified(false);
        setIsLoading(true);

        const payload = { email, password: "[REDACTED]" };
        try {
            const { api } = await import("@/lib/api-service");
            const loginRes = await api.login(email, password);
            localStorage.setItem(LAST_EMAIL_KEY, email);
            const me = await api.getMe();
            setUser(me || null);
            router.push(getPostLoginPath(loginRes ?? me, searchParams.get("redirect")));

        } catch (err: any) {
            const status = err?.status ?? err?.response?.status;
            const data = err?.data ?? err?.response?.data ?? err?.data;
            const message = err?.message ?? err?.response?.data?.message ?? "";

            console.log("[LOGIN ERROR] STATUS:", status);
            console.log("[LOGIN ERROR] DATA:", data);
            console.log("[LOGIN ERROR] MESSAGE:", message);
            console.log("[LOGIN ERROR] REQUEST PAYLOAD:", payload);

            const statusText = status != null ? `HTTP ${status}` : "Error";
            let serverMsg = typeof data?.message === "string" ? data.message : (data?.error ?? message);
            if (typeof serverMsg === "object" && serverMsg !== null) {
                serverMsg = typeof (serverMsg as any).message === "string" ? (serverMsg as any).message : JSON.stringify(serverMsg);
            } else if (typeof serverMsg !== "string") {
                serverMsg = "";
            }
            // Mensaje claro para 502 (backend no responde o proxy falla)
            if (status === 502) {
                serverMsg = "El servidor de inicio de sesión no responde. Verifica que el API esté en línea o intenta en unos minutos.";
            }
            const isEmailNotVerified = data && typeof data === "object" && (data as { code?: string }).code === "EMAIL_NOT_VERIFIED";
            const displayMsg = isEmailNotVerified
                ? (typeof data?.message === "string" ? data.message : "Debes verificar tu correo antes de iniciar sesión.")
                : getLoginErrorMessage({ status, message: serverMsg, code: data?.code });
            setError(displayMsg);
            setEmailNotVerified(!!isEmailNotVerified);
        } finally {
            setIsLoading(false);
        }
    };

    const startRecovery = (channel: "whatsapp" | "email") => {
        setRecoveryChannel(channel);
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        setGeneratedOtp(code);

        // Simulación de envío
        if (channel === "whatsapp") {
            alert(`💬 [WhatsApp API Mock]:\n"Tu código de seguridad para Trinalyze Billing es: ${code}. No lo compartas con nadie."`);
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
        <div className="min-h-screen flex items-center justify-center bg-lexis-bg-deep px-4 relative overflow-hidden">
            {/* Background Luxury Effects */}
            <div className="absolute inset-0">
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5" />
                <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-amber-900/30 rounded-full blur-[120px]" />
                <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] bg-lexis-gold/10 rounded-full blur-[100px]" />
            </div>

            <Card className="w-full max-w-md bg-white/95 backdrop-blur border-none shadow-2xl relative z-10 overflow-hidden">
                <div className="w-full">
                    <div className="h-1.5 w-full bg-gradient-to-r from-[#D97706] to-[#F59E0B]" />
                </div>
                <CardHeader className="text-center pb-6 pt-10">
                    <CardTitle className="text-3xl font-bold tracking-tight flex items-center justify-center gap-2">
                        <LexisWord className="text-3xl" showBill={true} />
                    </CardTitle>
                    <CardDescription className="text-slate-500 font-medium mt-2 text-sm">Oficina Fiscal Inteligente</CardDescription>
                </CardHeader>
                <CardContent className="px-6 sm:px-8 pb-8">
                    {apiUnavailable && (
                        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                            <p className="text-sm text-amber-800 dark:text-amber-200">
                                El servicio de inicio de sesión no está disponible. Contacte al administrador o a soporte.
                            </p>
                        </div>
                    )}
                    <form onSubmit={handleLogin} className="space-y-5" autoComplete="on">
                        <div className="space-y-2">
                            <label htmlFor="login-email" className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Correo electrónico</label>
                            <Input
                                id="login-email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                placeholder="ejemplo@correo.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="bg-slate-50 border-slate-200 h-12 focus:ring-lexis-gold"
                                required
                                aria-describedby={error ? "login-error" : undefined}
                            />
                            <label htmlFor="login-password" className="text-xs font-semibold text-slate-600 uppercase tracking-wider sr-only">Contraseña</label>
                            <div className="relative">
                                <Input
                                    id="login-password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    autoComplete="current-password"
                                    placeholder="Contraseña"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="bg-slate-50 border-slate-200 h-12 focus:ring-lexis-gold pr-11"
                                    aria-describedby={error ? "login-error" : undefined}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((v) => !v)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-500 hover:text-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-lexis-gold/50"
                                    aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                                    tabIndex={0}
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div id="login-error" className="p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 flex flex-col gap-3 animate-in fade-in slide-in-from-top-1 shadow-sm" role="alert">
                                <div className="flex items-start gap-3">
                                    <div className="rounded-full bg-red-100 dark:bg-red-900/40 p-2 shrink-0">
                                        <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                                    </div>
                                    <p className="text-sm font-medium text-red-800 dark:text-red-200 leading-snug">{error}</p>
                                </div>
                                {emailNotVerified && (
                                    <Button type="button" variant="outline" size="sm" className="w-full border-amber-500 text-amber-700 hover:bg-amber-50 dark:border-amber-600 dark:text-amber-400 dark:hover:bg-amber-950/30 rounded-lg" onClick={handleResendVerify} disabled={resendingVerify}>
                                        {resendingVerify ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Mail className="w-4 h-4 mr-2" />}
                                        Reenviar verificación al correo
                                    </Button>
                                )}
                            </div>
                        )}

                        <div className="flex justify-end">
                            <Link href="/recuperar-contrasena" className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors">
                                ¿Olvidó su contraseña?
                            </Link>
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-gradient-to-r from-[#D97706] to-[#F59E0B] text-white font-bold py-6 text-base tracking-wide shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.01] hover:shadow-amber-500/30 rounded-xl"
                            disabled={isLoading}
                            aria-busy={isLoading}
                        >
                            {isLoading ? (
                                <span className="flex items-center gap-2"><Loader2 className="w-5 h-5 animate-spin" aria-hidden /> Entrando...</span>
                            ) : (
                                "Entrar a mi Oficina Fiscal"
                            )}
                        </Button>

                        <div className="pt-2 text-center">
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest flex items-center justify-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
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

        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-lexis-bg-deep px-4">
                <Card className="w-full max-w-md bg-white/95 backdrop-blur border-none shadow-2xl p-8">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-lexis-gold border-t-transparent rounded-full animate-spin" />
                        <p className="text-slate-500 text-sm">Cargando...</p>
                    </div>
                </Card>
            </div>
        }>
            <LoginForm />
        </Suspense>
    );
}
