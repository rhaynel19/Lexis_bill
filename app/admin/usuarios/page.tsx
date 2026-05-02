"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserCircle, Search, Download, Filter, Check, Loader2, Trash2, ArrowUp, ArrowDown, Eye, Lock, Unlock, Users, Clock, Ban, Handshake, Copy, MoreHorizontal } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import Link from "next/link";
import type { AdminUser } from "@/lib/api-service";
import { cn } from "@/lib/utils";

// Custom simple Avatar since it's not exported from generic ui in this case
function SimpleAvatar({ name, className }: { name: string, className?: string }) {
    const initials = name
        .split(' ')
        .map(n => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase() || '?';
        
    return (
        <div className={cn("flex items-center justify-center bg-indigo-100 text-indigo-700 font-bold rounded-full w-9 h-9 shrink-0 dark:bg-indigo-900/50 dark:text-indigo-400", className)}>
            {initials}
        </div>
    );
}

export default function AdminUsuariosPage() {
    const [list, setList] = useState<AdminUser[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [limit] = useState(50);
    const [search, setSearch] = useState("");
    const [searchInput, setSearchInput] = useState("");
    const [roleFilter, setRoleFilter] = useState<string>("all");
    const [planFilter, setPlanFilter] = useState<string>("all");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [activityFilter, setActivityFilter] = useState<string>("all");
    const [sortBy, setSortBy] = useState<string>("lastLoginAt");
    const [sortOrder, setSortOrder] = useState<string>("desc");
    const [isLoading, setIsLoading] = useState(true);
    const [actioningId, setActioningId] = useState<string | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
    const [detailUser, setDetailUser] = useState<AdminUser | null>(null);
    const [detailData, setDetailData] = useState<any>(null);
    const [notesEdit, setNotesEdit] = useState("");
    const [globalStats, setGlobalStats] = useState<any>(null);

    const fetchGlobalStats = async () => {
        try {
            const { api } = await import("@/lib/api-service");
            const res = await api.getAdminStats();
            setGlobalStats(res);
        } catch (e) {
            console.error("Error fetching admin stats", e);
        }
    };

    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
        try {
            const { api } = await import("@/lib/api-service");
            const res = await api.getAdminUsers({
                q: search || undefined,
                role: roleFilter === "all" ? undefined : roleFilter,
                plan: planFilter === "all" ? undefined : planFilter,
                status: statusFilter === "all" ? undefined : statusFilter,
                activity: activityFilter === "all" ? undefined : activityFilter,
                sortBy,
                sortOrder,
                page,
                limit
            });
            setList(res?.list ?? []);
            setTotal(res?.total ?? 0);
        } catch (e) {
            toast.error("Error al cargar usuarios");
            setList([]);
            setTotal(0);
        } finally {
            setIsLoading(false);
        }
    }, [search, roleFilter, planFilter, statusFilter, activityFilter, sortBy, sortOrder, page, limit]);

    useEffect(() => {
        fetchUsers();
        fetchGlobalStats();
    }, [fetchUsers]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setSearch(searchInput.trim());
        setPage(1);
    };

    const isUserActive = (u: AdminUser) =>
        u.subscriptionStatus === "Activo" || u.subscriptionStatus === "active";

    const getUserId = (u: AdminUser | null | undefined): string => u ? (u.id || (u as any)._id as string) : "";

    const handleActivate = async (id: string) => {
        setActioningId(id);
        try {
            const { api } = await import("@/lib/api-service");
            const res = await api.activateUser(id);
            toast.success(res?.message || "Membresía activada.");
            fetchUsers();
        } catch (e: any) {
            toast.error(e?.message || "Error al activar.");
        } finally {
            setActioningId(null);
        }
    };

    const handleBlock = async (id: string) => {
        setActioningId(id);
        try {
            const { api } = await import("@/lib/api-service");
            await api.blockUser(id);
            toast.success("Cuenta bloqueada.");
            fetchUsers();
            setDetailUser(null);
        } catch (e: any) {
            toast.error(e?.message || "Error al bloquear.");
        } finally {
            setActioningId(null);
        }
    };

    const handleUnblock = async (id: string) => {
        setActioningId(id);
        try {
            const { api } = await import("@/lib/api-service");
            await api.unblockUser(id);
            toast.success("Cuenta desbloqueada.");
            fetchUsers();
            if (detailUser && getUserId(detailUser) === id) setDetailData((d: any) => d ? { ...d, blocked: false } : null);
        } catch (e: any) {
            toast.error(e?.message || "Error al desbloquear.");
        } finally {
            setActioningId(null);
        }
    };

    const handleOpenDetail = async (u: AdminUser) => {
        setDetailUser(u);
        setNotesEdit(u.adminNotes || "");
        const userId = getUserId(u);
        if (!userId) {
            toast.error("ID de usuario no disponible");
            return;
        }
        try {
            const { api } = await import("@/lib/api-service");
            const data = await api.getAdminUserDetail(userId);
            setDetailData(data);
        } catch {
            toast.error("Error al cargar detalle");
            setDetailData(null);
        }
    };

    const handleSaveNotes = async () => {
        if (!detailUser) return;
        const userId = getUserId(detailUser);
        setActioningId(userId);
        try {
            const { api } = await import("@/lib/api-service");
            await api.updateUserNotes(userId, notesEdit);
            toast.success("Notas guardadas.");
            setDetailData((d: any) => d ? { ...d, adminNotes: notesEdit } : null);
            fetchUsers();
        } catch (e: any) {
            toast.error(e?.message || "Error al guardar.");
        } finally {
            setActioningId(null);
        }
    };

    const handleDelete = async () => {
        if (!deleteConfirm) return;
        const id = deleteConfirm.id;
        setActioningId(id);
        setDeleteConfirm(null);
        try {
            const { api } = await import("@/lib/api-service");
            const res = await api.deleteUser(id);
            toast.success(res?.message || "Usuario eliminado.");
            fetchUsers();
        } catch (e: any) {
            toast.error(e?.message || "Error al eliminar.");
            setActioningId(null);
        } finally {
            setActioningId(null);
        }
    };

    const getDaysUntilBlock = (u: AdminUser): number | null => {
        if (u.role === "admin") return null;
        const status = (u.subscriptionStatus || "").toLowerCase();
        if (status === "bloqueado" || status === "expired") return null;
        const end = u.expiryDate ? new Date(u.expiryDate) : null;
        if (!end) return null;
        const now = new Date();
        const diffMs = end.getTime() - now.getTime();
        const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        if (days > 0) return days;
        const daysPast = Math.abs(days);
        const graceRemaining = Math.max(0, 5 - daysPast);
        return graceRemaining > 0 ? graceRemaining : null;
    };

    const displayName = (u: AdminUser) => {
        const name = (u.name || "").trim();
        if (!name || name.toUpperCase() === "CONTRIBUYENTE REGISTRADO") {
            return u.email ? `Sin nombre fiscal (${u.email})` : "Sin nombre fiscal";
        }
        return name;
    };

    const formatDate = (d: string | undefined) => {
        if (!d) return "—";
        try {
            return new Date(d).toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" });
        } catch {
            return "—";
        }
    };

    const getActivityLevel = (lastLoginAt: string | undefined): "active" | "medium" | "inactive" => {
        if (!lastLoginAt) return "inactive";
        const d = new Date(lastLoginAt);
        const now = new Date();
        const daysAgo = Math.floor((now.getTime() - d.getTime()) / (24 * 60 * 60 * 1000));
        if (daysAgo <= 7) return "active";
        if (daysAgo <= 30) return "medium";
        return "inactive";
    };

    const planLabel: Record<string, string> = {
        free: "Gratis",
        pro: "Pro",
        premium: "Premium"
    };
    const roleLabel: Record<string, string> = {
        user: "Usuario",
        admin: "Admin",
        partner: "Partner"
    };

    const handleCopyRNC = (rnc: string) => {
        if (!rnc) return;
        navigator.clipboard.writeText(rnc);
        toast.success("RNC copiado al portapapeles");
    };

    const handleExportCsv = () => {
        const headers = ["Nombre", "Email", "RNC", "Rol", "Plan", "Estado suscripción", "Días hasta bloqueo", "Onboarding", "Partner", "Fecha registro", "Último acceso"];
        const rows = list.map((u) => {
            return [
                displayName(u),
                u.email ?? "",
                u.rnc ?? "",
                roleLabel[u.role] ?? u.role,
                planLabel[u.plan] ?? u.plan,
                u.subscriptionStatus ?? "",
                getDaysUntilBlockLabel(u),
                u.onboardingCompleted ? "Sí" : "No",
                u.partner ? `${u.partner.referralCode} (${u.partner.status})` : "",
                formatDate(u.createdAt),
                formatDate(u.lastLoginAt)
            ];
        });
        const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
        const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `usuarios-trinalyze-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("CSV descargado");
    };

    const totalPages = Math.max(1, Math.ceil(total / limit));

    const getDaysUntilBlockLabel = (u: AdminUser): string => {
        if (u.blocked) return "Bloqueado";
        const status = (u.subscriptionStatus || "").toLowerCase();
        if (status === "bloqueado" || status === "expired") return "Vencido";
        
        const days = getDaysUntilBlock(u);
        if (days === null) return "—";
        if (days > 365) return "♾️ Vigente";
        if (days >= 300) return "♾️ Activa";
        
        return `${days} ${days === 1 ? "día" : "días"}`;
    };

    const [clientSortDays, setClientSortDays] = useState<boolean>(false);
    const displayList = clientSortDays
        ? [...list].sort((a, b) => {
            const da = getDaysUntilBlock(a);
            const db = getDaysUntilBlock(b);
            if (da === null && db === null) return 0;
            if (da === null) return 1;
            if (db === null) return -1;
            return da - db;
        })
        : list;

    const displayStats = globalStats ? {
        activos: globalStats.activeUsers ?? 0,
        trial: globalStats.trialUsers ?? 0,
        porVencer: globalStats.expiringSoon ?? 0,
        bloqueados: globalStats.blockedUsers ?? 0,
        partners: globalStats.partnerUsers ?? 0,
    } : {
        activos: list.filter((u) => !u.blocked && (u.subscriptionStatus === "Activo" || u.subscriptionStatus === "active")).length,
        trial: list.filter((u) => !u.blocked && (u.subscriptionStatus || "").toLowerCase() === "trial").length,
        porVencer: list.filter((u) => {
            const d = getDaysUntilBlock(u);
            return d !== null && d <= 7;
        }).length,
        bloqueados: list.filter((u) => u.blocked).length,
        partners: list.filter((u) => u.partner).length,
    };

    if (isLoading && list.length === 0) {
        return (
            <div className="space-y-8">
                <div>
                    <h1 className="text-2xl font-bold">Usuarios registrados</h1>
                    <p className="text-muted-foreground text-sm">Listado de personas registradas en Trinalyze Billing</p>
                </div>
                <Skeleton className="h-10 w-80 rounded-md" />
                <Skeleton className="h-64 rounded-lg" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <UserCircle className="w-7 h-7 text-indigo-600" />
                    Usuarios registrados
                </h1>
                <p className="text-muted-foreground text-sm mt-1">Gestión avanzada de la base de usuarios de la plataforma.</p>
            </div>

            {/* KPIs resumen */}
            {list.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                    <Card className="p-4 border border-emerald-100 dark:border-emerald-900/30 bg-gradient-to-br from-emerald-50/50 to-emerald-100/30 dark:from-emerald-900/10 dark:to-emerald-900/5 shadow-sm rounded-xl">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/50 rounded-md">
                                <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-500">Activos</span>
                        </div>
                        <p className="text-2xl font-black mt-2 text-emerald-900 dark:text-emerald-100 tracking-tight">{displayStats.activos}</p>
                    </Card>
                    <Card className="p-4 border border-amber-100 dark:border-amber-900/30 bg-gradient-to-br from-amber-50/50 to-amber-100/30 dark:from-amber-900/10 dark:to-amber-900/5 shadow-sm rounded-xl">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-amber-100 dark:bg-amber-900/50 rounded-md">
                                <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                            </div>
                            <span className="text-xs font-semibold text-amber-700 dark:text-amber-500">Prueba (Trial)</span>
                        </div>
                        <p className="text-2xl font-black mt-2 text-amber-900 dark:text-amber-100 tracking-tight">{displayStats.trial}</p>
                    </Card>
                    <Card className="p-4 border border-orange-100 dark:border-orange-900/30 bg-gradient-to-br from-orange-50/50 to-orange-100/30 dark:from-orange-900/10 dark:to-orange-900/5 shadow-sm rounded-xl">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-orange-100 dark:bg-orange-900/50 rounded-md">
                                <Clock className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                            </div>
                            <span className="text-xs font-semibold text-orange-700 dark:text-orange-500">Por vencer (7d)</span>
                        </div>
                        <p className="text-2xl font-black mt-2 text-orange-900 dark:text-orange-100 tracking-tight">{displayStats.porVencer}</p>
                    </Card>
                    <Card className="p-4 border border-red-100 dark:border-red-900/30 bg-gradient-to-br from-red-50/50 to-red-100/30 dark:from-red-900/10 dark:to-red-900/5 shadow-sm rounded-xl">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-red-100 dark:bg-red-900/50 rounded-md">
                                <Ban className="w-4 h-4 text-red-600 dark:text-red-400" />
                            </div>
                            <span className="text-xs font-semibold text-red-700 dark:text-red-500">Bloqueados</span>
                        </div>
                        <p className="text-2xl font-black mt-2 text-red-900 dark:text-red-100 tracking-tight">{displayStats.bloqueados}</p>
                    </Card>
                    <Card className="p-4 border border-indigo-100 dark:border-indigo-900/30 bg-gradient-to-br from-indigo-50/50 to-indigo-100/30 dark:from-indigo-900/10 dark:to-indigo-900/5 shadow-sm rounded-xl">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/50 rounded-md">
                                <Handshake className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-500">Partners</span>
                        </div>
                        <p className="text-2xl font-black mt-2 text-indigo-900 dark:text-indigo-100 tracking-tight">{displayStats.partners}</p>
                    </Card>
                </div>
            )}

            <Card className="rounded-xl border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <form onSubmit={handleSearch} className="flex gap-2 flex-1 w-full sm:max-w-md">
                            <div className="relative w-full">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar usuario por nombre, email o RNC..."
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    className="pl-9 h-10 w-full rounded-lg bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                                />
                            </div>
                            <Button type="submit" variant="default" className="h-10 rounded-lg shadow-sm" aria-label="Buscar">
                                Buscar
                            </Button>
                        </form>
                        <Button variant="outline" size="sm" className="gap-2 shrink-0 h-10 rounded-lg" onClick={handleExportCsv} disabled={list.length === 0}>
                            <Download className="w-4 h-4" />
                            Exportar CSV
                        </Button>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 mt-4">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-md text-xs font-medium text-slate-500 dark:text-slate-400">
                            <Filter className="w-3.5 h-3.5" />
                            Filtros:
                        </div>
                        <Select value={roleFilter || "all"} onValueChange={(v) => { setRoleFilter(v); setPage(1); }}>
                            <SelectTrigger className="w-[140px] h-9 text-xs rounded-lg">
                                <SelectValue placeholder="Rol" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos los roles</SelectItem>
                                <SelectItem value="user">Usuario</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="partner">Partner</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={planFilter || "all"} onValueChange={(v) => { setPlanFilter(v); setPage(1); }}>
                            <SelectTrigger className="w-[140px] h-9 text-xs rounded-lg">
                                <SelectValue placeholder="Plan" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos los planes</SelectItem>
                                <SelectItem value="free">Gratis</SelectItem>
                                <SelectItem value="pro">Pro</SelectItem>
                                <SelectItem value="premium">Premium</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={statusFilter || "all"} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                            <SelectTrigger className="w-[130px] h-9 text-xs rounded-lg">
                                <SelectValue placeholder="Estado" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Estado: Todos</SelectItem>
                                <SelectItem value="active">Activo</SelectItem>
                                <SelectItem value="trial">Trial</SelectItem>
                                <SelectItem value="expired">Expirado</SelectItem>
                            </SelectContent>
                        </Select>
                        
                        <div className="ml-auto flex items-center gap-2">
                            <Select value={clientSortDays ? "daysUntilBlock_asc" : `${sortBy}_${sortOrder}`} onValueChange={(v) => {
                                if (v === "daysUntilBlock_asc") {
                                    setClientSortDays(true);
                                } else {
                                    setClientSortDays(false);
                                    const [s, o] = v.split("_");
                                    setSortBy(s);
                                    setSortOrder(o || "desc");
                                }
                                setPage(1);
                            }}>
                                <SelectTrigger className="w-[200px] h-9 text-xs rounded-lg bg-white dark:bg-slate-950">
                                    <SelectValue placeholder="Ordenar por" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="lastLoginAt_desc">
                                        <span className="flex items-center gap-2">
                                            <ArrowDown className="w-3.5 h-3.5" /> Último acceso (reciente)
                                        </span>
                                    </SelectItem>
                                    <SelectItem value="lastLoginAt_asc">
                                        <span className="flex items-center gap-2">
                                            <ArrowUp className="w-3.5 h-3.5" /> Último acceso (antiguo)
                                        </span>
                                    </SelectItem>
                                    <SelectItem value="createdAt_desc">
                                        <span className="flex items-center gap-2">
                                            <ArrowDown className="w-3.5 h-3.5" /> Registro (reciente)
                                        </span>
                                    </SelectItem>
                                    <SelectItem value="createdAt_asc">
                                        <span className="flex items-center gap-2">
                                            <ArrowUp className="w-3.5 h-3.5" /> Registro (antiguo)
                                        </span>
                                    </SelectItem>
                                    <SelectItem value="daysUntilBlock_asc">
                                        <span className="flex items-center gap-2">
                                            <Clock className="w-3.5 h-3.5" /> Días bloqueo (vencer 1º)
                                        </span>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/20">
                        <p className="text-xs text-muted-foreground font-medium">
                            {total} usuario{total !== 1 ? "s" : ""} en total
                            {(search || (roleFilter && roleFilter !== "all") || (planFilter && planFilter !== "all") || (statusFilter && statusFilter !== "all") || (activityFilter && activityFilter !== "all")) ? " (filtrados)" : ""}
                        </p>
                    </div>

                    {list.length === 0 ? (
                        <div className="py-20 text-center flex flex-col items-center">
                            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                                <Users className="w-8 h-8 text-slate-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">No hay resultados</h3>
                            <p className="text-sm text-slate-500 max-w-sm mt-1">
                                {(search || (roleFilter && roleFilter !== "all") || (planFilter && planFilter !== "all") || (statusFilter && statusFilter !== "all") || (activityFilter && activityFilter !== "all")) ? "Intenta cambiar o limpiar los filtros aplicados para ver más usuarios." : "Aún no hay usuarios registrados en el sistema."}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="w-[300px] font-semibold">Usuario</TableHead>
                                        <TableHead className="font-semibold">Suscripción</TableHead>
                                        <TableHead className="font-semibold">Vencimiento</TableHead>
                                        <TableHead className="font-semibold">Actividad</TableHead>
                                        <TableHead className="font-semibold">Partner</TableHead>
                                        <TableHead className="text-right font-semibold">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {displayList.map((u) => {
                                        const userId = getUserId(u);
                                        return (
                                        <TableRow
                                            key={userId}
                                            className="cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors group"
                                            onClick={() => handleOpenDetail(u)}
                                        >
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <SimpleAvatar name={displayName(u)} />
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate max-w-[200px]">
                                                            {displayName(u)}
                                                            {u.role === "admin" && <span className="ml-2 text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Admin</span>}
                                                        </span>
                                                        <span className="text-xs text-slate-500 truncate max-w-[200px]">{u.email || "Sin email"}</span>
                                                        <div className="flex items-center gap-1 mt-1">
                                                            <span className="text-[10px] font-mono text-slate-400">{u.rnc || "Sin RNC"}</span>
                                                            {u.rnc && (
                                                                <button 
                                                                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-600 transition-opacity p-0.5"
                                                                    onClick={(e) => { e.stopPropagation(); handleCopyRNC(u.rnc!); }}
                                                                >
                                                                    <Copy className="w-3 h-3" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1.5 items-start">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className={cn(
                                                            "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider",
                                                            u.plan === "premium" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400" :
                                                            u.plan === "pro" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400" :
                                                            "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                                        )}>
                                                            {planLabel[u.plan] ?? u.plan}
                                                        </span>
                                                        <span className={cn(
                                                            "text-[10px] px-2 py-0.5 rounded-full font-bold tracking-wider",
                                                            u.blocked ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 border border-red-200 dark:border-red-800" :
                                                            (u.subscriptionStatus === "active" || u.subscriptionStatus === "Activo") ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800" :
                                                            (u.subscriptionStatus || "").toLowerCase() === "trial" ? "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border border-amber-200 dark:border-amber-800" :
                                                            "bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                                                        )}>
                                                            {u.blocked ? "Bloqueado" : u.subscriptionStatus === "active" || u.subscriptionStatus === "Activo" ? "Activo" : u.subscriptionStatus || "—"}
                                                        </span>
                                                    </div>
                                                    <span className={cn(
                                                        "text-[10px] font-medium flex items-center gap-1",
                                                        u.onboardingCompleted ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                                                    )}>
                                                        <div className={cn("w-1.5 h-1.5 rounded-full", u.onboardingCompleted ? "bg-emerald-500" : "bg-amber-500")} />
                                                        {u.onboardingCompleted ? "Onboarding ok" : "Onboarding pend."}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {(() => {
                                                    const days = getDaysUntilBlock(u);
                                                    const label = getDaysUntilBlockLabel(u);
                                                    if (label === "Bloqueado") return <span className="text-red-600 dark:text-red-400 font-medium text-xs">Bloqueado</span>;
                                                    if (label === "Vencido") return <span className="text-slate-400 text-xs line-through">Vencido</span>;
                                                    if (label === "—") return <span className="text-slate-400 text-xs">—</span>;
                                                    
                                                    const isWarning = days !== null && days <= 7;
                                                    return (
                                                        <div className="flex items-center gap-2">
                                                            <div className={cn(
                                                                "w-1.5 h-8 rounded-full",
                                                                isWarning ? "bg-orange-500" : "bg-emerald-500",
                                                                days && days > 300 && "bg-indigo-500"
                                                            )} />
                                                            <span className={cn("text-xs font-medium", isWarning ? "text-orange-600 dark:text-orange-400" : "text-slate-600 dark:text-slate-300")}>
                                                                {label}
                                                            </span>
                                                        </div>
                                                    );
                                                })()}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-xs text-slate-500 w-12 shrink-0">Acceso:</span>
                                                        {u.lastLoginAt ? (
                                                            (() => {
                                                                const level = getActivityLevel(u.lastLoginAt);
                                                                return (
                                                                    <span className={cn(
                                                                        "text-[10px] px-1.5 py-0.5 rounded font-medium",
                                                                        level === "active" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
                                                                        level === "medium" && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                                                                        level === "inactive" && "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                                                                    )}>
                                                                        {formatDate(u.lastLoginAt)}
                                                                    </span>
                                                                );
                                                            })()
                                                        ) : (
                                                            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-slate-100 text-slate-400 dark:bg-slate-800">Nunca</span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-xs text-slate-400 w-12 shrink-0">Registro:</span>
                                                        <span className="text-xs text-slate-600 dark:text-slate-400">{formatDate(u.createdAt)}</span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {u.partner ? (
                                                    <div className="flex flex-col gap-1">
                                                        <Link href="/admin/partners" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline" onClick={(e) => e.stopPropagation()}>
                                                            {u.partner.referralCode}
                                                        </Link>
                                                        <span className={cn(
                                                            "text-[9px] px-1.5 py-0.5 rounded-sm uppercase tracking-wider font-bold w-fit",
                                                            (u.partner.status || "").toLowerCase() === "active" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
                                                            (u.partner.status || "").toLowerCase() === "pending" && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                                                            (u.partner.status || "").toLowerCase() === "rejected" && "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
                                                            (u.partner.status || "").toLowerCase() === "suspended" && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                                        )}>
                                                            {(u.partner.status || "—") === "active" ? "Activo" : (u.partner.status || "—") === "pending" ? "Pendiente" : (u.partner.status || "—") === "rejected" ? "Rechazado" : (u.partner.status || "—") === "suspended" ? "Suspendido" : u.partner.status || "—"}
                                                        </span>
                                                    </div>
                                                ) : <span className="text-slate-300 dark:text-slate-600 text-sm">—</span>}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div onClick={(e) => e.stopPropagation()}>
                                                    {actioningId === userId ? (
                                                        <div className="flex justify-end p-2"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
                                                    ) : u.role === "admin" ? (
                                                        <span className="text-slate-300 text-xs mr-4">—</span>
                                                    ) : (
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100">
                                                                    <MoreHorizontal className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="w-[160px]">
                                                                <DropdownMenuItem onClick={() => handleOpenDetail(u)} className="gap-2 cursor-pointer">
                                                                    <Eye className="w-4 h-4" /> Ver Detalles
                                                                </DropdownMenuItem>
                                                                
                                                                {!u.blocked && !isUserActive(u) && (
                                                                    <DropdownMenuItem onClick={() => handleActivate(userId)} className="gap-2 cursor-pointer text-emerald-600 dark:text-emerald-400">
                                                                        <Check className="w-4 h-4" /> Activar plan
                                                                    </DropdownMenuItem>
                                                                )}
                                                                
                                                                {u.blocked ? (
                                                                    <DropdownMenuItem onClick={() => handleUnblock(userId)} className="gap-2 cursor-pointer text-emerald-600 dark:text-emerald-400">
                                                                        <Unlock className="w-4 h-4" /> Desbloquear
                                                                    </DropdownMenuItem>
                                                                ) : (
                                                                    <DropdownMenuItem onClick={() => handleBlock(userId)} className="gap-2 cursor-pointer text-amber-600 dark:text-amber-400">
                                                                        <Lock className="w-4 h-4" /> Bloquear acceso
                                                                    </DropdownMenuItem>
                                                                )}
                                                                
                                                                <DropdownMenuSeparator />
                                                                
                                                                <DropdownMenuItem 
                                                                    onClick={() => setDeleteConfirm({ id: userId, name: displayName(u) })} 
                                                                    className="gap-2 cursor-pointer text-red-600 dark:text-red-400 focus:bg-red-50 focus:text-red-700 dark:focus:bg-red-900/20"
                                                                >
                                                                    <Trash2 className="w-4 h-4" /> Eliminar usuario
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                    
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                            <p className="text-sm text-slate-500">
                                Página <span className="font-medium text-slate-900 dark:text-slate-100">{page}</span> de {totalPages}
                            </p>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="h-8">
                                    Anterior
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="h-8">
                                    Siguiente
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <Trash2 className="w-5 h-5" /> Eliminar usuario
                        </DialogTitle>
                        <DialogDescription className="pt-2">
                            ¿Estás seguro de que deseas eliminar a <strong>{deleteConfirm?.name || "este usuario"}</strong>? Esta acción no se puede deshacer y se eliminarán todos sus datos (facturas, cotizaciones, clientes, etc.).
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0 mt-4">
                        <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
                        <Button variant="destructive" onClick={handleDelete} className="gap-2">
                            <Trash2 className="w-4 h-4" /> Sí, eliminar permanentemente
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Sheet open={!!detailUser} onOpenChange={(open) => !open && (setDetailUser(null), setDetailData(null))}>
                <SheetContent className="w-full sm:max-w-lg overflow-y-auto border-l border-slate-200 dark:border-slate-800">
                    <SheetHeader>
                        <SheetTitle className="flex items-center gap-2 text-xl">
                            <SimpleAvatar name={detailUser ? displayName(detailUser) : "?"} className="w-8 h-8 text-xs" />
                            Detalle de usuario
                        </SheetTitle>
                    </SheetHeader>
                    {detailData ? (
                        <div className="mt-8 space-y-8">
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                                <div className="grid grid-cols-1 gap-4">
                                    <div>
                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Nombre y RNC</p>
                                        <p className="font-medium text-slate-900 dark:text-slate-100">{displayName(detailData)}</p>
                                        <p className="font-mono text-sm text-slate-500 mt-0.5">{detailData.rnc || "Sin RNC"}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Email</p>
                                        <p className="text-sm text-slate-700 dark:text-slate-300">{detailData.email || "—"}</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Plan</p>
                                    <p className="font-medium text-slate-900 dark:text-slate-100">{planLabel[detailData.plan] ?? detailData.plan}</p>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Estado</p>
                                    <p className={cn("font-medium", detailData.blocked ? "text-red-600" : "text-emerald-600 dark:text-emerald-400")}>
                                        {detailData.blocked ? "Bloqueado" : detailData.subscriptionStatus || "—"}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Registro</p>
                                    <p className="text-sm font-medium">{formatDate(detailData.createdAt)}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Último acceso</p>
                                    <p className="text-sm font-medium">{detailData.lastLoginAt ? formatDate(detailData.lastLoginAt) : "Nunca"}</p>
                                </div>
                            </div>
                            
                            {detailData.partner && (
                                <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
                                    <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">Afiliado por Partner</p>
                                    <p className="font-medium text-indigo-700 dark:text-indigo-400">{detailData.partner.referralCode} <span className="text-xs text-indigo-500">({detailData.partner.status})</span></p>
                                    <Button asChild variant="outline" size="sm" className="mt-3 gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:text-indigo-400 dark:hover:bg-indigo-900/50">
                                        <Link href="/admin/partners">
                                            <Handshake className="w-4 h-4" /> Ver en Partners
                                        </Link>
                                    </Button>
                                </div>
                            )}
                            
                            <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Resumen Comercial</p>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div className="p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-center">
                                        <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{detailData.totalFacturas ?? 0}</p>
                                        <p className="text-xs text-slate-500 uppercase">Facturas</p>
                                    </div>
                                    <div className="p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-center">
                                        <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1">{new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP", maximumFractionDigits: 0 }).format(detailData.totalFacturado ?? 0)}</p>
                                        <p className="text-xs text-slate-500 uppercase mt-0.5">Total Emitido</p>
                                    </div>
                                </div>
                            </div>
                            
                            {detailData.invoices && detailData.invoices.length > 0 && (
                                <div>
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Últimas facturas</p>
                                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                        {detailData.invoices.map((inv: any) => (
                                            <div key={inv.id} className="flex justify-between items-center bg-white dark:bg-slate-950 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate max-w-[200px]">{inv.clientName}</span>
                                                    <span className="text-[10px] text-slate-400">{formatDate(inv.date)}</span>
                                                </div>
                                                <span className="font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">{new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP", maximumFractionDigits: 0 }).format(inv.total)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Notas Administrativas (Privadas)</p>
                                <Textarea
                                    value={notesEdit}
                                    onChange={(e) => setNotesEdit(e.target.value)}
                                    placeholder="Agrega notas o recordatorios internos sobre este usuario..."
                                    className="min-h-[100px] bg-amber-50/30 border-amber-200 focus-visible:ring-amber-500 dark:bg-amber-950/10 dark:border-amber-900/30 text-sm resize-none rounded-xl"
                                    maxLength={2000}
                                />
                                <Button size="sm" className="mt-3 w-full" onClick={handleSaveNotes} disabled={actioningId === getUserId(detailUser)}>
                                    {actioningId === getUserId(detailUser) ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                    Guardar notas internas
                                </Button>
                            </div>
                            
                            {detailUser && detailUser.role !== "admin" && (
                                <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex gap-3">
                                    {detailData.blocked ? (
                                        <Button variant="outline" className="flex-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-900/50 dark:hover:bg-emerald-900/20" onClick={() => handleUnblock(getUserId(detailUser))} disabled={!!actioningId}>
                                            <Unlock className="w-4 h-4 mr-2" /> Desbloquear
                                        </Button>
                                    ) : (
                                        <Button variant="outline" className="flex-1 text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-900/20" onClick={() => handleBlock(getUserId(detailUser))} disabled={!!actioningId}>
                                            <Lock className="w-4 h-4 mr-2" /> Bloquear acceso
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="mt-12 flex flex-col items-center justify-center gap-3">
                            <Loader2 className="w-8 h-8 animate-spin text-slate-300 dark:text-slate-700" />
                            <p className="text-sm text-slate-500">Cargando perfil completo...</p>
                        </div>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
}
