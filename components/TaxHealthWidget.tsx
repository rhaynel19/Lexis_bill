"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDown, ArrowUp, Info, ShieldCheck, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { ContextualHelp } from "@/components/ui/contextual-help";

import { usePreferences } from "@/components/providers/PreferencesContext";

export function TaxHealthWidget() {
    const { mode } = usePreferences();
    const [taxData, setTaxData] = useState({
        collectedItbis: 0,
        paidItbis: 0,
        retentions: 0,
        netTaxPayable: 0,
        safeToSpend: 0,
        status: "healthy" // healthy, warning, danger
    });

    useEffect(() => {
        // 1. Get Invoices (Collected ITBIS & Retentions)
        const invoicesStr = localStorage.getItem("invoices"); // Or API equivalent if we had it handy in context
        // Ideally we pass this as props, but for widget autonomy we might fetch or read local cache if props not available.
        // Let's assume we read from the same source as the dashboard for now or rely on props if we integrate deeply. 
        // For standalone widget:
        const invoices = invoicesStr ? JSON.parse(invoicesStr) : [];

        // Filter for current month approx (or general "Next Declaration")
        // Making it "Current Month" for relevance
        const now = new Date();
        const currentMonthInvoices = invoices.filter((inv: any) => {
            const d = new Date(inv.date);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });

        const collectedItbis = currentMonthInvoices.reduce((sum: number, inv: any) => sum + (inv.itbis || 0), 0);
        const retentions = currentMonthInvoices.reduce((sum: number, inv: any) => sum + (inv.isrRetention || 0) + (inv.itbisRetention || 0), 0);
        const subtotalRevenue = currentMonthInvoices.reduce((sum: number, inv: any) => sum + (inv.subtotal || (inv.total - (inv.itbis || 0))), 0);

        // 2. Get Expenses (Paid ITBIS)
        const expensesStr = localStorage.getItem("expenses");
        const expenses = expensesStr ? JSON.parse(expensesStr) : [];
        const currentMonthExpenses = expenses.filter((exp: any) => {
            const d = new Date(exp.date);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });

        // Assuming expense amount includes ITBIS, estimating 18% if not explicit.
        // For a more advanced app, expense should have 'itbis' field.
        // Let's assume the user enters Total, so we extract 18% if it's a formal expense.
        // Simplified: 15% of total expense amount is treated as ITBIS deductible for this heuristic.
        const paidItbis = currentMonthExpenses.reduce((sum: number, exp: any) => sum + (exp.amount * 0.15), 0);

        // 3. Calculate Net
        // Neto a Pagar = (ITBIS Cobrado - ITBIS Pagado) - Retenciones (Saldo a favor si te retuvieron)
        // Wait, Retentions are pre-payments. If I was retained, I owe LESS.
        // So: Tax Liability = Collected ITBIS - Deductible ITBIS. 
        // Then I pay that.
        // The "Reserve" should be specifically for the ITBIS I collected that isn't mine.

        let liability = collectedItbis - paidItbis;
        if (liability < 0) liability = 0; // Saldo a favor technicaly

        // Retentions reduce my ISR liability usually, but ITBIS retention specifically reduces ITBIS payment.
        // Let's count ITBIS retention only against ITBIS.
        const itbisRetentions = currentMonthInvoices.reduce((sum: number, inv: any) => sum + (inv.itbisRetention || 0), 0);
        liability -= itbisRetentions;
        if (liability < 0) liability = 0;

        // Determine Health
        // Safe to Spend = (Subtotal Revenue) - (Expenses Net) 
        // This is a rough "Cash Flow" metric.
        const netCash = subtotalRevenue - currentMonthExpenses.reduce((s: number, e: any) => s + e.amount, 0);

        setTaxData({
            collectedItbis,
            paidItbis,
            retentions,
            netTaxPayable: liability,
            safeToSpend: netCash,
            status: liability > (collectedItbis * 0.5) ? "warning" : "healthy"
        });

    }, []);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("es-DO", {
            style: "currency",
            currency: "DOP",
            maximumFractionDigits: 0
        }).format(amount);
    };

    if (mode === "simple") return null; // In simple mode, EmotionalStatusWidget replaces this complexity.

    return (
        <Card className="bg-gradient-to-br from-blue-950 to-slate-900 border-none text-white shadow-xl overflow-hidden relative">
            {/* Background Decor */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>

            <CardHeader className="pb-2 relative z-10">
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-amber-400 flex items-center gap-2 text-lg">
                            <ShieldCheck className="w-5 h-5" />
                            Bolsillo Fiscal
                        </CardTitle>
                        <CardDescription className="text-slate-400">Salud impositiva del mes</CardDescription>
                    </div>
                    <div className="flex items-center">
                        <ContextualHelp text="Este cálculo es un estimado basado en tus facturas y gastos reportados. En 'Modo Simple' simplificamos los detalles." />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="relative z-10">
                <div className="flex flex-col md:flex-row gap-6 items-end">

                    {/* Main Number: Reserve Needed */}
                    <div className="flex-1">
                        <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold mb-1">Reserva Sugerida (DGII)</p>
                        <div className="text-4xl font-bold font-mono text-white mb-2">
                            {formatCurrency(taxData.netTaxPayable)}
                        </div>
                        <div className="flex items-center gap-2 text-xs">

                            {taxData.netTaxPayable > 0 ? (
                                <span className="text-amber-400 flex items-center bg-amber-400/10 px-2 py-0.5 rounded">
                                    <AlertTriangle className="w-3 h-3 mr-1" />
                                    Apartar dinero
                                </span>
                            ) : (
                                <span className="text-emerald-400 flex items-center bg-emerald-400/10 px-2 py-0.5 rounded">
                                    <ShieldCheck className="w-3 h-3 mr-1" />
                                    Estás cubierto
                                </span>
                            )}
                            <span className="text-slate-500">
                                {taxData.collectedItbis > 0 ? `${Math.round((taxData.netTaxPayable / taxData.collectedItbis) * 100)}% del ITBIS cobrado` : "0%"}
                            </span>
                        </div>
                    </div>

                    {/* Breakdown */}
                    <div className="flex-1 space-y-3 bg-white/5 p-4 rounded-xl border border-white/10">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-300 flex items-center">
                                <ArrowUp className="w-3 h-3 text-emerald-400 mr-2" />
                                ITBIS Cobrado
                            </span>
                            <span className="font-semibold">{formatCurrency(taxData.collectedItbis)}</span>
                        </div>
                        <div className="w-full bg-slate-700 h-1 rounded-full overflow-hidden">
                            <div className="bg-emerald-500 h-full" style={{ width: '100%' }}></div>
                        </div>

                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-300 flex items-center">
                                <ArrowDown className="w-3 h-3 text-amber-500 mr-2" />
                                ITBIS Deducible
                            </span>
                            <span className="font-semibold text-red-400">-{formatCurrency(taxData.paidItbis)}</span>
                        </div>
                        {/* Visual Bar vs Collected */}
                        <div className="w-full bg-slate-700 h-1 rounded-full overflow-hidden">
                            <div className="bg-amber-500 h-full" style={{ width: `${Math.min((taxData.paidItbis / (taxData.collectedItbis || 1)) * 100, 100)}%` }}></div>
                        </div>

                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
