"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-service";

export default function RecuperarContrasenaPage() {
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) {
            toast.error("Ingresa tu correo electrónico.");
            return;
        }
        setIsLoading(true);
        try {
            await api.forgotPassword(email.trim());
            setSent(true);
            toast.success("Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.");
        } catch (err: unknown) {
            const msg = err && typeof err === "object" && "message" in err ? String((err as { message: unknown }).message) : "Error al enviar.";
            toast.error(msg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0F172A] px-4 py-8">
            <div className="w-full max-w-md">
                <Link href="/login" className="inline-flex items-center gap-2 text-slate-400 hover:text-amber-400 mb-6 text-sm">
                    <ArrowLeft className="w-4 h-4" /> Volver al inicio de sesión
                </Link>
                <Card className="bg-white/95 dark:bg-card border-none shadow-2xl overflow-hidden rounded-2xl">
                    <div className="h-2 w-full bg-gradient-to-r from-blue-600 via-amber-500 to-blue-950" />
                    <CardHeader className="text-center pb-2 pt-8">
                        <CardTitle className="text-xl font-black text-slate-900 dark:text-foreground">
                            Recuperar contraseña
                        </CardTitle>
                        <CardDescription className="text-slate-500">
                            Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="px-6 pb-8">
                        {sent ? (
                            <div className="text-center py-4">
                                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                                <p className="text-sm text-slate-600 dark:text-muted-foreground mb-4">
                                    Revisa tu bandeja de entrada (y spam). El enlace expira en 1 hora.
                                </p>
                                <Link href="/login">
                                    <Button variant="outline" className="w-full">Volver al login</Button>
                                </Link>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label htmlFor="email" className="text-xs font-bold text-muted-foreground uppercase">Correo electrónico</label>
                                    <div className="relative mt-1">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="tu@correo.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="pl-10"
                                            required
                                        />
                                    </div>
                                </div>
                                <Button type="submit" disabled={isLoading} className="w-full bg-amber-500 hover:bg-amber-600 text-white">
                                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                    Enviar enlace
                                </Button>
                            </form>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
