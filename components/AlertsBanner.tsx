"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { api } from "@/lib/api-service";
import Link from "next/link";

interface Alert {
    type: string;
    message: string;
    severity: string;
}

export function AlertsBanner() {
    const [alerts, setAlerts] = useState<Alert[]>([]);

    useEffect(() => {
        api.getAlerts().then((res) => setAlerts(res?.alerts || [])).catch(() => setAlerts([]));
    }, []);

    if (alerts.length === 0) return null;

    return (
        <div className="mb-6 space-y-2">
            {alerts.map((a, i) => (
                <div
                    key={i}
                    className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
                        a.severity === "warning"
                            ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100"
                            : "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100"
                    }`}
                >
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <span className="text-sm font-medium flex-1">{a.message}</span>
                    {a.type === "ncf_low" || a.type === "ncf_expiring" ? (
                        <Link href="/configuracion" className="text-sm font-semibold underline">
                            Configurar NCF
                        </Link>
                    ) : a.type === "subscription_expiring" ? (
                        <Link href="/pagos" className="text-sm font-semibold underline">
                            Renovar
                        </Link>
                    ) : null}
                </div>
            ))}
        </div>
    );
}
