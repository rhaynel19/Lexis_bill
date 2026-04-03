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
import { 
    Sheet, 
    SheetContent, 
    SheetHeader, 
    SheetTitle, 
    SheetDescription 
} from "@/components/ui/sheet";

const LEXIS_COPILOT_COLLAPSED_KEY = "lexis-copilot-collapsed";
const LEXIS_COPILOT_CACHE_KEY = "lexis-copilot-cache";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos
const MIN_LOADING_MS = 2000; // Reducido para mayor agilidad (era 6000)
const REQUEST_TIMEOUT_MS = 10000;
const RETRY_ATTEMPTS = 1;
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
    biSummary?: {
        cashFlowProjection: { next7Days: number; next15Days: number; next30Days: number };
        vipClients: Array<{ name: string; totalRevenue: number; invoiceCount: number }>;
    };
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
    const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false);
    const [selectedInsight, setSelectedInsight] = useState<any>(null);

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

    const handleInsightAction = (insight: ProactiveInsight) => {
        const { type, url, data } = insight.action;
        
        switch (type) {
            case 'whatsapp_prefill':
                const wpData = insight.action.data;
                const phone = (wpData.phone || "").replace(/[^0-9]/g, "");
                const msg = encodeURIComponent(`Hola ${wpData.clientName}, de parte de Trinalyze le recordamos que la factura ${wpData.ncf} por RD$${formatCurrency(wpData.amount)} vence pronto. Puede realizar su pago vía transferencia.`);
                window.open(`https://wa.me/${phone.length === 10 ? `1${phone}` : phone}?text=${msg}`, "_blank");
                break;
            case 'open_collections_manager':
                setShowCollections(true);
                break;
            case 'view_analysis':
                setSelectedInsight(data);
                setShowDetailedAnalysis(true);
                break;
            case 'navigate':
                if (url) router.push(url);
                break;
            case 'new_invoice':
                const query = data ? new URLSearchParams(data).toString() : '';
                router.push(`/nueva-factura${query ? `?${query}` : ''}`);
                break;
            default:
                if (url) router.push(url);
        }
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
    
    // ... (keep previous error and insufficient data states, update branding to Lexis)

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
                                <p className="font-semibold text-foreground">Trinalyze Copilot</p>
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
                            <p className="font-semibold text-foreground">Trinalyze Copilot</p>
                            <p className="text-sm text-muted-foreground mt-1">
                                {data.message ?? "Aún no tenemos suficientes datos para generar un análisis inteligente. Crea tus primeras facturas y el Copilot comenzará a darte recomendaciones automáticamente."}
                            </p>
                            <NewInvoiceButton variant="card" className="mt-4 gap-2" />
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
                            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100 italic">
                                Análisis de Trinalyze
                            </CardTitle>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                                {getSmartSubtitle(data)}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowDetailedAnalysis(true)}
                            className="hidden sm:flex shrink-0 gap-2 font-medium italic border-blue-200 dark:border-blue-800"
                        >
                            <Target className="w-4 h-4 text-blue-600" />
                            Análisis Global
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setCollapsedAndSave(!collapsed)}
                            className="shrink-0 text-slate-500 hover:text-slate-700"
                        >
                            {collapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                        </Button>
                    </div>
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
                                "rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all",
                                insight.priority === 'critical' 
                                    ? "bg-red-50/50 border-red-100 dark:bg-red-950/10 dark:border-red-900/30" 
                                    : "bg-blue-50/50 border-blue-100 dark:bg-blue-950/10 dark:border-blue-900/30"
                            )}
                        >
                            <div className="flex-1 min-w-0">
                                <h4 className={cn(
                                    "font-bold text-sm mb-1",
                                    insight.priority === 'critical' ? "text-red-900 dark:text-red-400" : "text-blue-900 dark:text-blue-400"
                                )}>
                                    {insight.title}
                                </h4>
                                <p className="text-sm text-slate-700 dark:text-slate-300">{insight.humanMessage}</p>
                            </div>
                            {insight.action && (
                                <Button 
                                    size="sm" 
                                    onClick={() => handleInsightAction(insight)}
                                    className={cn(
                                        "shrink-0 font-semibold gap-2",
                                        insight.priority === 'critical' 
                                            ? "bg-red-600 hover:bg-red-700 text-white" 
                                            : "bg-blue-600 hover:bg-blue-700 text-white"
                                    )}
                                >
                                    {insight.action.label}
                                    <ArrowRight className="w-4 h-4" />
                                </Button>
                            )}
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
            
            <DetailedAnalysisDrawer 
                isOpen={showDetailedAnalysis} 
                onClose={() => {
                    setShowDetailedAnalysis(false);
                    setSelectedInsight(null);
                }} 
                insightData={selectedInsight}
                businessData={data}
            />
        </Card>
    );
}

function DetailedAnalysisDrawer({ isOpen, onClose, insightData, businessData }: any) {
    if (!isOpen) return null;
    
    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <SheetContent side="right" className="sm:max-w-[600px] w-full overflow-y-auto">
                <SheetHeader className="mb-6">
                    <SheetTitle className="text-2xl font-bold flex items-center gap-2">
                        <Radar className="text-blue-600" />
                        Centro de Inteligencia Trinalyze
                    </SheetTitle>
                    <SheetDescription>
                        Análisis profundo de la salud y proyecciones de tu negocio.
                    </SheetDescription>
                </SheetHeader>

                <div className="space-y-8">
                    {/* Resumen de Salud */}
                    <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-900/10 dark:to-indigo-900/10 p-6 rounded-2xl border border-blue-100/50 dark:border-blue-800/30 backdrop-blur-sm shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-slate-900 dark:text-slate-100 italic flex items-center gap-2">
                                <Activity className="w-4 h-4 text-blue-600" />
                                Estado Actual
                            </h3>
                            <span className="px-3 py-1 bg-blue-600 text-white dark:bg-blue-500 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-md">
                                Salud: {businessData?.businessHealth?.score}/100
                            </span>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                            Basado en tu flujo de caja de los últimos 30 días, tu negocio se encuentra en un estado <strong className="text-blue-700 dark:text-blue-300">{businessData?.businessHealth?.label}</strong>.
                        </p>
                    </div>

                    {/* NUEVA SECCIÓN: Antigüedad de Saldo (CxC) */}
                    {businessData?.biSummary?.agingBuckets && (
                        <section className="space-y-4">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 px-1">
                                <DollarSign className="w-4 h-4 text-amber-600" />
                                Antigüedad de Saldo (CxC)
                                <span className="ml-auto text-[10px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 px-2.5 py-1 rounded-lg border border-amber-100 dark:border-amber-900/30">
                                    Cartera Pendiente
                                </span>
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                {businessData.biSummary.agingBuckets.map((bucket: any, idx: number) => (
                                    <div key={idx} className="p-5 rounded-2xl border bg-slate-50/50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 transition-all hover:shadow-md hover:border-amber-200 dark:hover:border-amber-900 group">
                                        <p className="text-[10px] font-black text-slate-400 group-hover:text-amber-600 uppercase tracking-tight transition-colors">{bucket.label}</p>
                                        <p className={cn(
                                            "text-2xl font-black mt-1 tabular-nums transition-transform group-hover:scale-105",
                                            idx === 0 ? "text-slate-900 dark:text-slate-100" : "text-amber-600 dark:text-amber-500"
                                        )}>
                                            {formatCurrency(bucket.amount)}
                                        </p>
                                        <div className="mt-3 flex items-center gap-2 grayscale group-hover:grayscale-0 opacity-70 group-hover:opacity-100 transition-all">
                                            <FileText className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                                            <span className="text-[10px] font-bold text-slate-500 tracking-wide">{bucket.count} documentos</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* NUEVA SECCIÓN: Clientes VIP */}
                    {businessData?.biSummary?.vipClients && (
                        <section className="space-y-4">
                            <div className="flex items-center justify-between px-1">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                                    <Users className="w-4 h-4 text-blue-600" />
                                    Clientes Premium (VIP)
                                </h3>
                                <span className="text-[10px] text-blue-600 font-bold uppercase tracking-widest border-b border-blue-200">Top 3</span>
                            </div>
                            <div className="grid gap-3">
                                {businessData.biSummary.vipClients.map((client: any, idx: number) => (
                                    <div key={idx} className="group flex items-center justify-between p-4 rounded-2xl border bg-white dark:bg-slate-900/50 border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:bg-slate-50/50 dark:hover:bg-slate-800/80">
                                        <div className="flex items-center gap-4">
                                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 text-blue-700 dark:text-blue-400 flex items-center justify-center text-sm font-black shadow-inner group-hover:scale-110 transition-transform">
                                                {idx + 1}
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-blue-600 transition-colors">{client.name}</p>
                                                <p className="text-[10px] font-bold text-slate-400 mt-0.5 flex items-center gap-1.5 uppercase tracking-tighter">
                                                    <Activity className="w-3 h-3 text-emerald-500" />
                                                    {client.invoiceCount} Transacciones
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-black text-slate-900 dark:text-slate-100 tabular-nums italic text-lg">{formatCurrency(client.totalRevenue)}</p>
                                            <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mt-0.5">Captación total</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Alerta Específica (Caída de Ingresos) */}
                    {insightData && insightData.insightId === 'revenue_drop' && (
                        <div className="bg-amber-50 dark:bg-amber-950/20 p-6 rounded-2xl border border-amber-200 dark:border-amber-800">
                           <div className="flex items-center gap-3 mb-3">
                               <AlertTriangle className="text-amber-600" />
                               <h3 className="font-bold text-amber-900 dark:text-amber-400">Análisis de Variación de Ingresos</h3>
                           </div>
                           <p className="text-sm text-amber-800 dark:text-amber-300 mb-4">
                               Detectamos una caída del **{insightData.dropPct}%** en comparación con el mes pasado. 
                               El mes anterior facturaste {formatCurrency(insightData.lastMonth)}.
                           </p>
                           
                           {insightData.churnedClients && insightData.churnedClients.length > 0 && (
                               <div className="mt-4 space-y-3">
                                   <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900/60 dark:text-amber-400/60 flex items-center gap-2">
                                       <Users className="w-3 h-3" /> Clientes con Menor Actividad
                                   </h4>
                                   <div className="space-y-2">
                                       {insightData.churnedClients.map((client: any, idx: number) => (
                                           <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-amber-200/50">
                                               <span className="text-sm font-medium truncate max-w-[200px]">{client.name}</span>
                                               <span className="text-sm font-bold text-red-600">-{formatCurrency(client.loss)}</span>
                                           </div>
                                       ))}
                                   </div>
                               </div>
                           )}

                           <Button 
                                variant="outline"
                                className="w-full mt-6 border-amber-200 bg-white/50 hover:bg-amber-100 text-amber-900" 
                                onClick={() => (window.location.href = '/clientes')}
                            >
                                <Users className="w-4 h-4 mr-2" />
                                Gestionar Clientes
                           </Button>
                        </div>
                    )}

                    {/* Proyecciones */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 italic">
                            <TrendingUp className="w-5 h-5 text-emerald-500" />
                            Proyecciones a Cierre de Mes
                        </h3>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-xl border bg-white dark:bg-slate-950">
                                <p className="text-xs text-slate-500 mb-1">Monto Proyectado</p>
                                <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
                                    {formatCurrency(businessData?.prediction?.projectedMonth)}
                                </p>
                            </div>
                            <div className="p-4 rounded-xl border bg-white dark:bg-slate-950">
                                <p className="text-xs text-slate-500 mb-1">Ritmo Diario</p>
                                <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
                                    {formatCurrency(businessData?.prediction?.dailyRate)}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Proyección de Liquidez (Cash Flow) */}
                    {businessData?.biSummary?.cashFlowProjection && (
                        <div className="space-y-4">
                             <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 italic">
                                <DollarSign className="w-5 h-5 text-emerald-500" />
                                Proyección de Liquidez
                            </h3>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="p-3 rounded-xl border bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30">
                                    <p className="text-[10px] uppercase font-bold text-emerald-600 mb-1">7 Días</p>
                                    <p className="text-sm font-bold">{formatCurrency(businessData.biSummary.cashFlowProjection.next7Days)}</p>
                                </div>
                                <div className="p-3 rounded-xl border bg-blue-50/30 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/30">
                                    <p className="text-[10px] uppercase font-bold text-blue-600 mb-1">15 Días</p>
                                    <p className="text-sm font-bold">{formatCurrency(businessData.biSummary.cashFlowProjection.next15Days)}</p>
                                </div>
                                <div className="p-3 rounded-xl border bg-slate-50/30 dark:bg-slate-950/20 border-slate-100 dark:border-slate-800/30">
                                    <p className="text-[10px] uppercase font-bold text-slate-600 mb-1">30 Días</p>
                                    <p className="text-sm font-bold">{formatCurrency(businessData.biSummary.cashFlowProjection.next30Days)}</p>
                                </div>
                            </div>
                            <p className="text-[11px] text-slate-500 italic">
                                *Basado en facturas a crédito con vencimiento estándar de 30 días.
                            </p>
                        </div>
                    )}

                    {/* Clientes VIP */}
                    {businessData?.biSummary?.vipClients && businessData.biSummary.vipClients.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 italic">
                                <Users className="w-5 h-5 text-violet-500" />
                                Clientes de Mayor Valor
                            </h3>
                            <div className="space-y-2">
                                {businessData.biSummary.vipClients.map((client: any, idx: number) => (
                                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-violet-50/20 dark:bg-violet-950/10 border border-violet-100 dark:border-violet-900/30">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center text-xs font-bold text-violet-700">
                                                {idx + 1}
                                            </div>
                                            <span className="text-sm font-semibold">{client.name}</span>
                                        </div>
                                        <div className="text-right text-xs">
                                            <p className="font-bold text-slate-900 dark:text-slate-100">{formatCurrency(client.totalRevenue)}</p>
                                            <p className="text-slate-500">{client.invoiceCount} facturas</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Recomendaciones */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 italic">
                            <Zap className="w-5 h-5 text-amber-500" />
                            Recomendaciones de Trinalyze
                        </h3>
                        
                        <ul className="space-y-3">
                            <li className="flex gap-3 text-sm text-slate-600 dark:text-slate-400">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                                Para alcanzar tu proyección, sugiere un aumento del 10% en seguimiento a clientes inactivos.
                            </li>
                            <li className="flex gap-3 text-sm text-slate-600 dark:text-slate-400">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                                Tienes deudas pendientes por cobrar que representan el 40% de tu facturación mensual. Un recordatorio vía WhatsApp podría mejorar tu liquidez.
                            </li>
                        </ul>
                    </div>

                    <Button variant="outline" className="w-full mt-6" onClick={onClose}>
                        Cerrar Análisis
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}

