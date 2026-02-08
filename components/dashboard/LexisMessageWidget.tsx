"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, Plus } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { AIService } from "@/lib/ai-service-mock";
import { usePreferences } from "@/components/providers/PreferencesContext";
import { useEffect, useState } from "react";

function getTimeGreeting(): string {
    const h = new Date().getHours();
    if (h < 12) return "Buenos días";
    if (h < 18) return "Buenas tardes";
    return "Buenas noches";
}

interface LexisMessageWidgetProps {
    userName: string;
    contextualMessage?: string;
    monthlySummary?: { revenue: number; invoiceCount: number; clientCount: number };
    /** Para alertas y tareas */
    revenue?: number;
    previousRevenue?: number;
    pendingCount?: number;
    predictions?: string[];
    className?: string;
}

export function LexisMessageWidget({
    userName,
    contextualMessage,
    monthlySummary,
    revenue = 0,
    previousRevenue,
    pendingCount = 0,
    predictions = [],
    className,
}: LexisMessageWidgetProps) {
    const { mode } = usePreferences();
    const [task, setTask] = useState<{ task: string; urgency: string } | null>(null);

    useEffect(() => {
        const currentDay = new Date().getDate();
        setTask(AIService.predictNextTaxTask(currentDay));
    }, []);

    const greeting = getTimeGreeting();
    const displayName = userName || "ahí";
    const formatCurrency = (n: number) =>
        new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP", maximumFractionDigits: 0 }).format(n);

    const showNewInvoiceCTA =
        !contextualMessage ||
        contextualMessage.includes("factura") ||
        contextualMessage.includes("primera") ||
        (monthlySummary?.invoiceCount ?? 0) === 0;

    return (
        <Card
            className={cn(
                "border-none bg-gradient-to-r from-amber-50 to-amber-100/50 dark:from-amber-950/20 dark:to-amber-900/10 shadow-sm mb-6 overflow-hidden relative",
                className
            )}
        >
            <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
            <CardContent className="p-4 flex flex-col sm:flex-row sm:items-start gap-4">
                <div className="flex gap-4 flex-1 min-w-0">
                    <div className="mt-1 bg-amber-500/10 p-2 rounded-full shrink-0">
                        <MessageCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="space-y-2 flex-1 min-w-0">
                        <p className="text-foreground font-medium">
                            <span className="text-amber-700 dark:text-amber-400 font-semibold">
                                {greeting}, {displayName}.
                            </span>{" "}
                            {contextualMessage || "Aquí está tu resumen. ¿En qué te ayudo hoy?"}
                        </p>
                        {monthlySummary && monthlySummary.invoiceCount > 0 && (
                            <p className="text-sm text-muted-foreground">
                                Este mes has facturado {formatCurrency(monthlySummary.revenue)} a{" "}
                                {monthlySummary.clientCount} cliente{monthlySummary.clientCount !== 1 ? "s" : ""} (
                                {monthlySummary.invoiceCount} comprobante
                                {monthlySummary.invoiceCount !== 1 ? "s" : ""}).
                                {typeof previousRevenue === "number" && previousRevenue > 0 && revenue !== previousRevenue && (
                                    <span className="block mt-1">
                                        {revenue > previousRevenue ? (
                                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                                ↑ {(((revenue - previousRevenue) / previousRevenue) * 100).toFixed(0)}% respecto al mes pasado
                                            </span>
                                        ) : (
                                            <span className="text-amber-600 dark:text-amber-400 font-medium">
                                                ↓ {(((previousRevenue - revenue) / previousRevenue) * 100).toFixed(0)}% respecto al mes pasado
                                            </span>
                                        )}
                                    </span>
                                )}
                            </p>
                        )}
                        <div className="flex flex-wrap gap-2 pt-1">
                            {task && task.urgency !== "low" && mode !== "simple" && (
                                <span
                                    className={cn(
                                        "text-xs font-bold px-2 py-1 rounded inline-flex items-center",
                                        task.urgency === "high" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                    )}
                                >
                                    ⚡ {task.task}
                                </span>
                            )}
                            {predictions.map((pred, i) => (
                                <span
                                    key={i}
                                    className="text-xs font-bold px-2 py-1 rounded inline-flex items-center bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                                >
                                    🔮 {pred}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
                {showNewInvoiceCTA && (
                    <Link href="/nueva-factura" className="shrink-0">
                        <Button className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-lg shadow-amber-500/20">
                            <Plus className="w-4 h-4 mr-2" />
                            Nueva Factura
                        </Button>
                    </Link>
                )}
            </CardContent>
        </Card>
    );
}
