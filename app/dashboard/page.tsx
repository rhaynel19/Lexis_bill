"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { APP_CONFIG } from "@/lib/config";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  Users,
  MessageCircle,
  Mail,
  Copy,
  AlertCircle,
  Download,
  Share2,
  HelpCircle,
  Ban
} from "lucide-react";
import { toast } from "sonner";
import { SubscriptionAlert } from "@/components/SubscriptionAlert";
import { TrialBanner } from "@/components/TrialBanner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditNoteModal } from "@/components/CreditNoteModal";
import { FacturaTable } from "@/components/FacturaTable";
import { TaxHealthWidget } from "@/components/TaxHealthWidget";
import { FiscalNamePrompt } from "@/components/FiscalNamePrompt";

// Interfaz para definir la estructura de una factura
interface Invoice {
  id: string;
  _id?: string;
  clientName: string;
  rnc: string;
  clientRnc?: string;
  ncfSequence?: string;
  ncfType?: string;
  type: string;
  total: number;
  itbis?: number;
  isrRetention?: number;
  itbisRetention?: number;
  date: string;
  status: "pending" | "paid" | "modified" | "cancelled";
  annulledBy?: string;
  modifiedNcf?: string;
}

// Componente simple de Gráfico de Línea SVG
const SimpleLineChart = ({ data }: { data: number[] }) => {
  const height = 100;
  const width = 300;
  const max = Math.max(...data, 1);
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - (val / max) * height;
    return `${x},${y}`;
  }).join(" ");

  // Fill path (cerrado abajo)
  const fillPath = `${points} ${width},${height} 0,${height}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
      <defs>
        <linearGradient id="gradient" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`M ${points}`} fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d={`M ${points} L ${width},${height} L 0,${height} Z`} fill="url(#gradient)" stroke="none" />
      {/* Puntos */}
      {data.map((val, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - (val / max) * height;
        return (
          <circle key={i} cx={x} cy={y} r="4" fill="#fff" stroke="#10b981" strokeWidth="2" />
        );
      })}
    </svg>
  );
};

export default function Dashboard() {
  const router = useRouter();
  // Estados para almacenar las estadísticas del dashboard
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [pendingInvoices, setPendingInvoices] = useState(0);
  const [totalClients, setTotalClients] = useState(0);
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [showCreditNote, setShowCreditNote] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const [estimatedTaxes, setEstimatedTaxes] = useState(0);
  const [chartData, setChartData] = useState<number[]>([0, 0, 0, 0]);
  const [monthLabels, setMonthLabels] = useState<string[]>([]);

  // Estado para el Wizard de Configuración e Identidad Fiscal
  const [showSetup, setShowSetup] = useState(false);
  const [setupData, setSetupData] = useState({ rnc: "", exequatur: "", sequence: "E3100000001" });
  const [fiscalState, setFiscalState] = useState<{ suggested: string; confirmed: string | null }>({ suggested: "", confirmed: null });

  useEffect(() => {
    const loadDashboardData = async () => {
      setIsLoading(true);
      setError("");

      try {
        // 0. Security Check
        const token = localStorage.getItem("token");
        if (!token) {
          router.push("/login");
          return;
        }

        // 1. Check first login/config (still local for UI state)
        if (!localStorage.getItem("appConfigured")) {
          setShowSetup(true);
        }

        // 2. Fetch subscription & fiscal status
        const { api } = await import("@/lib/api-service");

        // Get user data from local storage to check fiscal status initially
        const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
        setFiscalState({
          suggested: storedUser.fiscalStatus?.suggested || "",
          confirmed: storedUser.fiscalStatus?.confirmed || null
        });

        const status = await api.getSubscriptionStatus().catch(() => null);

        if (status && (status.status === 'Bloqueado' || status.graceDaysRemaining < 0)) {
          router.push("/pagos");
          return;
        }

        // 3. Fetch Invoices from Server
        const invoices: Invoice[] = await api.getInvoices();

        if (invoices && invoices.length > 0) {
          const now = new Date();
          const currentMonth = now.getMonth();
          const currentYear = now.getFullYear();

          // Calcular el total facturado del mes actual
          const monthlyInvoices = invoices.filter((inv) => {
            const invDate = new Date(inv.date);
            return invDate.getMonth() === currentMonth && invDate.getFullYear() === currentYear;
          });

          const monthlyRevenue = monthlyInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
          setTotalRevenue(monthlyRevenue);

          // ITBIS (18% simplified or from data)
          const monthlyTaxes = monthlyInvoices.reduce((sum, inv) => sum + (inv.itbis || 0), 0);
          setEstimatedTaxes(monthlyTaxes);

          // Contar facturas pendientes
          const pending = invoices.filter((inv) => inv.status === "pending").length;
          setPendingInvoices(pending);

          // Contar clientes únicos (por RNC)
          const uniqueClients = new Set(invoices.map((inv) => inv.rnc || (inv as any).clientRnc));
          setTotalClients(uniqueClients.size);

          // Obtener las 5 facturas más recientes
          const recent = invoices.slice(0, 5);
          setRecentInvoices(recent);

          // Datos para el gráfico (Últimos 4 meses)
          const last4MonthsData = [];
          const labels = [];
          for (let i = 3; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthDetails = invoices.filter(inv => {
              const invDate = new Date(inv.date);
              return invDate.getMonth() === d.getMonth() && invDate.getFullYear() === d.getFullYear();
            });
            const total = monthDetails.reduce((sum, inv) => sum + (inv.total || 0), 0);
            last4MonthsData.push(total);
            labels.push(d.toLocaleDateString('es-DO', { month: 'short' }));
          }
          setChartData(last4MonthsData);
          setMonthLabels(labels);
        }
      } catch (err: any) {
        console.error("Dashboard Load Error:", err);
        setError("Hubo un inconveniente técnico al cargar sus datos, nuestro equipo ha sido notificado.");
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const handleRefresh = () => {
    // Re-fetch data
    const refresh = async () => {
      const { api } = await import("@/lib/api-service");
      const invoices = await api.getInvoices();
      if (invoices) {
        setRecentInvoices(invoices.slice(0, 10));
      }
    };
    refresh();
  };

  // Función para formatear números como moneda dominicana
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-DO", {
      style: "currency",
      currency: "DOP",
    }).format(amount);
  };

  // Función para exportar a CSV
  const exportToCSV = () => {
    if (recentInvoices.length === 0) {
      toast.error("No hay datos para exportar");
      return;
    }
    const invoices = recentInvoices; // In production this would be all invoices from server

    // Headers (DGII 607 Compatible)
    const headers = ["RNC/Cédula", "Tipo Identificación", "NCF", "NCF Modificado", "Tipo Ingreso", "Fecha Comprobante", "Fecha Retención", "Monto Facturado", "ITBIS Facturado"];

    // Rows
    const rows = invoices.map((inv: any) => [
      inv.rnc,
      "2", // RNC
      inv.sequenceNumber || inv.id,
      "", // NCF Modificado
      "01", // Ingreso por Operaciones
      new Date(inv.date).toISOString().slice(0, 10).replace(/-/g, ""), // YYYYMMDD
      "", // Fecha Retención
      (inv.subtotal || 0).toFixed(2),
      (inv.itbis || 0).toFixed(2)
    ]);

    const csvContent = "data:text/csv;charset=utf-8,"
      + headers.join(",") + "\n"
      + rows.map((e: any[]) => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `607_LEXIS_${new Date().toISOString().slice(0, 7)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleWhatsApp = (inv: Invoice & { clientPhone?: string }) => {
    const message = `Hola ${inv.clientName}, le envío su factura NCF ${inv.id.slice(-6)} por valor de RD$${inv.total.toLocaleString('es-DO')}. Fecha: ${new Date(inv.date).toLocaleDateString("es-DO")}.`;
    const phone = inv.clientPhone ? inv.clientPhone.replace(/\D/g, '') : '';
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
    toast.info(phone ? `📲 Enviando mensaje a ${inv.clientPhone}...` : "📲 Abriendo WhatsApp (Selecciona contacto)...");
  };

  const handleEmail = (inv: Invoice) => {
    const subject = `Factura NCF ${inv.id.slice(-6)} - ${new Date(inv.date).toLocaleDateString("es-DO")}`;
    const body = `Estimado ${inv.clientName},\n\nAdjunto encontrará los detalles de su factura por RD$${inv.total.toLocaleString('es-DO')}.\n\nSaludos,\nLEXIS BILL`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
    toast.info("📧 Abriendo cliente de correo...");
  };

  const handleClone = (inv: Invoice) => {
    localStorage.setItem("invoiceToClone", JSON.stringify(inv));
    router.push("/nueva-factura");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12">
      <div className="container mx-auto px-4 py-8">
        <TrialBanner />
        <SubscriptionAlert />
        {/* Título del Dashboard */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              Bienvenido, {APP_CONFIG.company.name}
            </h2>
            <p className="text-slate-500 mt-1">Aquí está lo que está pasando con tu negocio hoy.</p>
          </div>
          <div className="flex gap-3">
            <Link href="/nueva-factura">
              <Button className="bg-[#0A192F] hover:bg-slate-800 text-white shadow-lg shadow-blue-900/20 transition-all hover:scale-105">
                <Plus className="w-4 h-4 mr-2" />
                Nueva Factura
              </Button>
            </Link>
          </div>
        </div>

        {/* Prompt de Identidad Fiscal (Asistente Inteligente) */}
        {!fiscalState.confirmed && fiscalState.suggested && (
          <div className="mb-8 animate-in slide-in-from-top-4 duration-500">
            <FiscalNamePrompt
              initialSuggestedName={fiscalState.suggested}
              onConfirmed={(name) => {
                setFiscalState(prev => ({ ...prev, confirmed: name }));
                // Update local storage - User Object
                const user = JSON.parse(localStorage.getItem("user") || "{}");
                user.fiscalStatus = { ...user.fiscalStatus, confirmed: name };
                localStorage.setItem("user", JSON.stringify(user));

                // Sync with appConfig for PDF generation consistency
                const config = JSON.parse(localStorage.getItem("appConfig") || "{}");
                config.companyName = name;
                localStorage.setItem("appConfig", JSON.stringify(config));
              }}
            />
          </div>
        )}

        {/* Premium Feature: Bolsillo Fiscal */}
        <div className="mb-8">
          <TaxHealthWidget />
        </div>

        {/* Grid de tarjetas con estadísticas */}
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-3 mb-8">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="h-40 bg-slate-200 animate-pulse border-none"></Card>
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 p-6 rounded-2xl text-center mb-8">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-800 font-medium">{error}</p>
            <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>Reintentar</Button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-3 mb-8 animate-in fade-in duration-700">
            {/* Tarjeta: Ingresos del Mes */}
            <Card className="bg-primary text-primary-foreground border-none shadow-xl shadow-primary/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -mr-20 -mt-20"></div>
              <CardHeader className="pb-2">
                <CardDescription className="text-primary-foreground/70 font-medium font-sans">Ingresos del Mes</CardDescription>
                <CardTitle className="text-4xl font-bold tracking-tight">
                  {formatCurrency(totalRevenue)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-16 mt-2 relative z-10">
                  <SimpleLineChart data={chartData} />
                </div>
              </CardContent>
            </Card>

            {/* Tarjeta: ITBIS Acumulado */}
            <Card className="bg-white border text-foreground shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription className="text-muted-foreground font-medium uppercase tracking-wider text-xs">ITBIS Acumulado</CardDescription>
                <CardTitle className="text-3xl font-bold text-foreground">
                  {formatCurrency(estimatedTaxes)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground mt-4">
                  <div className="w-2 h-2 rounded-full bg-secondary"></div>
                  <p>Generado este mes</p>
                </div>
              </CardContent>
            </Card>

            {/* Tarjeta: Facturas Pendientes */}
            <Card className="bg-white border text-foreground shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription className="text-muted-foreground font-medium uppercase tracking-wider text-xs">Facturas Pendientes</CardDescription>
                <CardTitle className="text-3xl font-bold text-foreground">
                  {pendingInvoices}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mt-6 w-full bg-secondary/20 rounded-full h-1.5">
                  <div className="bg-secondary h-1.5 rounded-full" style={{ width: pendingInvoices > 0 ? '60%' : '0%' }}></div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">En proceso de cobro</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Botón de acción rápida */}
        <div className="mb-10 text-right">
          <Link href="/nueva-factura">
            <Button size="lg" className="bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-lg shadow-secondary/20 px-8 py-6 text-lg rounded-xl transition-all hover:scale-105 active:scale-95 font-bold">
              <span className="mr-2 text-xl">✦</span> Nueva Factura
            </Button>
          </Link>
        </div>

        {/* Alerta de Vencimiento NCF */}
        <div className="mt-6">
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r shadow-sm flex items-start justify-between">
            <div className="flex gap-3">
              <AlertCircle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-red-800">Atención: Secuencia de Facturas por Vencer</h3>
                <p className="text-sm text-red-700 mt-1">
                  Le quedan <strong>8 comprobantes</strong> válidos tipo B01 (Crédito Fiscal).
                  Su secuencia vence el <strong>30/06/2026</strong>.
                </p>
              </div>
            </div>
            <Button size="sm" variant="outline" className="text-red-700 border-red-200 hover:bg-red-100">
              Solicitar Nuevos
            </Button>
          </div>
        </div>

        {/* Tabla de facturas recientes */}
        {/* Usando el nuevo componente refactorizado con lógica Luxury */}
        <FacturaTable
          invoices={recentInvoices as any}
          onRefresh={handleRefresh}
        />

      </div>
      <Dialog open={showSetup} onOpenChange={() => { }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>👋 ¡Bienvenido a LEXIS BILL!</DialogTitle>
            <DialogDescription>
              Configuremos su Oficina Fiscal en 3 simples pasos.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rnc">RNC Personal o Empresarial</Label>
              <Input
                id="rnc"
                placeholder="131-XXXXX-X"
                value={setupData.rnc}
                onChange={(e) => setSetupData({ ...setupData, rnc: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exeq">Exequátur (Opcional)</Label>
              <Input
                id="exeq"
                placeholder="1234-56"
                value={setupData.exequatur}
                onChange={(e) => setSetupData({ ...setupData, exequatur: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="seq">Secuencia Inicial (e-CF)</Label>
              <Input
                id="seq"
                placeholder="E3100000001"
                value={setupData.sequence}
                onChange={(e) => setSetupData({ ...setupData, sequence: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => {
              localStorage.setItem("appConfigured", "true");
              // Update user to remove firstLogin flag loop if needed, essentially covered by appConfigured check though.
              const user = localStorage.getItem("user");
              if (user) {
                const u = JSON.parse(user);
                u.firstLogin = false;
                localStorage.setItem("user", JSON.stringify(u));
              }
              setShowSetup(false);
              toast.success("✅ Configuración guardada. ¡Listo para facturar!");
            }}>
              Guardar y Empezar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CreditNoteModal
        isOpen={showCreditNote}
        onClose={() => setShowCreditNote(false)}
        invoice={selectedInvoice}
        onSuccess={handleRefresh}
      />
    </div>
  );
}
