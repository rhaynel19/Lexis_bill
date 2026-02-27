"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, DollarSign, Loader2, CheckCircle, Ban, Handshake, TrendingUp, Link2, Copy, Wallet, Download, ShieldCheck, MessageCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { openWhatsApp } from "@/lib/whatsapp-utils";

export default function AdminPartnersPage() {
    const [partners, setPartners] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [actioning, setActioning] = useState<string | null>(null);
    const [inviteUrl, setInviteUrl] = useState<string | null>(null);
    const [isCreatingInvite, setIsCreatingInvite] = useState(false);
    const [carteraModal, setCarteraModal] = useState<string | null>(null);
    const [carteraPartner, setCarteraPartner] = useState<{ partner: { name: string; referralCode: string }; cartera: any[] } | null>(null);
    const [loadingCartera, setLoadingCartera] = useState(false);
    const [calculatingCommissions, setCalculatingCommissions] = useState(false);
    const [statusFilter, setStatusFilter] = useState<"" | "active" | "suspended" | "pending" | "rejected">("");
    const [confirmAction, setConfirmAction] = useState<{ action: "suspend" | "activate" | "reject"; id: string; name: string } | null>(null);
    const [detailPartnerId, setDetailPartnerId] = useState<string | null>(null);
    const [detailData, setDetailData] = useState<{ partner: any; commissions: any[] } | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [activityData, setActivityData] = useState<any[]>([]);
    const [activityLoading, setActivityLoading] = useState(false);
    const [markPaidCommissionId, setMarkPaidCommissionId] = useState<string | null>(null);
    const [markPaidPayload, setMarkPaidPayload] = useState({ paidAt: new Date().toISOString().slice(0, 10), paymentRef: "" });
    const [savingMarkPaid, setSavingMarkPaid] = useState(false);
    const [editingRatePartnerId, setEditingRatePartnerId] = useState<string | null>(null);
    const [editRateValue, setEditRateValue] = useState<string>("");
    const [savingRate, setSavingRate] = useState(false);
    const [earningsFilter, setEarningsFilter] = useState<"all" | "conPendiente">("conPendiente");

    useEffect(() => {
        const fetchData = async () => {
            try {
                const { api } = await import("@/lib/api-service");
                const [partnersData, statsData] = await Promise.all([
                    api.getAdminPartners(),
                    api.getAdminPartnersStats()
                ]);
                setPartners(partnersData || []);
                setStats(statsData || {});
            } catch (e) {
                toast.error("Error al cargar partners");
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleApprove = async (id: string) => {
        setActioning(id);
        try {
            const { api } = await import("@/lib/api-service");
            const res = await api.approvePartner(id);
            toast.success(res?.message || "Partner aprobado");
            setPartners(prev => prev.map(p => p._id === id ? { ...p, status: 'active' } : p));
            if (stats) setStats({ ...stats, totalPartners: (stats.totalPartners || 0) + 1, pendingApprovals: Math.max(0, (stats.pendingApprovals || 1) - 1) });
        } catch (e: any) {
            toast.error(e?.message || "Error al aprobar");
        } finally {
            setActioning(null);
        }
    };

    const handleSuspend = async (id: string) => {
        setConfirmAction(null);
        setActioning(id);
        try {
            const { api } = await import("@/lib/api-service");
            const res = await api.suspendPartner(id);
            toast.success(res?.message || "Partner suspendido correctamente");
            setPartners(prev => prev.map(p => p._id === id ? { ...p, status: "suspended", suspendedAt: new Date().toISOString() } : p));
            if (stats) setStats({ ...stats, totalPartners: Math.max(0, (stats.totalPartners || 0) - 1) });
        } catch (e: any) {
            toast.error(e?.message || "Error al suspender");
        } finally {
            setActioning(null);
        }
    };

    const handleActivate = async (id: string) => {
        setConfirmAction(null);
        setActioning(id);
        try {
            const { api } = await import("@/lib/api-service");
            const res = await api.activatePartner(id);
            toast.success(res?.message || "Partner activado correctamente");
            setPartners(prev => prev.map(p => p._id === id ? { ...p, status: "active", suspendedAt: undefined } : p));
            if (stats) setStats({ ...stats, totalPartners: (stats.totalPartners || 0) + 1 });
        } catch (e: any) {
            toast.error(e?.message || "Error al activar");
        } finally {
            setActioning(null);
        }
    };

    const formatCurrency = (n: number) =>
        new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP", maximumFractionDigits: 0 }).format(n || 0);

    const handleCreateInvite = async () => {
        setIsCreatingInvite(true);
        setInviteUrl(null);
        try {
            const { api } = await import("@/lib/api-service");
            const res = await api.createPartnerInvite({ expiresDays: 7, maxUses: 1 });
            setInviteUrl(res?.inviteUrl || "");
            toast.success("Link de invitación creado");
        } catch (e: any) {
            toast.error(e?.message || "Error al crear invitación");
        } finally {
            setIsCreatingInvite(false);
        }
    };

    const handleCalculateCommissions = async () => {
        setCalculatingCommissions(true);
        try {
            const { api } = await import("@/lib/api-service");
            const res = await api.calculatePartnerCommissions({});
            toast.success(res?.message || "Comisiones calculadas");
            if (res?.month) toast.info(`Mes: ${res.month}. Procesados: ${res.partnersProcessed ?? 0}. Creados: ${res.created ?? 0}. Actualizados: ${res.updated ?? 0}.`);
            const [partnersData, statsData] = await Promise.all([api.getAdminPartners(), api.getAdminPartnersStats()]);
            setPartners(partnersData || []);
            setStats(statsData || {});
        } catch (e: any) {
            toast.error(e?.message || "Error al calcular comisiones");
        } finally {
            setCalculatingCommissions(false);
        }
    };

    const handleExportCsv = () => {
        const headers = ["Nombre", "Email", "Código", "Estado", "Clientes activos", "En prueba", "Churned", "Ganado (RD$)", "Pendiente (RD$)"];
        const rows = partners.map((p) => [
            p.name ?? "",
            p.email ?? "",
            p.referralCode ?? "",
            p.status ?? "",
            String(p.activeClients ?? 0),
            String(p.trialClients ?? 0),
            String(p.churnedClients ?? 0),
            String(p.totalEarned ?? 0),
            String(p.pendingPayout ?? 0),
        ]);
        const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
        const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `partners-lexisbill-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("CSV descargado");
    };

    const handleVerCartera = async (partnerId: string) => {
        setCarteraModal(partnerId);
        setLoadingCartera(true);
        setCarteraPartner(null);
        try {
            const { api } = await import("@/lib/api-service");
            const data = await api.getPartnerCartera(partnerId);
            setCarteraPartner(data);
        } catch (e: any) {
            toast.error(e?.message || "Error al cargar cartera");
            setCarteraModal(null);
        } finally {
            setLoadingCartera(false);
        }
    };

    const closeCarteraModal = () => {
        setCarteraModal(null);
        setCarteraPartner(null);
    };

    const copyInviteUrl = () => {
        if (inviteUrl) {
            navigator.clipboard.writeText(inviteUrl);
            toast.success("Link copiado al portapapeles");
        }
    };

    const shareInviteByWhatsApp = () => {
        if (!inviteUrl) return;
        const message = `Hola! Te invito a ser Partner de Lexis Bill. Regístrate con este enlace y obtén prioridad en aprobación:\n\n${inviteUrl}`;
        openWhatsApp(undefined, message);
    };

    const getStatusBadge = (status: string) => {
        const map: Record<string, { label: string; className: string }> = {
            active: { label: "Activo", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-medium" },
            pending: { label: "Pendiente aprobación", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-medium" },
            suspended: { label: "Suspendido", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-medium" },
            rejected: { label: "Rechazado", className: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300 font-medium" }
        };
        const s = map[status] || { label: status, className: "bg-muted text-muted-foreground" };
        return <span className={`text-xs px-2 py-1 rounded-full ${s.className}`}>{s.label}</span>;
    };

    const openPartnerDetail = async (partnerId: string) => {
        setDetailPartnerId(partnerId);
        setDetailData(null);
        setActivityData([]);
        setDetailLoading(true);
        try {
            const { api } = await import("@/lib/api-service");
            const data = await api.getPartnerDetail(partnerId);
            setDetailData({ partner: data.partner, commissions: data.commissions || [] });
        } catch (e: any) {
            toast.error(e?.message || "Error al cargar detalle");
            setDetailPartnerId(null);
        } finally {
            setDetailLoading(false);
        }
    };

    const loadPartnerActivity = async () => {
        if (!detailPartnerId) return;
        setActivityLoading(true);
        try {
            const { api } = await import("@/lib/api-service");
            const res = await api.getPartnerActivity(detailPartnerId);
            setActivityData(res?.activity || []);
        } catch (e: any) {
            toast.error(e?.message || "Error al cargar actividad");
        } finally {
            setActivityLoading(false);
        }
    };

    const handleReject = async (id: string) => {
        setConfirmAction(null);
        setActioning(id);
        try {
            const { api } = await import("@/lib/api-service");
            const res = await api.rejectPartner(id);
            toast.success(res?.message || "Partner rechazado");
            setPartners(prev => prev.map(p => p._id === id ? { ...p, status: "rejected" } : p));
            if (stats) setStats({ ...stats, pendingApprovals: Math.max(0, (stats.pendingApprovals || 1) - 1) });
            if (detailPartnerId === id) setDetailPartnerId(null);
        } catch (e: any) {
            toast.error(e?.message || "Error al rechazar");
        } finally {
            setActioning(null);
        }
    };

    const handleMarkPaidSubmit = async () => {
        if (!markPaidCommissionId) return;
        setSavingMarkPaid(true);
        try {
            const { api } = await import("@/lib/api-service");
            await api.markCommissionPaid(markPaidCommissionId, {
                paidAt: markPaidPayload.paidAt || undefined,
                paymentRef: markPaidPayload.paymentRef || undefined,
            });
            toast.success("Comisión marcada como pagada");
            setMarkPaidCommissionId(null);
            setMarkPaidPayload({ paidAt: new Date().toISOString().slice(0, 10), paymentRef: "" });
            if (detailPartnerId) {
                const data = await api.getPartnerDetail(detailPartnerId);
                setDetailData({ partner: data.partner, commissions: data.commissions || [] });
            }
            const [partnersData, statsData] = await Promise.all([api.getAdminPartners(), api.getAdminPartnersStats()]);
            setPartners(partnersData || []);
            setStats(statsData || {});
        } catch (e: any) {
            toast.error(e?.message || "Error al marcar como pagada");
        } finally {
            setSavingMarkPaid(false);
        }
    };

    const handleUpdateCommissionRate = async () => {
        const id = editingRatePartnerId;
        if (!id) return;
        const rate = Number(editRateValue);
        if (Number.isNaN(rate) || rate < 0 || rate > 100) {
            toast.error("Porcentaje debe ser entre 0 y 100");
            return;
        }
        setSavingRate(true);
        try {
            const { api } = await import("@/lib/api-service");
            await api.updatePartnerCommissionRate(id, rate / 100);
            toast.success("Porcentaje de comisión actualizado");
            setEditingRatePartnerId(null);
            setEditRateValue("");
            if (detailPartnerId === id && detailData) {
                setDetailData({ ...detailData, partner: { ...detailData.partner, commissionRate: rate / 100 } });
            }
            const partnersData = await api.getAdminPartners();
            setPartners(partnersData || []);
        } catch (e: any) {
            toast.error(e?.message || "Error al actualizar");
        } finally {
            setSavingRate(false);
        }
    };

    const copyReferralUrl = (url: string) => {
        navigator.clipboard.writeText(url);
        toast.success("Link copiado al portapapeles");
    };

    const filteredPartners = statusFilter
        ? partners.filter((p) => p.status === statusFilter)
        : partners;

    const earningsPartners = earningsFilter === "conPendiente"
        ? filteredPartners.filter((p) => (p.pendingPayout ?? 0) > 0)
        : filteredPartners;
    const totalPendientePago = earningsPartners.reduce((sum, p) => sum + (p.pendingPayout ?? 0), 0);

    if (isLoading) {
        return (
            <div className="space-y-8">
                <div>
                    <h1 className="text-2xl font-bold">Programa Partners</h1>
                    <p className="text-muted-foreground text-sm">Estadísticas y gestión de partners Lexis Bill</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-lg" />)}
                </div>
                <Skeleton className="h-64 rounded-lg" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Handshake className="w-7 h-7 text-amber-500" />
                    Programa Partners
                </h1>
                <p className="text-muted-foreground text-sm">Panel de crecimiento · Afiliados y expansión comercial</p>
            </div>

            {/* Panel de crecimiento — KPIs */}
            <div className="space-y-2">
                <h2 className="text-sm font-semibold text-muted-foreground">Panel de crecimiento</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                            <Users className="w-4 h-4" /> Partners activos
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <span className="text-2xl font-bold">{stats?.totalPartners ?? 0}</span>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-muted-foreground">Pendientes de aprobar</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <span className="text-2xl font-bold text-amber-600">{stats?.pendingApprovals ?? 0}</span>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" /> Referidos activos
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <span className="text-2xl font-bold">{stats?.activeReferrals ?? 0}</span>
                        <p className="text-xs text-muted-foreground mt-1">de {stats?.totalReferrals ?? 0} total</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                            <Wallet className="w-4 h-4" /> Revenue canal
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <span className="text-2xl font-bold">{formatCurrency((stats?.activeReferrals ?? 0) * 950)}</span>
                        <p className="text-xs text-muted-foreground mt-1">Cartera activa × RD$950</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                            <DollarSign className="w-4 h-4" /> Comisiones este mes
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <span className="text-2xl font-bold text-amber-600">{formatCurrency(stats?.commissionsThisMonth ?? 0)}</span>
                        <p className="text-xs text-muted-foreground mt-1">Generadas en el mes actual</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                            <Wallet className="w-4 h-4" /> Comisiones pendientes
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <span className="text-2xl font-bold">{formatCurrency(stats?.commissionsPending ?? 0)}</span>
                        <p className="text-xs text-muted-foreground mt-1">Pagadas: {formatCurrency(stats?.commissionsPaid ?? 0)}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-muted-foreground">Cartera</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-2 items-baseline">
                            <span className="text-lg font-bold text-green-600">{stats?.activeReferrals ?? 0}</span>
                            <span className="text-xs text-muted-foreground">activos</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {stats?.trialReferrals ?? 0} prueba · {stats?.churnedReferrals ?? 0} churned
                        </p>
                    </CardContent>
                </Card>
                </div>
            </div>

            {/* Top Partners (ranking) */}
            {partners.filter(p => p.status === "active" && (p.activeClients ?? 0) > 0).length > 0 && (
                <Card className="border-amber-200/50 dark:border-amber-900/30 bg-gradient-to-br from-amber-50/20 to-transparent dark:from-amber-950/10">
                    <CardHeader>
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-amber-600" />
                            Top Partners por Cartera
                        </CardTitle>
                        <CardDescription>Partners con más clientes activos</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-4">
                            {partners
                                .filter(p => p.status === "active" && (p.activeClients ?? 0) > 0)
                                .sort((a, b) => (b.activeClients ?? 0) - (a.activeClients ?? 0))
                                .slice(0, 5)
                                .map((p, i) => (
                                    <div key={p._id} className="flex items-center gap-3 p-3 rounded-lg bg-background/80 border">
                                        <span className="text-2xl font-black text-amber-500 w-8">#{i + 1}</span>
                                        <div>
                                            <p className="font-semibold">{p.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {p.activeClients} activos · {formatCurrency((p.activeClients ?? 0) * 950)}/mes
                                            </p>
                                        </div>
                                        <Button variant="ghost" size="sm" onClick={() => handleVerCartera(p._id)}>
                                            Ver cartera
                                        </Button>
                                    </div>
                                ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Resumen de ganancia por partner — Próximo pago */}
            <Card className="border-emerald-200/50 dark:border-emerald-900/30 bg-gradient-to-br from-emerald-50/20 to-transparent dark:from-emerald-950/10">
                <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
                    <div>
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-emerald-600" />
                            Resumen de ganancia por partner
                        </CardTitle>
                        <CardDescription>
                            Cuánto has ganado por partner y cuánto debes pagar en el próximo pago (según comisiones pendientes y clientes activos).
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <select
                            value={earningsFilter}
                            onChange={(e) => setEarningsFilter(e.target.value as "all" | "conPendiente")}
                            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                            aria-label="Filtrar resumen"
                        >
                            <option value="all">Todos los partners</option>
                            <option value="conPendiente">Solo con pendiente de pago</option>
                        </select>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead>Partner</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead className="text-center">Clientes activos</TableHead>
                                    <TableHead className="text-right">Ganado (total)</TableHead>
                                    <TableHead className="text-right">Pendiente de pago</TableHead>
                                    <TableHead className="w-[80px]" />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {earningsPartners.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                            {earningsFilter === "conPendiente"
                                                ? "No hay partners con comisión pendiente de pago."
                                                : "No hay partners que coincidan con el filtro de estado."}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    [...earningsPartners]
                                        .sort((a, b) => (b.pendingPayout ?? 0) - (a.pendingPayout ?? 0))
                                        .map((p) => (
                                            <TableRow
                                                key={p._id}
                                                className="cursor-pointer hover:bg-muted/50"
                                                onClick={() => openPartnerDetail(p._id)}
                                            >
                                                <TableCell>
                                                    <div>
                                                        <p className="font-semibold">{p.name}</p>
                                                        <p className="text-xs text-muted-foreground font-mono">{p.referralCode}</p>
                                                    </div>
                                                </TableCell>
                                                <TableCell>{getStatusBadge(p.status)}</TableCell>
                                                <TableCell className="text-center">
                                                    <span className="font-semibold text-emerald-600">{p.activeClients ?? 0}</span>
                                                    <p className="text-[10px] text-muted-foreground">activos</p>
                                                </TableCell>
                                                <TableCell className="text-right font-medium">{formatCurrency(p.totalEarned ?? 0)}</TableCell>
                                                <TableCell className="text-right font-semibold text-amber-600">{formatCurrency(p.pendingPayout ?? 0)}</TableCell>
                                                <TableCell onClick={(e) => e.stopPropagation()}>
                                                    <Button variant="ghost" size="sm" onClick={() => openPartnerDetail(p._id)}>
                                                        Ver perfil
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    {earningsPartners.length > 0 && totalPendientePago > 0 && (
                        <div className="mt-4 pt-4 border-t flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-muted-foreground">Total a pagar (pendiente):</p>
                            <p className="text-xl font-bold text-amber-600">{formatCurrency(totalPendientePago)}</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Calcular comisiones mensuales */}
            <Card className="border-slate-200 dark:border-slate-700 mb-6">
                <CardHeader>
                    <CardTitle className="text-sm font-bold text-muted-foreground">Comisiones mensuales</CardTitle>
                    <CardDescription>Ejecuta el cálculo para el mes anterior (o cron el día 1). Crea/actualiza PartnerCommission por partner activo.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button variant="outline" size="sm" onClick={handleCalculateCommissions} disabled={calculatingCommissions}>
                        {calculatingCommissions ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <DollarSign className="w-4 h-4 mr-2" />}
                        Calcular comisiones (mes anterior)
                    </Button>
                </CardContent>
            </Card>

            {/* Invitaciones (modelo híbrido) */}
            <Card className="border-amber-200/50 dark:border-amber-900/30 bg-gradient-to-br from-amber-50/30 to-transparent dark:from-amber-950/20">
                <CardHeader>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <Link2 className="w-5 h-5 text-amber-600" />
                        Invitaciones Partner
                    </CardTitle>
                    <CardDescription>
                        Genera un link exclusivo para invitar a alguien a ser partner. Úsalo para contadores, consultores o referidos clave.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col sm:flex-row gap-4 items-start">
                    <Button
                        onClick={handleCreateInvite}
                        disabled={isCreatingInvite}
                        className="bg-amber-500 hover:bg-amber-600 text-white"
                    >
                        {isCreatingInvite ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Link2 className="w-4 h-4 mr-2" />}
                        Crear invitación
                    </Button>
                    {inviteUrl && (
                        <div className="flex gap-2 items-center w-full max-w-md">
                            <input
                                readOnly
                                value={inviteUrl}
                                className="flex-1 text-sm bg-muted/50 px-3 py-2 rounded-md font-mono truncate border"
                                aria-label="Link de invitación partner"
                                title="Link de invitación partner"
                            />
                            <Button variant="outline" size="icon" onClick={copyInviteUrl} title="Copiar link">
                                <Copy className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="icon" onClick={shareInviteByWhatsApp} title="Enviar por WhatsApp" className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30">
                                <MessageCircle className="w-4 h-4" />
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Lista de Partners */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 flex-wrap gap-4">
                    <div>
                        <CardTitle className="text-lg font-bold">Lista de Partners</CardTitle>
                        <CardDescription>Gestiona aprobaciones, activaciones y suspensiones</CardDescription>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter((e.target.value || "") as "" | "active" | "suspended" | "pending" | "rejected")}
                            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                            aria-label="Filtrar por estado"
                        >
                            <option value="">Todos los estados</option>
                            <option value="active">Activo</option>
                            <option value="suspended">Suspendido</option>
                            <option value="pending">Pendiente aprobación</option>
                            <option value="rejected">Rechazado</option>
                        </select>
                        <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={partners.length === 0}>
                            <Download className="w-4 h-4 mr-2" />
                            Exportar CSV
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {partners.length > 0 ? (
                        <TooltipProvider>
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead>Partner</TableHead>
                                    <TableHead className="max-w-[180px]">¿Por qué partner?</TableHead>
                                    <TableHead>Código</TableHead>
                                    <TableHead className="text-center">Activos</TableHead>
                                    <TableHead className="text-center">Prueba</TableHead>
                                    <TableHead className="text-right">Ganado</TableHead>
                                    <TableHead className="text-right">Pendiente</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead className="whitespace-nowrap">Fecha activación</TableHead>
                                    <TableHead className="whitespace-nowrap">Fecha suspensión</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredPartners.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                                            No hay partners que coincidan con el filtro.
                                        </TableCell>
                                    </TableRow>
                                ) : filteredPartners.map((p) => (
                                    <TableRow
                                        key={p._id}
                                        className="cursor-pointer hover:bg-muted/50"
                                        onClick={() => openPartnerDetail(p._id)}
                                    >
                                        <TableCell>
                                            <div>
                                                <p className="font-semibold">{p.name}</p>
                                                <p className="text-xs text-muted-foreground">{p.email}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell className="max-w-[180px]">
                                            {p.whyPartner ? (
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <span className="line-clamp-2 text-xs text-muted-foreground cursor-default">
                                                                {p.whyPartner}
                                                            </span>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="top" className="max-w-sm whitespace-pre-wrap">
                                                            {p.whyPartner}
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="font-mono text-sm">{p.referralCode}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col items-center">
                                                <span className="font-semibold text-amber-600">{p.activeClients ?? 0}</span>
                                                <div className="flex gap-0.5 mt-1">
                                                    <span title="Activos" className="w-2 h-2 rounded-full bg-green-500" />
                                                    <span title="Prueba" className="w-2 h-2 rounded-full bg-amber-400" />
                                                    <span title="Churned" className="w-2 h-2 rounded-full bg-slate-400" />
                                                </div>
                                                <p className="text-[10px] text-muted-foreground">
                                                    {(p.trialClients ?? 0) + (p.churnedClients ?? 0)} más
                                                </p>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center text-muted-foreground">{p.trialClients ?? 0}</TableCell>
                                        <TableCell className="text-right font-medium">{formatCurrency(p.totalEarned ?? 0)}</TableCell>
                                        <TableCell className="text-right text-muted-foreground">{formatCurrency(p.pendingPayout ?? 0)}</TableCell>
                                        <TableCell>{getStatusBadge(p.status)}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {p.approvedAt ? new Date(p.approvedAt).toLocaleDateString("es-DO") : "—"}
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {p.suspendedAt ? new Date(p.suspendedAt).toLocaleDateString("es-DO") : "—"}
                                        </TableCell>
                                        <TableCell className="text-right flex gap-1 justify-end">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleVerCartera(p._id); }} aria-label="Ver cartera">
                                                        <Wallet className="w-4 h-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Ver cartera de referidos</TooltipContent>
                                            </Tooltip>
                                            {p.status === "pending" && (
                                                <>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="text-green-600 border-green-200 hover:bg-green-50 dark:border-green-800 dark:hover:bg-green-900/30"
                                                                onClick={(e) => { e.stopPropagation(); handleApprove(p._id); }}
                                                                disabled={actioning === p._id}
                                                            >
                                                                {actioning === p._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>Aprobar partner</TooltipContent>
                                                    </Tooltip>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="text-slate-600 border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900/30"
                                                                onClick={(e) => { e.stopPropagation(); setConfirmAction({ action: "reject", id: p._id, name: p.name }); }}
                                                                disabled={actioning === p._id}
                                                            >
                                                                <Ban className="w-4 h-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>Rechazar partner</TooltipContent>
                                                    </Tooltip>
                                                </>
                                            )}
                                            {p.status === "active" && (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/30"
                                                            onClick={(e) => { e.stopPropagation(); setConfirmAction({ action: "suspend", id: p._id, name: p.name }); }}
                                                            disabled={actioning === p._id}
                                                        >
                                                            {actioning === p._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Suspender partner</TooltipContent>
                                                </Tooltip>
                                            )}
                                            {p.status === "suspended" && (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="text-green-600 border-green-200 hover:bg-green-50 dark:border-green-800 dark:hover:bg-green-900/30"
                                                            onClick={(e) => { e.stopPropagation(); setConfirmAction({ action: "activate", id: p._id, name: p.name }); }}
                                                            disabled={actioning === p._id}
                                                        >
                                                            {actioning === p._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Activar partner</TooltipContent>
                                                </Tooltip>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        </TooltipProvider>
                    ) : (
                        <p className="text-center text-muted-foreground py-12">No hay partners registrados</p>
                    )}
                </CardContent>
            </Card>

            {/* Modal confirmación Activar / Suspender */}
            <Dialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Confirmar acción</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        {confirmAction?.action === "suspend"
                            ? "El partner no podrá generar comisiones ni referidos hasta que lo reactives."
                            : confirmAction?.action === "reject"
                            ? "El partner quedará en estado Rechazado y no podrá acceder al programa."
                            : "El partner volverá a generar comisiones normalmente."}
                    </p>
                    {confirmAction && (
                        <p className="text-sm font-medium text-foreground">
                            Partner: <span className="font-semibold">{confirmAction.name}</span>
                        </p>
                    )}
                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={() => setConfirmAction(null)}>
                            Cancelar
                        </Button>
                        <Button
                            variant={confirmAction?.action === "suspend" ? "destructive" : "default"}
                            className={confirmAction?.action === "activate" ? "bg-green-600 hover:bg-green-700" : confirmAction?.action === "reject" ? "bg-slate-600 hover:bg-slate-700" : ""}
                            onClick={() => {
                                if (confirmAction?.action === "suspend") handleSuspend(confirmAction.id);
                                else if (confirmAction?.action === "activate") handleActivate(confirmAction.id);
                                else if (confirmAction?.action === "reject") handleReject(confirmAction.id);
                            }}
                        >
                            Confirmar
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Sheet Perfil Partner */}
            <Sheet open={!!detailPartnerId} onOpenChange={(open) => !open && setDetailPartnerId(null)}>
                <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle>Perfil del partner</SheetTitle>
                    </SheetHeader>
                    {detailLoading && (
                        <div className="flex justify-center py-12">
                            <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
                        </div>
                    )}
                    {detailData && !detailLoading && (
                        <div className="space-y-6 pt-4">
                            <div>
                                <p className="font-semibold text-lg">{detailData.partner.name}</p>
                                <p className="text-sm text-muted-foreground">{detailData.partner.email}</p>
                                <div className="mt-2">{getStatusBadge(detailData.partner.status)}</div>
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground">Link de referido</Label>
                                <div className="flex gap-2 mt-1">
                                    <input
                                        readOnly
                                        aria-label="Link de referido del partner"
                                        value={detailData.partner.referralUrl ?? ""}
                                        className="flex-1 text-sm bg-muted/50 px-3 py-2 rounded-md font-mono truncate border"
                                    />
                                    <Button variant="outline" size="icon" onClick={() => copyReferralUrl(detailData.partner.referralUrl)} title="Copiar">
                                        <Copy className="w-4 h-4" />
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {detailData.partner.totalReferidos ?? 0} registros con este link
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <Card className="p-3">
                                    <p className="text-xs text-muted-foreground">Activos / Prueba / Churned</p>
                                    <p className="font-semibold">{detailData.partner.activeClients ?? 0} / {detailData.partner.trialClients ?? 0} / {detailData.partner.churnedClients ?? 0}</p>
                                </Card>
                                <Card className="p-3">
                                    <p className="text-xs text-muted-foreground">Facturación generada</p>
                                    <p className="font-semibold">{formatCurrency(detailData.partner.facturacionGenerada ?? 0)}</p>
                                </Card>
                                <Card className="p-3">
                                    <p className="text-xs text-muted-foreground">Comisión acumulada</p>
                                    <p className="font-semibold">{formatCurrency(detailData.partner.totalEarned ?? 0)}</p>
                                </Card>
                                <Card className="p-3">
                                    <p className="text-xs text-muted-foreground">Pendiente de pago</p>
                                    <p className="font-semibold text-amber-600">{formatCurrency(detailData.partner.pendingPayout ?? 0)}</p>
                                </Card>
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <Label className="text-sm font-medium">Comisión (%)</Label>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setEditingRatePartnerId(detailPartnerId);
                                            setEditRateValue(String(Math.round((detailData.partner.commissionRate ?? 0) * 100)));
                                        }}
                                    >
                                        Editar %
                                    </Button>
                                </div>
                                <p className="text-sm text-muted-foreground">{Math.round((detailData.partner.commissionRate ?? 0) * 100)}%</p>
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold mb-2">Comisiones por mes</h4>
                                {detailData.commissions.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">Sin comisiones registradas</p>
                                ) : (
                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                        {detailData.commissions.map((c: any) => (
                                            <div key={c.id} className="flex items-center justify-between py-2 border-b text-sm">
                                                <span>{c.year}-{c.month}</span>
                                                <span>{formatCurrency(c.commissionAmount ?? 0)}</span>
                                                <span className={c.status === "paid" ? "text-green-600" : "text-amber-600"}>{c.status === "paid" ? "Pagada" : c.status === "pending" ? "Pendiente" : c.status}</span>
                                                {c.status !== "paid" && (
                                                    <Button size="sm" variant="outline" onClick={() => setMarkPaidCommissionId(c.id)}>
                                                        Marcar pagada
                                                    </Button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-sm font-semibold">Actividad</h4>
                                    <Button variant="outline" size="sm" onClick={loadPartnerActivity} disabled={activityLoading}>
                                        {activityLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Ver actividad"}
                                    </Button>
                                </div>
                                {activityData.length > 0 ? (
                                    <div className="space-y-1 max-h-40 overflow-y-auto text-xs">
                                        {activityData.map((log: any, i: number) => (
                                            <div key={i} className="py-1.5 border-b border-dashed">
                                                <span className="font-medium">{log.action}</span>
                                                {log.metadata && Object.keys(log.metadata).length > 0 && (
                                                    <span className="text-muted-foreground ml-1">{JSON.stringify(log.metadata)}</span>
                                                )}
                                                <p className="text-muted-foreground">{log.createdAt ? new Date(log.createdAt).toLocaleString("es-DO") : ""}</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">Carga la actividad para ver el historial.</p>
                                )}
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>

            {/* Modal Marcar comisión como pagada */}
            <Dialog open={!!markPaidCommissionId} onOpenChange={(open) => !open && setMarkPaidCommissionId(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Marcar comisión como pagada</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                        <div>
                            <Label htmlFor="paidAt">Fecha de pago</Label>
                            <Input
                                id="paidAt"
                                type="date"
                                value={markPaidPayload.paidAt}
                                onChange={(e) => setMarkPaidPayload((prev) => ({ ...prev, paidAt: e.target.value }))}
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label htmlFor="paymentRef">Referencia de pago</Label>
                            <Input
                                id="paymentRef"
                                placeholder="Ej. transferencia, cheque..."
                                value={markPaidPayload.paymentRef}
                                onChange={(e) => setMarkPaidPayload((prev) => ({ ...prev, paymentRef: e.target.value }))}
                                className="mt-1"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={() => setMarkPaidCommissionId(null)}>Cancelar</Button>
                        <Button onClick={handleMarkPaidSubmit} disabled={savingMarkPaid}>
                            {savingMarkPaid ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Confirmar
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Modal Editar % comisión */}
            <Dialog open={!!editingRatePartnerId} onOpenChange={(open) => !open && (setEditingRatePartnerId(null), setEditRateValue(""))}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Editar porcentaje de comisión</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                        <div>
                            <Label htmlFor="editRate">Porcentaje (0-100)</Label>
                            <Input
                                id="editRate"
                                type="number"
                                min={0}
                                max={100}
                                step={0.5}
                                value={editRateValue}
                                onChange={(e) => setEditRateValue(e.target.value)}
                                className="mt-1"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={() => { setEditingRatePartnerId(null); setEditRateValue(""); }}>Cancelar</Button>
                        <Button onClick={handleUpdateCommissionRate} disabled={savingRate}>
                            {savingRate ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Guardar
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Modal Cartera */}
            <Dialog open={!!carteraModal} onOpenChange={(open) => !open && closeCarteraModal()}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Wallet className="w-5 h-5 text-amber-500" />
                            Cartera — {loadingCartera ? "Cargando…" : carteraPartner?.partner?.name}
                        </DialogTitle>
                        {carteraPartner && (
                            <p className="text-sm text-muted-foreground">
                                Código: {carteraPartner.partner.referralCode} · {carteraPartner.cartera.length} referidos
                            </p>
                        )}
                    </DialogHeader>
                    {loadingCartera && (
                        <div className="flex justify-center py-12">
                            <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
                        </div>
                    )}
                    {carteraPartner && !loadingCartera && (
                        <div className="space-y-4">
                            {carteraPartner.cartera.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead>Cliente</TableHead>
                                            <TableHead>RNC</TableHead>
                                            <TableHead>Estado</TableHead>
                                            <TableHead>Fecha</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {carteraPartner.cartera.map((c: any, i: number) => (
                                            <TableRow key={i}>
                                                <TableCell>
                                                    <p className="font-medium">{c.name || "—"}</p>
                                                    <p className="text-xs text-muted-foreground">{c.email}</p>
                                                </TableCell>
                                                <TableCell className="font-mono text-sm">{c.rnc || "—"}</TableCell>
                                                <TableCell>
                                                    <span className={`text-xs px-2 py-1 rounded-full ${
                                                        c.status === "active" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                                                        c.status === "trial" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                                                        "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                                    }`}>
                                                        {c.status === "active" ? "Activo" : c.status === "trial" ? "Prueba" : "Churned"}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground">
                                                    {c.subscribedAt ? new Date(c.subscribedAt).toLocaleDateString("es-DO") : new Date(c.createdAt).toLocaleDateString("es-DO")}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <p className="text-center text-muted-foreground py-8">Sin referidos aún</p>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
