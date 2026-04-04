"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { APP_CONFIG } from "@/lib/config";
import Link from "next/link";
import { useEffect, useState, useCallback, useRef } from "react";
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
  Ban,
  Receipt
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
import { FirstTimeGuide } from "@/components/onboarding/FirstTimeGuide";
import { EmotionalStatusWidget } from "@/components/dashboard/EmotionalStatusWidget";
import { TrinalyzeBusinessCopilot } from "@/components/dashboard/TrinalyzeBusinessCopilot";
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
  tipoPago?: string;
  montoPagado?: number;
  balancePendiente?: number;
  estadoPago?: "pendiente" | "parcial" | "pagado" | "credito_aplicado";
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


export default function Dashboard() {
  const router = useRouter();
  // Estados para almacenar las estadísticas del dashboard
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [collectedThisMonth, setCollectedThisMonth] = useState(0);
  const [previousMonthRevenue, setPreviousMonthRevenue] = useState(0);
  const [pendingInvoices, setPendingInvoices] = useState(0);
  const [totalPorCobrar, setTotalPorCobrar] = useState(0);
  const [totalVencido, setTotalVencido] = useState(0);
  const [predictiveAlerts, setPredictiveAlerts] = useState<string[]>([]);
  const [totalClients, setTotalClients] = useState(0);
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const { mode, profession } = usePreferences();
  const { user: authUser, refresh } = useAuth();


  // Estado para el Wizard de Configuración e Identidad Fiscal
  const [fiscalState, setFiscalState] = useState<{ suggested: string; confirmed: string | null }>({ suggested: "", confirmed: null });
  const [isFiscalHealthy, setIsFiscalHealthy] = useState(true);
  const [lowNcfType, setLowNcfType] = useState<string | null>(null);
  const [ncfSequenceSummary, setNcfSequenceSummary] = useState<NcfSequenceSummary | null>(null);
  const [ncfLowSequence, setNcfLowSequence] = useState<NcfSequenceSummary | null>(null);
  const [lexisContextualMessage, setLexisContextualMessage] = useState<string>("");
  const [monthlyStats, setMonthlyStats] = useState<{ revenue: number; invoiceCount: number; clientCount: number } | undefined>(undefined);
  const [targetInvoices, setTargetInvoices] = useState<number | undefined>(undefined);
  const [frequentClients, setFrequentClients] = useState<{ name: string; rnc: string; phone?: string; lastInvoiceDate?: string }[]>([]);
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

  const cancelledRef = useRef(false);

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError("");
    cancelledRef.current = false;

    try {
      if (!authUser) {
        if (!cancelledRef.current) router.push("/login");
        return;
      }

      if (typeof window !== "undefined" && window.location.pathname === "/pagos") {
        if (!cancelledRef.current) setIsLoading(false);
        return;
      }

      if (cancelledRef.current) return;

      setFiscalState({
        suggested: authUser.fiscalStatus?.suggested || "",
        confirmed: authUser.fiscalStatus?.confirmed || null
      });

      const { api } = await import("@/lib/api-service");
      const status = await api.getSubscriptionStatus(true).catch(() => null);

      if (cancelledRef.current) return;

      if (status && status.shouldRedirect === true) {
        if (!cancelledRef.current) router.replace("/pagos");
        return;
      }

      // Intentar stats por agregación (menos carga) y solo 50 facturas para la lista
      const [statsRes, invRes, customersRes] = await Promise.all([
        api.getDashboardStats().catch(() => null),
        api.getInvoices(1, 50),
        api.getCustomers().catch(() => [])
      ]);
      const customersList = (customersRes || []) as { name: string; rnc: string; phone?: string; lastInvoiceDate?: string }[];
      const sorted = [...customersList].sort((a, b) => {
        const da = a.lastInvoiceDate ? new Date(a.lastInvoiceDate).getTime() : 0;
        const db = b.lastInvoiceDate ? new Date(b.lastInvoiceDate).getTime() : 0;
        return db - da;
      });
      if (!cancelledRef.current) setFrequentClients(sorted.slice(0, 5));

      const invoices: Invoice[] = invRes?.data || [];
      setRecentInvoices(invoices);

      if (statsRes) {
        setMonthlyRevenue(statsRes.monthlyRevenue);
        setTotalRevenue(statsRes.totalRevenue || statsRes.monthlyRevenue);
        setCollectedThisMonth(statsRes.monthlyCollected ?? (statsRes.totalRevenue || statsRes.monthlyRevenue));
        setPreviousMonthRevenue(statsRes.previousMonthRevenue);
        setPendingInvoices(statsRes.pendingInvoices);
        setTotalPorCobrar(statsRes.totalPorCobrar);
        setTotalVencido(statsRes.totalVencido || 0);
        setMonthlyStats({
          revenue: statsRes.monthlyRevenue,
          invoiceCount: statsRes.invoiceCount,
          clientCount: statsRes.totalClients
        });
      } else {
        // Fallback: calcular desde facturas (comportamiento anterior)
        if (recentInvoices.length > 0) {
          const invoices = recentInvoices;
          const getInvoiceBalance = (inv: Invoice) => {
            const total = Number(inv.total || 0);
            const paid = Math.max(0, Number(inv.montoPagado || 0));
            const fallback = Math.max(0, total - paid);
            if (typeof inv.balancePendiente === "number" && inv.balancePendiente > 0) return inv.balancePendiente;
            if (inv.estadoPago === "pendiente" || inv.estadoPago === "parcial" || inv.status === "pending" || inv.tipoPago === "credito") return fallback;
            return 0;
          };
          const now = new Date();
          const currentMonth = now.getMonth();
          const currentYear = now.getFullYear();
          const monthlyInvoices = invoices.filter((inv) => {
            const invDate = new Date(inv.date);
            return invDate.getMonth() === currentMonth && invDate.getFullYear() === currentYear;
          });
          const monthlyRevenue = monthlyInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
          const monthlyCollectedFallback = monthlyInvoices.reduce((sum, inv) => {
            const paid = Number(inv.montoPagado || 0);
            if (paid > 0) return sum + paid;
            if (inv.tipoPago === "credito" || inv.estadoPago === "pendiente") return sum;
            return sum + (inv.total || 0);
          }, 0);
          setTotalRevenue(monthlyRevenue);
          setCollectedThisMonth(monthlyCollectedFallback);
          const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
          const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
          const previousMonthlyInvoices = invoices.filter((inv) => {
            const invDate = new Date(inv.date);
            return invDate.getMonth() === prevMonth && invDate.getFullYear() === prevYear;
          });
          setPreviousMonthRevenue(previousMonthlyInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0));
          setTargetInvoices(Math.max(previousMonthlyInvoices.length, 1));
          const pendingData = invoices
            .map((inv) => ({ ...inv, _bal: getInvoiceBalance(inv) }))
            .filter((inv) => inv._bal > 0);
          setPendingInvoices(pendingData.length);
          setTotalPorCobrar(pendingData.reduce((sum, inv) => sum + inv._bal, 0));
          const overdueThreshold = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          const vencidoData = pendingData.filter(inv => new Date(inv.date) < overdueThreshold);
          setTotalVencido(vencidoData.reduce((sum, inv) => sum + inv._bal, 0));
          setTotalClients(new Set(invoices.map((inv) => inv.rnc || inv.clientRnc || "")).size);
          setMonthlyStats({
            revenue: monthlyRevenue,
            invoiceCount: monthlyInvoices.length,
            clientCount: new Set(invoices.map((inv) => inv.rnc || inv.clientRnc || "")).size
          });
        }
      }

      try {
        const ncfSettings = (await api.getNcfSettings()) as NcfSetting[];
        const typeToLabel: Record<string, string> = { "01": "B01", "02": "B02", "31": "E31", "32": "E32", "14": "B14", "15": "B15", "44": "E44", "45": "E45" };
        const activeSettings = (ncfSettings || []).filter((s: NcfSetting) => s.isActive);
        let firstSummary: NcfSequenceSummary | null = null;
        let lowSummary: NcfSequenceSummary | null = null;
        for (const s of activeSettings) {
          const remaining = (s.finalNumber ?? 0) - (s.currentValue ?? 0);
          const expiryStr = s.expiryDate ? new Date(s.expiryDate).toLocaleDateString("es-DO", { day: "2-digit", month: "2-digit", year: "numeric" }) : "";
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
        const { PredictiveService: Pred } = await import("@/lib/predictive-service");
        const pending = statsRes ? statsRes.pendingInvoices : (invRes?.data || []).filter((inv: Invoice) => {
          const total = Number(inv.total || 0);
          const paid = Math.max(0, Number(inv.montoPagado || 0));
          const fallback = Math.max(0, total - paid);
          const bal = typeof inv.balancePendiente === "number" && inv.balancePendiente > 0
            ? inv.balancePendiente
            : ((inv.estadoPago === "pendiente" || inv.estadoPago === "parcial" || inv.status === "pending" || inv.tipoPago === "credito") ? fallback : 0);
          return bal > 0;
        }).length;
        const alerts = Pred.getPredictiveAlerts({
          ncfSettings: ncfSettings as { type: string; currentValue: number; finalNumber: number; isActive?: boolean }[],
          invoices: (invRes?.data || []) as { date: string; total?: number; status?: string; rnc?: string; clientRnc?: string; clientName?: string }[],
          pendingCount: pending
        });
        setPredictiveAlerts(alerts);

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
      } catch (e) {
        console.error("NCF Settings Fetch Error:", e);
      }

      if ((!statsRes && (!invRes?.data || (invRes.data as unknown[]).length === 0)) || (statsRes && statsRes.invoiceCount === 0)) {
        if (!statsRes) {
          setMonthlyStats({ revenue: 0, invoiceCount: 0, clientCount: 0 });
          setTargetInvoices(undefined);
        }
        setLexisContextualMessage("Aún no hay facturas. ¿Creamos la primera juntos?");
      }
    } catch (err: unknown) {
      if (!cancelledRef.current) {
        console.error("Dashboard Load Error:", err);
        setError("Hubo un inconveniente técnico al cargar sus datos. Usa «Reintentar» para volver a intentar.");
        toast.error("No pudimos cargar el dashboard. Revisa tu conexión e intenta de nuevo.");
      }
    } finally {
      if (!cancelledRef.current) {
        setIsLoading(false);
      }
    }
  }, [authUser, router]);

  useEffect(() => {
    loadDashboardData();
    return () => {
      cancelledRef.current = true;
    };
  }, [loadDashboardData]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("setup") === "required") {
      toast.error("⚠️ Identidad Fiscal Requerida", {
        description: "Confirma tu nombre fiscal para poder emitir comprobantes válidos.",
        duration: 5000
      });
    }
  }, []);

  const handleRefresh = () => {
    loadDashboardData();
  };

  // Función para formatear números como moneda dominicana
  const formatCurrency = (amount: number | null | undefined) => {
    const val = (amount === null || amount === undefined || isNaN(amount)) ? 0 : amount;
    return new Intl.NumberFormat("es-DO", {
      style: "currency",
      currency: "DOP",
    }).format(val);
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
    link.setAttribute("download", `607_TRINALYZE_${new Date().toISOString().slice(0, 7)}.csv`);
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
    const body = `Estimado ${inv.clientName},\n\nAdjunto encontrará los detalles de su factura por RD$${inv.total.toLocaleString('es-DO')}.\n\nSaludos,\nTRINALYZE BILLING`;
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
        {/* Trinalyze Business Copilot: observa tu negocio, alertas, scoring, predicción */}
        {!isLoading && <TrinalyzeBusinessCopilot />}

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



        {/* Facturar a cliente frecuente */}
        {!isLoading && frequentClients.length > 0 && (
          <Card className="mb-8 border-emerald-100 bg-emerald-50/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                Facturar a cliente frecuente
              </CardTitle>
              <CardDescription>Los que más has facturado recientemente. Un clic y listo.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {frequentClients.map((c) => {
                  const q = new URLSearchParams({ rnc: c.rnc, name: c.name });
                  if (c.phone) q.set("phone", c.phone);
                  return (
                    <Link key={c.rnc} href={`/nueva-factura?${q.toString()}`}>
                      <Button variant="outline" size="sm" className="gap-2 border-emerald-200 text-emerald-800 hover:bg-emerald-100 max-w-[200px]">
                        <Receipt className="w-4 h-4" />
                        <span className="truncate">{c.name}</span>
                      </Button>
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>
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
          externalStats={{
            monthlyRevenue: monthlyRevenue,
            totalRevenue: totalRevenue,
            monthlyCollected: collectedThisMonth,
            totalPorCobrar: totalPorCobrar,
            totalVencido: totalVencido,
            invoiceCount: monthlyStats?.invoiceCount || 0,
            revenueChange: previousMonthRevenue > 0 ? ((totalRevenue - previousMonthRevenue) / previousMonthRevenue) * 100 : 0
          }}
        />

      </div>
      <OnboardingWizard />
      <FirstTimeGuide />

      {/* Botón flotante Nueva Factura (desktop); en móvil usa el FAB del layout */}
      <div className="hidden md:block fixed bottom-6 right-6 z-50">
        <NewInvoiceButton variant="inline" className="h-14 px-6 rounded-2xl shadow-xl shadow-primary/30 hover:scale-105 active:scale-100 transition-all font-semibold text-base" />
      </div>
    </div>
  );
}
