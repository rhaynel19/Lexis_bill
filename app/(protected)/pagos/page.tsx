"use client";

import { useEffect, useState } from "react";
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
import {
    CreditCard,
    Download,
    CheckCircle,
    Wallet,
    ArrowLeft
} from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api-service";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MembershipConfig } from "@/components/MembershipConfig";
import { EmptyState } from "@/components/ui/empty-state";

export default function PaymentsPage() {
    const [history, setHistory] = useState<any[]>([]);
    const [status, setStatus] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            api.invalidateSubscriptionCache();
            const historyData = await api.getPaymentHistory().catch((e) => {
                console.error("History fetch error:", e);
                return [];
            });
            const statusData = await api.getSubscriptionStatus(true).catch((e) => {
                console.error("Status fetch error:", e);
                return null;
            });
            setHistory(historyData || []);
            setStatus(statusData);
            if (typeof window !== "undefined") window.dispatchEvent(new Event("subscription-updated"));
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : "Error de conexión";
            setLoadError(msg);
            toast.error("Hubo un problema de conexión al verificar el estado del pago.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownloadReceipt = (payment: any) => {
        const d = payment.date ? new Date(payment.date) : new Date();
        const dateStr = d.toLocaleDateString("es-DO", { day: "2-digit", month: "2-digit", year: "numeric" });
        const timeStr = d.toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
        const concept = payment.plan ? `Plan ${String(payment.plan).toUpperCase()} - Trinalyze Billing` : "Suscripción Trinalyze Billing";
        const statusLabel = (payment.status === "pending" || payment.status === "under_review") ? "Pendiente de validación" : "COMPLETADO";
        
        const win = window.open('', '_blank');
        if (!win) {
            toast.error("Por favor permite popups para imprimir tu recibo.");
            return;
        }

        win.document.write(`
            <html>
            <head>
                <title>Recibo de Pago - Trinalyze</title>
                <style>
                    body { font-family: 'Inter', system-ui, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background-color: #f1f5f9; }
                    .ticket { background: white; padding: 40px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); max-width: 500px; width: 100%; border: 1px solid #e2e8f0; }
                    .header { text-align: center; margin-bottom: 30px; }
                    .header h1 { margin: 0; color: #1e293b; font-size: 24px; font-weight: 900; letter-spacing: -0.5px; }
                    .header p { margin: 5px 0 0; color: #64748b; font-size: 14px; }
                    .divider { height: 1px; background: #e2e8f0; margin: 20px 0; border-top: 1px dashed #cbd5e1; }
                    .row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px; }
                    .label { color: #64748b; font-weight: 500; }
                    .value { color: #0f172a; font-weight: 700; text-align: right; }
                    .amount { font-size: 24px; font-weight: 900; color: #10b981; margin: 20px 0; text-align: center; }
                    .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #94a3b8; }
                    @media print { body { background: white; } .ticket { box-shadow: none; border: none; } }
                </style>
            </head>
            <body>
                <div class="ticket">
                    <div class="header">
                        <h1>TRINALYZE BILLING</h1>
                        <p>Recibo de Pago Oficial</p>
                    </div>
                    <div class="amount">RD$ ${Number(payment.amount || 0).toLocaleString("es-DO")}</div>
                    <div class="divider"></div>
                    <div class="row">
                        <span class="label">Referencia</span>
                        <span class="value">${payment.reference || "—"}</span>
                    </div>
                    <div class="row">
                        <span class="label">Fecha y Hora</span>
                        <span class="value">${dateStr} ${timeStr}</span>
                    </div>
                    <div class="row">
                        <span class="label">Concepto</span>
                        <span class="value">${concept}</span>
                    </div>
                    <div class="row">
                        <span class="label">Estado</span>
                        <span class="value" style="color: ${statusLabel === 'COMPLETADO' ? '#10b981' : '#f59e0b'};">${statusLabel}</span>
                    </div>
                    <div class="divider"></div>
                    <div class="footer">
                        Este comprobante es para sus registros internos.<br>Gracias por confiar en el sistema contable Trinalyze.
                    </div>
                </div>
                <script>
                    window.onload = function() { window.print(); }
                </script>
            </body>
            </html>
        `);
        win.document.close();
    };

    return (
        <div className="container mx-auto px-4 py-6 md:py-8 pb-24 md:pb-12 max-w-4xl">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <Link href="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-2 text-sm font-semibold">
                        <ArrowLeft className="w-4 h-4" /> Volver al Dashboard
                    </Link>
                    <h1 className="text-2xl md:text-3xl font-bold text-primary tracking-tight flex items-center gap-3">
                        <Wallet className="w-7 h-7 text-amber-600" /> Mi Plan y Pagos
                    </h1>
                </div>
                {status && (
                    <Badge variant="outline" className={`px-3 py-1 font-bold ${status.plan === "pro" || status.plan === "premium" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                        {status.plan?.toUpperCase() || "FREE"}
                    </Badge>
                )}
            </div>

            {/* Error de carga con Reintentar */}
            {loadError && (
                <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <p className="text-sm font-medium text-destructive">{loadError}</p>
                    <Button variant="outline" size="sm" onClick={loadData} className="border-destructive/30 text-destructive hover:bg-destructive/10">
                        Reintentar
                    </Button>
                </div>
            )}

            {/* Membresía: planes, método de pago, "He realizado el pago" */}
            <div className="mb-8">
                <MembershipConfig onPaymentReported={loadData} />
            </div>

            <h2 className="text-lg font-semibold mb-4 text-foreground">Historial y Estado</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <Card className="border-none shadow-lg bg-card">
                    <CardHeader className="pb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Vencimiento</span>
                        <CardTitle className="text-xl font-bold text-foreground">
                            {status?.expiryDate ? new Date(status.expiryDate).toLocaleDateString() : '—'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-muted-foreground">{status?.daysRemaining != null && status.daysRemaining < 999 ? `${status.daysRemaining} días restantes` : "Plan activo"}</p>
                        
                        {/* Barra de Progreso Visual */}
                        {status?.daysRemaining != null && status.daysRemaining < 999 && (
                            <div className="mt-4 space-y-1.5">
                                <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full rounded-full transition-all duration-1000 ${
                                            status.daysRemaining > 15 ? "bg-emerald-500" :
                                            status.daysRemaining > 5 ? "bg-amber-500" : "bg-red-500"
                                        }`} 
                                        style={{ width: `${Math.min(100, Math.max(0, (status.daysRemaining / 30) * 100))}%` }}
                                    />
                                </div>
                                <div className="flex justify-between text-[10px] font-bold text-muted-foreground">
                                    <span>Renovación</span>
                                    <span className={status.daysRemaining <= 5 ? "text-red-500 font-black animate-pulse" : ""}>
                                        {status.daysRemaining} días
                                    </span>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-none shadow-lg bg-card">
                    <CardHeader className="pb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Acumulado</span>
                        <CardTitle className="text-xl font-black text-foreground">
                            RD$ {(history.reduce((acc, p) => acc + p.amount, 0)).toLocaleString()}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-slate-400">Total invertido en la plataforma</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-border shadow-2xl bg-card overflow-hidden">
                <CardHeader className="border-b border-border bg-muted/20">
                    <CardTitle className="text-lg font-black text-foreground">Historial de Transacciones</CardTitle>
                    <CardDescription className="text-muted-foreground">Consulta tus facturas y recibos de Trinalyze Billing</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted hover:bg-muted border-none">
                                <TableHead className="font-black text-muted-foreground text-[10px] uppercase tracking-wider">Fecha</TableHead>
                                <TableHead className="font-black text-muted-foreground text-[10px] uppercase tracking-wider">Referencia</TableHead>
                                <TableHead className="font-black text-muted-foreground text-[10px] uppercase tracking-wider">Monto</TableHead>
                                <TableHead className="font-black text-muted-foreground text-[10px] uppercase tracking-wider">Estado</TableHead>
                                <TableHead className="text-right"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {history.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="p-0">
                                        <EmptyState
                                            icon={CreditCard}
                                            title="Sin pagos registrados"
                                            description="Cuando reportes un pago, aparecerá aquí con estado «Pendiente de validación». Los aprobados se marcarán como completados."
                                        />
                                    </TableCell>
                                </TableRow>
                            ) : (
                                history.map((payment, i) => {
                                    const isPending = payment.status === "pending" || payment.status === "under_review";
                                    return (
                                        <TableRow key={payment.id || i} className="hover:bg-muted/50 transition-colors border-border">
                                            <TableCell className="font-medium text-foreground">
                                                {payment.date ? new Date(payment.date).toLocaleDateString() : "—"}
                                            </TableCell>
                                            <TableCell className="font-mono text-xs text-muted-foreground">
                                                {payment.reference}
                                            </TableCell>
                                            <TableCell className="font-bold text-foreground">
                                                RD$ {Number(payment.amount || 0).toLocaleString()}
                                            </TableCell>
                                            <TableCell>
                                                {isPending ? (
                                                    <Badge className="bg-amber-50 text-amber-700 border-amber-200 font-bold text-[10px]">
                                                        Pendiente de validación
                                                    </Badge>
                                                ) : (
                                                    <Badge className="bg-emerald-50 text-emerald-700 border-none shadow-none font-bold text-[10px]">
                                                        COMPLETADO
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {!isPending && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-primary hover:text-primary hover:bg-blue-50 gap-2"
                                                        onClick={() => handleDownloadReceipt(payment)}
                                                    >
                                                        <Download className="w-4 h-4" /> Recibo
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <div className="mt-8 p-6 bg-slate-100/80 rounded-xl border border-slate-200/50 flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                    <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                    <h4 className="font-bold text-slate-900 text-sm">Tu suscripción está segura</h4>
                    <p className="text-xs text-slate-500 leading-relaxed mt-1">
                        Validamos los pagos en menos de 24 horas. Cualquier duda, contacta a soporte.
                    </p>
                </div>
            </div>
        </div>
    );
}
