"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, Plus, FileText, Users, BarChart3, ChevronRight } from "lucide-react";
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

const CONSEJOS_POR_DIA: string[] = [
    "Domingo: Revisa tu flujo de caja para la semana.",
    "Lunes: Buen día para enviar recordatorios de cobro.",
    "Martes: Mantén actualizados tus comprobantes fiscales.",
    "Miércoles: Revisa que tus secuencias NCF tengan margen.",
    "Jueves: Prepara los datos para reportes 606 y 607.",
    "Viernes: Cierra la semana con facturas al día.",
    "Sábado: Aprovecha para organizar clientes y documentos.",
];

const MILESTONES = [5, 10, 25, 50, 100];

function getConsejoDelDia(): string {
    const day = new Date().getDay();
    return CONSEJOS_POR_DIA[day] ?? CONSEJOS_POR_DIA[0];
}

function getMilestoneMessage(count: number): string | null {
    const reached = MILESTONES.filter((m) => count >= m);
    const hit = reached.length > 0 ? reached[reached.length - 1] : null;
    if (!hit) return null;
    return `¡${hit} facturas este mes!`;
}

/** Formatea "hace X días" o "hoy" / "ayer" a partir de una fecha ISO */
function formatLastInvoiceAgo(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const other = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffMs = today.getTime() - other.getTime();
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    if (diffDays === 0) return "hoy";
    if (diffDays === 1) return "ayer";
    if (diffDays >= 2 && diffDays <= 6) return `hace ${diffDays} días`;
    if (diffDays >= 7 && diffDays <= 13) return "hace 1 semana";
    if (diffDays >= 14 && diffDays <= 29) return `hace ${Math.floor(diffDays / 7)} semanas`;
    return date.toLocaleDateString("es-DO", { day: "numeric", month: "short" });
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
    /** Fecha de la última factura (ISO) para mostrar "Última factura: hace X días" */
    lastInvoiceDate?: string;
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
    lastInvoiceDate,
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

    const consejo = getConsejoDelDia();
    const milestoneMsg = monthlySummary && monthlySummary.invoiceCount > 0 ? getMilestoneMessage(monthlySummary.invoiceCount) : null;

    const quickLinks = [
        { label: "Facturas", href: "/documentos", icon: FileText },
        { label: "Reportes", href: "/reportes", icon: BarChart3 },
        { label: "Clientes", href: "/clientes", icon: Users },
    ];

    return (
        <Card
            className={cn(
                "border border-amber-200/60 dark:border-amber-800/40 rounded-2xl",
                "bg-gradient-to-br from-amber-50/90 via-white to-orange-50/70 dark:from-amber-950/30 dark:via-slate-900/50 dark:to-amber-900/20",
                "shadow-md shadow-amber-500/5 dark:shadow-amber-500/10 mb-6 overflow-hidden relative",
                "backdrop-blur-[1px]",
                className
            )}
        >
            {/* Barra lateral con gradiente */}
            <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-amber-400 via-amber-500 to-orange-500 rounded-l-2xl" />
            {/* Detalle decorativo suave en esquina */}
            <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-amber-200/30 dark:bg-amber-600/10 blur-2xl" />
            <CardContent className="relative p-5 sm:p-6 flex flex-col sm:flex-row sm:items-start gap-5">
                <div className="flex gap-4 flex-1 min-w-0">
                    <div className="mt-0.5 flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-amber-100 to-amber-200/80 dark:from-amber-800/40 dark:to-amber-900/30 border border-amber-200/50 dark:border-amber-700/30 shadow-inner shrink-0">
                        <MessageCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" strokeWidth={2} />
                    </div>
                    <div className="space-y-2.5 flex-1 min-w-0">
                        <p className="text-[15px] leading-relaxed text-slate-700 dark:text-slate-300">
                            <span className="font-semibold text-amber-800 dark:text-amber-300 tracking-tight">
                                {greeting}, {displayName}.
                            </span>{" "}
                            <span className="text-slate-600 dark:text-slate-400">
                                {contextualMessage || "Aquí está tu resumen. ¿En qué te ayudo hoy?"}
                            </span>
                        </p>
                        {monthlySummary && monthlySummary.invoiceCount > 0 && (
                            <p className="text-sm text-slate-600 dark:text-slate-400">
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
                            {milestoneMsg && (
                                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg inline-flex items-center bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-700/40">
                                    🎉 {milestoneMsg}
                                </span>
                            )}
                            {task && task.urgency !== "low" && mode !== "simple" && (
                                <span
                                    className={cn(
                                        "text-xs font-semibold px-2.5 py-1 rounded-lg inline-flex items-center border",
                                        task.urgency === "high" ? "bg-red-50 text-red-700 border-red-200/60 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/50" : "bg-blue-50 text-blue-700 border-blue-200/60 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/50"
                                    )}
                                >
                                    ⚡ {task.task}
                                </span>
                            )}
                            {predictions.map((pred, i) => (
                                <span
                                    key={i}
                                    className="text-xs font-semibold px-2.5 py-1 rounded-lg inline-flex items-center bg-amber-50 text-amber-800 border border-amber-200/60 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-700/40"
                                >
                                    🔮 {pred}
                                </span>
                            ))}
                        </div>
                        {/* Última factura */}
                        {lastInvoiceDate && (
                            <p className="text-xs text-slate-500 dark:text-slate-500">
                                <span className="font-medium text-slate-600 dark:text-slate-400">Última factura:</span>{" "}
                                {formatLastInvoiceAgo(lastInvoiceDate)}
                            </p>
                        )}
                        {/* Consejo del día */}
                        <p className="text-xs text-slate-500 dark:text-slate-500 mt-2 pt-2 border-t border-amber-200/50 dark:border-amber-800/30">
                            <span className="font-medium text-amber-700/80 dark:text-amber-400/80">Lexis te recomienda:</span> {consejo}
                        </p>
                    </div>
                </div>
                <div className="flex flex-col gap-3 shrink-0">
                    {showNewInvoiceCTA && (
                        <Link href="/nueva-factura" className="w-full sm:w-auto">
                            <Button
                                size="default"
                                className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold shadow-md shadow-amber-500/25 hover:shadow-lg hover:shadow-amber-500/30 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] border border-amber-400/20"
                            >
                                <Plus className="w-4 h-4 mr-2" strokeWidth={2.5} />
                                Nueva Factura
                            </Button>
                        </Link>
                    )}
                    {pendingCount > 0 && (
                        <Link
                            href="/documentos"
                            className="text-sm font-medium text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 inline-flex items-center gap-1 transition-colors"
                        >
                            Ver {pendingCount} pendiente{pendingCount !== 1 ? "s" : ""} de cobro
                            <ChevronRight className="w-4 h-4" />
                        </Link>
                    )}
                    {/* Acciones rápidas */}
                    <div className="flex flex-wrap gap-2 sm:gap-3">
                        {quickLinks.map(({ label, href, icon: Icon }) => (
                            <Link
                                key={href}
                                href={href}
                                className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 inline-flex items-center gap-1.5 transition-colors"
                            >
                                <Icon className="w-3.5 h-3.5" />
                                {label}
                            </Link>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
