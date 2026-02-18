"use client";

import { useEffect, useState, useCallback } from "react";
import { Sparkles, Trophy } from "lucide-react";
import { api } from "@/lib/api-service";
import Link from "next/link";

export function TrialHeaderBadge() {
    const [status, setStatus] = useState<any>(null);

    const fetchStatus = useCallback(() => {
        api.invalidateSubscriptionCache();
        api.getSubscriptionStatus(true)
            .then(data => setStatus(data))
            .catch(() => setStatus("error"));
    }, []);

    useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);

    // Actualizar badge al volver a la pestaña (ej. tras pagar) o cuando se valida el pago
    useEffect(() => {
        const onFocus = () => fetchStatus();
        const onSubscriptionUpdated = () => fetchStatus();
        window.addEventListener("focus", onFocus);
        window.addEventListener("subscription-updated", onSubscriptionUpdated);
        return () => {
            window.removeEventListener("focus", onFocus);
            window.removeEventListener("subscription-updated", onSubscriptionUpdated);
        };
    }, [fetchStatus]);

    if (!status || status === "error") return null;

    const isPending = status.status === "pending" || status.status === "PendienteValidacion" || status.hasPendingPayment;
    const isTrial = status.plan === "free" || isPending || (status.daysRemaining != null && status.daysRemaining < 999 && status.daysRemaining < 30);

    if (isTrial || isPending) {
        return (
            <Link href="/pagos">
                <div className="group flex items-center gap-2 text-xs font-black bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-full transition-all cursor-pointer shadow-lg shadow-amber-500/20 active:scale-95">
                    <Sparkles className="w-3 h-3 animate-pulse" />
                    {isPending ? "PENDIENTE DE PAGO" : `PLAN FREE${status.daysRemaining != null && status.daysRemaining < 999 ? `: ${status.daysRemaining} DÍAS` : ""}`}
                    <div className="hidden lg:block border-l border-white/30 ml-1 pl-2 text-[10px] font-bold">
                        UPGRADE
                    </div>
                </div>
            </Link>
        );
    }

    // Plan activo (cliente ya pagó): mensaje de confianza, sin "Plan Free"
    const planLabel = "Suscripción activa";
    return (
        <Link href="/pagos" title="Tu cuenta está completamente habilitada. Ya puedes operar sin interrupciones.">
            <div className="flex items-center gap-2 text-xs font-black text-emerald-800 bg-emerald-50 dark:text-emerald-200 dark:bg-emerald-950/60 px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-800 uppercase tracking-tighter hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors shadow-sm">
                <Trophy className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> {planLabel}
            </div>
        </Link>
    );
}
