"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, TrendingUp, Link2, Loader2, CheckCircle, Handshake, Users, DollarSign, Wallet, MessageCircle } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { openWhatsApp } from "@/lib/whatsapp-utils";
import styles from "./partner-dashboard.module.css";

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
    totalReferrals?: number;
    estimatedMonthlyEarnings?: number;
    totalCommissions?: number;
    pendingCommissionsTotal?: number;
    showWelcomeMessage?: boolean;
    commissions?: PartnerCommission[];
    referrals?: Array<{
        id: string;
        name: string;
        email: string;
        status: string;
        plan?: string;
        monthlyCommission?: number;
        joinedAt: string;
    }>;
}

const MONTH_NAMES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function Bar({ heightPercent, title }: { heightPercent: number; title: string }) {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (ref.current) ref.current.style.setProperty("--bar-height", `${Math.max(heightPercent, 6)}%`);
    }, [heightPercent]);
    return <div ref={ref} className={styles.bar} title={title} />;
}

function formatCurrency(n: number) {
    return new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP", maximumFractionDigits: 0 }).format(n || 0);
}

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
            const err = e as { status?: number; message?: string } | undefined;
            if (err?.status === 403) {
                toast.error("No tienes acceso al panel partner. Redirigiendo al dashboard.");
                router.replace("/dashboard");
                return;
            }
            setLoadError("No se pudo cargar el panel. Revisa tu conexión e intenta de nuevo.");
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
            toast.success("Link copiado");
        }
    };

    const shareReferralByWhatsApp = () => {
        if (!data?.referralUrl) return;
        const message = `Hola! Te recomiendo Trinalyze Billing para facturación y reportes fiscales en República Dominicana. Prueba gratis 15 días con mi enlace:\n\n${data.referralUrl}`;
        openWhatsApp(undefined, message);
    };

    if (isLoading) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="container mx-auto max-w-4xl px-4 py-8">
                <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card p-8">
                    <p className="text-center font-medium text-destructive">{loadError}</p>
                    <Button onClick={fetchData} variant="outline" className="gap-2">
                        <Loader2 className="h-4 w-4" />
                        Reintentar
                    </Button>
                </div>
            </div>
        );
    }

    if (!data) return null;

    const commissionRatePct = ((data.commissionRate ?? 0) * 100).toFixed(0);
    const lastCommissions = (data.commissions ?? []).slice(0, 6).reverse();
    const pendingCommissionsTotal = (data.commissions ?? [])
        .filter(c => c.status === "pending")
        .reduce((sum, c) => sum + (c.amount ?? 0), 0);

    return (
        <div className="container mx-auto max-w-5xl px-4 py-8">
            {data.showWelcomeMessage && (
                <div className="mb-6 flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800 dark:border-green-800 dark:bg-green-950/30 dark:text-green-200">
                    <CheckCircle className="h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
                    Tu solicitud fue aprobada. Comparte tu link para empezar a ganar comisiones.
                </div>
            )}

            <div className="mb-8" id="dashboard">
                <h1 className="text-2xl font-bold flex items-center gap-2 text-foreground">
                    <Handshake className="w-7 h-7 text-amber-500" />
                    Programa Partner
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                    Estadísticas y gestión de tus referidos Trinalyze Billing · Comisión {commissionRatePct}% por suscripción
                </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                            <Users className="w-4 h-4" /> Total Referidos
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <span className="text-2xl font-bold">{data.totalReferrals ?? 0}</span>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-muted-foreground">Clientes Activos</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">{data.activeClients ?? 0}</span>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" /> Ganancias Mensuales Estimadas
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <span className="text-2xl font-bold">{formatCurrency(data.estimatedMonthlyEarnings ?? 0)}</span>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                            <DollarSign className="w-4 h-4" /> Total Comisiones
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <span className="text-2xl font-bold text-green-600 dark:text-green-500">{formatCurrency(data.totalCommissions ?? 0)}</span>
                        {data.pendingCommissionsTotal ? (
                            <p className="text-[10px] text-amber-600 font-medium mt-1 uppercase">Pendiente: {formatCurrency(data.pendingCommissionsTotal)}</p>
                        ) : null}
                    </CardContent>
                </Card>
            </div>

            <Card className="mb-8 border-amber-500/20 bg-card">
                <CardHeader>
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Link2 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                        Tu link de referido
                    </CardTitle>
                    <CardDescription>
                        Genera referidos compartiendo este enlace. Cuando se registren con plan de pago, ganarás comisión. Código: <span className="font-mono font-medium text-foreground">{data.referralCode}</span>
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Input readOnly value={data.referralUrl ?? ""} className="flex-1 font-mono text-sm bg-muted/50" />
                    <div className="flex gap-2 shrink-0">
                        <Button onClick={copyReferralUrl} variant="outline" size="sm" className="gap-2 border-amber-500/30 text-amber-700 hover:bg-amber-500/10 dark:text-amber-300">
                            <Copy className="h-4 w-4" /> Copiar
                        </Button>
                        <Button onClick={shareReferralByWhatsApp} variant="outline" size="sm" className="gap-2 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30 border-green-500/30">
                            <MessageCircle className="h-4 w-4" /> WhatsApp
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {lastCommissions.length > 0 && (
                <Card className="mb-8">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-amber-500" /> Evolución — Clientes activos por mes
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-end gap-2 h-24">
                            {lastCommissions.map((c, i) => {
                                const max = Math.max(...lastCommissions.map((x) => x.activeClients ?? 0), 1);
                                const h = max ? ((c.activeClients ?? 0) / max) * 100 : 0;
                                const monthNum = parseInt((c.month ?? "01").split("-")[1] || "1", 10) - 1;
                                return (
                                    <div key={i} className="flex flex-1 flex-col items-center gap-1 min-w-0">
                                        <Bar
                                            heightPercent={h}
                                            title={`${c.activeClients ?? 0} — ${MONTH_NAMES[monthNum]} ${c.year}`}
                                        />
                                        <span className="text-[10px] text-muted-foreground">
                                            {MONTH_NAMES[monthNum]}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card id="payouts">
                <CardHeader>
                    <CardTitle className="text-base font-semibold">Historial de Pagos (Payouts)</CardTitle>
                    <CardDescription>
                        Visualiza las comisiones pagadas y pendientes.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {(data.commissions?.length ?? 0) > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead>Fecha</TableHead>
                                    <TableHead className="text-right">Monto</TableHead>
                                    <TableHead className="text-right">Estado</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {(data.commissions ?? []).map((c, i) => (
                                    <TableRow key={i}>
                                        <TableCell className="font-medium">
                                            {MONTH_NAMES[parseInt((c.month ?? "01").split("-")[1] || "1", 10) - 1]} {c.year}
                                        </TableCell>
                                        <TableCell className="text-right font-medium">{formatCurrency(c.amount ?? 0)}</TableCell>
                                        <TableCell className="text-right">
                                            <span
                                                className={`rounded-full px-2 py-0.5 text-xs ${
                                                    c.status === "paid"
                                                        ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                                                        : c.status === "pending"
                                                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                                                        : "bg-muted text-muted-foreground"
                                                }`}
                                            >
                                                {c.status === "paid" ? "Pagado" : c.status === "pending" ? "Pendiente" : (c.status ?? "—")}
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <p className="py-8 text-center text-sm text-muted-foreground">
                            Aún no hay comisiones. Refiere clientes para empezar.
                        </p>
                    )}
                </CardContent>
            </Card>

            <Card className="mt-8" id="referrals">
                <CardHeader>
                    <CardTitle className="text-base font-semibold">Tus Referidos</CardTitle>
                    <CardDescription>
                        Lista de todos los clientes que se han registrado con tu código.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {(data.referrals?.length ?? 0) > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead>Cliente</TableHead>
                                    <TableHead>Plan</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead className="text-right">Comisión Mensual</TableHead>
                                    <TableHead className="text-right">Fecha de Registro</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {(data.referrals ?? []).map((r, i) => (
                                    <TableRow key={i}>
                                        <TableCell>
                                            <div className="font-medium">{r.name}</div>
                                            <div className="text-xs text-muted-foreground">{r.email}</div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-800 dark:bg-slate-800 dark:text-slate-300">
                                                {r.plan ?? "Estándar"}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <span
                                                className={`rounded-full px-2 py-0.5 text-xs ${
                                                    r.status === "active"
                                                        ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                                                        : r.status === "trial"
                                                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                                                        : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                                                }`}
                                            >
                                                {r.status === "active" ? "Activo" : r.status === "trial" ? "En Prueba" : "Inactivo"}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right font-medium text-green-600 dark:text-green-400">
                                            {formatCurrency(r.monthlyCommission ?? 0)}
                                        </TableCell>
                                        <TableCell className="text-right text-sm text-muted-foreground">
                                            {r.joinedAt ? new Date(r.joinedAt).toLocaleDateString("es-DO") : "N/A"}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <p className="py-8 text-center text-sm text-muted-foreground">
                            Aún no tienes referidos.
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
