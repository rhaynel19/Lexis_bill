"use client";

import React, { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-service";
import { Phone, Mail, MessageCircle, FileText, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

interface DebtorsListProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CollectionsManager({ isOpen, onClose }: DebtorsListProps) {
  const [loading, setLoading] = useState(true);
  const [debtors, setDebtors] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [settlingRnc, setSettlingRnc] = useState<string | null>(null);
  const [isSettling, setIsSettling] = useState(false);
  const [selectedClientName, setSelectedClientName] = useState("");
  const [clientInvoices, setClientInvoices] = useState<any[]>([]);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<string>>(new Set());
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadDebtors();
    }
  }, [isOpen]);

  async function loadDebtors() {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getDebtors();
      // Defensa ante respuestas mal estructuradas
      const debtorsData = Array.isArray(res) ? res : (res?.debtors || []);
      setDebtors(debtorsData);
    } catch (err: any) {
      console.error("Error loading debtors:", err);
      setError("No se pudieron cargar los deudores.");
    } finally {
      setLoading(false);
    }
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("es-DO", {
      style: "currency",
      currency: "DOP",
    }).format(val);
  };

  const handleWhatsApp = (debtor: any) => {
    const phone = (debtor.phone || "").replace(/[^0-9]/g, "");
    if (!phone) {
      toast.error("El cliente no tiene un teléfono registrado.");
      return;
    }
    // Prefix with 1 if it's DR and not present
    const cleanPhone = phone.length === 10 ? `1${phone}` : phone;
    const msg = encodeURIComponent(`Estimado/a cliente ${debtor.clientName}, saludos cordiales.\n\nLe contactamos amablemente para notificarle que presenta un balance pendiente de pago por la suma de *${formatCurrency(debtor.totalBalance)}*.\n\nLe invitamos a ponerse al día a la brevedad posible. En caso de requerir detalles de las facturas o haber realizado el pago, favor de hacer caso omiso o remitirnos su comprobante.\n\nAtentamente,\nDepartamento de Cobros.`);
    window.open(`https://wa.me/${cleanPhone}?text=${msg}`, "_blank");
  };

  const handleEmail = (debtor: any) => {
    if (!debtor.email) {
      toast.error("El cliente no tiene un correo registrado.");
      return;
    }
    window.location.href = `mailto:${debtor.email}?subject=Estado de Cuenta - Recordatorio de Pago&body=Estimado/a cliente ${debtor.clientName}, saludos cordiales.%0D%0A%0D%0ALe contactamos amablemente para notificarle que presenta un balance pendiente de pago por la suma de ${formatCurrency(debtor.totalBalance)}.%0D%0A%0D%0ALe invitamos a ponerse al día a la brevedad posible. Si ya ha realizado el pago, le agradecemos remitirnos el comprobante y omitir este mensaje.%0D%0A%0D%0AAtentamente,%0D%0ADepartamento de Cobros.`;
  };

  const handleStatement = async (rnc: string) => {
    try {
      toast.info("Generando estado de cuenta...");
      const res = await api.getAccountStatement(rnc);
      const lines = [
        `ESTADO DE CUENTA - ${res.customer.name}`,
        `RNC/CEDULA: ${res.customer.rnc}`,
        `FECHA: ${new Date(res.generatedAt).toLocaleString("es-DO")}`,
        "",
        `TOTAL PENDIENTE: ${formatCurrency(res.totalPending)}`,
        "",
        "DETALLE:",
        ...res.invoices.map((inv) => {
          const fecha = new Date(inv.date).toLocaleDateString("es-DO");
          return `${inv.ncf} | ${fecha} | Balance: ${formatCurrency(inv.balance)}`;
        }),
      ];
      const text = lines.join("\n");
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `estado_cuenta_${res.customer.rnc}_${new Date().toISOString().slice(0, 10)}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Estado de cuenta de ${res.customer.name} descargado.`);
    } catch (err) {
      toast.error("Error al generar el estado de cuenta.");
    }
  };

  const handleOpenSettle = async (debtor: any) => {
    setSettlingRnc(debtor._id);
    setSelectedClientName(debtor.clientName);
    setIsLoadingInvoices(true);
    setClientInvoices([]);
    setSelectedInvoiceIds(new Set());
    
    try {
      const res = await api.getAccountStatement(debtor._id);
      setClientInvoices(res.invoices);
      setSelectedInvoiceIds(new Set(res.invoices.map((i: any) => i.id)));
    } catch (err) {
      toast.error("Error al cargar las facturas del cliente.");
    } finally {
      setIsLoadingInvoices(false);
    }
  };

  const handleSettle = async () => {
    if (!settlingRnc) return;
    if (selectedInvoiceIds.size === 0) {
      toast.error("Selecciona al menos una factura para saldar.");
      return;
    }
    try {
      setIsSettling(true);
      await api.settleDebtorBalance(settlingRnc, 'efectivo', Array.from(selectedInvoiceIds));
      toast.success("Balance actualizado correctamente.");
      setSettlingRnc(null);
      loadDebtors();
    } catch (err: any) {
      toast.error(err?.message || "Error al saldar balance.");
    } finally {
      setIsSettling(false);
    }
  };

  const toggleInvoiceSelection = (id: string) => {
    const next = new Set(selectedInvoiceIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedInvoiceIds(next);
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="sm:max-w-[700px] w-full overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-2xl font-bold flex items-center gap-2">
            <AlertCircle className="text-amber-500" />
            Gestión de Cobros
          </SheetTitle>
          <SheetDescription>
            Listado de clientes con balances pendientes. Gestione sus cobros de manera eficiente.
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="animate-spin h-10 w-10 text-primary" />
            <p className="text-muted-foreground">Cargando deudores...</p>
          </div>
        ) : error ? (
          <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-center gap-3">
            <AlertCircle />
            <span>{error}</span>
          </div>
        ) : debtors.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed rounded-xl">
            <p className="text-muted-foreground">No se detectaron balances pendientes de cobro.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-xl border border-amber-100 dark:border-amber-900/40">
                <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold uppercase tracking-wider">Total por Cobrar</p>
                <p className="text-lg xs:text-xl sm:text-2xl font-bold text-amber-700 dark:text-amber-300 break-words">
                  {formatCurrency(debtors.reduce((s, d) => s + d.totalBalance, 0))}
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Clientes Deudores</p>
                <p className="text-lg sm:text-2xl font-bold">{debtors.length}</p>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Total Pendiente</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {debtors.map((debtor) => (
                  <TableRow key={debtor._id} className="group transition-colors">
                    <TableCell>
                      <div className="font-medium text-slate-800 dark:text-slate-200">{debtor.clientName}</div>
                      <div className="text-xs text-slate-500">{debtor._id} • {debtor.invoiceCount} factura(s)</div>
                    </TableCell>
                    <TableCell className="font-semibold text-amber-600 dark:text-amber-400">
                      {formatCurrency(debtor.totalBalance)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          title="WhatsApp" 
                          onClick={() => handleWhatsApp(debtor)}
                          className="hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950/20"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          title="Llamar" 
                          onClick={() => debtor.phone ? window.open(`tel:${debtor.phone}`) : toast.error("No hay teléfono")}
                          className="hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                        >
                          <Phone className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          title="Email" 
                          onClick={() => handleEmail(debtor)}
                          className="hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="ml-2 gap-1"
                          onClick={() => handleStatement(debtor._id)}
                        >
                          <FileText className="h-3.5 w-3.5" />
                          Estado
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          title="Saldar balance" 
                          onClick={() => handleOpenSettle(debtor)}
                          className="hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <Dialog open={!!settlingRnc} onOpenChange={(o) => !o && setSettlingRnc(null)}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="text-emerald-500" /> Saldar Balance
              </DialogTitle>
              <DialogDescription>
                Selecciona las facturas de <strong>{selectedClientName}</strong> que deseas marcar como pagadas.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              {isLoadingInvoices ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="animate-spin h-6 w-6 text-primary" />
                </div>
              ) : clientInvoices.length === 0 ? (
                <p className="text-sm text-center text-muted-foreground">No hay facturas pendientes.</p>
              ) : (
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                  {clientInvoices.map(inv => (
                    <label key={inv.id} className="flex items-start gap-3 p-3 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors">
                      <input 
                        type="checkbox" 
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600"
                        checked={selectedInvoiceIds.has(inv.id)}
                        onChange={() => toggleInvoiceSelection(inv.id)}
                      />
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-sm">{inv.ncf}</span>
                          <span className="font-bold text-emerald-600">{formatCurrency(inv.balance)}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">Fecha: {new Date(inv.date).toLocaleDateString('es-DO')}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter className="mt-2 flex flex-col sm:flex-row gap-2 justify-between items-center">
              <div className="text-sm font-semibold mb-2 sm:mb-0 w-full sm:w-auto">
                Total: <span className="text-emerald-600">{formatCurrency(
                  clientInvoices.filter(i => selectedInvoiceIds.has(i.id)).reduce((acc, i) => acc + i.balance, 0)
                )}</span>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button variant="outline" onClick={() => setSettlingRnc(null)} disabled={isSettling} className="flex-1 sm:flex-none">
                  Cancelar
                </Button>
                <Button onClick={handleSettle} disabled={isSettling || isLoadingInvoices || clientInvoices.length === 0} className="bg-emerald-600 hover:bg-emerald-700 text-white flex-1 sm:flex-none">
                  {isSettling ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saldando...
                    </>
                  ) : (
                    "Saldar Selección"
                  )}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  );
}
