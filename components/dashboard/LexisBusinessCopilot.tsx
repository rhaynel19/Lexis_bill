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
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useEffect, useState, useCallback } from "react";

const LEXIS_COPILOT_COLLAPSED_KEY = "lexis-copilot-collapsed";

export interface BusinessCopilotData {
    alerts: Array<{ type: string; severity: string; message: string; count?: number; pct?: number; clientName?: string; service?: string; amount?: number }>;
    clientRadar: Array<{ rnc: string; clientName: string; daysSinceLastInvoice: number; totalRevenue: number; revenuePct: number; status: string; recommendation?: string }>;
    rankings: {
        topClient?: { name: string; total: number; pct: number };
        droppedClient?: { name: string; lastMonthTotal: number };
        topService?: { description: string; totalRevenue: number; totalQuantity: number };
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
}

const formatCurrency = (n: number) =>
    new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP", maximumFractionDigits: 0 }).format(n);

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

export function LexisBusinessCopilot() {
    const [data, setData] = useState<BusinessCopilotData | null>(null);
    const [loading, setLoading] = useState(true);
    const [collapsed, setCollapsed] = useState(false);

    useEffect(() => {
        const stored = typeof window !== "undefined" ? localStorage.getItem(LEXIS_COPILOT_COLLAPSED_KEY) : null;
        setCollapsed(stored === "true");
    }, []);

    const loadData = useCallback(async () => {
        setLoading(true);
        const timeoutMs = 10000;
        try {
            const { api } = await import("@/lib/api-service");
            const res = await Promise.race([
                api.getBusinessCopilot(),
                new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error("timeout")), timeoutMs)
                ),
            ]);
            setData(res);
        } catch {
            setData(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const setCollapsedAndSave = (v: boolean) => {
        setCollapsed(v);
        try {
            localStorage.setItem(LEXIS_COPILOT_COLLAPSED_KEY, String(v));
        } catch { /* ignore */ }
    };

    if (loading) {
        return (
            <Card className="mb-6 overflow-hidden rounded-2xl border border-white/40 dark:border-slate-600/40 bg-white/80 dark:bg-slate-900/70 backdrop-blur-xl">
                <CardContent className="p-6">
                    <div className="animate-pulse flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-slate-200 dark:bg-slate-700" />
                        <div className="flex-1 space-y-2">
                            <div className="h-4 w-48 bg-slate-200 dark:bg-slate-700 rounded" />
                            <div className="h-3 w-64 bg-slate-200 dark:bg-slate-700 rounded" />
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!data) {
        return (
            <Card className="mb-6 overflow-hidden rounded-2xl border border-amber-200/50 dark:border-amber-800/50 bg-amber-50/30 dark:bg-amber-950/20">
                <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                                <Activity className="w-6 h-6 text-amber-600" />
                            </div>
                            <div>
                                <p className="font-semibold text-foreground">Lexis Business Copilot</p>
                                <p className="text-sm text-muted-foreground">No se pudo cargar el análisis. Revisa tu conexión o intenta de nuevo.</p>
                            </div>
                        </div>
                        <Button variant="outline" onClick={loadData} disabled={loading} className="gap-2">
                            {loading ? "Cargando..." : "Reintentar"}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const hasAlerts = data.alerts.length > 0 || data.fiscalAlerts.length > 0;
    const hasContent = hasAlerts || data.clientRadar.length > 0 || data.rankings.topClient || data.rankings.topService || data.businessHealth.score > 0;

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
            <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-blue-500/10 dark:bg-blue-500/5 blur-3xl pointer-events-none" />

            <CardHeader className="pb-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-slate-700 via-blue-600 to-violet-600 shadow-lg">
                            <Activity className="w-6 h-6 text-white" strokeWidth={2} />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                                Lexis observa tu negocio
                            </CardTitle>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                                Análisis automático de tu facturación y clientes
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setCollapsedAndSave(!collapsed)}
                        className="shrink-0 text-slate-500 hover:text-slate-700"
                        aria-label={collapsed ? "Expandir" : "Colapsar"}
                    >
                        {collapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                    </Button>
                </div>

                {/* Score de salud - siempre visible */}
                <div className="flex items-center gap-4 mt-4 pl-0 sm:pl-16">
                    <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                        <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <div>
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Salud de tu negocio</span>
                            <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
                                {data.businessHealth.score} — {data.businessHealth.label}
                            </p>
                        </div>
                    </div>
                    {data.businessHealth.concentrationRisk && (
                        <p className="text-sm text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            {data.businessHealth.concentrationRisk}
                        </p>
                    )}
                </div>
            </CardHeader>

            {!collapsed && hasContent && (
                <CardContent className="pt-0 space-y-6">
                    {/* Predicción + Caja */}
                    {data.prediction.daysRemaining > 0 && data.prediction.currentRevenue >= 0 && (
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20 p-4">
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Si mantienes este ritmo, cerrarás el mes con{" "}
                                    <span className="font-bold text-blue-700 dark:text-blue-400">{formatCurrency(data.prediction.projectedMonth)}</span> facturados.
                                </p>
                            </div>
                            {data.prediction.projectedCash15Days != null && data.prediction.projectedCash15Days > 0 && (
                                <div className="rounded-xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20 p-4">
                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                        Podrías recibir aproximadamente{" "}
                                        <span className="font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency(data.prediction.projectedCash15Days)}</span> en los próximos 15 días.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Radar de Morosidad */}
                    {data.morosityRadar && data.morosityRadar.totalPendiente > 0 && (
                        <div>
                            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                                <Radar className="w-4 h-4" /> Radar de Morosidad
                            </h4>
                            <div className="rounded-xl border overflow-hidden">
                                <div className={cn(
                                    "px-4 py-3 flex items-center justify-between",
                                    data.morosityRadar.riesgoGeneral === 'critico' && "bg-red-100 dark:bg-red-950/40 border-b border-red-200 dark:border-red-900/40",
                                    data.morosityRadar.riesgoGeneral === 'alto' && "bg-amber-100 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/40",
                                    data.morosityRadar.riesgoGeneral === 'medio' && "bg-amber-50 dark:bg-amber-950/20 border-b border-amber-100 dark:border-amber-900/20",
                                    data.morosityRadar.riesgoGeneral === 'bajo' && "bg-emerald-50 dark:bg-emerald-950/20 border-b border-emerald-100 dark:border-emerald-900/20"
                                )}>
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                                        Riesgo de cobro: {data.morosityRadar.riesgoGeneral === 'critico' ? 'Crítico' : data.morosityRadar.riesgoGeneral === 'alto' ? 'Alto' : data.morosityRadar.riesgoGeneral === 'medio' ? 'Medio' : 'Bajo'}
                                    </span>
                                    <span className="font-bold text-slate-900 dark:text-slate-100">{formatCurrency(data.morosityRadar.totalPendiente)} pendientes</span>
                                </div>
                                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-48 overflow-y-auto">
                                    {data.morosityRadar.clientes.slice(0, 5).map((c, i) => (
                                        <div key={c.rnc || i} className="px-4 py-2 flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2">
                                                <span className={cn(
                                                    "w-2 h-2 rounded-full",
                                                    c.nivel === 'critico' && "bg-red-500",
                                                    c.nivel === 'riesgo' && "bg-amber-500",
                                                    c.nivel === 'atencion' && "bg-yellow-500",
                                                    c.nivel === 'normal' && "bg-emerald-500"
                                                )} />
                                                <span className="font-medium truncate max-w-[180px]">{c.clientName || c.rnc}</span>
                                            </div>
                                            <span className="text-slate-600 dark:text-slate-400">{formatCurrency(c.totalPendiente)} · {c.diasMayorAntiguedad}d</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <Link href="/documentos">
                                <Button variant="ghost" size="sm" className="mt-2 text-slate-600">Gestionar cobros</Button>
                            </Link>
                        </div>
                    )}

                    {/* Insights de tipo de pago */}
                    {data.paymentInsights && (data.paymentInsights.creditPct > 0 || data.paymentInsights.transferPct > 0) && (
                        <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-slate-50/30 dark:bg-slate-900/20">
                            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                                <DollarSign className="w-4 h-4" /> Distribución de ingresos por tipo de pago
                            </h4>
                            <div className="flex gap-4 flex-wrap">
                                {data.paymentInsights.transferPct > 0 && (
                                    <span className="text-sm text-slate-600 dark:text-slate-400">
                                        Transferencia: <strong>{data.paymentInsights.transferPct}%</strong>
                                    </span>
                                )}
                                {data.paymentInsights.creditPct > 0 && (
                                    <span className="text-sm text-slate-600 dark:text-slate-400">
                                        Crédito: <strong>{data.paymentInsights.creditPct}%</strong>
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Alertas inteligentes */}
                    {data.alerts.length > 0 && (
                        <div>
                            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                                <Zap className="w-4 h-4" /> Lexis detectó algo importante
                            </h4>
                            <div className="grid gap-3 sm:grid-cols-2">
                                {data.alerts.slice(0, 6).map((a, i) => (
                                    <div
                                        key={i}
                                        className={cn(
                                            "flex items-start gap-3 p-4 rounded-xl border transition-all duration-200",
                                            a.severity === "positive"
                                                ? "bg-emerald-50/80 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/40"
                                                : a.severity === "high"
                                                    ? "bg-red-50/80 dark:bg-red-950/20 border-red-100 dark:border-red-900/40"
                                                    : a.severity === "medium"
                                                        ? "bg-amber-50/80 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/40"
                                                        : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700"
                                        )}
                                    >
                                        <AlertIcon severity={a.severity} />
                                        <p className="text-sm text-slate-700 dark:text-slate-300">{a.message}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Detector de errores fiscales */}
                    {data.fiscalAlerts.length > 0 && (
                        <div>
                            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                                <ShieldAlert className="w-4 h-4" /> Errores fiscales detectados
                            </h4>
                            <div className="space-y-2">
                                {data.fiscalAlerts.map((a, i) => (
                                    <div
                                        key={i}
                                        className="flex items-start gap-3 p-3 rounded-lg bg-amber-50/80 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40"
                                    >
                                        <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                        <p className="text-sm text-slate-700 dark:text-slate-300">{a.message}</p>
                                    </div>
                                ))}
                            </div>
                            <Link href="/configuracion">
                                <Button variant="outline" size="sm" className="mt-2">
                                    Revisar configuración NCF
                                </Button>
                            </Link>
                        </div>
                    )}

                    {/* Ranking automático */}
                    {(data.rankings.topClient || data.rankings.droppedClient || data.rankings.topService) && (
                        <div>
                            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                                <BarChart3 className="w-4 h-4" /> Resumen del período
                            </h4>
                            <div className="grid gap-3 sm:grid-cols-3">
                                {data.rankings.topClient && (
                                    <div className="p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20">
                                        <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Cliente que más pagó</p>
                                        <p className="font-semibold text-slate-900 dark:text-slate-100 mt-1 truncate">{data.rankings.topClient.name}</p>
                                        <p className="text-sm text-slate-600 dark:text-slate-400">{formatCurrency(data.rankings.topClient.total)} ({data.rankings.topClient.pct}%)</p>
                                    </div>
                                )}
                                {data.rankings.droppedClient && (
                                    <div className="p-4 rounded-xl border border-amber-100 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20">
                                        <p className="text-xs font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wider">Cliente que dejó de facturar</p>
                                        <p className="font-semibold text-slate-900 dark:text-slate-100 mt-1 truncate">{data.rankings.droppedClient.name}</p>
                                        <p className="text-sm text-slate-600 dark:text-slate-400">Facturaba {formatCurrency(data.rankings.droppedClient.lastMonthTotal)}/mes</p>
                                    </div>
                                )}
                                {data.rankings.topService && (
                                    <div className="p-4 rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20">
                                        <p className="text-xs font-medium text-blue-700 dark:text-blue-400 uppercase tracking-wider">Servicio más vendido</p>
                                        <p className="font-semibold text-slate-900 dark:text-slate-100 mt-1 truncate">{data.rankings.topService.description}</p>
                                        <p className="text-sm text-slate-600 dark:text-slate-400">{formatCurrency(data.rankings.topService.totalRevenue)} · {data.rankings.topService.totalQuantity} ventas</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Radar de clientes (scoring) */}
                    {data.clientRadar.length > 0 && (
                        <div>
                            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                                <Users className="w-4 h-4" /> Radar de clientes
                            </h4>
                            <div className="overflow-x-auto">
                                <div className="flex gap-2 min-w-max pb-2">
                                    {data.clientRadar.slice(0, 8).map((c, i) => (
                                        <div
                                            key={c.rnc || i}
                                            className={cn(
                                                "flex flex-col gap-1 p-3 rounded-xl border min-w-[140px] transition-colors",
                                                c.status === "active" && "border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/10",
                                                c.status === "at_risk" && "border-amber-100 dark:border-amber-900/40 bg-amber-50/30 dark:bg-amber-950/10",
                                                c.status === "lost" && "border-red-100 dark:border-red-900/40 bg-red-50/30 dark:bg-red-950/10"
                                            )}
                                        >
                                            <div className="flex items-center">
                                                <StatusDot status={c.status} />
                                                <span className="text-xs font-medium truncate" title={c.clientName}>{c.clientName || "Sin nombre"}</span>
                                            </div>
                                            <span className="text-xs text-slate-500">{c.daysSinceLastInvoice}d sin facturar</span>
                                            {c.recommendation && (
                                                <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-1 line-clamp-2">{c.recommendation}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <Link href="/clientes">
                                <Button variant="ghost" size="sm" className="mt-2 text-slate-600 dark:text-slate-400">
                                    Ver todos los clientes
                                </Button>
                            </Link>
                        </div>
                    )}

                    <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <Link href="/nueva-factura">
                            <Button size="sm" className="bg-gradient-to-r from-slate-700 via-blue-600 to-violet-600 text-white border-0 hover:opacity-90">
                                <FileText className="w-3.5 h-3.5 mr-1.5" /> Nueva factura
                            </Button>
                        </Link>
                        <Link href="/clientes">
                            <Button variant="outline" size="sm">Ver clientes</Button>
                        </Link>
                        <Link href="/reportes">
                            <Button variant="outline" size="sm">Reportes</Button>
                        </Link>
                    </div>
                </CardContent>
            )}

            {!collapsed && !hasContent && (
                <CardContent>
                    <p className="text-sm text-slate-500 dark:text-slate-400 py-4">
                        Lexis analizará tu negocio cuando tengas facturas y clientes. Crea tu primera factura para comenzar.
                    </p>
                    <Link href="/nueva-factura">
                        <Button size="sm" className="bg-gradient-to-r from-slate-700 via-blue-600 to-violet-600 text-white border-0">
                            Crear primera factura
                        </Button>
                    </Link>
                </CardContent>
            )}
        </Card>
    );
}
