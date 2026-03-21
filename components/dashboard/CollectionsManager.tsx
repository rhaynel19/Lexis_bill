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
import { Phone, Mail, MessageCircle, FileText, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface DebtorsListProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CollectionsManager({ isOpen, onClose }: DebtorsListProps) {
  const [loading, setLoading] = useState(true);
  const [debtors, setDebtors] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

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
      setDebtors(res.debtors || []);
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
    const msg = encodeURIComponent(`Hola ${debtor.clientName}, de parte de Lexis Bill le recordamos que tiene un balance pendiente de ${formatCurrency(debtor.totalBalance)}. Puede realizar su pago vía transferencia.`);
    window.open(`https://wa.me/${cleanPhone}?text=${msg}`, "_blank");
  };

  const handleEmail = (debtor: any) => {
    if (!debtor.email) {
      toast.error("El cliente no tiene un correo registrado.");
      return;
    }
    window.location.href = `mailto:${debtor.email}?subject=Recordatorio de Pago&body=Hola ${debtor.clientName}, le recordamos su balance pendiente de ${formatCurrency(debtor.totalBalance)}.`;
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
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-xl border border-amber-100 dark:border-amber-900/40">
                <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold uppercase tracking-wider">Total por Cobrar</p>
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                  {formatCurrency(debtors.reduce((s, d) => s + d.totalBalance, 0))}
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Clientes Deudores</p>
                <p className="text-2xl font-bold">{debtors.length}</p>
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
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
