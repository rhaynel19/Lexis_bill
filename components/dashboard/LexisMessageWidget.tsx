"use client";

import { Card, CardContent } from "@/components/ui/card";
import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

function getTimeGreeting(): string {
    const h = new Date().getHours();
    if (h < 12) return "Buenos días";
    if (h < 18) return "Buenas tardes";
    return "Buenas noches";
}

interface LexisMessageWidgetProps {
    userName: string;
    /** Mensaje contextual según datos del usuario */
    contextualMessage?: string;
    /** Resumen mensual: facturado, clientes, etc. */
    monthlySummary?: { revenue: number; invoiceCount: number; clientCount: number };
    className?: string;
}

export function LexisMessageWidget({ userName, contextualMessage, monthlySummary, className }: LexisMessageWidgetProps) {
    const greeting = getTimeGreeting();
    const displayName = userName || "ahí";
    const formatCurrency = (n: number) => new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP", maximumFractionDigits: 0 }).format(n);

    return (
        <Card className={cn("border-none bg-gradient-to-r from-amber-50 to-amber-100/50 dark:from-amber-950/20 dark:to-amber-900/10 shadow-sm mb-6 overflow-hidden relative", className)}>
            <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
            <CardContent className="p-4 flex gap-4 items-start">
                <div className="mt-1 bg-amber-500/10 p-2 rounded-full shrink-0">
                    <MessageCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="space-y-2 flex-1 min-w-0">
                    <p className="text-slate-800 dark:text-slate-200 font-medium">
                        <span className="text-amber-700 dark:text-amber-400 font-semibold">{greeting}, {displayName}.</span>
                        {contextualMessage ? (
                            <> {contextualMessage}</>
                        ) : (
                            <> Aquí está tu resumen. ¿En qué te ayudo hoy?</>
                        )}
                    </p>
                    {monthlySummary && monthlySummary.invoiceCount > 0 && (
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            Este mes has facturado {formatCurrency(monthlySummary.revenue)} a {monthlySummary.clientCount} cliente{monthlySummary.clientCount !== 1 ? "s" : ""} ({monthlySummary.invoiceCount} comprobante{monthlySummary.invoiceCount !== 1 ? "s" : ""}).
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
