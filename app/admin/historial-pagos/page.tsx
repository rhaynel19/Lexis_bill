"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Receipt, Loader2, Download } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

export default function AdminHistorialPagosPage() {
    const [list, setList] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [limit] = useState(50);
    const [isLoading, setIsLoading] = useState(true);

    const fetchHistory = useCallback(async () => {
        setIsLoading(true);
        try {
            const { api } = await import("@/lib/api-service");
            const res = await api.getAdminPaymentsHistory({ page, limit });
            setList(res?.list ?? []);
            setTotal(res?.total ?? 0);
        } catch (e) {
            toast.error("Error al cargar historial de pagos");
            setList([]);
        } finally {
            setIsLoading(false);
        }
    }, [page, limit]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    const formatDate = (d: string | undefined) => {
        if (!d) return "—";
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

    const formatCurrency = (n: number) =>
        new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP", maximumFractionDigits: 0 }).format(n ?? 0);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    const handleExportCSV = () => {
        const headers = ["Fecha solicitud", "Fecha aprobación", "Referencia", "Cliente", "Email", "Plan", "Ciclo", "Método", "Monto (RD$)", "Aprobado por"];
        const rows = list.map((p) => [
            formatDate(p.requestedAt),
            formatDate(p.processedAt),
            p.reference ?? "",
            p.userName ?? "",
            p.userEmail ?? "",
            p.plan ?? "",
            p.billingCycle === "annual" ? "Anual" : "Mensual",
            p.paymentMethod ?? "",
            String(p.amount ?? 0),
            p.processedByEmail ?? ""
        ]);
        const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
        const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `lexisbill-pagos-realizados-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("CSV descargado.");
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Receipt className="w-7 h-7 text-amber-500" />
                        Historial de pagos realizados
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Listado de pagos aprobados por cliente (transferencia / PayPal)
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2" disabled={list.length === 0}>
                    <Download className="w-4 h-4" /> Exportar CSV
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Pagos aprobados</CardTitle>
                    <CardDescription>
                        {total} pago{total !== 1 ? "s" : ""} en total
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading && list.length === 0 ? (
                        <div className="py-12 flex justify-center">
                            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : list.length === 0 ? (
                        <p className="py-12 text-center text-muted-foreground">No hay pagos aprobados aún.</p>
                    ) : (
                        <>
                            <div className="overflow-x-auto rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Fecha aprobación</TableHead>
                                            <TableHead>Referencia</TableHead>
                                            <TableHead>Cliente</TableHead>
                                            <TableHead>Plan</TableHead>
                                            <TableHead>Método</TableHead>
                                            <TableHead className="text-right">Monto</TableHead>
                                            <TableHead>Aprobado por</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {list.map((p) => (
                                            <TableRow key={p.id}>
                                                <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                                                    {formatDate(p.processedAt)}
                                                </TableCell>
                                                <TableCell className="font-mono text-xs">{p.reference}</TableCell>
                                                <TableCell>
                                                    <p className="font-medium text-sm">{p.userName || "—"}</p>
                                                    <p className="text-xs text-muted-foreground">{p.userEmail || ""}</p>
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    {p.plan} · {p.billingCycle === "annual" ? "Anual" : "Mensual"}
                                                </TableCell>
                                                <TableCell className="capitalize text-sm">{p.paymentMethod}</TableCell>
                                                <TableCell className="text-right font-medium">{formatCurrency(p.amount)}</TableCell>
                                                <TableCell className="text-xs text-muted-foreground">{p.processedByEmail || "—"}</TableCell>
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
