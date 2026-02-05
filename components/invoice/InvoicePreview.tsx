"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { usePreferences } from "@/components/providers/PreferencesContext";
import { useAuth } from "@/components/providers/AuthContext";
import { cn } from "@/lib/utils";
import { APP_CONFIG } from "@/lib/config";
import { User, Phone, MapPin, Receipt, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface InvoiceItem {
    description: string;
    quantity: number | string;
    price: number | string;
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
    const { user: authUser } = useAuth();
    const [viewMode, setViewMode] = useState<"simple" | "fiscal">("simple");

    // Nombre de la empresa: nombre fiscal confirmado o configuración
    const appConfig = typeof window !== "undefined"
        ? (() => { try { const c = localStorage.getItem("appConfig"); return c ? JSON.parse(c) : {}; } catch { return {}; } })()
        : {};
    const companyName = authUser?.fiscalStatus?.confirmed ?? appConfig.companyName ?? appConfig.name ?? APP_CONFIG.company.name ?? "Lexis Bill";

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
    const formatCurrency = (amount: number | string) => {
        const val = typeof amount === 'number' ? amount : (parseFloat(amount) || 0);
        return new Intl.NumberFormat("es-DO", {
            style: "currency",
            currency: "DOP",
        }).format(val);
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
                <div className="bg-muted p-1 rounded-lg flex text-xs font-medium border border-border/10">
                    <button
                        type="button"
                        onClick={() => setViewMode("simple")}
                        className={cn("px-3 py-1.5 rounded-md transition-all", viewMode === "simple" ? "bg-background shadow-sm text-foreground font-bold" : "text-muted-foreground hover:text-foreground")}
                    >
                        Vista Cliente
                    </button>
                    <button
                        type="button"
                        onClick={() => setViewMode("fiscal")}
                        className={cn("px-3 py-1.5 rounded-md transition-all", viewMode === "fiscal" ? "bg-background shadow-sm text-accent font-bold" : "text-muted-foreground hover:text-foreground")}
                    >
                        Vista Fiscal
                    </button>
                </div>
            </div>

            {/* The Document Visual */}
            <Card className="border border-border/10 shadow-2xl bg-card text-card-foreground overflow-hidden relative min-h-[600px] flex flex-col transition-colors duration-300">
                {/* Watermark / Background */}
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-br from-accent/5 to-transparent rounded-full -mr-32 -mt-32 pointer-events-none opacity-50"></div>

                {/* Header */}
                <div className="bg-secondary text-secondary-foreground p-8 relative overflow-hidden transition-colors">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-accent rounded-full blur-[60px] opacity-20 -mr-10 -mt-10"></div>

                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <h2 className="text-2xl font-serif font-bold tracking-tight mb-1 text-foreground">
                                {companyName}
                            </h2>
                            <p className="text-xs text-muted-foreground uppercase tracking-widest">Servicios Profesionales</p>
                        </div>
                        <div className="text-right">
                            <Badge variant="outline" className="text-accent border-accent/30 bg-accent/10 mb-2">
                                {getNcfLabel(data.invoiceType)}
                            </Badge>
                            <p className="font-mono text-sm opacity-80">
                                {data.ncf || "BXXXXXXXXXX (Borrador)"}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                {data.date.toLocaleDateString("es-DO", { year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                        </div>
                    </div>
                </div>

                <CardContent className="p-8 flex-1 flex flex-col">
                    {/* Client Section */}
                    <div className="mb-8 p-4 bg-muted/30 rounded-xl border border-border/10 flex justify-between items-center group">
                        <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1">{getClientLabel()}</p>
                            <h3 className="text-xl font-bold text-foreground">
                                {data.clientName || <span className="text-muted-foreground/30 italic">Nombre del cliente...</span>}
                            </h3>
                            {data.rnc && (
                                <div className="flex items-center gap-2 mt-1 min-w-0">
                                    <Badge variant="secondary" className="text-[10px] text-muted-foreground bg-secondary/50 shrink-0">RNC/Cédula</Badge>
                                    <span className="font-mono text-sm text-foreground/80 truncate min-w-0" title={data.rnc}>{data.rnc}</span>
                                </div>
                            )}
                        </div>
                        <div className="w-10 h-10 rounded-full bg-card flex items-center justify-center border border-border/10 shadow-sm text-muted-foreground">
                            <User className="w-5 h-5" />
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="flex-1">
                        <div className="flex justify-between items-end mb-4 border-b border-border/10 pb-2">
                            <h4 className="text-sm font-bold text-muted-foreground uppercase">{getServiceLabel()}</h4>
                        </div>
                        <div className="space-y-4">
                            {data.items.length === 0 ? (
                                <div className="text-center py-10 text-muted-foreground/30 italic">
                                    Agrega ítems a la factura...
                                </div>
                            ) : (
                                data.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-start text-sm group hover:bg-muted/20 p-2 rounded transition-colors">
                                        <div className="flex-1">
                                            <div className="font-medium text-foreground">{item.description || "Sin descripción"}</div>
                                            <div className="text-xs text-muted-foreground">Cant: {item.quantity}</div>
                                        </div>
                                        <div className="font-mono font-medium text-foreground/90">
                                            {formatCurrency(Number(item.price) * Number(item.quantity))}
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
                            <div className={cn("space-y-2 text-sm text-muted-foreground", viewMode === "simple" && "hidden")}>
                                <div className="flex justify-between">
                                    <span>Subtotal</span>
                                    <span className="text-foreground">{formatCurrency(data.subtotal)}</span>
                                </div>
                                <div className="flex justify-between text-success">
                                    <span>ITBIS (18%)</span>
                                    <span>{formatCurrency(data.itbis)}</span>
                                </div>
                                <Separator className="my-2 opacity-10" />
                            </div>

                            {/* Grand Total */}
                            <div className="flex justify-between items-center pt-2">
                                <div className="text-right">
                                    <span className="text-sm font-bold text-foreground block text-left uppercase">Total a Pagar</span>
                                    {viewMode === "simple" && <span className="text-[10px] text-muted-foreground font-light block text-left">Incluye impuestos</span>}
                                </div>
                                <span className="text-3xl font-bold text-accent font-serif">
                                    {formatCurrency(data.total)}
                                </span>
                            </div>
                        </div>
                    </div>
                </CardContent>

                {/* Footer / Branding */}
                <div className="bg-secondary/30 p-4 text-center border-t border-border/10">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest flex items-center justify-center gap-2">
                        <ShieldCheck className="w-3 h-3 text-accent" /> Documento generado con Lexis Bill
                    </p>
                </div>
            </Card>

            {/* Vista Cliente: mensaje de ayuda */}
            {viewMode === "simple" && (
                <p className="text-xs text-center text-muted-foreground animate-pulse">
                    Esta es la vista simplificada que recibirá tu cliente por WhatsApp.
                </p>
            )}
            {/* Vista Fiscal: mensaje de ayuda */}
            {viewMode === "fiscal" && (
                <p className="text-xs text-center text-muted-foreground">
                    Vista con desglose fiscal (subtotal e ITBIS) para contabilidad.
                </p>
            )}
        </div>
    );
}
