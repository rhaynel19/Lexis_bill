"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-service";
import { useAuth } from "@/components/providers/AuthContext";
import { FileText, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function AceptarPoliticasPage() {
    const router = useRouter();
    const { refresh, setUser } = useAuth();
    const [policiesToAccept, setPoliciesToAccept] = useState<Array<{ slug: string; version: number; title: string }>>([]);
    const [accepted, setAccepted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        let cancelled = false;
        api.getMe()
            .then((me) => {
                if (cancelled) return;
                if (!me) {
                    router.replace("/login");
                    return;
                }
                if (!me.needsPolicyAcceptance || !me.policiesToAccept?.length) {
                    router.replace("/dashboard");
                    return;
                }
                setPoliciesToAccept(me.policiesToAccept);
            })
            .catch(() => {
                if (!cancelled) router.replace("/login");
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, [router]);

    const handleSubmit = async () => {
        if (!accepted || policiesToAccept.length === 0) {
            toast.error("Debe aceptar los documentos para continuar.");
            return;
        }
        setSubmitting(true);
        try {
            await api.acceptPolicies(policiesToAccept.map((p) => ({ slug: p.slug, version: p.version })));
            const me = await api.getMe();
            if (me) setUser(me);
            toast.success("Aceptación registrada. Redirigiendo…");
            router.replace("/dashboard");
        } catch (err: any) {
            toast.error(err?.message || "No se pudo registrar la aceptación.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="container max-w-xl mx-auto px-4 py-12">
            <Card className="border-2 border-primary/20 shadow-xl">
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                        <ShieldCheck className="w-7 h-7 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">Actualización de políticas</CardTitle>
                    <CardDescription>
                        Hemos actualizado nuestros documentos legales. Para continuar usando Lexis Bill, lea y acepte las siguientes políticas.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <ul className="space-y-3">
                        {policiesToAccept.map((p) => (
                            <li key={p.slug} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/20">
                                <FileText className="w-5 h-5 text-primary shrink-0" />
                                <div className="min-w-0">
                                    <p className="font-medium truncate">{p.title}</p>
                                    <p className="text-xs text-muted-foreground">Versión {p.version}</p>
                                </div>
                                <Link
                                    href={{ terms: "/terminos", privacy: "/privacidad", acceptable_use: "/uso-aceptable", limitation: "/limitacion-responsabilidad", refunds: "/reembolsos" }[p.slug] || "/terminos"}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-primary hover:underline shrink-0"
                                >
                                    Leer
                                </Link>
                            </li>
                        ))}
                    </ul>
                    <label className="flex items-start gap-3 cursor-pointer p-4 rounded-xl bg-muted/30 border border-border/20">
                        <input
                            type="checkbox"
                            checked={accepted}
                            onChange={(e) => setAccepted(e.target.checked)}
                            className="mt-1 w-4 h-4 rounded border-primary text-primary focus:ring-primary"
                        />
                        <span className="text-sm text-foreground">
                            He leído y acepto los documentos indicados (Términos y Condiciones, Política de Privacidad y demás políticas aplicables).
                        </span>
                    </label>
                    <Button
                        className="w-full h-12 font-bold gap-2"
                        onClick={handleSubmit}
                        disabled={!accepted || submitting}
                    >
                        {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                        Confirmar y continuar
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
