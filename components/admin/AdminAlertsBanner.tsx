"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Users, CreditCard, Lock, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AdminAlertsBanner() {
    const [alerts, setAlerts] = useState<Array<{ type: string; count: number; severity: string; message: string }>>([]);
    const [collapsed, setCollapsed] = useState(true);

    useEffect(() => {
        const fetchAlerts = async () => {
            try {
                const { api } = await import("@/lib/api-service");
                const res = await api.getAdminAlerts();
                setAlerts(res?.alerts ?? []);
            } catch {
                setAlerts([]);
            }
        };
        fetchAlerts();
    }, []);

    if (alerts.length === 0) return null;

    return (
        <div className="border-b border-amber-200/60 dark:border-amber-800/40 bg-amber-50/50 dark:bg-amber-950/20">
            <div className="container mx-auto px-4 py-3">
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="w-full flex items-center justify-between gap-2 text-left"
                >
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span className="text-sm font-medium text-amber-900 dark:text-amber-100">
                            {alerts.length} alerta{alerts.length !== 1 ? "s" : ""} en el panel
                        </span>
                    </div>
                    <ChevronDown className={cn("w-4 h-4 text-amber-600 transition-transform", !collapsed && "rotate-180")} />
                </button>
                {!collapsed && (
                    <div className="mt-3 flex flex-wrap gap-2">
                        {alerts.map((a) => (
                            <Link
                                key={a.type}
                                href={
                                    a.type === "pending_payments" ? "/admin" :
                                    a.type === "trials_expiring" || a.type === "inactive" || a.type === "blocked" ? "/admin/usuarios" :
                                    "/admin"
                                }
                            >
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className={cn(
                                        "gap-2",
                                        a.severity === "warning" && "border-amber-400 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40"
                                    )}
                                >
                                    {a.type === "pending_payments" && <CreditCard className="w-3.5 h-3.5" />}
                                    {a.type === "trials_expiring" && <AlertTriangle className="w-3.5 h-3.5" />}
                                    {a.type === "inactive" && <Users className="w-3.5 h-3.5" />}
                                    {a.type === "blocked" && <Lock className="w-3.5 h-3.5" />}
                                    {a.message}
                                </Button>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
