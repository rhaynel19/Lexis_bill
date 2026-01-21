"use client";

import { useEffect, useState } from "react";
import { Sparkles, Trophy } from "lucide-react";
import { api } from "@/lib/api-service";
import Link from "next/link";

export function TrialHeaderBadge() {
    const [status, setStatus] = useState<any>(null);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            setStatus("no-session");
            return;
        }

        api.getSubscriptionStatus()
            .then(data => setStatus(data))
            .catch(() => setStatus("error"));
    }, []);

    if (!status || status === "no-session" || status === "error") return null;

    if (status.subscriptionStatus === 'Trial') {
        return (
            <Link href="/pagos">
                <div className="group flex items-center gap-2 text-xs font-black bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-full transition-all cursor-pointer shadow-lg shadow-amber-500/20 active:scale-95">
                    <Sparkles className="w-3 h-3 animate-pulse" />
                    PRUEBA GRATIS: {status.daysRemaining} DÍAS
                    <div className="hidden lg:block border-l border-white/30 ml-1 pl-2 text-[10px] font-bold">
                        ACTIVAR PRO
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
