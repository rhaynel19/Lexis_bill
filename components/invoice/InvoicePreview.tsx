"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { usePreferences } from "@/components/providers/PreferencesContext";
import { cn } from "@/lib/utils";
import { User, Phone, MapPin, Receipt, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface InvoiceItem {
    description: string;
    quantity: number;
    price: number;
}

interface InvoicePreviewProps {
    data: {
        invoiceType: string;
        clientName: string;
        rnc: string;
        items: InvoiceItem[];
        subtotal: number;
        itbis: number;
        total: number;
        date: Date;
        ncf?: string; // Optional if not yet generated
    };
    clientType?: string; // B2B or B2C
}

export function InvoicePreview({ data }: InvoicePreviewProps) {
    const { profession } = usePreferences();
    const [viewMode, setViewMode] = useState<"simple" | "fiscal">("simple");

    // Adaptive Labels based on Profession
    const getClientLabel = () => {
        if (profession === "medic") return "Paciente";
        if (profession === "lawyer") return "Cliente / Representado";
        return "Cliente";
    };

    const getServiceLabel = () => {
        if (profession === "medic") return "Servicios Médicos / Consultas";
        if (profession === "lawyer") return "Honorarios Legales";
        return "Descripción de Servicios";
    };

    // Format Helpers
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("es-DO", {
            style: "currency",
            currency: "DOP",
        }).format(amount);
    };

    const getNcfLabel = (type: string) => {
        const types: Record<string, string> = {
            "31": "Factura Crédito Fiscal",
            "32": "Factura de Consumo",
            "33": "Nota de Débito",
            "34": "Nota de Crédito",
            "44": "Reg. Especial (Exento)",
            "45": "Gastos Menores"
        };
        return types[type] || "Factura";
    };

    return (
        <div className="space-y-4">
            {/* Toggle Controls */}
            <div className="flex justify-end gap-2 mb-2">
                <div className="bg-slate-100 p-1 rounded-lg flex text-xs font-medium">
                    <button
                        onClick={() => setViewMode("simple")}
                        className={cn("px-3 py-1.5 rounded-md transition-all", viewMode === "simple" ? "bg-white shadow text-[#0A192F]" : "text-slate-500 hover:text-slate-700")}
                    >
                        Vista Cliente
                    </button>
                    <button
                        onClick={() => setViewMode("fiscal")}
                        className={cn("px-3 py-1.5 rounded-md transition-all", viewMode === "fiscal" ? "bg-white shadow text-[#D4AF37]" : "text-slate-500 hover:text-slate-700")}
                    >
                        Vista Fiscal
                    </button>
                </div>
            </div>

            {/* The Document Visual */}
            <Card className="border-none shadow-2xl bg-white text-slate-900 overflow-hidden relative min-h-[600px] flex flex-col">
                {/* Watermark / Background */}
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-br from-slate-50 to-transparent rounded-full -mr-32 -mt-32 pointer-events-none opacity-50"></div>

                {/* Header */}
                <div className="bg-[#0A192F] text-white p-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37] rounded-full blur-[60px] opacity-20 -mr-10 -mt-10"></div>

                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <h2 className="text-2xl font-serif font-bold tracking-tight mb-1">
                                <span className="text-[#D4AF37]">LEXIS</span> BILL
                            </h2>
                            <p className="text-xs text-slate-400 uppercase tracking-widest">Servicios Profesionales</p>
                        </div>
                        <div className="text-right">
                            <Badge variant="outline" className="text-[#D4AF37] border-[#D4AF37] bg-[#D4AF37]/10 mb-2">
                                {getNcfLabel(data.invoiceType)}
                            </Badge>
                            <p className="font-mono text-sm opacity-80">
                                {data.ncf || "BXXXXXXXXXX (Borrador)"}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                                {data.date.toLocaleDateString("es-DO", { year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                        </div>
                    </div>
                </div>

                <CardContent className="p-8 flex-1 flex flex-col">
                    {/* Client Section */}
                    <div className="mb-8 p-4 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center group">
                        <div>
                            <p className="text-xs text-slate-400 uppercase tracking-wider font-bold mb-1">{getClientLabel()}</p>
                            <h3 className="text-xl font-bold text-slate-800">
                                {data.clientName || <span className="text-slate-300 italic">Nombre del cliente...</span>}
                            </h3>
                            {data.rnc && (
                                <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="secondary" className="text-[10px] text-slate-500 bg-slate-200">RNC/Cédula</Badge>
                                    <span className="font-mono text-sm text-slate-600">{data.rnc}</span>
                                </div>
                            )}
                        </div>
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-slate-100 shadow-sm text-slate-400">
                            <User className="w-5 h-5" />
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="flex-1">
                        <div className="flex justify-between items-end mb-4 border-b border-slate-100 pb-2">
                            <h4 className="text-sm font-bold text-slate-700 uppercase">{getServiceLabel()}</h4>
                        </div>
                        <div className="space-y-4">
                            {data.items.length === 0 ? (
                                <div className="text-center py-10 text-slate-300 italic">
                                    Agrega ítems a la factura...
                                </div>
                            ) : (
                                data.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-start text-sm group hover:bg-slate-50 p-2 rounded transition-colors">
                                        <div className="flex-1">
                                            <div className="font-medium text-slate-800">{item.description || "Sin descripción"}</div>
                                            <div className="text-xs text-slate-400">Cant: {item.quantity}</div>
                                        </div>
                                        <div className="font-mono font-medium text-slate-700">
                                            {formatCurrency(item.price * item.quantity)}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <Separator className="my-6" />

                    {/* Totals Section */}
                    <div className="flex justify-end">
                        <div className="w-full md:w-1/2 space-y-3">
                            {/* Fiscal Details (Hidden in Simple Mode) */}
                            <div className={cn("space-y-2 text-sm text-slate-500", viewMode === "simple" && "hidden")}>
                                <div className="flex justify-between">
                                    <span>Subtotal</span>
                                    <span>{formatCurrency(data.subtotal)}</span>
                                </div>
                                <div className="flex justify-between text-slate-600">
                                    <span>ITBIS (18%)</span>
                                    <span>{formatCurrency(data.itbis)}</span>
                                </div>
                                <Separator className="my-2 opacity-50" />
                            </div>

                            {/* Grand Total */}
                            <div className="flex justify-between items-center pt-2">
                                <div className="text-right">
                                    <span className="text-sm font-bold text-slate-700 block text-left">Total a Pagar</span>
                                    {viewMode === "simple" && <span className="text-[10px] text-slate-400 font-light block text-left">Incluye impuestos</span>}
                                </div>
                                <span className="text-3xl font-bold text-[#D4AF37] font-serif">
                                    {formatCurrency(data.total)}
                                </span>
                            </div>
                        </div>
                    </div>
                </CardContent>

                {/* Footer / Branding */}
                <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2">
                        <ShieldCheck className="w-3 h-3 text-[#D4AF37]" /> Documento generado por Lexis Bill
                    </p>
                </div>
            </Card>

            {/* Simple Mode Helper */}
            {viewMode === 'simple' && (
                <p className="text-xs text-center text-slate-400">
                    Esta es la vista simplificada que recibirá tu cliente por WhatsApp.
                </p>
            )}
        </div>
    );
}
