"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-service";

function VerificarCorreoContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token") || "";
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [message, setMessage] = useState("");

    useEffect(() => {
        if (!token) {
            setStatus("error");
            setMessage("Falta el enlace de verificación. Revisa el correo que te enviamos o solicita uno nuevo desde el login.");
            return;
        }
        setStatus("loading");
        api.verifyEmail(token)
            .then(() => {
                setStatus("success");
                setMessage("Correo verificado correctamente. Ya puedes iniciar sesión.");
                toast.success("Correo verificado");
                setTimeout(() => router.push("/login"), 2500);
            })
            .catch((err: unknown) => {
                setStatus("error");
                const msg = err && typeof err === "object" && "message" in err ? String((err as { message: unknown }).message) : "Enlace inválido o expirado. Solicita uno nuevo desde el login.";
                setMessage(msg);
                toast.error(msg);
            });
    }, [token, router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0F172A] px-4 py-8">
            <div className="w-full max-w-md">
                <Link href="/login" className="inline-flex items-center gap-2 text-slate-400 hover:text-amber-400 mb-6 text-sm">
                    <ArrowLeft className="w-4 h-4" /> Volver al login
                </Link>
                <Card className="bg-white/95 dark:bg-card border-none shadow-2xl overflow-hidden rounded-2xl">
                    <div className="h-2 w-full bg-gradient-to-r from-blue-600 via-amber-500 to-blue-950" />
                    <CardHeader className="text-center pb-2 pt-8">
                        <CardTitle className="text-xl font-black text-slate-900 dark:text-foreground flex items-center justify-center gap-2">
                            <Mail className="w-6 h-6 text-amber-500" /> Verificar correo
                        </CardTitle>
                        <CardDescription className="text-slate-500">
                            Comprobando tu enlace de verificación…
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="px-6 pb-8">
                        {status === "loading" && (
                            <div className="flex flex-col items-center gap-4 py-6">
                                <Loader2 className="w-12 h-12 animate-spin text-amber-500" />
                                <p className="text-sm text-muted-foreground">Un momento…</p>
                            </div>
                        )}
                        {status === "success" && (
                            <div className="flex flex-col items-center gap-4 py-6">
                                <CheckCircle2 className="w-14 h-14 text-green-500" />
                                <p className="text-center text-slate-700 dark:text-foreground">{message}</p>
                                <Button asChild className="mt-2">
                                    <Link href="/login">Ir a iniciar sesión</Link>
                                </Button>
                            </div>
                        )}
                        {status === "error" && (
                            <div className="flex flex-col items-center gap-4 py-6">
                                <XCircle className="w-14 h-14 text-red-500" />
                                <p className="text-center text-slate-700 dark:text-foreground">{message}</p>
                                <div className="flex flex-col gap-2 w-full mt-2">
                                    <Button asChild variant="outline">
                                        <Link href="/login">Volver al login</Link>
                                    </Button>
                                    <p className="text-xs text-center text-muted-foreground">
                                        En el login puedes usar &quot;Reenviar verificación&quot; si no recibiste el correo.
                                    </p>
                                </div>
                            </div>
                        )}
                        {status === "idle" && !token && (
                            <p className="text-center text-muted-foreground py-6">Cargando…</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default function VerificarCorreoPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-[#0F172A]">
                <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
            </div>
        }>
            <VerificarCorreoContent />
        </Suspense>
    );
}
