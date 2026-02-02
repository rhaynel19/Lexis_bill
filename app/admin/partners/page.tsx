"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, DollarSign, Loader2, CheckCircle, Ban, Handshake, TrendingUp, Link2, Copy, Wallet, Download } from "lucide-react";
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
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

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
        setActioning(id);
        try {
            const { api } = await import("@/lib/api-service");
            const res = await api.suspendPartner(id);
            toast.success(res?.message || "Partner suspendido");
            setPartners(prev => prev.map(p => p._id === id ? { ...p, status: 'suspended' } : p));
            if (stats) setStats({ ...stats, totalPartners: Math.max(0, (stats.totalPartners || 0) - 1) });
        } catch (e: any) {
            toast.error(e?.message || "Error al suspender");
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

    const getStatusBadge = (status: string) => {
        const map: Record<string, { label: string; className: string }> = {
            active: { label: "Activo", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
            pending: { label: "Pendiente", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
            suspended: { label: "Suspendido", className: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" }
        };
        const s = map[status] || map.pending;
        return <span className={`text-xs px-2 py-1 rounded-full ${s.className}`}>{s.label}</span>;
    };

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
                <p className="text-muted-foreground text-sm">Estadísticas y gestión de partners Lexis Bill</p>
            </div>

            {/* Estadísticas y Cartera */}
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
                            <DollarSign className="w-4 h-4" /> Comisiones pagadas
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <span className="text-2xl font-bold text-green-600">{formatCurrency(stats?.commissionsPaid ?? 0)}</span>
                        <p className="text-xs text-muted-foreground mt-1">Pendiente: {formatCurrency(stats?.commissionsPending ?? 0)}</p>
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
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Lista de Partners */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <div>
                        <CardTitle className="text-lg font-bold">Lista de Partners</CardTitle>
                        <CardDescription>Gestiona aprobaciones y suspensiones</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={partners.length === 0}>
                        <Download className="w-4 h-4 mr-2" />
                        Exportar CSV
                    </Button>
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
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {partners.map((p) => (
                                    <TableRow key={p._id}>
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
                                        <TableCell className="text-right flex gap-1 justify-end">
                                            <Button variant="ghost" size="sm" onClick={() => handleVerCartera(p._id)} title="Ver cartera">
                                                <Wallet className="w-4 h-4" />
                                            </Button>
                                            {p.status === "pending" && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="text-green-600 border-green-200 hover:bg-green-50"
                                                    onClick={() => handleApprove(p._id)}
                                                    disabled={actioning === p._id}
                                                >
                                                    {actioning === p._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                                </Button>
                                            )}
                                            {p.status === "active" && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="text-red-600 border-red-200 hover:bg-red-50"
                                                    onClick={() => handleSuspend(p._id)}
                                                    disabled={actioning === p._id}
                                                >
                                                    {actioning === p._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                                                </Button>
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
