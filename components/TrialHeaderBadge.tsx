"use client";

import { useEffect, useState, useCallback } from "react";
import { Sparkles, Trophy, Clock } from "lucide-react";
import { api } from "@/lib/api-service";
import Link from "next/link";
import { cn } from "@/lib/utils";

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
    // Cliente con plan activo: no mostrar nunca "Plan Free" (pro, premium o internalStatus ACTIVE)
    const isActive = status.plan === "pro" || status.plan === "premium" || status.internalStatus === "ACTIVE";
    const isTrial = !isActive && (status.plan === "free" || isPending || (status.daysRemaining != null && status.daysRemaining < 999 && status.daysRemaining < 30));

    if (isTrial || isPending) {
        return (
            <Link href="/pagos">
                <div className="group flex items-center gap-2 text-xs font-black bg-trinalyze-gold hover:bg-trinalyze-gold-hover text-white px-3 py-1.5 rounded-full transition-all cursor-pointer shadow-lg shadow-trinalyze-gold/20 active:scale-95">
                    <Sparkles className="w-3 h-3 animate-pulse" />
                    {isPending ? "PENDIENTE DE PAGO" : `PRUEBA${status.daysRemaining != null && status.daysRemaining < 999 ? `: ${status.daysRemaining} DÍAS` : ""}`}
                    <div className="hidden lg:block border-l border-white/30 ml-1 pl-2 text-[10px] font-bold">
                        MEJORAR PLAN
                    </div>
                </div>
            </Link>
        );
    }

    // Plan activo (cliente ya pagó)
    if (status.daysRemaining != null && status.daysRemaining < 15) {
        const isUrgent = status.daysRemaining <= 3;
        const isWarning = status.daysRemaining <= 7;
        
        return (
            <Link href="/pagos">
                <div className={cn(
                    "flex items-center gap-2 text-[10px] md:text-xs font-black px-3 py-1.5 rounded-full border transition-all hover:scale-105 active:scale-95 shadow-sm",
                    isUrgent 
                        ? "bg-red-600 text-white border-red-500 animate-pulse" 
                        : isWarning 
                            ? "bg-amber-500 text-white border-amber-400 shadow-amber-500/20" 
                            : "bg-emerald-500 text-white border-emerald-400 shadow-emerald-500/20"
                )}>
                    <Clock className="w-3 h-3" />
                    <span>VENCE EN {status.daysRemaining} DÍAS</span>
                    <span className="hidden md:inline-block ml-1 border-l border-white/30 pl-2 uppercase">Renovar</span>
                </div>
            </Link>
        );
    }

    return (
        <Link href="/pagos" title="Tu cuenta está completamente habilitada. Ya puedes operar sin interrupciones.">
            <div className="flex items-center gap-2 text-xs font-black text-emerald-800 bg-emerald-50 dark:text-emerald-200 dark:bg-emerald-950/60 px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-800 uppercase tracking-tighter hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors shadow-sm">
                <Trophy className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Activa
            </div>
        </Link>
    );
}
