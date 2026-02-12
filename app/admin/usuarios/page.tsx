"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserCircle, Search, Download, Filter, Check, Loader2, Trash2, ArrowUp, ArrowDown, Eye, Lock, Unlock } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import type { AdminUser } from "@/lib/api-service";
import { cn } from "@/lib/utils";

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
    }, [fetchUsers]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setSearch(searchInput.trim());
        setPage(1);
    };

    const isUserActive = (u: AdminUser) =>
        u.subscriptionStatus === "Activo" || u.subscriptionStatus === "active";

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
            if (detailUser?.id === id) setDetailData((d: any) => d ? { ...d, blocked: false } : null);
        } catch (e: any) {
            toast.error(e?.message || "Error al desbloquear.");
        } finally {
            setActioningId(null);
        }
    };

    const handleOpenDetail = async (u: AdminUser) => {
        setDetailUser(u);
        setNotesEdit(u.adminNotes || "");
        try {
            const { api } = await import("@/lib/api-service");
            const data = await api.getAdminUserDetail(u.id);
            setDetailData(data);
        } catch {
            toast.error("Error al cargar detalle");
            setDetailData(null);
        }
    };

    const handleSaveNotes = async () => {
        if (!detailUser) return;
        setActioningId(detailUser.id);
        try {
            const { api } = await import("@/lib/api-service");
            await api.updateUserNotes(detailUser.id, notesEdit);
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

    /** Días restantes hasta bloqueo. Activo/Trial: días hasta expiryDate. Gracia: días de gracia restantes. */
    const getDaysUntilBlock = (u: AdminUser): number | null => {
        if (u.role === "admin") return null;
        const status = (u.subscriptionStatus || "").toLowerCase();
        if (status === "bloqueado" || status === "expired") return null;
        const end = u.expiryDate ? new Date(u.expiryDate) : null;
        if (!end) return null;
        const now = new Date();
        const diffMs = end.getTime() - now.getTime();
        const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        if (days > 0) return days; // Activo/Trial: días hasta vencimiento
        // Gracia: 5 días después del vencimiento
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

    /** Nivel de actividad: active (< 7 días), medium (7-30), inactive (> 30 o nunca) */
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

    const handleExportCsv = () => {
        const headers = ["Nombre", "Email", "RNC", "Rol", "Plan", "Estado suscripción", "Días hasta bloqueo", "Onboarding", "Partner", "Fecha registro", "Último acceso"];
        const rows = list.map((u) => {
            const days = getDaysUntilBlock(u);
            return [
                displayName(u),
                u.email ?? "",
                u.rnc ?? "",
                roleLabel[u.role] ?? u.role,
                planLabel[u.plan] ?? u.plan,
                u.subscriptionStatus ?? "",
                days !== null ? `${days} días` : "—",
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
        a.download = `usuarios-lexisbill-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("CSV descargado");
    };

    const totalPages = Math.max(1, Math.ceil(total / limit));

    if (isLoading && list.length === 0) {
        return (
            <div className="space-y-8">
                <div>
                    <h1 className="text-2xl font-bold">Usuarios registrados</h1>
                    <p className="text-muted-foreground text-sm">Listado de personas registradas en Lexis Bill</p>
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
                    <UserCircle className="w-7 h-7 text-amber-500" />
                    Usuarios registrados
                </h1>
                <p className="text-muted-foreground text-sm mt-1">Listado de personas registradas en Lexis Bill. Busca por nombre, email o RNC.</p>
            </div>

            <Card>
                <CardHeader className="flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <form onSubmit={handleSearch} className="flex gap-2 flex-1 w-full sm:max-w-sm">
                            <Input
                                placeholder="Buscar por nombre, email o RNC..."
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                className="flex-1"
                            />
                            <Button type="submit" variant="secondary" size="icon" aria-label="Buscar">
                                <Search className="w-4 h-4" />
                            </Button>
                        </form>
                        <Button variant="outline" size="sm" className="gap-2 shrink-0" onClick={handleExportCsv} disabled={list.length === 0}>
                            <Download className="w-4 h-4" />
                            Exportar CSV
                        </Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
                        <Select value={roleFilter || "all"} onValueChange={(v) => { setRoleFilter(v); setPage(1); }}>
                            <SelectTrigger className="w-[130px]">
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
                            <SelectTrigger className="w-[130px]">
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
                            <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Estado" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                <SelectItem value="active">Activo</SelectItem>
                                <SelectItem value="trial">Trial</SelectItem>
                                <SelectItem value="expired">Expirado</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={activityFilter || "all"} onValueChange={(v) => { setActivityFilter(v); setPage(1); }}>
                            <SelectTrigger className="w-[160px]">
                                <SelectValue placeholder="Último acceso" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                <SelectItem value="active_7">Activos (7 días)</SelectItem>
                                <SelectItem value="active_30">Activos (30 días)</SelectItem>
                                <SelectItem value="inactive_30">Inactivos (30+ días)</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={`${sortBy}_${sortOrder}`} onValueChange={(v) => {
                            const [s, o] = v.split("_");
                            setSortBy(s);
                            setSortOrder(o || "desc");
                            setPage(1);
                        }}>
                            <SelectTrigger className="w-[180px]">
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
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                        {total} usuario{total !== 1 ? "s" : ""} en total
                        {(search || (roleFilter && roleFilter !== "all") || (planFilter && planFilter !== "all") || (statusFilter && statusFilter !== "all") || (activityFilter && activityFilter !== "all")) ? " (filtros aplicados)" : ""}
                    </p>

                    {list.length === 0 ? (
                        <div className="py-12 text-center text-muted-foreground">
                            {(search || (roleFilter && roleFilter !== "all") || (planFilter && planFilter !== "all") || (statusFilter && statusFilter !== "all") || (activityFilter && activityFilter !== "all")) ? "No hay usuarios con los filtros aplicados." : "No hay usuarios registrados."}
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nombre</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>RNC</TableHead>
                                            <TableHead>Rol</TableHead>
                                            <TableHead>Plan</TableHead>
                                            <TableHead>Estado</TableHead>
                                            <TableHead>Días hasta bloqueo</TableHead>
                                            <TableHead>Onboarding</TableHead>
                                            <TableHead>Partner</TableHead>
                                            <TableHead>Registro</TableHead>
                                            <TableHead>Último acceso</TableHead>
                                            <TableHead className="text-right">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {list.map((u) => (
                                            <TableRow
                                                key={u.id}
                                                className="cursor-pointer hover:bg-muted/50"
                                                onClick={() => handleOpenDetail(u)}
                                            >
                                                <TableCell className="font-medium">{displayName(u)}</TableCell>
                                                <TableCell className="text-muted-foreground">{u.email || "—"}</TableCell>
                                                <TableCell className="font-mono text-xs">{u.rnc || "—"}</TableCell>
                                                <TableCell>
                                                    <span className={`text-xs px-2 py-1 rounded-full ${
                                                        u.role === "admin" ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400" :
                                                        u.role === "partner" ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400" :
                                                        "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                                    }`}>
                                                        {roleLabel[u.role] ?? u.role}
                                                    </span>
                                                </TableCell>
                                                <TableCell>{planLabel[u.plan] ?? u.plan}</TableCell>
                                                <TableCell className="text-xs">
                                                    <span className={u.blocked ? "text-red-600 dark:text-red-400 font-medium" : u.subscriptionStatus === "active" || u.subscriptionStatus === "Activo" ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}>
                                                        {u.blocked ? "Bloqueado" : u.subscriptionStatus === "active" || u.subscriptionStatus === "Activo" ? "Activo" : u.subscriptionStatus || "—"}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    {(() => {
                                                        const days = getDaysUntilBlock(u);
                                                        if (days === null) return "—";
                                                        return (
                                                            <span className={days <= 7 ? "text-amber-600 dark:text-amber-400 font-medium" : "text-muted-foreground"}>
                                                                {days} {days === 1 ? "día" : "días"}
                                                            </span>
                                                        );
                                                    })()}
                                                </TableCell>
                                                <TableCell>{u.onboardingCompleted ? "Sí" : "No"}</TableCell>
                                                <TableCell>
                                                    {u.partner ? (
                                                        <span className="text-xs text-amber-600 dark:text-amber-400" title={u.partner.status}>
                                                            {u.partner.referralCode}
                                                        </span>
                                                    ) : "—"}
                                                </TableCell>
                                                <TableCell className="text-muted-foreground text-xs whitespace-nowrap">{formatDate(u.createdAt)}</TableCell>
                                                <TableCell className="text-xs whitespace-nowrap">
                                                    {u.lastLoginAt ? (
                                                        (() => {
                                                            const level = getActivityLevel(u.lastLoginAt);
                                                            return (
                                                                <span
                                                                    className={cn(
                                                                        "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium",
                                                                        level === "active" && "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400",
                                                                        level === "medium" && "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400",
                                                                        level === "inactive" && "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                                                    )}
                                                                    title={level === "active" ? "Activo en los últimos 7 días" : level === "medium" ? "Activo hace 7–30 días" : "Inactivo más de 30 días"}
                                                                >
                                                                    {formatDate(u.lastLoginAt)}
                                                                </span>
                                                            );
                                                        })()
                                                    ) : (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400" title="Sin registro de acceso">
                                                            Nunca
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                                        {u.role === "admin" ? (
                                                            <span className="text-muted-foreground text-xs">—</span>
                                                        ) : actioningId === u.id ? (
                                                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                                        ) : (
                                                            <>
                                                                {u.blocked ? (
                                                                    <Button variant="outline" size="sm" className="text-green-600 hover:bg-green-500/10 border-green-500/50" onClick={() => handleUnblock(u.id)}>
                                                                        <Unlock className="w-3.5 h-3.5 mr-1" /> Desbloquear
                                                                    </Button>
                                                                ) : (
                                                                    <Button variant="outline" size="sm" className="text-amber-600 hover:bg-amber-500/10 border-amber-500/50" onClick={() => handleBlock(u.id)} title="Bloquear acceso (no podrá iniciar sesión)">
                                                                        <Lock className="w-3.5 h-3.5 mr-1" /> Bloquear acceso
                                                                    </Button>
                                                                )}
                                                                {!u.blocked && !isUserActive(u) && (
                                                                    <Button variant="outline" size="sm" className="text-green-600 hover:bg-green-500/10 border-green-500/50" onClick={() => handleActivate(u.id)}>
                                                                        <Check className="w-3.5 h-3.5 mr-1" /> Activar
                                                                    </Button>
                                                                )}
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="text-destructive hover:bg-destructive/10 border-destructive/30"
                                                                    onClick={() => setDeleteConfirm({ id: u.id, name: displayName(u) })}
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </Button>
                                                            </>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            {totalPages > 1 && (
                                <div className="flex items-center justify-between mt-4">
                                    <p className="text-sm text-muted-foreground">
                                        Página {page} de {totalPages}
                                    </p>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                                            Anterior
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                                            Siguiente
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>

            <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <Trash2 className="w-5 h-5" /> Eliminar usuario
                        </DialogTitle>
                        <DialogDescription>
                            ¿Estás seguro de que deseas eliminar a <strong>{deleteConfirm?.name || "este usuario"}</strong>? Esta acción no se puede deshacer y se eliminarán todos sus datos (facturas, cotizaciones, clientes, etc.).
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
                        <Button variant="destructive" onClick={handleDelete} className="gap-2">
                            <Trash2 className="w-4 h-4" /> Sí, eliminar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Sheet open={!!detailUser} onOpenChange={(open) => !open && (setDetailUser(null), setDetailData(null))}>
                <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle className="flex items-center gap-2">
                            <Eye className="w-5 h-5" /> Detalle de usuario
                        </SheetTitle>
                    </SheetHeader>
                    {detailData && (
                        <div className="mt-6 space-y-6">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Nombre</p>
                                <p className="font-medium">{displayName(detailData)}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Email</p>
                                <p>{detailData.email || "—"}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">RNC</p>
                                <p className="font-mono text-sm">{detailData.rnc || "—"}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Plan</p>
                                    <p>{planLabel[detailData.plan] ?? detailData.plan}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Estado</p>
                                    <p className={detailData.blocked ? "text-red-600 font-medium" : ""}>
                                        {detailData.blocked ? "Bloqueado" : detailData.subscriptionStatus || "—"}
                                    </p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Registro</p>
                                    <p className="text-sm">{formatDate(detailData.createdAt)}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Último acceso</p>
                                    <p className="text-sm">{detailData.lastLoginAt ? formatDate(detailData.lastLoginAt) : "Nunca"}</p>
                                </div>
                            </div>
                            {detailData.partner && (
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Partner</p>
                                    <p className="text-amber-600 dark:text-amber-400">{detailData.partner.referralCode} ({detailData.partner.status})</p>
                                </div>
                            )}
                            <div>
                                <p className="text-sm font-medium text-muted-foreground mb-1">Resumen</p>
                                <p className="text-sm">
                                    {detailData.totalFacturas ?? 0} facturas · {new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP", maximumFractionDigits: 0 }).format(detailData.totalFacturado ?? 0)} facturado
                                </p>
                            </div>
                            {detailData.invoices && detailData.invoices.length > 0 && (
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground mb-2">Últimas facturas</p>
                                    <div className="space-y-1 max-h-40 overflow-y-auto">
                                        {detailData.invoices.map((inv: any) => (
                                            <div key={inv.id} className="flex justify-between text-sm py-1 border-b border-border/50">
                                                <span className="truncate">{inv.clientName}</span>
                                                <span className="font-mono">{new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP", maximumFractionDigits: 0 }).format(inv.total)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div>
                                <p className="text-sm font-medium text-muted-foreground mb-2">Notas internas</p>
                                <Textarea
                                    value={notesEdit}
                                    onChange={(e) => setNotesEdit(e.target.value)}
                                    placeholder="Notas visibles solo para admins..."
                                    className="min-h-[80px]"
                                    maxLength={2000}
                                />
                                <Button size="sm" className="mt-2" onClick={handleSaveNotes} disabled={actioningId === detailUser?.id}>
                                    {actioningId === detailUser?.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar notas"}
                                </Button>
                            </div>
                            {detailUser && detailUser.role !== "admin" && (
                                <div className="pt-4 border-t flex gap-2">
                                    {detailData.blocked ? (
                                        <Button variant="outline" className="text-green-600" onClick={() => handleUnblock(detailUser.id)} disabled={!!actioningId}>
                                            <Unlock className="w-4 h-4 mr-2" /> Desbloquear cuenta
                                        </Button>
                                    ) : (
                                        <Button variant="outline" className="text-amber-600" onClick={() => handleBlock(detailUser.id)} disabled={!!actioningId}>
                                            <Lock className="w-4 h-4 mr-2" /> Bloquear cuenta
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                    {detailUser && !detailData && (
                        <div className="mt-6 flex justify-center">
                            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                        </div>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
}
