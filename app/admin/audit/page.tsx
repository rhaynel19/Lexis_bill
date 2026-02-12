"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ScrollText, Loader2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

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
    reconcile_system: "Reconciliación del sistema",
    repair_user_billing: "Reparar billing de usuario",
};

export default function AdminAuditPage() {
    const [list, setList] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [limit] = useState(50);
    const [isLoading, setIsLoading] = useState(true);

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

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <ScrollText className="w-7 h-7 text-amber-500" />
                    Audit Log
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                    Registro de acciones realizadas por administradores
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Acciones recientes</CardTitle>
                    <CardDescription>
                        {total} registro{total !== 1 ? "s" : ""} en total
                    </CardDescription>
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
                                        {list.map((log) => (
                                            <TableRow key={log._id}>
                                                <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                                                    {formatDate(log.createdAt)}
                                                </TableCell>
                                                <TableCell className="text-sm">{log.adminEmail || log.adminId}</TableCell>
                                                <TableCell>
                                                    <span className="text-sm font-medium">
                                                        {ACTION_LABELS[log.action] ?? log.action}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground">
                                                    {log.targetType} {log.targetId ? `#${String(log.targetId).slice(-6)}` : ""}
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                                                    {log.metadata?.email ? `email: ${log.metadata.email}` : ""}
                                                    {log.metadata?.referralCode ? `ref: ${log.metadata.referralCode}` : ""}
                                                </TableCell>
                                            </TableRow>
                                        ))}
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
        </div>
    );
}
