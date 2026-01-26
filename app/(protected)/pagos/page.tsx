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
    Calendar,
    CheckCircle,
    Wallet,
    TrendingUp,
    FileText,
    ArrowLeft
} from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api-service";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Upload } from "lucide-react";

export default function PaymentsPage() {
    const [history, setHistory] = useState<any[]>([]);
    const [status, setStatus] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showPaymentModal, setShowPaymentModal] = useState(false);

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
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <Link href="/" className="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors mb-2 text-sm font-semibold">
                        <ArrowLeft className="w-4 h-4" /> Volver al Dashboard
                    </Link>
                    <h1 className="text-3xl font-black text-primary tracking-tight flex items-center gap-3">
                        <Wallet className="w-8 h-8 text-blue-600" /> Mis Pagos
                    </h1>
                </div>
                <div className="text-right flex items-center gap-3">
                    <Button onClick={() => setShowPaymentModal(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20">
                        <Upload className="w-4 h-4 mr-2" />
                        Reportar Transferencia
                    </Button>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100 px-3 py-1 font-bold">
                        PLAN PROFESIONAL
                    </Badge>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <Card className="border-none shadow-xl bg-gradient-to-br from-blue-600 to-blue-800 text-white">
                    <CardHeader className="pb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-70">Próximo Pago</span>
                        <CardTitle className="text-2xl font-black">
                            {status ? new Date(status.expiryDate).toLocaleDateString() : '...'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs opacity-80">Renovación automática RD$ 950</p>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-lg bg-white">
                    <CardHeader className="pb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Estado Suscripción</span>
                        <CardTitle className={`text-2xl font-black ${status?.status === 'Activo' ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {status?.status || '...'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-slate-400">Protección Lexis Bill activa</p>
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
                                    <TableCell colSpan={5} className="text-center py-10 text-slate-400 italic">
                                        No hay pagos registrados aún.
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

            <div className="mt-10 p-6 bg-slate-100 rounded-2xl border border-slate-200/50 flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                    <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                    <h4 className="font-black text-slate-900 text-sm">Tu suscripción está segura</h4>
                    <p className="text-xs text-slate-500 leading-relaxed mt-1">
                        Utilizamos encriptación de grado bancario para procesar tus pagos. No almacenamos los datos de tu tarjeta en nuestros servidores.
                        Para cualquier duda con tus cargos, contacta a soporte@lexisbill.com
                    </p>
                </div>
            </div>

            {/* Modal de Reporte de Pago */}
            <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Wallet className="w-5 h-5 text-emerald-600" /> Reportar Transferencia
                        </DialogTitle>
                        <DialogDescription>
                            Realiza tu transferencia y sube el comprobante aquí para activar tu cuenta.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {/* Datos Bancarios */}
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 space-y-3">
                            <h4 className="font-bold text-sm text-slate-700 mb-2">Datos para Transferencia</h4>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-slate-400 text-xs block uppercase">Banco</span>
                                    <span className="font-medium text-slate-800">Banco Popular</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 text-xs block uppercase">Tipo</span>
                                    <span className="font-medium text-slate-800">Corriente</span>
                                </div>
                                <div className="col-span-2">
                                    <span className="text-slate-400 text-xs block uppercase">Número de Cuenta</span>
                                    <div className="flex items-center justify-between">
                                        <span className="font-mono font-bold text-slate-900">712-345-6789</span>
                                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => { navigator.clipboard.writeText("7123456789"); toast.success("Copiado"); }}>
                                            <span className="sr-only">Copiar</span>
                                            <CopyIcon className="w-3 h-3 text-slate-400" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="col-span-2">
                                    <span className="text-slate-400 text-xs block uppercase">Beneficiario</span>
                                    <span className="font-medium text-slate-800">Lexis Bill Solutions SRL</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 text-xs block uppercase">RNC</span>
                                    <span className="font-medium text-slate-800">1-32-44455-1</span>
                                </div>
                            </div>
                        </div>

                        {/* Upload Mock */}
                        <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center hover:bg-slate-50 transition-colors cursor-pointer">
                            <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                            <p className="text-sm text-slate-600 font-medium">Sube tu comprobante</p>
                            <p className="text-xs text-slate-400 mt-1">PNG, JPG o PDF (Max. 5MB)</p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowPaymentModal(false)}>Cancelar</Button>
                        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => {
                            toast.success("Comprobante enviado. Su cuenta será activada en breve.");
                            setShowPaymentModal(false);
                        }}>
                            Confirmar Envío
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function CopyIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
        </svg>
    )
}
