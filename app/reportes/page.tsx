"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    FileText,
    Download,
    Calendar,
    Info,
    CheckCircle2,
    TrendingUp,
    PieChart,
    ArrowUpRight,
    Loader2,
    DollarSign,
    Calculator
} from "lucide-react";
import { api } from "@/lib/api-service";
import { Badge } from "@/components/ui/badge";

export default function ReportsPage() {
    const [summary, setSummary] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const months = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    useEffect(() => {
        loadSummary();
    }, [selectedMonth, selectedYear]);

    const loadSummary = async () => {
        setIsLoading(true);
        try {
            const data = await api.getTaxSummary(selectedMonth, selectedYear);
            setSummary(data);
        } catch (error) {
            console.error("Error loading tax summary:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownload607 = () => {
        const token = localStorage.getItem("token");
        // We use the direct URL with token for download
        const url = `${process.env.NEXT_PUBLIC_API_URL}/reports/607?month=${selectedMonth}&year=${selectedYear}&token=${token}`;
        window.open(url, '_blank');
    };

    const isMonthClosed = (mIndex: number) => {
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        if (selectedYear < currentYear) return true;
        if (selectedYear === currentYear && mIndex < currentMonth) return true;
        return false;
    };

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Header section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
                <div>
                    <h1 className="text-3xl font-extrabold text-primary flex items-center gap-3 tracking-tight">
                        <TrendingUp className="w-8 h-8 text-blue-600" /> Mis Reportes DGII
                    </h1>
                    <p className="text-slate-500 mt-1 font-medium italic">
                        Gestión fiscal inteligente y transparente
                    </p>
                </div>
                <div className="flex gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
                    <select
                        className="bg-transparent border-none text-sm font-bold text-slate-700 outline-none focus:ring-0 cursor-pointer px-2"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    >
                        <option value={2026}>2026</option>
                        <option value={2025}>2025</option>
                    </select>
                </div>
            </div>

            {/* Tax Dashboard Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <Card className="border-none shadow-2xl bg-gradient-to-br from-primary to-blue-800 text-white overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                        <DollarSign className="w-24 h-24" />
                    </div>
                    <CardHeader className="pb-2">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                                <PieChart className="w-4 h-4" />
                            </div>
                            <span className="text-xs font-black uppercase tracking-widest opacity-80">ITBIS Cobrado</span>
                        </div>
                        <CardTitle className="text-4xl font-black">
                            {isLoading ? <Loader2 className="animate-spin" /> : `RD$ ${summary?.itbis.toLocaleString()}`}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs font-medium text-blue-100">
                            Total para presentar en el IT-1 de {months[selectedMonth - 1]}
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-xl bg-white/80 backdrop-blur-md border border-slate-100">
                    <CardHeader className="pb-2">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-primary">
                                <Calculator className="w-4 h-4" />
                            </div>
                            <span className="text-xs font-black uppercase tracking-widest text-slate-400">Subtotal Neto</span>
                        </div>
                        <CardTitle className="text-3xl font-black text-slate-900">
                            {isLoading ? <Loader2 className="animate-spin text-primary" /> : `RD$ ${summary?.subtotal.toLocaleString()}`}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs font-medium text-slate-400">
                            Ingresos gravables antes de impuestos
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-xl bg-white/80 backdrop-blur-md border border-slate-100">
                    <CardHeader className="pb-2">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                                <FileText className="w-4 h-4" />
                            </div>
                            <span className="text-xs font-black uppercase tracking-widest text-slate-400">Comprobantes</span>
                        </div>
                        <CardTitle className="text-3xl font-black text-slate-900">
                            {isLoading ? <Loader2 className="animate-spin text-primary" /> : `${summary?.count} Docs`}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs font-medium text-slate-400">
                            Total de e-CF emitidos este mes
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Monthly Reports Grid */}
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest mb-6 px-1">Periodos</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {months.map((monthName, index) => {
                    const mNum = index + 1;
                    const active = selectedMonth === mNum;
                    const closed = isMonthClosed(index);

                    return (
                        <Card
                            key={index}
                            className={`cursor-pointer transition-all duration-300 border-none shadow-lg ${active ? 'ring-2 ring-primary bg-white scale-105 z-10' : 'bg-white/50 hover:bg-white hover:shadow-xl hover:-translate-y-1 opacity-80'}`}
                            onClick={() => setSelectedMonth(mNum)}
                        >
                            <CardHeader className="pb-4">
                                <div className="flex justify-between items-start">
                                    <div className={`p-2 rounded-xl ${active ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'}`}>
                                        <Calendar className="w-5 h-5" />
                                    </div>
                                    {closed ? (
                                        <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-100 font-bold text-[10px] gap-1 px-2">
                                            <CheckCircle2 className="w-3 h-3" /> COMPLETADO
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-blue-500 border-blue-100 font-bold text-[10px] px-2">
                                            EN CURSO
                                        </Badge>
                                    )}
                                </div>
                                <div className="mt-4">
                                    <CardTitle className="text-xl font-black text-slate-900">{monthName}</CardTitle>
                                    <CardDescription className="font-bold text-slate-400">{selectedYear}</CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3 pt-0">
                                {active && (
                                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                        <Button
                                            className="w-full justify-between font-bold h-10 group"
                                            onClick={(e) => { e.stopPropagation(); handleDownload607(); }}
                                        >
                                            607 - Ventas <Download className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
                                        </Button>
                                        <Button variant="outline" className="w-full justify-between font-bold h-10 border-slate-200 text-slate-600">
                                            Resumen ITBIS <ArrowUpRight className="w-4 h-4" />
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <div className="mt-12 p-6 bg-blue-50/50 rounded-2xl border border-blue-100/50 flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0">
                    <Info className="w-5 h-5" />
                </div>
                <div>
                    <h4 className="font-black text-blue-900 text-sm italic">Recordatorio Fiscal</h4>
                    <p className="text-xs text-blue-700 leading-relaxed mt-1">
                        Recuerda que los reportes 607 deben presentarse a más tardar el día 15 de cada mes. Nuestro sistema e-CF asegura que tus correlativos estén siempre en orden para evitar multas innecesarias.
                    </p>
                </div>
            </div>
        </div>
    );
}
