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
import { CreditCard, Check, X, Loader2, RefreshCw, AlertCircle, ImageIcon, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";

export default function AdminPagosPendientes() {
    const [payments, setPayments] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [comprobanteView, setComprobanteView] = useState<string | null>(null);
    const [searchRef, setSearchRef] = useState("");

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

    useEffect(() => {
        fetchPayments();
    }, []);

    const handleApprove = async (id: string) => {
        setProcessingId(id);
        try {
            const { api } = await import("@/lib/api-service");
            await api.approvePayment(id);
            toast.success("Pago aprobado. Membresía activada.");
            fetchPayments();
        } catch (e: any) {
            toast.error(e.message || "Error al aprobar.");
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (id: string) => {
        setProcessingId(id);
        try {
            const { api } = await import("@/lib/api-service");
            await api.rejectPayment(id);
            toast.success("Solicitud rechazada.");
            fetchPayments();
        } catch (e: any) {
            toast.error(e.message || "Error al rechazar.");
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

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Pagos Pendientes</h1>
                    <p className="text-muted-foreground text-sm">
                        Valida y aprueba las solicitudes de membresía manual (transferencia / PayPal).
                    </p>
                </div>
                <div className="flex gap-2">
                    <Link href="/admin/dashboard">
                        <Button variant="outline">Ver Estadísticas</Button>
                    </Link>
                    <Button variant="outline" size="icon" onClick={fetchPayments} disabled={isLoading}>
                        <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5" />
                        Solicitudes pendientes de validación
                    </CardTitle>
                    <CardDescription>
                        Valida los comprobantes de transferencia antes de aprobar. Busca por referencia (ej. LEX-1024) para localizar el pago. Al aprobar, el usuario se activa automáticamente y su plan queda vigente.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {payments.length > 0 && (
                        <div className="mb-4 flex items-center gap-2">
                            <Search className="w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por referencia (ej. LEX-1024)"
                                value={searchRef}
                                onChange={(e) => setSearchRef(e.target.value)}
                                className="max-w-xs"
                            />
                        </div>
                    )}
                    {isLoading ? (
                        <div className="py-12 flex justify-center text-muted-foreground">
                            <Loader2 className="w-8 h-8 animate-spin" />
                        </div>
                    ) : filteredPayments.length === 0 ? (
                        <div className="py-12 text-center text-muted-foreground space-y-2">
                            <AlertCircle className="w-12 h-12 mx-auto opacity-50" />
                            <p>{searchRef.trim() ? "Ningún pago coincide con esa referencia." : "No hay pagos pendientes en este momento."}</p>
                            <p className="text-sm">{searchRef.trim() ? "Prueba con otra referencia (ej. LEX-1024)." : "Las nuevas solicitudes aparecerán aquí."}</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Referencia</TableHead>
                                    <TableHead>Usuario</TableHead>
                                    <TableHead>Plan</TableHead>
                                    <TableHead>Método</TableHead>
                                    <TableHead>Adjunto</TableHead>
                                    <TableHead>Fecha solicitud</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredPayments.map((p) => (
                                    <TableRow key={p.id}>
                                        <TableCell>
                                            {p.reference ? (
                                                <code className="px-2 py-1 bg-muted rounded text-sm font-mono font-semibold">{p.reference}</code>
                                            ) : (
                                                <span className="text-muted-foreground text-sm">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium">{p.userName || "—"}</p>
                                                <p className="text-sm text-muted-foreground">{p.userEmail}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-medium capitalize">{p.plan}</span>
                                            <p className="text-xs text-muted-foreground capitalize">
                                                {p.billingCycle === "annual" ? "Anual" : "Mensual"}
                                            </p>
                                        </TableCell>
                                        <TableCell>
                                            <span className="capitalize">{p.paymentMethod}</span>
                                        </TableCell>
                                        <TableCell>
                                            {p.comprobanteImage ? (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="gap-1.5"
                                                    onClick={() => setComprobanteView(p.comprobanteImage)}
                                                >
                                                    <ImageIcon className="w-4 h-4" />
                                                    Ver comprobante
                                                </Button>
                                            ) : (
                                                <span className="text-muted-foreground text-sm">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {formatDate(p.requestedAt)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="default"
                                                    className="bg-green-600 hover:bg-green-700"
                                                    onClick={() => handleApprove(p.id)}
                                                    disabled={!!processingId}
                                                >
                                                    {processingId === p.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <>
                                                            <Check className="w-4 h-4 mr-1" /> Aprobar
                                                        </>
                                                    )}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => handleReject(p.id)}
                                                    disabled={!!processingId}
                                                >
                                                    {processingId === p.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <>
                                                            <X className="w-4 h-4 mr-1" /> Rechazar
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={!!comprobanteView} onOpenChange={() => setComprobanteView(null)}>
                <DialogContent className="max-w-2xl max-h-[90vh]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ImageIcon className="w-5 h-5" />
                            Comprobante de pago (adjunto)
                        </DialogTitle>
                    </DialogHeader>
                    {comprobanteView && (
                        <div className="overflow-auto max-h-[70vh]">
                            <img src={comprobanteView} alt="Comprobante" className="w-full rounded-lg border" />
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
