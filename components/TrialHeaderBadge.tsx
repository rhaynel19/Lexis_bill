"use client";

import { useEffect, useState } from "react";
import { Sparkles, Trophy } from "lucide-react";
import { api } from "@/lib/api-service";
import Link from "next/link";

export function TrialHeaderBadge() {
    const [status, setStatus] = useState<any>(null);

    useEffect(() => {
        api.getSubscriptionStatus()
            .then(data => setStatus(data))
            .catch(() => setStatus("error"));
    }, []);

    if (!status || status === "error") return null;

    const isTrial = status.plan === "free" || status.status === "pending" || (status.daysRemaining != null && status.daysRemaining < 30);
    if (isTrial || status.status === "pending") {
        return (
            <Link href="/pagos">
                <div className="group flex items-center gap-2 text-xs font-black bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-full transition-all cursor-pointer shadow-lg shadow-amber-500/20 active:scale-95">
                    <Sparkles className="w-3 h-3 animate-pulse" />
                    {status.status === "pending" ? "PENDIENTE DE PAGO" : `PLAN FREE${status.daysRemaining != null && status.daysRemaining < 999 ? `: ${status.daysRemaining} DÍAS` : ""}`}
                    <div className="hidden lg:block border-l border-white/30 ml-1 pl-2 text-[10px] font-bold">
                        UPGRADE
                    </div>
                </div>
            </Link>
        );
    }

    return (
        <div className="flex items-center gap-2 text-sm font-black text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-100 uppercase tracking-tighter">
            <Trophy className="w-3.5 h-3.5 text-blue-600" /> Professional Edition
        </div>
    );
}
