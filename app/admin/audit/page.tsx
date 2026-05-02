"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ScrollText, Loader2, Download, Filter } from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const SimpleAvatar = ({ name }: { name: string }) => {
    return (
        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-[10px] text-slate-600 dark:text-slate-300 shadow-sm shrink-0 uppercase">
            {name?.substring(0, 2) || "??"}
        </div>
    );
};

const ACTION_LABELS: Record<string, string> = {
    user_block: "Bloquear cuenta",
    user_unblock: "Desbloquear cuenta",
    user_activate: "Activar membresía",
    user_deactivate: "Bloquear membresía",
    user_delete: "Eliminar usuario",
    payment_approve: "Aprobar pago",
    payment_reject: "Rechazar pago",
    partner_approve: "Aprobar partner",
    partner_suspend: "Suspender partner",
    partner_activate: "Activar partner",
    partner_reject: "Rechazar partner",
    partner_commission_rate: "Editar % comisión",
    partner_commission_paid: "Comisión marcada pagada",
    reconcile_system: "Reconciliación del sistema",
    repair_user_billing: "Reparar billing de usuario",
};

export default function AdminAuditPage() {
    const [list, setList] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [limit] = useState(50);
    const [isLoading, setIsLoading] = useState(true);
    const [actionFilter, setActionFilter] = useState<string>("all");
    const [targetTypeFilter, setTargetTypeFilter] = useState<string>("all");

    const fetchAudit = useCallback(async () => {
        setIsLoading(true);
        try {
            const { api } = await import("@/lib/api-service");
            const res = await api.getAdminAudit({ page, limit });
            setList(res?.list ?? []);
            setTotal(res?.total ?? 0);
        } catch (e) {
            toast.error("Error al cargar audit log");
            setList([]);
        } finally {
            setIsLoading(false);
        }
    }, [page, limit]);

    useEffect(() => {
        fetchAudit();
    }, [fetchAudit]);

    const displayList = useMemo(() => {
        return list.filter((log) => {
            if (actionFilter !== "all" && log.action !== actionFilter) return false;
            if (targetTypeFilter !== "all" && (log.targetType || "") !== targetTypeFilter) return false;
            return true;
        });
    }, [list, actionFilter, targetTypeFilter]);

    const handleExportCsv = () => {
        const headers = ["Fecha", "Admin", "Acción", "Tipo objetivo", "ID objetivo", "Detalles"];
        const rows = displayList.map((log) => {
            const details = log.metadata ? (log.metadata.email ? `email: ${log.metadata.email}` : log.metadata.referralCode ? `ref: ${log.metadata.referralCode}` : JSON.stringify(log.metadata)) : "";
            return [
                formatDate(log.createdAt),
                log.adminEmail || log.adminId || "",
                ACTION_LABELS[log.action] ?? log.action,
                log.targetType || "",
                log.targetId || "",
                details
            ];
        });
        const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
        const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `audit-log-trinalyze-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("CSV descargado");
    };

    const formatDetails = (log: any) => {
        if (!log.metadata || typeof log.metadata !== "object") return "—";
        const parts: string[] = [];
        if (log.metadata.email) parts.push(`email: ${log.metadata.email}`);
        if (log.metadata.referralCode) parts.push(`ref: ${log.metadata.referralCode}`);
        if (log.metadata.previousRate != null) parts.push(`antes: ${log.metadata.previousRate}`);
        if (log.metadata.newRate != null) parts.push(`nuevo: ${log.metadata.newRate}`);
        if (parts.length) return parts.join(" · ");
        return Object.entries(log.metadata).map(([k, v]) => `${k}: ${v}`).join(" · ") || "—";
    };

    const formatDate = (d: string) => {
        try {
            return new Date(d).toLocaleString("es-DO", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            });
        } catch {
            return "—";
        }
    };

    const totalPages = Math.max(1, Math.ceil(total / limit));

    const uniqueActions = useMemo(() => Array.from(new Set(list.map((l) => l.action))).sort(), [list]);
    const uniqueTargetTypes = useMemo(() => Array.from(new Set(list.map((l) => l.targetType).filter(Boolean))).sort(), [list]);

    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
        >
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <ScrollText className="w-7 h-7 text-amber-500" />
                    Audit Log
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                    Registro de acciones realizadas por administradores
                </p>
            </div>

            <Card className="backdrop-blur-md bg-white/40 dark:bg-slate-900/40 border-white/20 shadow-xl overflow-hidden relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
                <CardHeader className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <CardTitle>Acciones recientes</CardTitle>
                            <CardDescription>
                                {total} registro{total !== 1 ? "s" : ""} en total
                                {(actionFilter !== "all" || targetTypeFilter !== "all") && ` · Mostrando ${displayList.length} en esta página`}
                            </CardDescription>
                        </div>
                        <Button variant="outline" size="sm" className="gap-2" onClick={handleExportCsv} disabled={displayList.length === 0}>
                            <Download className="w-4 h-4" /> Exportar CSV
                        </Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
                        <Select value={actionFilter} onValueChange={(v) => setActionFilter(v)}>
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Acción" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas las acciones</SelectItem>
                                {uniqueActions.map((a) => (
                                    <SelectItem key={a} value={a}>{ACTION_LABELS[a] ?? a}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={targetTypeFilter} onValueChange={(v) => setTargetTypeFilter(v)}>
                            <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Objetivo" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                <SelectItem value="partner">Partner</SelectItem>
                                <SelectItem value="user">Usuario</SelectItem>
                                {uniqueTargetTypes.filter((t) => t !== "partner" && t !== "user").map((t) => (
                                    <SelectItem key={t} value={t}>{t}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading && list.length === 0 ? (
                        <div className="py-12 flex justify-center">
                            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : list.length === 0 ? (
                        <p className="py-12 text-center text-muted-foreground">No hay registros aún.</p>
                    ) : (
                        <>
                            <div className="overflow-x-auto rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Fecha</TableHead>
                                            <TableHead>Admin</TableHead>
                                            <TableHead>Acción</TableHead>
                                            <TableHead>Objetivo</TableHead>
                                            <TableHead>Detalles</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <AnimatePresence mode="popLayout">
                                        {displayList.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                                    No hay registros que coincidan con los filtros.
                                                </TableCell>
                                            </TableRow>
                                        ) : displayList.map((log, idx) => {
                                            const actionLabel = ACTION_LABELS[log.action] ?? log.action;
                                            const isNegative = log.action.includes("block") || log.action.includes("reject") || log.action.includes("suspend") || log.action.includes("delete");
                                            const isPositive = log.action.includes("approve") || log.action.includes("activate") || log.action.includes("unblock");
                                            const isSystem = log.action.includes("reconcile") || log.action.includes("repair");

                                            return (
                                                <motion.tr 
                                                    key={log._id}
                                                    initial={{ opacity: 0, x: -5 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: idx * 0.02 }}
                                                    className="group border-b last:border-0 hover:bg-muted/30 transition-colors"
                                                >
                                                    <TableCell className="text-muted-foreground text-[11px] font-mono whitespace-nowrap">
                                                        {formatDate(log.createdAt)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <SimpleAvatar name={log.adminEmail || "AD"} />
                                                            <div className="min-w-0">
                                                                <p className="text-xs font-medium truncate max-w-[120px]">{log.adminEmail || "Admin"}</p>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className={cn(
                                                            "text-[10px] uppercase font-bold border-none py-0.5",
                                                            isNegative ? "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400" :
                                                            isPositive ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" :
                                                            isSystem ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" :
                                                            "bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                                        )}>
                                                            {actionLabel}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-xs text-muted-foreground">
                                                        {log.targetType === "partner" ? (
                                                            <Link href="/admin/partners" className="text-amber-600 hover:underline font-semibold flex items-center gap-1">
                                                                <span className="opacity-50">partner</span> 
                                                                <span>#{String(log.targetId || "").slice(-6)}</span>
                                                            </Link>
                                                        ) : log.targetType === "user" ? (
                                                            <Link href="/admin/usuarios" className="text-blue-600 hover:underline font-semibold flex items-center gap-1">
                                                                <span className="opacity-50">user</span>
                                                                <span>#{String(log.targetId || "").slice(-6)}</span>
                                                            </Link>
                                                        ) : (
                                                            <div className="flex items-center gap-1">
                                                                <span className="opacity-50 lowercase">{log.targetType}</span>
                                                                {log.targetId && <span>#{String(log.targetId).slice(-6)}</span>}
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-[11px] text-muted-foreground/80 max-w-[220px] truncate group-hover:text-foreground transition-colors" title={formatDetails(log)}>
                                                        {formatDetails(log)}
                                                    </TableCell>
                                                </motion.tr>
                                            );
                                        })}
                                        </AnimatePresence>
                                    </TableBody>
                                </Table>
                            </div>
                            {totalPages > 1 && (
                                <div className="flex justify-between mt-4">
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
        </motion.div>
    );
}
