"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDown, ArrowUp, ShieldCheck, AlertTriangle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { ContextualHelp } from "@/components/ui/contextual-help";
import { usePreferences } from "@/components/providers/PreferencesContext";
import { api } from "@/lib/api-service";
import styles from "./TaxHealthWidget.module.css";

export function TaxHealthWidget() {
    const { mode } = usePreferences();
    const [taxData, setTaxData] = useState({
        collectedItbis: 0,
        paidItbis: 0,
        retentions: 0,
        netTaxPayable: 0,
        safeToSpend: 0,
        status: "healthy" as "healthy" | "warning" | "danger"
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        api.getTaxHealth().then((data) => {
            if (!cancelled) {
                setTaxData(data);
            }
        }).catch(() => {
            if (!cancelled) setTaxData((prev) => prev);
        }).finally(() => {
            if (!cancelled) setLoading(false);
        });
        return () => { cancelled = true; };
    }, []);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("es-DO", {
            style: "currency",
            currency: "DOP",
            maximumFractionDigits: 0
        }).format(amount);
    };

    if (mode === "simple") return null; // In simple mode, EmotionalStatusWidget replaces this complexity.

    if (loading) {
        return (
            <Card className="bg-gradient-to-br from-blue-950 to-slate-900 border-none text-white shadow-xl overflow-hidden relative">
                <CardHeader className="pb-2">
                    <CardTitle className="text-amber-400 flex items-center gap-2 text-lg">
                        <ShieldCheck className="w-5 h-5" />
                        Bolsillo Fiscal
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
                </CardContent>
            </Card>
        );
    }

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
                        <div className={styles.progressTrack}>
                            <div className={styles.progressBarCollected}></div>
                        </div>

                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-300 flex items-center">
                                <ArrowDown className="w-3 h-3 text-amber-500 mr-2" />
                                ITBIS Deducible
                            </span>
                            <span className="font-semibold text-red-400">-{formatCurrency(taxData.paidItbis)}</span>
                        </div>
                        {/* Visual Bar vs Collected - ancho en pasos de 5% para evitar estilos en línea */}
                        <div className={styles.progressTrack}>
                            <div
                                className={`${styles.progressBarDeductible} ${styles[`width${Math.min(Math.round((taxData.paidItbis / (taxData.collectedItbis || 1)) * 100 / 5) * 5, 100)}` as keyof typeof styles] ?? styles.width0}`}
                            ></div>
                        </div>

                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
