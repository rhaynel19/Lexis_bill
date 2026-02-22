"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-service";
import { ArrowLeft, Loader2, FileText } from "lucide-react";

/** Convierte contenido markdown simple (## y párrafos) a JSX */
function renderPolicyContent(content: string) {
    const parts = content.split(/\n## /);
    const elements: React.ReactNode[] = [];
    parts.forEach((block, i) => {
        if (!block.trim()) return;
        if (i === 0 && !block.startsWith("##")) {
            elements.push(...block.split(/\n\n+/).map((p, j) => <p key={j} className="mb-4 text-slate-600 dark:text-slate-400 leading-relaxed">{p.trim()}</p>));
            return;
        }
        const firstLine = block.indexOf("\n");
        const title = firstLine >= 0 ? block.slice(0, firstLine).trim() : block.trim();
        const body = firstLine >= 0 ? block.slice(firstLine + 1).trim() : "";
        elements.push(
            <h2 key={`h-${i}`} className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-8 mb-3">
                {title}
            </h2>
        );
        elements.push(
            ...body.split(/\n\n+/).map((p, j) => (
                <p key={`p-${i}-${j}`} className="mb-4 text-slate-600 dark:text-slate-400 leading-relaxed">
                    {p.trim()}
                </p>
            ))
        );
    });
    return <div className="prose prose-slate dark:prose-invert max-w-none">{elements}</div>;
}

interface PolicyViewProps {
    slug: string;
    backHref?: string;
    backLabel?: string;
}

export function PolicyView({ slug, backHref = "/", backLabel = "Volver al inicio" }: PolicyViewProps) {
    const [policy, setPolicy] = useState<{ title: string; content: string; effectiveAt: string } | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        api.getPolicy(slug)
            .then((data) => {
                if (!cancelled) setPolicy(data);
            })
            .catch((err) => {
                if (!cancelled) setError(err?.message || "No se pudo cargar el documento.");
            });
        return () => { cancelled = true; };
    }, [slug]);

    if (error) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-6">
                <div className="text-center">
                    <p className="text-destructive mb-4">{error}</p>
                    <Link href={backHref} className="text-accent hover:underline inline-flex items-center gap-2">
                        <ArrowLeft className="w-4 h-4" /> {backLabel}
                    </Link>
                </div>
            </div>
        );
    }

    if (!policy) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-6">
                <Loader2 className="w-10 h-10 animate-spin text-accent" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <header className="border-b border-border/20 bg-card sticky top-0 z-10">
                <div className="container mx-auto px-4 py-4 flex items-center gap-4">
                    <Link href={backHref} className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                        <ArrowLeft className="w-5 h-5" /> {backLabel}
                    </Link>
                </div>
            </header>
            <main className="container mx-auto px-4 py-8 max-w-3xl">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <FileText className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">{policy.title}</h1>
                        <p className="text-sm text-muted-foreground">Última actualización: {policy.effectiveAt}</p>
                    </div>
                </div>
                <div className="bg-card rounded-xl border border-border/20 p-6 md:p-8 shadow-sm">
                    {renderPolicyContent(policy.content)}
                </div>
                <p className="mt-8 text-center text-xs text-muted-foreground">
                    © {new Date().getFullYear()} Lexis Bill. Documento legal — no modificar.
                </p>
            </main>
        </div>
    );
}
