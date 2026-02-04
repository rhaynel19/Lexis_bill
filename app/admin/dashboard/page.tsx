"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, FileText, DollarSign, BarChart3, CreditCard, Loader2, Handshake, TrendingUp, Download } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

type PeriodFilter = "current" | "last";

const CHART_COLORS = ["#0A192F", "#D4AF37", "#1e3a5f", "#2d5a87", "#3d7ab5"];
const PIE_COLORS = ["#94a3b8", "#D4AF37", "#0A192F"];

export default function AdminCEODashboard() {
    const [stats, setStats] = useState<any>(null);
    const [metrics, setMetrics] = useState<any>(null);
    const [partnerStats, setPartnerStats] = useState<any>(null);
    const [chartData, setChartData] = useState<{ monthly: Array<{ month: string; revenue: number; invoices: number }>; usersByPlan: { free: number; pro: number; premium: number } } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [period, setPeriod] = useState<PeriodFilter>("current");

    useEffect(() => {
        const fetchData = async () => {
            try {
                const { api } = await import("@/lib/api-service");
                const params = period === "last" ? "?period=last_month" : "";
                const [statsData, metricsData, partnerStatsData, chartDataRes] = await Promise.all([
                    api.getAdminStats(params),
                    api.getAdminMetrics(params).catch(() => null),
                    api.getAdminPartnersStats().catch(() => null),
                    api.getAdminChartData(12).catch(() => null)
                ]);
                setStats(statsData);
                setMetrics(metricsData);
                setPartnerStats(partnerStatsData);
                setChartData(chartDataRes || null);
            } catch (e) {
                toast.error("Error al cargar estadísticas.");
            } finally {
                setIsLoading(false);
            }
        };
        setIsLoading(true);
        fetchData();
    }, [period]);

    const formatCurrency = (n: number) =>
        new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP", maximumFractionDigits: 0 }).format(n || 0);

    const handleExportCSV = () => {
        const rows: string[][] = [
            ["Estadísticas CEO", "Valor"],
            ["Usuarios totales", String(users?.total ?? 0)],
            ["Usuarios nuevos este mes", String(users?.newThisMonth ?? 0)],
            ["Facturación mensual (DOP)", String(invoicing?.monthlyTotal ?? 0)],
            ["Facturas este mes", String(invoicing?.monthlyInvoices ?? 0)],
            ["Total facturas emitidas", String(invoicing?.totalInvoices ?? 0)],
            ["ITBIS total", String(invoicing?.totalItbis ?? 0)],
            ["Reportes 606", String(fiscal?.report606 ?? 0)],
            ["Reportes 607", String(fiscal?.report607 ?? 0)],
            ["Usuarios Free", String(business?.freeUsers ?? 0)],
            ["Usuarios Pro", String(business?.proUsers ?? 0)],
            ["Membresías activas", String(business?.activeMemberships ?? 0)],
            ["Pagos pendientes", String(business?.pendingPayments ?? 0)],
        ];
        if (metrics) {
            rows.push(["MRR (DOP)", String(metrics.mrr ?? 0)]);
            rows.push(["Revenue total (DOP)", String(metrics.revenueTotal ?? 0)]);
            rows.push(["ARPU (DOP)", String(metrics.arpu ?? 0)]);
            rows.push(["Churn %", String(metrics.churn ?? 0)]);
            rows.push(["Growth %", String(metrics.growthRate ?? 0)]);
        }
        const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
        const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `lexisbill-ceo-stats-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("CSV descargado.");
    };

    if (isLoading || !stats) {
        return (
            <div className="flex justify-center py-16">
                <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const { users, invoicing, fiscal, business } = stats;

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Estadísticas CEO</h1>
                    <p className="text-muted-foreground text-sm">Métricas clave del negocio LexisBill</p>
                </div>
                <div className="flex items-center gap-2">
                    <Select value={period} onValueChange={(v: PeriodFilter) => setPeriod(v)}>
                        <SelectTrigger className="w-[160px]">
                            <SelectValue placeholder="Periodo" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="current">Este mes</SelectItem>
                            <SelectItem value="last">Mes pasado</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" className="gap-2" onClick={handleExportCSV}>
                        <Download className="w-4 h-4" /> Exportar CSV
                    </Button>
                </div>
            </div>

            {/* Métricas SaaS (MRR, Churn, ARPU, etc.) */}
            {metrics && (
                <div>
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5" /> Métricas SaaS
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-medium text-muted-foreground">MRR</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <span className="text-xl font-bold">{formatCurrency(metrics.mrr ?? 0)}</span>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-medium text-muted-foreground">Revenue Total</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <span className="text-xl font-bold">{formatCurrency(metrics.revenueTotal ?? 0)}</span>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-medium text-muted-foreground">ARPU</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <span className="text-xl font-bold">{formatCurrency(metrics.arpu ?? 0)}</span>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-medium text-muted-foreground">Churn %</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <span className="text-xl font-bold">{(metrics.churn ?? 0)}%</span>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-medium text-muted-foreground">Growth %</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <span className="text-xl font-bold">{(metrics.growthRate ?? 0)}%</span>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-medium text-muted-foreground">Activos Pro</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <span className="text-xl font-bold">{metrics.activeUsers ?? 0}</span>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {/* Gráficos */}
            {chartData && (chartData.monthly?.length > 0 || (chartData.usersByPlan?.free !== undefined)) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <TrendingUp className="w-4 h-4" /> Ingresos y facturas por mes
                            </CardTitle>
                            <CardDescription>Últimos 12 meses (DOP)</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[280px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData.monthly || []} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                                        <Tooltip formatter={(value: number, name: string) => [name === "revenue" ? formatCurrency(value) : value, name === "revenue" ? "Ingresos" : "Facturas"]} labelFormatter={(l) => l} />
                                        <Bar dataKey="revenue" fill={CHART_COLORS[0]} name="Ingresos" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="invoices" fill={CHART_COLORS[1]} name="Facturas" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <Users className="w-4 h-4" /> Usuarios por plan
                            </CardTitle>
                            <CardDescription>Distribución Free / Pro / Premium</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[280px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={[
                                                { name: "Free", value: chartData.usersByPlan?.free ?? 0 },
                                                { name: "Pro", value: chartData.usersByPlan?.pro ?? 0 },
                                                { name: "Premium", value: chartData.usersByPlan?.premium ?? 0 }
                                            ].filter((d) => d.value > 0)}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={90}
                                            paddingAngle={2}
                                            dataKey="value"
                                            nameKey="name"
                                            label={({ name, value }) => `${name}: ${value}`}
                                        >
                                            {[
                                                { name: "Free", value: chartData.usersByPlan?.free ?? 0 },
                                                { name: "Pro", value: chartData.usersByPlan?.pro ?? 0 },
                                                { name: "Premium", value: chartData.usersByPlan?.premium ?? 0 }
                                            ]
                                                .filter((d) => d.value > 0)
                                                .map((_, i) => (
                                                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                                ))}
                                        </Pie>
                                        <Tooltip formatter={(value: number) => [value, "Usuarios"]} />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Usuarios */}
            <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5" /> Usuarios
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Total usuarios</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <span className="text-3xl font-bold">{users?.total ?? 0}</span>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Usuarios activos</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <span className="text-3xl font-bold">{business?.activeMemberships ?? 0}</span>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Nuevos este mes</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <span className="text-3xl font-bold">{users?.newThisMonth ?? 0}</span>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Facturación */}
            <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <DollarSign className="w-5 h-5" /> Facturación
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Total facturas emitidas</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <span className="text-3xl font-bold">{invoicing?.totalInvoices ?? 0}</span>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Facturación mensual</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <span className="text-3xl font-bold">{formatCurrency(invoicing?.monthlyTotal ?? 0)}</span>
                            <p className="text-xs text-muted-foreground mt-1">
                                {invoicing?.monthlyInvoices ?? 0} facturas este mes
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">ITBIS total generado</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <span className="text-3xl font-bold">{formatCurrency(invoicing?.totalItbis ?? 0)}</span>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Fiscal */}
            <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" /> Fiscal
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Reportes 606 generados</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <span className="text-3xl font-bold">{fiscal?.report606 ?? 0}</span>
                            <p className="text-xs text-muted-foreground mt-1">Compras / Gastos</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Reportes 607 generados</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <span className="text-3xl font-bold">{fiscal?.report607 ?? 0}</span>
                            <p className="text-xs text-muted-foreground mt-1">Ventas</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Facturas por tipo NCF</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2 text-sm">
                                {fiscal?.invoicesByNcfType && Object.keys(fiscal.invoicesByNcfType).length > 0 ? (
                                    Object.entries(fiscal.invoicesByNcfType).map(([k, v]: [string, any]) => (
                                        <div key={k} className="flex justify-between">
                                            <span>B{k}/E{k}</span>
                                            <span className="font-medium">{v}</span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-muted-foreground">Sin datos</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Programa Partners */}
            {partnerStats && (
                <div>
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Handshake className="w-5 h-5 text-amber-500" /> Programa Partners
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                        <Card className="border-amber-200/50 dark:border-amber-900/30">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-medium text-muted-foreground">Partners activos</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <span className="text-2xl font-bold">{partnerStats.totalPartners ?? 0}</span>
                            </CardContent>
                        </Card>
                        <Card className="border-amber-200/50 dark:border-amber-900/30">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-medium text-muted-foreground">Cartera activa</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <span className="text-2xl font-bold text-amber-600">{partnerStats.activeReferrals ?? 0}</span>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {partnerStats.trialReferrals ?? 0} en prueba · {partnerStats.churnedReferrals ?? 0} churned
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-amber-200/50 dark:border-amber-900/30">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                    <TrendingUp className="w-3.5 h-3.5" /> Revenue canal
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <span className="text-2xl font-bold">{formatCurrency(partnerStats.revenueFromPartners ?? 0)}</span>
                            </CardContent>
                        </Card>
                        <Card className="border-amber-200/50 dark:border-amber-900/30">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-medium text-muted-foreground">Comisiones pagadas</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <span className="text-2xl font-bold text-green-600">{formatCurrency(partnerStats.commissionsPaid ?? 0)}</span>
                            </CardContent>
                        </Card>
                        <Card className="border-amber-200/50 dark:border-amber-900/30">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-medium text-muted-foreground">Comisiones pendientes</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <span className="text-2xl font-bold text-amber-600">{formatCurrency(partnerStats.commissionsPending ?? 0)}</span>
                            </CardContent>
                        </Card>
                        <Card className="border-amber-200/50 dark:border-amber-900/30">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-medium text-muted-foreground">Pendientes aprobar</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <span className="text-2xl font-bold">{partnerStats.pendingApprovals ?? 0}</span>
                                {partnerStats.pendingApprovals > 0 && (
                                    <Link href="/admin/partners" className="block text-xs text-primary mt-1 hover:underline">
                                        Ver →
                                    </Link>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                    <Link href="/admin/partners">
                        <span className="text-sm text-amber-600 hover:text-amber-500 font-medium mt-2 inline-block">Ver dashboard de partners →</span>
                    </Link>
                </div>
            )}

            {/* Negocio / Membresías */}
            <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <CreditCard className="w-5 h-5" /> Negocio
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Usuarios Free</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <span className="text-2xl font-bold">{business?.freeUsers ?? 0}</span>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Usuarios Pro</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <span className="text-2xl font-bold">{business?.proUsers ?? 0}</span>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Membresías activas</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <span className="text-2xl font-bold">{business?.activeMemberships ?? 0}</span>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Pagos pendientes</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <span className="text-2xl font-bold">{business?.pendingPayments ?? 0}</span>
                            {business?.pendingPayments > 0 && (
                                <Link href="/admin" className="block text-sm text-primary mt-1 hover:underline">
                                    Ver pendientes →
                                </Link>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
