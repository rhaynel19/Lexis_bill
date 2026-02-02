"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import partnersStyles from "./partners.module.css";
import { Copy, Users, DollarSign, TrendingUp, Link2, Loader2, Crown, Zap, Star, CheckCircle } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function BarChartBar({ heightPercent, title }: { heightPercent: number; title: string }) {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (ref.current) {
            ref.current.style.setProperty("--bar-height", `${Math.max(heightPercent, 4)}%`);
        }
    }, [heightPercent]);
    return <div ref={ref} className={partnersStyles.bar} title={title} />;
}

interface PartnerCommission {
    month?: string;
    year?: number;
    activeClients?: number;
    amount?: number;
    status?: string;
}

interface PartnerDashboard {
    tier?: string;
    referralCode?: string;
    referralUrl?: string;
    commissionRate?: number;
    activeClients?: number;
    trialClients?: number;
    totalRevenue?: number;
    commissionThisMonth?: number;
    showWelcomeMessage?: boolean;
    commissions?: PartnerCommission[];
}

const TIER_LABELS: Record<string, { label: string; icon: typeof Star; color: string }> = {
    starter: { label: "Starter", icon: Star, color: "text-slate-600" },
    growth: { label: "Growth", icon: Zap, color: "text-amber-600" },
    elite: { label: "Elite", icon: Crown, color: "text-amber-500" },
};

export default function PartnerDashboardPage() {
    const router = useRouter();
    const [data, setData] = useState<PartnerDashboard | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const fetchData = async () => {
        setIsLoading(true);
        setLoadError(null);
        try {
            const { api } = await import("@/lib/api-service");
            const d = await api.getPartnerDashboard();
            setData(d);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "";
            if (msg.includes("403") || msg.includes("Acceso denegado")) {
                toast.error("No eres partner activo. Aplica en /unirse-como-partner");
                router.replace("/dashboard");
            } else {
                setLoadError("No se pudo cargar el dashboard. Revisa tu conexión e intenta de nuevo.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [router]);

    const copyReferralUrl = () => {
        if (data?.referralUrl) {
            navigator.clipboard.writeText(data.referralUrl);
            toast.success("Link copiado al portapapeles");
        }
    };

    const formatCurrency = (n: number) =>
        new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP", maximumFractionDigits: 0 }).format(n || 0);

    const MONTH_NAMES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

    if (isLoading) {
        return (
            <div className="container mx-auto px-4 py-8 max-w-5xl flex justify-center min-h-[400px] items-center">
                <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="container mx-auto px-4 py-8 max-w-5xl">
                <Breadcrumbs items={[{ label: "Inicio", href: "/dashboard" }, { label: "Partner" }]} className="mb-4 text-slate-500" />
                <div className="flex flex-col items-center justify-center min-h-[300px] gap-4 p-8 rounded-xl bg-destructive/5 border border-destructive/20">
                    <p className="text-destructive font-medium text-center">{loadError}</p>
                    <Button onClick={fetchData} variant="outline" className="gap-2">
                        <Loader2 className="w-4 h-4" />
                        Reintentar
                    </Button>
                </div>
            </div>
        );
    }

    if (!data) return null;

    const tierInfo = TIER_LABELS[data.tier ?? "starter"] ?? TIER_LABELS.starter;
    const TierIcon = tierInfo.icon;

    return (
        <div className="container mx-auto px-4 py-8 max-w-5xl">
            <Breadcrumbs items={[{ label: "Inicio", href: "/dashboard" }, { label: "Partner" }]} className="mb-4 text-slate-500" />
            {data.showWelcomeMessage && (
                <div className="mb-6 p-4 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200 flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 shrink-0 text-green-600 dark:text-green-400" />
                    <p className="text-sm font-medium">
                        Tu solicitud fue aprobada. Ya puedes compartir tu link de referido y empezar a ganar comisiones.
                    </p>
                </div>
            )}
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-foreground font-serif lowercase tracking-tighter">
                        Programa Partners
                    </h1>
                    <p className="text-slate-500 dark:text-muted-foreground font-medium">
                        Gana comisiones recurrentes por cada cliente activo
                    </p>
                </div>
            </div>

            {/* Nivel y Link de Referido */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <Card className="border-amber-200/50 dark:border-amber-900/30 bg-gradient-to-br from-amber-50/50 to-white dark:from-amber-950/20 dark:to-background">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <TierIcon className={`w-4 h-4 ${tierInfo.color}`} />
                            Nivel {tierInfo.label}
                        </CardTitle>
                        <CardDescription>Comisión {((data.commissionRate ?? 0) * 100).toFixed(0)}% por cliente activo</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold text-foreground">{data.referralCode}</p>
                        <p className="text-xs text-muted-foreground mt-1">Tu código de referido</p>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 dark:border-border">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Link2 className="w-4 h-4" />
                            Tu link de referido
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex gap-2 items-center">
                        <Input
                            readOnly
                            value={data.referralUrl || ""}
                            className="flex-1 text-sm bg-muted/50 font-mono truncate"
                        />
                        <Button onClick={copyReferralUrl} variant="outline" size="icon" title="Copiar link" className="shrink-0">
                            <Copy className="w-4 h-4" />
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Gráfica evolución (últimos meses) */}
            {data.commissions && data.commissions.length > 0 && (
                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-amber-500" />
                            Evolución — Clientes activos por mes
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-end gap-2 h-32">
                            {[...(data.commissions || [])].reverse().slice(0, 12).map((c, i) => {
                                const commissions = data.commissions || [];
                                const max = Math.max(...commissions.map((x) => x.activeClients || 0), 1);
                                const h = max ? ((c.activeClients || 0) / max) * 100 : 0;
                                return (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                                        <BarChartBar
                                            heightPercent={h}
                                            title={`${c.activeClients} clientes — ${MONTH_NAMES[parseInt((c.month || "01").split("-")[1] || "1") - 1]} ${c.year}`}
                                        />
                                        <span className="text-[10px] text-muted-foreground truncate w-full text-center">
                                            {MONTH_NAMES[parseInt((c.month || "01").split("-")[1] || "1") - 1]}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Métricas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" /> Clientes activos
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <span className="text-2xl font-bold text-amber-600 dark:text-amber-500">{data.activeClients ?? 0}</span>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-muted-foreground">En prueba</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <span className="text-2xl font-bold text-slate-600 dark:text-muted-foreground">{data.trialClients ?? 0}</span>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            <TrendingUp className="w-3.5 h-3.5" /> Revenue generado
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <span className="text-2xl font-bold">{formatCurrency(data.totalRevenue ?? 0)}</span>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            <DollarSign className="w-3.5 h-3.5" /> Comisión este mes
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <span className="text-2xl font-bold text-green-600 dark:text-green-500">{formatCurrency(data.commissionThisMonth ?? 0)}</span>
                    </CardContent>
                </Card>
            </div>

            {/* Historial de Comisiones */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg font-bold">Historial de comisiones</CardTitle>
                    <CardDescription>Comisiones calculadas mensualmente. Pago 30 días después del cobro.</CardDescription>
                </CardHeader>
                <CardContent>
                    {(data.commissions?.length ?? 0) > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead>Mes</TableHead>
                                    <TableHead className="text-center">Clientes</TableHead>
                                    <TableHead className="text-right">Monto</TableHead>
                                    <TableHead className="text-right">Estado</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {(data.commissions || []).map((c, i) => (
                                    <TableRow key={i}>
                                        <TableCell className="font-medium">
                                            {MONTH_NAMES[parseInt((c.month || "01").split("-")[1] || "1") - 1]} {c.year}
                                        </TableCell>
                                        <TableCell className="text-center">{c.activeClients}</TableCell>
                                        <TableCell className="text-right font-semibold">{formatCurrency(c.amount ?? 0)}</TableCell>
                                        <TableCell className="text-right">
                                            <span className={`text-xs px-2 py-1 rounded-full ${
                                                c.status === "paid" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                                                c.status === "pending" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                                                "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                            }`}>
                                                {c.status === "paid" ? "Pagado" : c.status === "pending" ? "Pendiente" : c.status}
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <p className="text-center text-muted-foreground py-8">Aún no hay comisiones registradas. Refiere clientes para empezar a ganar.</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
