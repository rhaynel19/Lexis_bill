"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserCircle, Search, Download, Filter, Check, Ban, Loader2 } from "lucide-react";
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
import type { AdminUser } from "@/lib/api-service";

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
    const [isLoading, setIsLoading] = useState(true);
    const [actioningId, setActioningId] = useState<string | null>(null);

    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
        try {
            const { api } = await import("@/lib/api-service");
            const res = await api.getAdminUsers({
                q: search || undefined,
                role: roleFilter === "all" ? undefined : roleFilter,
                plan: planFilter === "all" ? undefined : planFilter,
                status: statusFilter === "all" ? undefined : statusFilter,
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
    }, [search, roleFilter, planFilter, statusFilter, page, limit]);

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

    const handleDeactivate = async (id: string) => {
        setActioningId(id);
        try {
            const { api } = await import("@/lib/api-service");
            const res = await api.deactivateUser(id);
            toast.success(res?.message || "Membresía bloqueada.");
            fetchUsers();
        } catch (e: any) {
            toast.error(e?.message || "Error al bloquear.");
        } finally {
            setActioningId(null);
        }
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
        const headers = ["Nombre", "Email", "RNC", "Rol", "Plan", "Estado suscripción", "Onboarding", "Partner", "Fecha registro"];
        const rows = list.map((u) => [
            u.name ?? "",
            u.email ?? "",
            u.rnc ?? "",
            roleLabel[u.role] ?? u.role,
            planLabel[u.plan] ?? u.plan,
            u.subscriptionStatus ?? "",
            u.onboardingCompleted ? "Sí" : "No",
            u.partner ? `${u.partner.referralCode} (${u.partner.status})` : "",
            formatDate(u.createdAt)
        ]);
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
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                        {total} usuario{total !== 1 ? "s" : ""} en total
                        {(search || (roleFilter && roleFilter !== "all") || (planFilter && planFilter !== "all") || (statusFilter && statusFilter !== "all")) ? " (filtros aplicados)" : ""}
                    </p>

                    {list.length === 0 ? (
                        <div className="py-12 text-center text-muted-foreground">
                            {(search || (roleFilter && roleFilter !== "all") || (planFilter && planFilter !== "all") || (statusFilter && statusFilter !== "all")) ? "No hay usuarios con los filtros aplicados." : "No hay usuarios registrados."}
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
                                            <TableHead>Onboarding</TableHead>
                                            <TableHead>Partner</TableHead>
                                            <TableHead>Registro</TableHead>
                                            <TableHead className="text-right">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {list.map((u) => (
                                            <TableRow key={u.id}>
                                                <TableCell className="font-medium">{u.name || "—"}</TableCell>
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
                                                    <span className={u.subscriptionStatus === "active" || u.subscriptionStatus === "Activo" ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}>
                                                        {u.subscriptionStatus === "active" || u.subscriptionStatus === "Activo" ? "Activo" : u.subscriptionStatus || "—"}
                                                    </span>
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
                                                <TableCell className="text-right">
                                                    {u.role === "admin" ? (
                                                        <span className="text-muted-foreground text-xs">—</span>
                                                    ) : actioningId === u.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin inline-block text-muted-foreground" />
                                                    ) : isUserActive(u) ? (
                                                        <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => handleDeactivate(u.id)}>
                                                            <Ban className="w-3.5 h-3.5 mr-1" /> Bloquear
                                                        </Button>
                                                    ) : (
                                                        <Button variant="outline" size="sm" className="text-green-600 hover:bg-green-500/10 border-green-500/50" onClick={() => handleActivate(u.id)}>
                                                            <Check className="w-3.5 h-3.5 mr-1" /> Activar
                                                        </Button>
                                                    )}
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
        </div>
    );
}
