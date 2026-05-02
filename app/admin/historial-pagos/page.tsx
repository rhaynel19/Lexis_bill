"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Receipt, Loader2, Download, Search, AlertCircle, CreditCard, DollarSign, CalendarCheck } from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

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

const planColors: Record<string, string> = {
    free: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
    pro: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400 border-blue-200 dark:border-blue-800",
    premium: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-400 border-purple-200 dark:border-purple-800",
    elite: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 border-amber-200 dark:border-amber-800"
};

export default function AdminHistorialPagosPage() {
    const [list, setList] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [limit] = useState(50);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

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

    const filteredList = useMemo(() => {
        if (!searchQuery.trim()) return list;
        const q = searchQuery.toLowerCase();
        return list.filter(p => 
            (p.reference && p.reference.toLowerCase().includes(q)) ||
            (p.userName && p.userName.toLowerCase().includes(q)) ||
            (p.userEmail && p.userEmail.toLowerCase().includes(q))
        );
    }, [list, searchQuery]);

    // KPI Calculations
    const totalAmountThisPage = useMemo(() => list.reduce((acc, curr) => acc + (curr.amount || 0), 0), [list]);
    const mostUsedMethod = useMemo(() => {
        const methods = list.reduce((acc, curr) => {
            acc[curr.paymentMethod] = (acc[curr.paymentMethod] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        const sorted = (Object.entries(methods) as [string, number][]).sort((a, b) => b[1] - a[1]);
        return sorted[0]?.[0] || "—";
    }, [list]);

    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
        >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <Receipt className="w-6 h-6 text-indigo-500" />
                        Historial de Pagos
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Registro histórico de todos los pagos procesados y membresías activadas.
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2 border-slate-200 dark:border-slate-800 shadow-sm" disabled={list.length === 0}>
                    <Download className="w-4 h-4 text-slate-500" /> Exportar CSV
                </Button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                            <CalendarCheck className="w-4 h-4 text-slate-400" /> Transacciones Totales
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{total}</span>
                        <p className="text-xs text-slate-400 mt-1">Histórico general</p>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                            <Receipt className="w-4 h-4 text-slate-400" /> En esta página
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{list.length}</span>
                        <p className="text-xs text-slate-400 mt-1">Mostrados actualmente</p>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-emerald-500" /> Volumen (Pág. Actual)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(totalAmountThisPage)}</span>
                        <p className="text-xs text-slate-400 mt-1">Suma de pagos en vista</p>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-slate-400" /> Vía Principal
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <span className="text-2xl font-bold text-slate-900 dark:text-slate-100 capitalize">{mostUsedMethod}</span>
                        <p className="text-xs text-slate-400 mt-1">Método más usado (pág. actual)</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm overflow-hidden">
                <CardHeader className="bg-slate-50/50 dark:bg-slate-900/20 border-b border-slate-100 dark:border-slate-800/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <CardTitle className="text-lg text-slate-800 dark:text-slate-200">
                            Registro Detallado
                        </CardTitle>
                        <CardDescription className="mt-1">
                            Vista paginada de las transacciones aprobadas en el sistema.
                        </CardDescription>
                    </div>
                    {list.length > 0 && (
                        <div className="relative w-full sm:w-auto">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <Input
                                placeholder="Buscar cliente o referencia..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 w-full sm:w-[300px] bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                            />
                        </div>
                    )}
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading && list.length === 0 ? (
                        <div className="p-6 space-y-4">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="flex items-center justify-between p-4 border rounded-xl">
                                    <div className="flex items-center gap-4">
                                        <Skeleton className="w-10 h-10 rounded-full" />
                                        <div className="space-y-2">
                                            <Skeleton className="w-32 h-4" />
                                            <Skeleton className="w-48 h-3" />
                                        </div>
                                    </div>
                                    <Skeleton className="w-24 h-8 rounded-md" />
                                </div>
                            ))}
                        </div>
                    ) : filteredList.length === 0 ? (
                        <div className="py-16 text-center space-y-3">
                            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertCircle className="w-8 h-8 text-slate-400" />
                            </div>
                            <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200">
                                {searchQuery.trim() ? "Sin resultados" : "Historial vacío"}
                            </h3>
                            <p className="text-slate-500 max-w-sm mx-auto">
                                {searchQuery.trim() 
                                    ? "No se encontraron pagos con ese término en esta página." 
                                    : "No hay pagos registrados en la plataforma."}
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                                        <TableRow className="border-slate-100 dark:border-slate-800 hover:bg-transparent">
                                            <TableHead className="font-semibold text-slate-600 dark:text-slate-400 pl-6">Cliente & Referencia</TableHead>
                                            <TableHead className="font-semibold text-slate-600 dark:text-slate-400">Suscripción</TableHead>
                                            <TableHead className="font-semibold text-slate-600 dark:text-slate-400">Fechas</TableHead>
                                            <TableHead className="text-right font-semibold text-slate-600 dark:text-slate-400 pr-6">Monto</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <AnimatePresence mode="popLayout">
                                            {filteredList.map((p) => (
                                                <motion.tr 
                                                    key={p.id}
                                                    layout
                                                    initial={{ opacity: 0, y: -5 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="border-slate-100 dark:border-slate-800/60 transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                                                >
                                                    <TableCell className="pl-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <SimpleAvatar name={p.userName || "U"} />
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">
                                                                        {p.userName || "—"}
                                                                    </p>
                                                                    {p.reference && (
                                                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                                                            {p.reference}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className="text-xs text-slate-500 mt-0.5">{p.userEmail}</p>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-4">
                                                        <div className="flex flex-col items-start gap-1">
                                                            <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border", planColors[p.plan] || planColors.free)}>
                                                                {p.plan || "Free"}
                                                            </span>
                                                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                                <span className="capitalize font-medium text-slate-600 dark:text-slate-400">{p.billingCycle === "annual" ? "Anual" : "Mensual"}</span>
                                                                <span>•</span>
                                                                <span className="capitalize">{p.paymentMethod}</span>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-4">
                                                        <div className="flex flex-col gap-1 text-xs">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-slate-400 w-16">Solicitud:</span>
                                                                <span className="text-slate-600 dark:text-slate-300 font-medium">{formatDate(p.requestedAt)}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-emerald-500/70 w-16">Aprobado:</span>
                                                                <span className="text-emerald-600 dark:text-emerald-400 font-medium">{formatDate(p.processedAt)}</span>
                                                            </div>
                                                            {p.processedByEmail && (
                                                                <div className="flex items-center gap-2 mt-0.5">
                                                                    <span className="text-slate-400 w-16">Por:</span>
                                                                    <span className="text-slate-500">{p.processedByEmail}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right pr-6 py-4">
                                                        <span className="font-bold text-slate-900 dark:text-slate-100 text-base">{formatCurrency(p.amount)}</span>
                                                    </TableCell>
                                                </motion.tr>
                                            ))}
                                        </AnimatePresence>
                                    </TableBody>
                                </Table>
                            </div>
                            
                            {/* Pagination Footer */}
                            {totalPages > 1 && (
                                <div className="border-t border-slate-100 dark:border-slate-800 p-4 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/20">
                                    <p className="text-sm text-slate-500 font-medium">
                                        Página <span className="text-slate-900 dark:text-slate-100">{page}</span> de <span className="text-slate-900 dark:text-slate-100">{totalPages}</span>
                                    </p>
                                    <div className="flex gap-2">
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-950"
                                            onClick={() => setPage((p) => Math.max(1, p - 1))} 
                                            disabled={page <= 1}
                                        >
                                            Anterior
                                        </Button>
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-950"
                                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))} 
                                            disabled={page >= totalPages}
                                        >
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
