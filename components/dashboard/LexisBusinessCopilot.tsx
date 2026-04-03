"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Activity,
    AlertTriangle,
    TrendingUp,
    Users,
    ShieldAlert,
    Target,
    ChevronDown,
    ChevronUp,
    Zap,
    BarChart3,
    FileText,
    Radar,
    DollarSign,
    RefreshCw,
    ArrowRight,
} from "lucide-react";
import { LexisMessageWidget } from "./LexisMessageWidget";
import { CollectionsManager } from "./CollectionsManager";
import { api } from "@/lib/api-service";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { NewInvoiceButton } from "@/components/NewInvoiceButton";

const LEXIS_COPILOT_COLLAPSED_KEY = "lexis-copilot-collapsed";
const LEXIS_COPILOT_CACHE_KEY = "lexis-copilot-cache";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos
const MIN_LOADING_MS = 6000; // No mostrar error antes de 6 segundos
const REQUEST_TIMEOUT_MS = 12000;
const RETRY_ATTEMPTS = 2;
const RETRY_DELAY_MS = 2000;

export interface ProactiveInsight {
    id: string;
    priority: 'critical' | 'important' | 'opportunity';
    type: string;
    title: string;
    message: string;
    humanMessage: string;
    action: {
        label: string;
        url: string;
        type: string;
        data?: any;
    };
    metadata?: any;
}

export interface BusinessCopilotData {
    insufficientData?: boolean;
    message?: string;
    alerts: Array<{ type: string; severity: string; message: string; count?: number; pct?: number; clientName?: string; service?: string; amount?: number }>;
    clientRadar: Array<{ rnc: string; clientName: string; daysSinceLastInvoice: number; totalRevenue: number; revenuePct: number; status: string; recommendation?: string }>;
    rankings: {
        topClient?: { name: string; total: number; pct: number } | null;
        droppedClient?: { name: string; lastMonthTotal: number } | null;
        topService?: { description: string; totalRevenue: number; totalQuantity: number } | null;
    };
    fiscalAlerts: Array<{ type: string; severity: string; message: string }>;
    prediction: { currentRevenue: number; projectedMonth: number; dailyRate: number; daysRemaining: number; projectedCash15Days?: number };
    businessHealth: { score: number; label: string; concentrationRisk?: string };
    paymentInsights?: { creditPct: number; transferPct: number; totalBalancePendiente: number };
    morosityRadar?: {
        totalPendiente: number;
        clientes: Array<{ rnc: string; clientName: string; totalPendiente: number; facturasVencidas: number; diasMayorAntiguedad: number; nivel: string }>;
        riesgoGeneral: string;
    };
    proactiveInsights?: ProactiveInsight[];
}

const formatCurrency = (n: number | null | undefined) => {
    if (n === null || n === undefined || isNaN(n)) return "RD$0.00";
    return new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
};

function AlertIcon({ severity }: { severity: string }) {
    switch (severity) {
        case "positive":
            return <TrendingUp className="w-4 h-4 text-emerald-500" />;
        case "high":
            return <AlertTriangle className="w-4 h-4 text-red-500" />;
        case "medium":
            return <AlertTriangle className="w-4 h-4 text-amber-500" />;
        default:
            return <Activity className="w-4 h-4 text-blue-500" />;
    }
}

function StatusDot({ status }: { status: string }) {
    const colors = { active: "bg-emerald-500", at_risk: "bg-amber-500", lost: "bg-red-500" };
    return <span className={cn("inline-block w-2 h-2 rounded-full mr-1.5", colors[status as keyof typeof colors] || "bg-slate-400")} />;
}

function getCachedData(): BusinessCopilotData | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = localStorage.getItem(LEXIS_COPILOT_CACHE_KEY);
        if (!raw) return null;
        const { data, ts } = JSON.parse(raw);
        if (Date.now() - ts > CACHE_TTL_MS) return null;
        return data;
    } catch {
        return null;
    }
}

function setCachedData(data: BusinessCopilotData) {
    try {
        localStorage.setItem(LEXIS_COPILOT_CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
    } catch { /* ignore */ }
}

function getSmartSubtitle(data: BusinessCopilotData): string {
    const score = data?.businessHealth?.score ?? 0;
    const hasAlerts = (data?.alerts?.length ?? 0) + (data?.fiscalAlerts?.length ?? 0) > 0;
    const hasGrowth = data?.alerts?.some(a => a.type === "revenue_growth");
    const hasDrop = data?.alerts?.some(a => a.type === "revenue_drop");
    if (hasGrowth) return "Detectamos oportunidades para aumentar tu facturación.";
    if (hasDrop) return "Trinalyze ha detectado variaciones en tu ritmo. Te sugerimos revisar el análisis.";
    if (hasAlerts) return "Hay aspectos de tu negocio que requieren tu atención.";
    if (score >= 70) return "Hoy tu negocio muestra un comportamiento estable.";
    if (score >= 50) return "Tu negocio se mantiene. Hay margen para optimizar.";
    return "Análisis automático de tu facturación y clientes.";
}

export function LexisBusinessCopilot() {
    const router = useRouter();
    const [data, setData] = useState<BusinessCopilotData | null>(null);
    const [loading, setLoading] = useState(true);
    const [collapsed, setCollapsed] = useState(false);
    const [showError, setShowError] = useState(false);
    const [isRetrying, setIsRetrying] = useState(false);
    const [fromCache, setFromCache] = useState(false);
    const [showCollections, setShowCollections] = useState(false);

    useEffect(() => {
        const stored = typeof window !== "undefined" ? localStorage.getItem(LEXIS_COPILOT_COLLAPSED_KEY) : null;
        setCollapsed(stored === "true");
        
        const cached = getCachedData();
        if (cached) {
            setData(cached);
            setFromCache(true);
        }
    }, []);

    const fetchWithRetry = useCallback(async (signal?: AbortSignal): Promise<BusinessCopilotData | null> => {
        const { api } = await import("@/lib/api-service");
        for (let attempt = 0; attempt <= RETRY_ATTEMPTS; attempt++) {
            if (signal?.aborted) throw new Error("cancelled");
            
            try {
                const timeoutId = setTimeout(() => {
                    if (signal) signal.dispatchEvent(new Event('abort'));
                }, REQUEST_TIMEOUT_MS);
                
                const res = await Promise.race([
                    api.getBusinessCopilot(),
                    new Promise<never>((_, reject) => {
                        if (signal) {
                            signal.addEventListener('abort', () => {
                                clearTimeout(timeoutId);
                                reject(new Error("timeout"));
                            });
                        } else {
                            setTimeout(() => {
                                clearTimeout(timeoutId);
                                reject(new Error("timeout"));
                            }, REQUEST_TIMEOUT_MS);
                        }
                    }),
                ]);
                
                clearTimeout(timeoutId);
                return res;
            } catch (err: any) {
                if (signal?.aborted || err.message === "cancelled") throw err;
                if (attempt < RETRY_ATTEMPTS) {
                    await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
                }
            }
        }
        return null;
    }, []);

    useEffect(() => {
        let cancelled = false;
        let timeoutId: NodeJS.Timeout | null = null;
        
        const loadData = async () => {
            setLoading(true);
            setShowError(false);
            setFromCache(false);
            const startTime = Date.now();
            
            const controller = new AbortController();
            
            try {
                const res = await fetchWithRetry(controller.signal);
                
                if (cancelled) return;
                
                const elapsed = Date.now() - startTime;
                const minWaitRemaining = Math.max(0, MIN_LOADING_MS - elapsed);
                
                if (minWaitRemaining > 0) {
                    await new Promise(r => {
                        timeoutId = setTimeout(r, minWaitRemaining);
                    });
                }
                
                if (cancelled) return;
                
                if (res) {
                    setData(res);
                    setCachedData(res);
                    setShowError(false);
                } else {
                    const cached = getCachedData();
                    if (cached) {
                        setData(cached);
                        setFromCache(true);
                        setShowError(true);
                    } else {
                        setData(null);
                        setShowError(true);
                    }
                }
            } catch (err: any) {
                if (cancelled || err.message === "cancelled") return;
                
                const cached = getCachedData();
                if (cached) {
                    setData(cached);
                    setFromCache(true);
                    setShowError(true);
                } else {
                    setData(null);
                    setShowError(true);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };
        
        loadData();
        
        return () => {
            cancelled = true;
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, []);

    useEffect(() => {
        if (!showError || loading) return;
        
        let cancelled = false;
        const intervalId = setInterval(() => {
            if (cancelled) return;
            
            fetchWithRetry().then(res => {
                if (cancelled || !res) return;
                setData(res);
                setCachedData(res);
                setFromCache(false);
                setShowError(false);
            }).catch(() => {
                // Ignore
            });
        }, 15000);
        
        return () => {
            cancelled = true;
            clearInterval(intervalId);
        };
    }, [showError, loading]);

    const setCollapsedAndSave = (v: boolean) => {
        setCollapsed(v);
        try {
            localStorage.setItem(LEXIS_COPILOT_COLLAPSED_KEY, String(v));
        } catch { /* ignore */ }
    };

    const handleManualRetry = () => {
        setIsRetrying(true);
        setLoading(true);
        setShowError(false);
        setFromCache(false);
        
        fetchWithRetry().then(res => {
            if (res) {
                setData(res);
                setCachedData(res);
                setShowError(false);
            } else {
                const cached = getCachedData();
                if (cached) {
                    setData(cached);
                    setFromCache(true);
                    setShowError(true);
                } else {
                    setData(null);
                    setShowError(true);
                }
            }
        }).catch(() => {
            const cached = getCachedData();
            if (cached) {
                setData(cached);
                setFromCache(true);
                setShowError(true);
            } else {
                setData(null);
                setShowError(true);
            }
        }).finally(() => {
            setLoading(false);
            setIsRetrying(false);
        });
    };

    if (loading && !data) {
        return (
            <Card className="mb-6 overflow-hidden rounded-2xl border border-white/40 dark:border-slate-600/40 bg-white/80 dark:bg-slate-900/70 backdrop-blur-xl">
                <CardContent className="p-6">
                    <div className="animate-pulse flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-slate-200/80 dark:bg-slate-700/80" />
                        <div className="flex-1 space-y-2">
                            <div className="h-4 w-48 bg-slate-200/80 dark:bg-slate-700/80 rounded animate-pulse" />
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                                Trinalyze Copilot está analizando tu negocio…
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (showError && !data) {
        return (
            <Card className="mb-6 overflow-hidden rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl">
                <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                <Activity className="w-6 h-6 text-slate-500 dark:text-slate-400" />
                            </div>
                            <div>
                                <p className="font-semibold text-foreground">Trinalyze Business Copilot</p>
                                <p className="text-sm text-muted-foreground mt-0.5">
                                    El asistente está teniendo dificultades para cargar el análisis.<br />
                                    Estamos reintentando en segundo plano.
                                </p>
                            </div>
                        </div>
                        <Button variant="outline" onClick={handleManualRetry} disabled={isRetrying} className="gap-2 shrink-0">
                            <RefreshCw className={cn("w-4 h-4", isRetrying && "animate-spin")} />
                            {isRetrying ? "Reintentando…" : "Reintentar ahora"}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!data) return null;

    if (data.insufficientData) {
        return (
            <Card className="mb-6 overflow-hidden rounded-2xl border border-blue-200/50 dark:border-blue-800/40 bg-blue-50/30 dark:bg-blue-950/20 backdrop-blur-xl">
                <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center shrink-0">
                            <Activity className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="font-semibold text-foreground">Trinalyze Business Copilot</p>
                            <p className="text-sm text-muted-foreground mt-1">
                                {data.message ?? "Aún no tenemos suficientes datos para generar un análisis inteligente. Crea tus primeras facturas y el Copilot comenzará a darte recomendaciones automáticamente."}
                            </p>
                            <Button asChild variant="default" size="sm" className="mt-4 gap-2">
                                <Link href="/nueva-factura">
                                    <FileText className="w-4 h-4" />
                                    Crear primera factura
                                </Link>
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const hasAlerts = (data.alerts?.length ?? 0) > 0 || (data.fiscalAlerts?.length ?? 0) > 0;
    const hasContent = hasAlerts || (data.clientRadar?.length ?? 0) > 0 || data.rankings?.topClient || data.rankings?.topService || (data.businessHealth?.score ?? 0) > 0;

    return (
        <Card
            className={cn(
                "mb-6 overflow-hidden relative rounded-2xl",
                "border border-white/40 dark:border-slate-600/40",
                "bg-white/80 dark:bg-slate-900/70 backdrop-blur-xl",
                "shadow-[0_4px_24px_-4px_rgba(30,41,59,0.08),0_8px_48px_-8px_rgba(30,41,59,0.12)]",
                "dark:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.35),0_8px_48px_-8px_rgba(0,0,0,0.4)]",
                "transition-all duration-300"
            )}
        >
            <div className="absolute top-0 left-0 w-1.5 h-full rounded-l-2xl bg-gradient-to-b from-slate-700 via-blue-600 to-violet-600 opacity-90" />

            <CardHeader className="pb-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-slate-700 via-blue-600 to-violet-600 shadow-lg">
                            <Activity className="w-6 h-6 text-white" strokeWidth={2} />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                                Trinalyze observa tu negocio
                            </CardTitle>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                                {getSmartSubtitle(data)}
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setCollapsedAndSave(!collapsed)}
                        className="shrink-0 text-slate-500 hover:text-slate-700"
                    >
                        {collapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                    </Button>
                </div>
    
                <div className="flex items-center gap-4 mt-4 pl-0 sm:pl-16">
                    <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                        <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <div>
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Salud de tu negocio</span>
                            <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
                                {data?.businessHealth?.score ?? 0} — {data?.businessHealth?.label ?? "Estable"}
                            </p>
                        </div>
                    </div>
                    {data?.businessHealth?.concentrationRisk && (
                        <p className="text-sm text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            {data.businessHealth.concentrationRisk}
                        </p>
                    )}
                </div>
            </CardHeader>

            {data?.proactiveInsights && data.proactiveInsights.length > 0 && (
                <div className="px-6 pb-4 space-y-3">
                    {data.proactiveInsights.map((insight) => (
                        <motion.div
                            key={insight.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={cn(
                                "rounded-xl border p-4 flex items-start gap-3 transition-all",
                                insight.priority === 'critical' ? "bg-red-50 dark:bg-red-950/20" : "bg-blue-50 dark:bg-blue-950/20"
                            )}
                        >
                            <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-sm mb-1">{insight.title}</h4>
                                <p className="text-sm opacity-90 mb-3">{insight.humanMessage}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {!collapsed && hasContent && (
                <CardContent className="pt-0 space-y-6">
                    {data?.alerts && data.alerts.length > 0 && (
                        <div className="grid gap-3 sm:grid-cols-2">
                            {data.alerts.map((a, i) => (
                                <div key={i} className="flex items-start gap-3 p-4 rounded-xl border bg-slate-50 dark:bg-slate-800/50">
                                    <AlertIcon severity={a.severity} />
                                    <p className="text-sm text-slate-700 dark:text-slate-300">{a.message}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            )}

            <CollectionsManager isOpen={showCollections} onClose={() => setShowCollections(false)} />
        </Card>
    );
}
