"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, TrendingUp, Link2, Loader2, CheckCircle, Handshake, Users, DollarSign, Wallet } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
    totalRevenue?: number;
    commissionThisMonth?: number;
    showWelcomeMessage?: boolean;
    commissions?: PartnerCommission[];
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

    return (
        <div className="container mx-auto max-w-5xl px-4 py-8">
            {data.showWelcomeMessage && (
                <div className="mb-6 flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800 dark:border-green-800 dark:bg-green-950/30 dark:text-green-200">
                    <CheckCircle className="h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
                    Tu solicitud fue aprobada. Comparte tu link para empezar a ganar comisiones.
                </div>
            )}

            <div className="mb-8">
                <h1 className="text-2xl font-bold flex items-center gap-2 text-foreground">
                    <Handshake className="w-7 h-7 text-amber-500" />
                    Programa Partner
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                    Estadísticas y gestión de tus referidos Lexis Bill · Comisión {commissionRatePct}% por cliente activo
                </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                            <Users className="w-4 h-4" /> Clientes activos
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">{data.activeClients ?? 0}</span>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-muted-foreground">En prueba</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <span className="text-2xl font-bold">{data.trialClients ?? 0}</span>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                            <Wallet className="w-4 h-4" /> Revenue generado
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <span className="text-2xl font-bold">{formatCurrency(data.totalRevenue ?? 0)}</span>
                        <p className="text-xs text-muted-foreground mt-1">Cartera activa × RD$950</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                            <DollarSign className="w-4 h-4" /> Comisión este mes
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <span className="text-2xl font-bold text-green-600 dark:text-green-500">{formatCurrency(data.commissionThisMonth ?? 0)}</span>
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
                    <Button onClick={copyReferralUrl} variant="outline" size="sm" className="gap-2 shrink-0 border-amber-500/30 text-amber-700 hover:bg-amber-500/10 dark:text-amber-300">
                        <Copy className="h-4 w-4" /> Copiar
                    </Button>
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

            <Card>
                <CardHeader>
                    <CardTitle className="text-base font-semibold">Comisiones mensuales</CardTitle>
                    <CardDescription>
                        Historial de comisiones. El pago se realiza 30 días después del cierre del mes.
                    </CardDescription>
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
                                {(data.commissions ?? []).map((c, i) => (
                                    <TableRow key={i}>
                                        <TableCell className="font-medium">
                                            {MONTH_NAMES[parseInt((c.month ?? "01").split("-")[1] || "1", 10) - 1]} {c.year}
                                        </TableCell>
                                        <TableCell className="text-center">{c.activeClients ?? 0}</TableCell>
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
        </div>
    );
}
