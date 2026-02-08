"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Plus, FileText, Users, BarChart3, ChevronRight, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { AIService } from "@/lib/ai-service-mock";
import { usePreferences } from "@/components/providers/PreferencesContext";
import { useEffect, useState } from "react";

const LEXIS_ASSISTANT_COLLAPSED_KEY = "lexis-assistant-collapsed";

/** Saludos tipo SaaS: inteligentes, no robóticos */
function getSaaSGreeting(userName: string, hasInvoices: boolean): { title: string; sub?: string } {
    const name = userName || "ahí";
    const h = new Date().getHours();
    const isMorning = h < 12;
    const isEvening = h >= 18;

    if (!hasInvoices) {
        return {
            title: `Bienvenido de nuevo, ${name}.`,
            sub: "Todo listo para facturar. ¿Creamos la primera juntos?",
        };
    }

    const options: { title: string; sub?: string }[] = [
        { title: `Bienvenido de nuevo, ${name}.`, sub: "Tu centro de control está preparado." },
        { title: "Tu centro de control está preparado.", sub: `Todo listo para seguir facturando, ${name}.` },
        { title: `Hola, ${name}.`, sub: "Hoy es un buen día para mantener tu negocio en orden." },
        { title: "Todo al día.", sub: "Tu panel está listo para cuando lo necesites." },
    ];

    if (isMorning) {
        options.push({ title: `Buen arranque, ${name}.`, sub: "Tu espacio de facturación está listo." });
    }
    if (isEvening) {
        options.push({ title: `Buenas noches, ${name}.`, sub: "Tu resumen está actualizado." });
    }

    return options[new Date().getDate() % options.length] ?? options[0];
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
    /** Meta de facturas del mes (ej. mes pasado) para mostrar barra de progreso */
    targetInvoices?: number;
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
    targetInvoices,
    className,
}: LexisMessageWidgetProps) {
    const { mode } = usePreferences();
    const [task, setTask] = useState<{ task: string; urgency: string } | null>(null);
    const [collapsed, setCollapsed] = useState(false);

    useEffect(() => {
        const currentDay = new Date().getDate();
        setTask(AIService.predictNextTaxTask(currentDay));
    }, []);

    useEffect(() => {
        try {
            const stored = typeof window !== "undefined" ? localStorage.getItem(LEXIS_ASSISTANT_COLLAPSED_KEY) : null;
            setCollapsed(stored === "true");
        } catch {
            setCollapsed(false);
        }
    }, []);

    const setCollapsedAndSave = (value: boolean) => {
        setCollapsed(value);
        try {
            localStorage.setItem(LEXIS_ASSISTANT_COLLAPSED_KEY, String(value));
        } catch {
            /* ignore */
        }
    };

    const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
    const shortcutHint = isMac ? "⌘K" : "Ctrl+K";

    const hasInvoices = (monthlySummary?.invoiceCount ?? 0) > 0;
    const { title: greetingTitle, sub: greetingSub } = getSaaSGreeting(userName || "", hasInvoices);
    const displayMessage = contextualMessage || greetingSub || "Aquí está tu resumen. ¿En qué te ayudo hoy?";
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
                "mb-6 overflow-hidden relative rounded-[16px]",
                "border border-white/40 dark:border-slate-600/40",
                "bg-white/75 dark:bg-slate-900/70 backdrop-blur-xl",
                "shadow-[0_4px_24px_-4px_rgba(30,41,59,0.08),0_8px_48px_-8px_rgba(30,41,59,0.12)]",
                "dark:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.35),0_8px_48px_-8px_rgba(0,0,0,0.4)]",
                "transition-all duration-300 ease-out",
                className
            )}
        >
            {/* Barra lateral: gradiente navy → azul eléctrico → violeta */}
            <div className="absolute top-0 left-0 w-1 sm:w-1.5 h-full rounded-l-[16px] opacity-95 lexis-assistant-bar" />
            {/* Glow sutil esquina superior derecha */}
            <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full opacity-30 dark:opacity-20 pointer-events-none lexis-assistant-glow" />

            <CardContent className="relative p-5 sm:p-6 flex flex-col gap-5">
                {/* Header: icono + etiqueta + título (si colapsado) + botón colapsar */}
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <div className="flex gap-4 flex-1 min-w-0">
                        <div className="relative shrink-0">
                            <div className="lexis-assistant-icon flex items-center justify-center w-12 h-12 rounded-[14px] border border-white/30 dark:border-slate-500/30 shadow-lg transition-transform duration-200 hover:scale-105">
                                <Sparkles className="w-5 h-5 text-white" strokeWidth={2} />
                            </div>
                            <span
                                className="lexis-assistant-dot absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-white dark:border-slate-900 animate-pulse"
                                aria-hidden
                            />
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Asistente Lexis
                            </span>
                            <p className="text-[15px] leading-relaxed text-slate-800 dark:text-slate-200 font-semibold tracking-tight mt-0.5">
                                {greetingTitle}
                            </p>
                            {collapsed && (
                                <p className="text-[14px] leading-relaxed text-slate-600 dark:text-slate-400 font-normal mt-0.5 truncate">
                                    {displayMessage}
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {showNewInvoiceCTA && collapsed && (
                            <Link href="/nueva-factura" className="sm:order-2">
                                <Button
                                    size="sm"
                                    className="lexis-assistant-cta rounded-[12px] font-semibold text-white border-0 text-xs px-4 py-2 h-9"
                                >
                                    <Plus className="w-3.5 h-3.5 mr-1.5" strokeWidth={2.5} />
                                    Nueva Factura
                                </Button>
                            </Link>
                        )}
                        <button
                            type="button"
                            onClick={() => setCollapsedAndSave(!collapsed)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-300 dark:hover:bg-slate-800 transition-colors duration-200"
                            aria-label={collapsed ? "Expandir asistente" : "Minimizar asistente"}
                        >
                            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                {!collapsed && (
                    <>
                        <div className="flex flex-col sm:flex-row sm:items-start gap-5 -mt-2">
                            <div className="flex gap-4 flex-1 min-w-0 pl-0 sm:pl-16">
                                <div className="space-y-2.5 flex-1 min-w-0">
                                    <p className="text-[14px] leading-relaxed text-slate-600 dark:text-slate-400 font-normal">
                                        {displayMessage}
                                    </p>
                        {/* Meta del mes: barra de progreso motivacional */}
                        {targetInvoices != null && targetInvoices > 0 && monthlySummary && (() => {
                            const pct = Math.min(100, (monthlySummary.invoiceCount / targetInvoices) * 100);
                            return (
                                <div className="lexis-meta-wrapper space-y-1.5">
                                    <style
                                        dangerouslySetInnerHTML={{
                                            __html: `.lexis-meta-wrapper { --lexis-meta-pct: ${pct}% }`,
                                        }}
                                    />
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-medium text-slate-600 dark:text-slate-400">Meta del mes</span>
                                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                                            {Math.min(monthlySummary.invoiceCount, targetInvoices)} / {targetInvoices} facturas
                                        </span>
                                    </div>
                                    <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                        <div className="lexis-meta-progress h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all duration-500 ease-out" />
                                    </div>
                                </div>
                            );
                        })()}
                        {monthlySummary && monthlySummary.invoiceCount > 0 && (
                            <p className="text-sm text-slate-600 dark:text-slate-400 font-normal">
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
                                            <span className="text-violet-600 dark:text-violet-400 font-medium">
                                                ↓ {(((previousRevenue - revenue) / previousRevenue) * 100).toFixed(0)}% respecto al mes pasado
                                            </span>
                                        )}
                                    </span>
                                )}
                            </p>
                        )}
                        <div className="flex flex-wrap gap-2 pt-1">
                            {milestoneMsg && (
                                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg inline-flex items-center bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700/50">
                                    🎉 {milestoneMsg}
                                </span>
                            )}
                            {task && task.urgency !== "low" && mode !== "simple" && (
                                <span
                                    className={cn(
                                        "text-xs font-semibold px-2.5 py-1 rounded-lg inline-flex items-center border transition-colors duration-200",
                                        task.urgency === "high" ? "bg-red-50 text-red-700 border-red-200/60 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/50" : "bg-blue-50 text-blue-700 border-blue-200/60 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/50"
                                    )}
                                >
                                    ⚡ {task.task}
                                </span>
                            )}
                            {predictions.map((pred, i) => (
                                <span
                                    key={i}
                                    className="text-xs font-semibold px-2.5 py-1 rounded-lg inline-flex items-center bg-slate-100 text-slate-700 border border-slate-200/80 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700/50"
                                >
                                    🔮 {pred}
                                </span>
                            ))}
                        </div>
                        {lastInvoiceDate && (
                            <p className="text-xs text-slate-500 dark:text-slate-500 font-normal">
                                <span className="font-medium text-slate-600 dark:text-slate-400">Última factura:</span>{" "}
                                {formatLastInvoiceAgo(lastInvoiceDate)}
                            </p>
                        )}
                        <p className="text-xs text-slate-500 dark:text-slate-500 mt-2 pt-2 border-t border-slate-200/80 dark:border-slate-700/50 font-normal">
                            <span className="font-medium text-slate-600 dark:text-slate-400">Lexis te recomienda:</span> {consejo}
                        </p>
                                </div>
                            </div>
                            <div className="flex flex-col gap-3 shrink-0">
                                {showNewInvoiceCTA && (
                                    <Link href="/nueva-factura" className="w-full sm:w-auto">
                                        <Button
                                            size="default"
                                            className={cn(
                                                "lexis-assistant-cta w-full sm:w-auto rounded-[14px] font-semibold transition-all duration-200 ease-out",
                                                "hover:scale-[1.02] active:scale-[0.98] hover:opacity-95 text-white border-0"
                                            )}
                                        >
                                            <Plus className="w-4 h-4 mr-2" strokeWidth={2.5} />
                                            Nueva Factura
                                        </Button>
                                    </Link>
                                )}
                                {pendingCount > 0 && (
                                    <Link
                                        href="/documentos"
                                        className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 inline-flex items-center gap-1 transition-colors duration-200"
                                    >
                                        Ver {pendingCount} pendiente{pendingCount !== 1 ? "s" : ""} de cobro
                                        <ChevronRight className="w-4 h-4" />
                                    </Link>
                                )}
                                <div className="flex flex-wrap gap-2 sm:gap-3">
                                    {quickLinks.map(({ label, href, icon: Icon }) => (
                                        <Link
                                            key={href}
                                            href={href}
                                            className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 inline-flex items-center gap-1.5 transition-colors duration-200"
                                        >
                                            <Icon className="w-3.5 h-3.5" />
                                            {label}
                                        </Link>
                                    ))}
                                </div>
                                <p className="text-[11px] text-slate-400 dark:text-slate-500 font-normal">
                                    Atajos de teclado: <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono text-[10px]">{shortcutHint}</kbd>
                                </p>
                            </div>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
