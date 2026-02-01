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

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [historyData, statusData] = await Promise.all([
                api.getPaymentHistory(),
                api.getSubscriptionStatus()
            ]);
            setHistory(historyData);
            setStatus(statusData);
        } catch (error) {
            console.error("Error loading payments data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownloadReceipt = (payment: any) => {
        // Simple mock receipt download
        const receiptText = `
        LEXIS BILL - RECIBO DE PAGO
        ---------------------------
        Referencia: ${payment.reference}
        Fecha: ${new Date(payment.date).toLocaleString()}
        Monto: RD$ ${payment.amount.toLocaleString()}
        Estado: COMPLETADO
        ---------------------------
        ¡Gracias por usar Lexis Bill!
        `;
        const blob = new Blob([receiptText], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `Recibo_${payment.reference}.txt`;
        link.click();
    };

    return (
        <div className="container mx-auto px-4 py-6 md:py-8 pb-28 md:pb-12 max-w-4xl">
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

            {/* Membresía: planes, método de pago, "He realizado el pago" */}
            <div className="mb-8">
                <MembershipConfig />
            </div>

            <h2 className="text-lg font-semibold mb-4">Historial y Estado</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <Card className="border-none shadow-lg bg-white">
                    <CardHeader className="pb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vencimiento</span>
                        <CardTitle className="text-xl font-bold">
                            {status?.expiryDate ? new Date(status.expiryDate).toLocaleDateString() : '—'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-slate-500">{status?.daysRemaining != null && status.daysRemaining < 999 ? `${status.daysRemaining} días restantes` : "Plan activo"}</p>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-lg bg-white">
                    <CardHeader className="pb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Acumulado</span>
                        <CardTitle className="text-2xl font-black text-slate-900">
                            RD$ {(history.reduce((acc, p) => acc + p.amount, 0)).toLocaleString()}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-slate-400">Total invertido en la plataforma</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-none shadow-2xl bg-white overflow-hidden">
                <CardHeader className="border-b border-slate-50 bg-slate-50/50">
                    <CardTitle className="text-lg font-black text-slate-800">Historial de Transacciones</CardTitle>
                    <CardDescription>Consulta tus facturas y recibos de Lexis Bill</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50 hover:bg-slate-50 border-none">
                                <TableHead className="font-black text-slate-500 text-[10px] uppercase tracking-wider">Fecha</TableHead>
                                <TableHead className="font-black text-slate-500 text-[10px] uppercase tracking-wider">Referencia</TableHead>
                                <TableHead className="font-black text-slate-500 text-[10px] uppercase tracking-wider">Monto</TableHead>
                                <TableHead className="font-black text-slate-500 text-[10px] uppercase tracking-wider">Estado</TableHead>
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
                                            description="Cuando actives tu membresía Pro, los pagos aparecerán aquí. Elige tu plan arriba."
                                        />
                                    </TableCell>
                                </TableRow>
                            ) : (
                                history.map((payment, i) => (
                                    <TableRow key={i} className="hover:bg-slate-50 transition-colors border-slate-50">
                                        <TableCell className="font-medium text-slate-600">
                                            {new Date(payment.date).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs text-slate-400">
                                            {payment.reference}
                                        </TableCell>
                                        <TableCell className="font-bold text-slate-900">
                                            RD$ {payment.amount.toLocaleString()}
                                        </TableCell>
                                        <TableCell>
                                            <Badge className="bg-emerald-50 text-emerald-700 border-none shadow-none font-bold text-[10px]">
                                                COMPLETADO
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-primary hover:text-primary hover:bg-blue-50 gap-2"
                                                onClick={() => handleDownloadReceipt(payment)}
                                            >
                                                <Download className="w-4 h-4" /> Recibo
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
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
                        Validamos los pagos en 24-48 horas. Para cualquier duda, contacta a soporte.
                    </p>
                </div>
            </div>
        </div>
    );
}
