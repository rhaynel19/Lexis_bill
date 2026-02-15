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
  AlertTriangle,
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
import { InvoiceControlCenter } from "@/components/dashboard/InvoiceControlCenter";
import { TaxHealthWidget } from "@/components/TaxHealthWidget";
import { FiscalNamePrompt } from "@/components/FiscalNamePrompt";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { SmartTutorial } from "@/components/SmartTutorial";
import { EmotionalStatusWidget } from "@/components/dashboard/EmotionalStatusWidget";
import { LexisBusinessCopilot } from "@/components/dashboard/LexisBusinessCopilot";
import { AlertsBanner } from "@/components/AlertsBanner";
import { NewInvoiceButton } from "@/components/NewInvoiceButton";

import { usePreferences } from "@/components/providers/PreferencesContext";
import { useAuth } from "@/components/providers/AuthContext";
import { cn } from "@/lib/utils";

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
  status: "pending" | "paid" | "modified" | "cancelled" | "recibida" | "rechazada" | "condicional";
  annulledBy?: string;
  modifiedNcf?: string;
  sequenceNumber?: string;
  subtotal?: number;
}

// Interfaz para configuración de NCF (API devuelve también expiryDate)
interface NcfSetting {
  type: string;
  finalNumber: number;
  currentValue: number;
  isActive: boolean;
  expiryDate?: string;
}
// Resumen de una secuencia para mostrar en el dashboard
interface NcfSequenceSummary {
  type: string;
  typeLabel: string;
  remaining: number;
  expiryDate: string;
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
  const [previousMonthRevenue, setPreviousMonthRevenue] = useState(0);
  const [pendingInvoices, setPendingInvoices] = useState(0);
  const [predictiveAlerts, setPredictiveAlerts] = useState<string[]>([]);
  const [totalClients, setTotalClients] = useState(0);
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const { mode, profession } = usePreferences();
  const { user: authUser, refresh } = useAuth();

  const [estimatedTaxes, setEstimatedTaxes] = useState(0);
  const [chartData, setChartData] = useState<number[]>([0, 0, 0, 0]);
  const [monthLabels, setMonthLabels] = useState<string[]>([]);

  // Estado para el Wizard de Configuración e Identidad Fiscal
  const [fiscalState, setFiscalState] = useState<{ suggested: string; confirmed: string | null }>({ suggested: "", confirmed: null });
  const [isFiscalHealthy, setIsFiscalHealthy] = useState(true);
  const [lowNcfType, setLowNcfType] = useState<string | null>(null);
  const [ncfSequenceSummary, setNcfSequenceSummary] = useState<NcfSequenceSummary | null>(null);
  const [ncfLowSequence, setNcfLowSequence] = useState<NcfSequenceSummary | null>(null);
  const [lexisContextualMessage, setLexisContextualMessage] = useState<string>("");
  const [monthlyStats, setMonthlyStats] = useState<{ revenue: number; invoiceCount: number; clientCount: number } | undefined>(undefined);
  const [targetInvoices, setTargetInvoices] = useState<number | undefined>(undefined);
  const userName = authUser?.name ?? "";
  // Nombre para el saludo: perfil del usuario (configuración) > nombre fiscal > nombre de usuario
  const [welcomeName, setWelcomeName] = useState(userName || authUser?.fiscalStatus?.confirmed || APP_CONFIG.company.name);
  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("appConfig") : null;
      const appConfig = raw ? JSON.parse(raw) : {};
      const fromConfig = appConfig.companyName || appConfig.name;
      const name = fromConfig || authUser?.fiscalStatus?.confirmed || userName || APP_CONFIG.company.name;
      setWelcomeName(name || APP_CONFIG.company.name);
    } catch {
      setWelcomeName(userName || authUser?.fiscalStatus?.confirmed || APP_CONFIG.company.name);
    }
  }, [authUser?.fiscalStatus?.confirmed, userName]);

  useEffect(() => {
    let cancelled = false;
    
    const loadDashboardData = async () => {
      setIsLoading(true);
      setError("");

      try {
        if (!authUser) {
          if (!cancelled) router.push("/login");
          return;
        }

        // ✅ Verificar ruta actual ANTES de redirigir
        if (typeof window !== "undefined" && window.location.pathname === '/pagos') {
          if (!cancelled) setIsLoading(false);
          return; // Ya está en la página correcta
        }

        if (cancelled) return;

        setFiscalState({
          suggested: authUser.fiscalStatus?.suggested || "",
          confirmed: authUser.fiscalStatus?.confirmed || null
        });

        // 2. Fetch subscription & fiscal status
        const { api } = await import("@/lib/api-service");

        // ✅ Forzar fetch sin cache para estado crítico
        const status = await api.getSubscriptionStatus(true).catch(() => null);

        if (cancelled) return;

        // ✅ CORREGIDO: Solo redirigir si shouldRedirect es true (PAST_DUE o SUSPENDED)
        // NO redirigir durante GRACE_PERIOD, PENDING_PAYMENT o UNDER_REVIEW (permitir acceso parcial)
        if (status && status.shouldRedirect === true) {
          // ✅ Usar replace en vez de push para evitar historial
          if (!cancelled) router.replace("/pagos");
          return;
        }
        // Si está en GRACE_PERIOD, PENDING_PAYMENT o UNDER_REVIEW, permitir acceso parcial (mostrar banner)

        // 3. Fetch Invoices from Server (paginado: 200 para stats del dashboard)
        const invRes = await api.getInvoices(1, 200);
        const invoices: Invoice[] = invRes?.data || [];

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

          // Ingresos del mes anterior (para insight real)
          const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
          const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
          const previousMonthlyInvoices = invoices.filter((inv) => {
            const invDate = new Date(inv.date);
            return invDate.getMonth() === prevMonth && invDate.getFullYear() === prevYear;
          });
          const prevRevenue = previousMonthlyInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
          setPreviousMonthRevenue(prevRevenue);
          setTargetInvoices(Math.max(previousMonthlyInvoices.length, 1));

          // ITBIS (18% simplified or from data)
          const monthlyTaxes = monthlyInvoices.reduce((sum, inv) => sum + (inv.itbis || 0), 0);
          setEstimatedTaxes(monthlyTaxes);

          // Contar facturas pendientes
          const pending = invoices.filter((inv) => inv.status === "pending").length;
          setPendingInvoices(pending);

          // Contar clientes únicos (por RNC)
          const uniqueClients = new Set(invoices.map((inv) => inv.rnc || inv.clientRnc || ""));
          setTotalClients(uniqueClients.size);

          // Facturas para Centro de Control (50 para tabla con paginación)
          setRecentInvoices(invoices.slice(0, 50));

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

          // Resumen mensual para Lexis
          setMonthlyStats({
            revenue: monthlyRevenue,
            invoiceCount: monthlyInvoices.length,
            clientCount: uniqueClients.size
          });
        }

        // Check NCF Health + predictive alerts con datos reales
        try {
          const ncfSettings = await api.getNcfSettings() as NcfSetting[];
          const typeToLabel: Record<string, string> = { "01": "B01", "02": "B02", "31": "E31", "32": "E32", "14": "B14", "15": "B15", "44": "E44", "45": "E45" };
          const activeSettings = (ncfSettings || []).filter((s: NcfSetting) => s.isActive);
          let firstSummary: NcfSequenceSummary | null = null;
          let lowSummary: NcfSequenceSummary | null = null;
          for (const s of activeSettings) {
            const remaining = (s.finalNumber ?? 0) - (s.currentValue ?? 0);
            const expiryStr = s.expiryDate
              ? new Date(s.expiryDate).toLocaleDateString("es-DO", { day: "2-digit", month: "2-digit", year: "numeric" })
              : "";
            const summary: NcfSequenceSummary = {
              type: s.type,
              typeLabel: typeToLabel[s.type] || `tipo ${s.type}`,
              remaining: Math.max(0, remaining),
              expiryDate: expiryStr
            };
            if (!firstSummary) firstSummary = summary;
            if (remaining < 20 && remaining >= 0 && !lowSummary) {
              lowSummary = summary;
              setIsFiscalHealthy(false);
              setLowNcfType(s.type);
            }
          }
          setNcfSequenceSummary(firstSummary);
          setNcfLowSequence(lowSummary);
          // Alertas predictivas con datos reales (NCF, pendientes, clientes recurrentes)
          const { PredictiveService: Pred } = await import("@/lib/predictive-service");
          const pending = (invRes?.data || []).filter((inv: Invoice) => inv.status === "pending").length;
          const alerts = Pred.getPredictiveAlerts({
            ncfSettings: ncfSettings as { type: string; currentValue: number; finalNumber: number; isActive?: boolean }[],
            invoices: (invRes?.data || []) as { date: string; total?: number; status?: string; rnc?: string; clientRnc?: string; clientName?: string }[],
            pendingCount: pending
          });
          setPredictiveAlerts(alerts);

          // Mensaje contextual de Lexis
          const todayStr = new Date().toISOString().slice(0, 10);
          const invoicesToday = (invRes?.data || []).filter((inv: { date?: string }) => inv.date && inv.date.startsWith(todayStr));
          const dayOfMonth = new Date().getDate();
          if (invoicesToday.length === 0 && (invRes?.data || []).length > 0) {
            setLexisContextualMessage("Hoy no has emitido facturas. ¿Creamos una?");
          } else if (lowSummary) {
            setLexisContextualMessage(`Tu secuencia ${lowSummary.typeLabel} se está agotando (quedan ${lowSummary.remaining}). ¿Te guío para solicitar más?`);
          } else if (pending > 0) {
            setLexisContextualMessage(`Tienes ${pending} factura${pending !== 1 ? "s" : ""} pendiente${pending !== 1 ? "s" : ""} de cobro. ¿Te ayudo con un recordatorio?`);
          } else if (dayOfMonth >= 25) {
            setLexisContextualMessage("Se acerca el cierre de mes. ¿Ya tienes listos tus reportes 606 y 607?");
          } else {
            setLexisContextualMessage("Aquí está tu resumen. ¿En qué te ayudo hoy?");
          }
        } catch (e) { console.error("NCF Settings Fetch Error:", e); }

        // Si no hay facturas, establecer stats en cero
        if (!invRes?.data || (invRes.data as unknown[]).length === 0) {
          setMonthlyStats({ revenue: 0, invoiceCount: 0, clientCount: 0 });
          setTargetInvoices(undefined);
          setLexisContextualMessage("Aún no hay facturas. ¿Creamos la primera juntos?");
        }
      } catch (err: unknown) {
        if (!cancelled) {
          console.error("Dashboard Load Error:", err);
          setError("Hubo un inconveniente técnico al cargar sus datos. Usa «Reintentar» o recarga la página.");
          toast.error("No pudimos cargar el dashboard. Revisa tu conexión e intenta de nuevo.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadDashboardData();

    // Check for setup requirement from redirect
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("setup") === "required") {
        toast.error("⚠️ Identidad Fiscal Requerida", {
          description: "Confirma tu nombre fiscal para poder emitir comprobantes válidos.",
          duration: 5000
        });
      }
    }
    
    return () => {
      cancelled = true;
    };
  }, [authUser, router]);

  const handleRefresh = () => {
    const refresh = async () => {
      const { api } = await import("@/lib/api-service");
      const invRes = await api.getInvoices(1, 200);
      const invoices = invRes?.data || [];
      setRecentInvoices(invoices.slice(0, 50));
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
    const rows: string[][] = invoices.map((inv: Invoice) => [
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
      + rows.map((e: string[]) => e.join(",")).join("\n");

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
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24 md:pb-12">
      <div className="container mx-auto px-4 py-8">
        <TrialBanner />
        <SubscriptionAlert />
        {/* Lexis Business Copilot: observa tu negocio, alertas, scoring, predicción */}
        {!isLoading && <LexisBusinessCopilot />}

        {/* Alertas proactivas: NCF bajo, secuencias por vencer, suscripción */}
        <AlertsBanner />

        {/* Título del Dashboard */}
        <div className="mb-8 px-1">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">Tu negocio hoy</h2>
          <p className="text-sm md:text-base text-muted-foreground mt-1">Resumen de ingresos, facturas y pendientes.</p>
        </div>

        {/* Prompt de Identidad Fiscal o Bloqueo Informativo */}
        {!fiscalState.confirmed ? (
          fiscalState.suggested ? (
            <div className="mb-8 animate-in slide-in-from-top-4 duration-500">
              <FiscalNamePrompt
                initialSuggestedName={fiscalState.suggested}
                onConfirmed={async (name) => {
                  setFiscalState(prev => ({ ...prev, confirmed: name }));
                  const { api } = await import("@/lib/api-service");
                  await api.confirmFiscalName(name);
                  await refresh();
                  const config = JSON.parse(localStorage.getItem("appConfig") || "{}");
                  config.companyName = name;
                  localStorage.setItem("appConfig", JSON.stringify(config));
                }}
              />
            </div>
          ) : (
            <Card className="mb-8 border-red-100 bg-red-50/50 shadow-lg border-l-4 border-l-red-500">
              <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-start gap-4 text-center md:text-left">
                  <div className="w-12 h-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center shrink-0">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-red-900 font-bold text-lg">Configuración Pendiente</h3>
                    <p className="text-red-700 text-sm max-w-md">
                      Para poder emitir facturas con valor fiscal, primero debes completar tu perfil y confirmar tu RNC en la sección de configuración.
                    </p>
                  </div>
                </div>
                <Link href="/configuracion" className="w-full md:w-auto">
                  <Button className="w-full md:w-auto bg-red-600 hover:bg-red-700 text-white font-bold px-8 py-6 rounded-xl shadow-lg shadow-red-600/20 active:scale-95 transition-all">
                    Configurar Perfil Fiscal
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )
        ) : null}

        {/* Premium Feature: Bolsillo Fiscal (Advanced) / Emotional State (Simple) */}
        <div className="mb-8">
          <EmotionalStatusWidget
            ncfHealthy={isFiscalHealthy}
            blockers={!fiscalState.confirmed ? ["Perfil Fiscal incompleto"] : []}
          />
          <div className="mt-4">
            <TaxHealthWidget />
          </div>
        </div>

        {/* Grid de tarjetas con estadísticas */}
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-3 mb-8">
            <div className="col-span-3 flex items-center gap-3 text-muted-foreground text-sm">
              <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin shrink-0"></div>
              Revisando tus datos...
            </div>
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
                <CardDescription className="text-primary-foreground/70 font-medium font-sans text-xs md:text-sm">
                  {mode === 'simple' ? "Cobrado este mes" : "Ingresos del Mes"}
                </CardDescription>
                <CardTitle className="text-3xl md:text-4xl font-bold tracking-tight">
                  {formatCurrency(totalRevenue)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-16 mt-2 relative z-10">
                  <SimpleLineChart data={chartData} />
                </div>
              </CardContent>
            </Card>

            {/* Tarjeta: ITBIS Acumulado (Hidden in Simple Mode) */}
            {mode !== 'simple' && (
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
            )}

            {/* Tarjeta: Facturas Pendientes */}
            <Card className="bg-white border text-foreground shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription className="text-muted-foreground font-medium uppercase tracking-wider text-xs">
                  {mode === 'simple' ? "Te deben (Por cobrar)" : "Facturas Pendientes"}
                </CardDescription>
                <CardTitle className="text-3xl font-bold text-foreground">
                  {pendingInvoices}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mt-6 w-full bg-secondary/20 rounded-full h-1.5">
                  <div className={cn("bg-secondary h-1.5 rounded-full transition-all", pendingInvoices > 0 ? "w-[60%]" : "w-0")}></div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">En proceso de cobro</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Estado de secuencia NCF: alerta solo si quedan pocos; si no, mensaje informativo con datos reales */}
        {(ncfLowSequence || ncfSequenceSummary) && (
          <div className="mt-6">
            {ncfLowSequence ? (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r shadow-sm flex flex-col md:flex-row items-center md:items-start justify-between gap-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-red-800 text-sm md:text-base">Secuencia de Facturas por Vencer</h3>
                    <p className="text-xs md:text-sm text-red-700 mt-1">
                      Le quedan <strong>{ncfLowSequence.remaining} comprobante{ncfLowSequence.remaining !== 1 ? "s" : ""}</strong> válido{ncfLowSequence.remaining !== 1 ? "s" : ""} tipo {ncfLowSequence.typeLabel}.
                      {ncfLowSequence.expiryDate && (
                        <> Su secuencia vence el <strong>{ncfLowSequence.expiryDate}</strong>.</>
                      )}
                    </p>
                  </div>
                </div>
                <Link href="/configuracion" className="w-full md:w-auto">
                  <Button size="sm" variant="outline" className="w-full md:w-auto text-red-700 border-red-200 hover:bg-red-100">
                    Solicitar Nuevos
                  </Button>
                </Link>
              </div>
            ) : ncfSequenceSummary && ncfSequenceSummary.remaining >= 20 ? (
              <div className="bg-slate-50 border-l-4 border-slate-300 p-4 rounded-r shadow-sm flex flex-col sm:flex-row items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm md:text-base">Comprobantes fiscales</h3>
                  <p className="text-xs md:text-sm text-slate-600 mt-1">
                    Tienes <strong>{ncfSequenceSummary.remaining} comprobante{ncfSequenceSummary.remaining !== 1 ? "s" : ""}</strong> válido{ncfSequenceSummary.remaining !== 1 ? "s" : ""} tipo {ncfSequenceSummary.typeLabel}.
                    {ncfSequenceSummary.expiryDate && (
                      <> La secuencia vence el <strong>{ncfSequenceSummary.expiryDate}</strong>.</>
                    )}
                  </p>
                </div>
                <Link href="/configuracion" className="text-sm font-medium text-primary hover:underline shrink-0">
                  Ver en Configuración
                </Link>
              </div>
            ) : null}
          </div>
        )}

        {/* Centro de Control Inteligente — Facturas */}
        <InvoiceControlCenter
          invoices={recentInvoices}
          onRefresh={handleRefresh}
          isLoading={isLoading}
        />

      </div>
      <OnboardingWizard />
      <SmartTutorial />

      {/* Botón flotante — Nueva Factura (solo desktop; en móvil usa el FAB circular del layout) */}
      <div className="hidden md:block fixed bottom-6 right-6 z-50">
        <NewInvoiceButton variant="inline" className="h-14 px-6 rounded-2xl shadow-xl shadow-primary/30 hover:scale-105 active:scale-100 transition-all font-semibold text-base" />
      </div>
    </div>
  );
}
