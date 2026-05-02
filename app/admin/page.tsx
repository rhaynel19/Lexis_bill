"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { CreditCard, Check, X, Loader2, RefreshCw, AlertCircle, ImageIcon, Search, ArrowLeft, AlertTriangle, Clock, Lock, Wrench, MoreHorizontal } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
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

export default function AdminPagosPendientes() {
    const [payments, setPayments] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [comprobanteView, setComprobanteView] = useState<string | null>(null);
    const [searchRef, setSearchRef] = useState("");
    const [alerts, setAlerts] = useState<Array<{ type: string; count: number; severity: string; message: string }>>([]);
    const [isReconciling, setIsReconciling] = useState(false);

    const fetchPayments = async () => {
        try {
            const { api } = await import("@/lib/api-service");
            const data = await api.getPendingPayments();
            setPayments(data || []);
        } catch (e) {
            toast.error("Error al cargar pagos pendientes.");
            setPayments([]);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchAlerts = async () => {
        try {
            const { api } = await import("@/lib/api-service");
            const res = await api.getAdminAlerts();
            setAlerts(res?.alerts ?? []);
        } catch {
            setAlerts([]);
        }
    };

    const handleReconcile = async () => {
        setIsReconciling(true);
        try {
            const { api } = await import("@/lib/api-service");
            const res = await api.reconcileSystem();
            toast.success(res?.message || "Reconciliación completada");
            if (res?.results) {
                const { payments, subscriptions } = res.results;
                toast.info(`Pagos reparados: ${payments.repaired}/${payments.total}. Suscripciones reparadas: ${subscriptions.repaired}/${subscriptions.total}`);
            }
            fetchPayments();
            fetchAlerts();
        } catch (e: any) {
            toast.error(e?.message || "Error al reconciliar");
        } finally {
            setIsReconciling(false);
        }
    };

    useEffect(() => {
        fetchPayments();
        fetchAlerts();
    }, []);

    // Polling: nuevas solicitudes aparecen sin refrescar (cada 20s)
    useEffect(() => {
        const interval = setInterval(() => {
            fetchPayments();
        }, 20000);
        return () => clearInterval(interval);
    }, []);

    const handleApprove = async (id: string) => {
        const previousPayments = [...payments];
        // Optimistic Update: remove from UI immediately
        setPayments(prev => prev.filter(p => p.id !== id));
        setProcessingId(id);
        
        try {
            const { api } = await import("@/lib/api-service");
            await api.approvePayment(id);
            toast.success("Pago aprobado correctamente.");
            // Refresh to ensure sync
            fetchPayments();
        } catch (e: any) {
            toast.error(e.message || "Error al aprobar.");
            setPayments(previousPayments); // Rollback
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (id: string) => {
        const previousPayments = [...payments];
        setPayments(prev => prev.filter(p => p.id !== id));
        setProcessingId(id);
        
        try {
            const { api } = await import("@/lib/api-service");
            await api.rejectPayment(id);
            toast.success("Solicitud rechazada.");
            fetchPayments();
        } catch (e: any) {
            toast.error(e.message || "Error al rechazar.");
            setPayments(previousPayments); // Rollback
        } finally {
            setProcessingId(null);
        }
    };

    const formatDate = (d: string | Date) => {
        return new Date(d).toLocaleDateString("es-DO", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    const filteredPayments = useMemo(() => {
        const list = payments;
        const byId = new Map<string, typeof list[0]>();
        list.forEach((p) => {
            if (p?.id && !byId.has(p.id)) byId.set(p.id, p);
        });
        const deduped = Array.from(byId.values());
        if (!searchRef.trim()) return deduped;
        const q = searchRef.trim().toUpperCase();
        return deduped.filter((p) => (p.reference || "").toUpperCase().includes(q));
    }, [payments, searchRef]);

    const alertHref: Record<string, string> = {
        trials_expiring: "/admin/usuarios?status=trial",
        inactive: "/admin/usuarios?activity=inactive",
        pending_payments: "/admin",
        blocked: "/admin/usuarios?status=blocked"
    };

    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
        >
            {/* Alertas: trials por vencer, inactivos, pagos pendientes, bloqueados */}
            {alerts.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {alerts.map((a) => {
                        const href = alertHref[a.type] || "#";
                        const Icon = a.type === "pending_payments" ? CreditCard : a.type === "trials_expiring" ? AlertTriangle : a.type === "inactive" ? Clock : Lock;
                        const isWarning = a.severity === "warning";
                        return (
                            <Link key={a.type} href={href}>
                                <div className={`p-4 rounded-lg border ${isWarning ? "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800" : "bg-muted/50 border-border"} hover:opacity-90 transition-opacity flex items-center gap-3`}>
                                    <div className={`p-2 rounded-full ${isWarning ? "bg-blue-100 dark:bg-blue-900/40" : "bg-muted"}`}>
                                        <Icon className={`w-5 h-5 ${isWarning ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground"}`} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-medium text-sm text-foreground">{a.message}</p>
                                        <p className="text-xs text-muted-foreground">Ver detalles →</p>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Pagos Pendientes</h1>
                    <p className="text-muted-foreground text-sm">
                        Valida y aprueba las solicitudes de membresía manual (transferencia / PayPal).
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button 
                        variant="outline" 
                        className="gap-2 border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900/50 shadow-sm" 
                        onClick={handleReconcile}
                        disabled={isReconciling}
                    >
                        <Wrench className={`w-4 h-4 ${isReconciling ? "animate-spin" : "text-slate-500"}`} />
                        Reconciliar
                    </Button>
                    <Link href="/admin/dashboard">
                        <Button variant="outline" className="shadow-sm border-slate-200 dark:border-slate-800">Ver Estadísticas</Button>
                    </Link>
                    <Button variant="outline" size="icon" className="shadow-sm border-slate-200 dark:border-slate-800" onClick={fetchPayments} disabled={isLoading} aria-label="Actualizar lista de pagos">
                        <RefreshCw className={`w-4 h-4 text-slate-500 ${isLoading ? "animate-spin" : ""}`} />
                    </Button>
                </div>
            </div>

            <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm overflow-hidden">
                <CardHeader className="bg-slate-50/50 dark:bg-slate-900/20 border-b border-slate-100 dark:border-slate-800/50">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <CardTitle className="flex items-center gap-2 text-lg text-slate-800 dark:text-slate-200">
                                <CreditCard className="w-5 h-5 text-indigo-500" />
                                Solicitudes por Validar
                            </CardTitle>
                            <CardDescription className="mt-1">
                                Revisa los comprobantes adjuntos y la referencia antes de aprobar.
                            </CardDescription>
                        </div>
                        {payments.length > 0 && (
                            <div className="relative w-full sm:w-auto">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <Input
                                    placeholder="Buscar referencia (ej. LEX-1024)"
                                    value={searchRef}
                                    onChange={(e) => setSearchRef(e.target.value)}
                                    className="pl-9 w-full sm:w-[280px] bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                                />
                            </div>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="p-6 space-y-4">
                            {[...Array(4)].map((_, i) => (
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
                    ) : filteredPayments.length === 0 ? (
                        <div className="py-16 text-center space-y-3">
                            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertCircle className="w-8 h-8 text-slate-400" />
                            </div>
                            <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200">
                                {searchRef.trim() ? "Ningún pago encontrado" : "Todo al día"}
                            </h3>
                            <p className="text-slate-500 max-w-sm mx-auto">
                                {searchRef.trim() 
                                    ? "No hay coincidencias con esa referencia." 
                                    : "No tienes pagos pendientes de aprobación. Buen trabajo."}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                                    <TableRow className="border-slate-100 dark:border-slate-800 hover:bg-transparent">
                                        <TableHead className="font-semibold text-slate-600 dark:text-slate-400 pl-6">Usuario & Referencia</TableHead>
                                        <TableHead className="font-semibold text-slate-600 dark:text-slate-400">Suscripción</TableHead>
                                        <TableHead className="font-semibold text-slate-600 dark:text-slate-400">Fecha de Solicitud</TableHead>
                                        <TableHead className="text-right pr-6 font-semibold text-slate-600 dark:text-slate-400">Gestión</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <AnimatePresence mode="popLayout">
                                        {filteredPayments.map((p) => (
                                            <motion.tr 
                                                key={p.id}
                                                layout
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.95, backgroundColor: "rgba(239, 68, 68, 0.05)" }}
                                                transition={{ duration: 0.2 }}
                                                className="border-slate-100 dark:border-slate-800/60 transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40 group"
                                            >
                                                <TableCell className="pl-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <SimpleAvatar name={p.userName || "U"} />
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">
                                                                    {p.userName || "Usuario Desconocido"}
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
                                                <TableCell className="py-4 text-slate-500 text-sm">
                                                    {formatDate(p.requestedAt)}
                                                </TableCell>
                                                <TableCell className="text-right pr-6 py-4">
                                                    <div className="flex justify-end items-center gap-2">
                                                        {p.comprobanteImage && (
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Button
                                                                            size="icon"
                                                                            variant="ghost"
                                                                            className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 dark:hover:text-indigo-400"
                                                                            onClick={() => setComprobanteView(p.comprobanteImage)}
                                                                        >
                                                                            <ImageIcon className="w-4 h-4" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p>Ver comprobante adjunto</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        )}
                                                        
                                                        {processingId === p.id ? (
                                                            <div className="px-3 py-1.5 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center">
                                                                <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                                                            </div>
                                                        ) : (
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="outline" size="sm" className="h-8 gap-1 border-slate-200 dark:border-slate-800 shadow-sm">
                                                                        Acciones <MoreHorizontal className="w-3.5 h-3.5 ml-1 text-slate-400" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end" className="w-48 p-1">
                                                                    <div className="px-2 py-1.5 mb-1 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                                                        Gestión de Pago
                                                                    </div>
                                                                    <DropdownMenuItem 
                                                                        className="gap-2 cursor-pointer text-emerald-600 focus:text-emerald-700 focus:bg-emerald-50 dark:text-emerald-400 dark:focus:bg-emerald-900/20"
                                                                        onClick={() => handleApprove(p.id)}
                                                                    >
                                                                        <Check className="w-4 h-4" /> Aprobar Transacción
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuSeparator className="my-1 border-slate-100 dark:border-slate-800" />
                                                                    <DropdownMenuItem 
                                                                        className="gap-2 cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50 dark:text-red-400 dark:focus:bg-red-900/20"
                                                                        onClick={() => handleReject(p.id)}
                                                                    >
                                                                        <X className="w-4 h-4" /> Rechazar Pago
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </motion.tr>
                                        ))}
                                    </AnimatePresence>
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={!!comprobanteView} onOpenChange={(open) => !open && setComprobanteView(null)}>
                <DialogContent className="max-w-2xl max-h-[90vh] relative p-0 overflow-hidden bg-slate-950 border-slate-800">
                    <DialogHeader className="absolute top-0 w-full bg-gradient-to-b from-black/80 to-transparent p-4 z-10 flex flex-row items-center justify-between pointer-events-none">
                        <DialogTitle className="flex items-center gap-2 text-white shadow-sm font-medium">
                            <ImageIcon className="w-4 h-4 text-white/80" />
                            Comprobante de Depósito
                        </DialogTitle>
                    </DialogHeader>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-3 right-3 z-20 shrink-0 text-white/70 hover:text-white hover:bg-white/20 rounded-full h-8 w-8"
                        onClick={() => setComprobanteView(null)}
                        aria-label="Cerrar"
                    >
                        <X className="w-4 h-4" />
                    </Button>
                    {comprobanteView && (
                        <div className="w-full h-full min-h-[300px] flex items-center justify-center bg-slate-950 p-2">
                            <img src={comprobanteView} alt="Comprobante" className="max-w-full max-h-[85vh] object-contain rounded-md" />
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </motion.div>
    );
}
