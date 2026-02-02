"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Lock, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-service";

function RestablecerContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token") || "";
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (!token) toast.error("Falta el token. Usa el enlace que te enviamos por correo.");
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;
        if (newPassword.length < 8) {
            toast.error("La contraseña debe tener al menos 8 caracteres.");
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.error("Las contraseñas no coinciden.");
            return;
        }
        setIsLoading(true);
        try {
            await api.resetPassword(token, newPassword);
            setSuccess(true);
            toast.success("Contraseña actualizada. Redirigiendo al login…");
            setTimeout(() => router.push("/login"), 2000);
        } catch (err: unknown) {
            const msg = err && typeof err === "object" && "message" in err ? String((err as { message: unknown }).message) : "Error al restablecer.";
            toast.error(msg);
        } finally {
            setIsLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0F172A] px-4 py-8">
                <Card className="bg-white/95 dark:bg-card border-none shadow-2xl rounded-2xl max-w-md w-full p-6">
                    <p className="text-slate-600 dark:text-muted-foreground text-center mb-4">Enlace inválido. Solicita uno nuevo desde la página de recuperar contraseña.</p>
                    <Link href="/recuperar-contrasena">
                        <Button className="w-full">Recuperar contraseña</Button>
                    </Link>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0F172A] px-4 py-8">
            <div className="w-full max-w-md">
                <Link href="/login" className="inline-flex items-center gap-2 text-slate-400 hover:text-amber-400 mb-6 text-sm">
                    <ArrowLeft className="w-4 h-4" /> Volver al login
                </Link>
                <Card className="bg-white/95 dark:bg-card border-none shadow-2xl overflow-hidden rounded-2xl">
                    <div className="h-2 w-full bg-gradient-to-r from-blue-600 via-amber-500 to-blue-950" />
                    <CardHeader className="text-center pb-2 pt-8">
                        <CardTitle className="text-xl font-black text-slate-900 dark:text-foreground">
                            Nueva contraseña
                        </CardTitle>
                        <CardDescription className="text-slate-500">
                            Elige una contraseña segura (mínimo 8 caracteres).
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="px-6 pb-8">
                        {success ? (
                            <div className="text-center py-4">
                                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                                <p className="text-sm text-slate-600 dark:text-muted-foreground">Redirigiendo al login…</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label htmlFor="newPassword" className="text-xs font-bold text-muted-foreground uppercase">Nueva contraseña</label>
                                    <div className="relative mt-1">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <Input
                                            id="newPassword"
                                            type="password"
                                            placeholder="Mínimo 8 caracteres"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="pl-10"
                                            required
                                            minLength={8}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="confirmPassword" className="text-xs font-bold text-muted-foreground uppercase">Confirmar contraseña</label>
                                    <div className="relative mt-1">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <Input
                                            id="confirmPassword"
                                            type="password"
                                            placeholder="Repite la contraseña"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="pl-10"
                                            required
                                            minLength={8}
                                        />
                                    </div>
                                </div>
                                <Button type="submit" disabled={isLoading} className="w-full bg-amber-500 hover:bg-amber-600 text-white">
                                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                    Restablecer contraseña
                                </Button>
                            </form>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default function RestablecerContrasenaPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#0F172A]"><Loader2 className="w-10 h-10 animate-spin text-amber-500" /></div>}>
            <RestablecerContent />
        </Suspense>
    );
}
