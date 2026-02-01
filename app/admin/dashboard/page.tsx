"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, FileText, DollarSign, BarChart3, CreditCard, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";

export default function AdminCEODashboard() {
    const [stats, setStats] = useState<any>(null);
    const [metrics, setMetrics] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const { api } = await import("@/lib/api-service");
                const [statsData, metricsData] = await Promise.all([
                    api.getAdminStats(),
                    api.getAdminMetrics().catch(() => null)
                ]);
                setStats(statsData);
                setMetrics(metricsData);
            } catch (e) {
                toast.error("Error al cargar estadísticas.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const formatCurrency = (n: number) =>
        new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP", maximumFractionDigits: 0 }).format(n || 0);

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
            <div>
                <h1 className="text-2xl font-bold">Estadísticas CEO</h1>
                <p className="text-muted-foreground text-sm">Métricas clave del negocio LexisBill</p>
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
