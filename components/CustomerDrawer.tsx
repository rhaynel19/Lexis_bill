"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Mail, Phone, Calendar, Hash, FileText, ChevronRight, UserCircle2, Receipt } from "lucide-react";
import { api } from "@/lib/api-service";
import { toast } from "sonner";

interface CustomerDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    customer: any;
}

export function CustomerDrawer({ isOpen, onClose, customer }: CustomerDrawerProps) {
    const [history, setHistory] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen && customer) {
            loadHistory();
        }
    }, [isOpen, customer]);

    const loadHistory = async () => {
        setIsLoading(true);
        try {
            const data = await api.getCustomerHistory(customer.rnc);
            setHistory(data);
        } catch (error) {
            console.error("Error loading history:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleWhatsApp = () => {
        if (!customer.phone) return;
        const phoneDigits = customer.phone.replace(/\D/g, '');
        const finalPhone = phoneDigits.length === 10 ? `1${phoneDigits}` : phoneDigits;
        window.open(`https://wa.me/${finalPhone}`, '_blank');
    };

    const handleSendReminder = () => {
        if (!customer.phone) {
             toast.error("El cliente no tiene un teléfono registrado.");
             return;
        }
        const phoneDigits = customer.phone.replace(/\D/g, '');
        const finalPhone = phoneDigits.length === 10 ? `1${phoneDigits}` : phoneDigits;
        
        let pendingAmnt = 0;
        let pendingInfo = "";
        const pendingInvoices = history.filter(i => (i.balancePendiente !== undefined ? i.balancePendiente > 0 : (i.estadoPago === 'vencida' || i.estadoPago === 'pendiente')));
        
        if (pendingInvoices.length > 0) {
            pendingAmnt = pendingInvoices.reduce((acc, i) => acc + (i.balancePendiente || i.total), 0);
            pendingInfo = `Le contactamos amablemente para notificarle que, según nuestros registros, presenta un balance pendiente por el monto de *RD$ ${pendingAmnt.toLocaleString("es-DO", { minimumFractionDigits: 2 })}* a la fecha.`;
        } else {
            pendingInfo = `Le contactamos para saludarle de manera proactiva y brindarle seguimiento a su estado de cuenta, el cual no presenta balances vencidos a la fecha.`;
        }
        
        const message = `Estimado/a cliente ${customer.name},\n\nSaludos cordiales.\n\n${pendingInfo}\n\nEn caso de tener alguna consulta o requerir detalles adicionales, no dude en escribirnos. Quedamos a su entera disposición.\n\nAtentamente,\nDepartamento de Facturación.`;
        const encoded = encodeURIComponent(message);
        window.open(`https://wa.me/${finalPhone}?text=${encoded}`, '_blank');
    };

    if (!customer) return null;

    const lifetimeValue = history.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const invoiceCount = history.length;
    const pendingCount = history.filter(i => (i.balancePendiente !== undefined ? i.balancePendiente > 0 : (i.estadoPago === 'vencida' || i.estadoPago === 'pendiente'))).length;

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="sm:max-w-md border-none shadow-2xl bg-white p-0 flex flex-col h-[100dvh]">
                {/* Header Decoration */}
                <div className="h-32 bg-primary relative shrink-0">
                    <div className="absolute -bottom-12 left-6">
                        <div className="w-24 h-24 bg-white rounded-3xl shadow-xl flex items-center justify-center border-4 border-white overflow-hidden">
                            <span className="text-4xl font-black text-primary/20">
                                {customer.name.substring(0, 2).toUpperCase()}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="pt-16 px-6 space-y-8 flex-1 overflow-y-auto pb-4">
                    {/* Basic Info */}
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">{customer.name}</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="font-mono">{customer.rnc}</Badge>
                            {customer.lastInvoiceDate && (
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Activo</span>
                            )}
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-4 gap-2">
                        <Button variant="outline" className="flex flex-col h-16 gap-1" onClick={handleWhatsApp} disabled={!customer.phone}>
                            <MessageCircle className="w-5 h-5 text-green-600" />
                            <span className="text-[10px] font-bold">WhatsApp</span>
                        </Button>
                        <Button variant="outline" className="flex flex-col h-16 gap-1" disabled={!customer.email}>
                            <Mail className="w-5 h-5 text-blue-600" />
                            <span className="text-[10px] font-bold">Email</span>
                        </Button>
                        <Button variant="outline" className="flex flex-col h-16 gap-1">
                            <Phone className="w-5 h-5 text-slate-600" />
                            <span className="text-[10px] font-bold">Llamar</span>
                        </Button>
                        <Button variant="outline" className="flex flex-col h-16 gap-1 border-amber-200 bg-amber-50" onClick={handleSendReminder} disabled={!customer.phone}>
                            <Hash className="w-5 h-5 text-amber-600" />
                            <span className="text-[10px] font-bold text-amber-700 leading-tight">Estado de Cta.</span>
                        </Button>
                    </div>

                    {/* CRM 360 Metrics */}
                    <div className="grid grid-cols-2 gap-3 mt-4">
                        <div className="bg-primary/5 rounded-xl p-3 border border-primary/10">
                            <p className="text-[10px] font-bold uppercase text-primary/70 tracking-widest">Lifetime Value</p>
                            <h4 className="text-xl font-black text-primary">RD$ {lifetimeValue.toLocaleString('es-DO')}</h4>
                        </div>
                        <div className="bg-rose-50 rounded-xl p-3 border border-rose-100 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-bold uppercase text-rose-500 tracking-widest">Pendientes</p>
                                <h4 className="text-xl font-black text-rose-600">{pendingCount} Facturas</h4>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center">
                                <Receipt className="w-4 h-4 text-rose-500" />
                            </div>
                        </div>
                    </div>

                    {/* Details List */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Información</h4>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-3 text-slate-500">
                                    <Phone className="w-4 h-4" /> <span>Teléfono:</span>
                                </div>
                                <span className="font-bold text-slate-900">{customer.phone || 'N/A'}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-3 text-slate-500">
                                    <Mail className="w-4 h-4" /> <span>Correo:</span>
                                </div>
                                <span className="font-bold text-slate-900">{customer.email || 'N/A'}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-3 text-slate-500">
                                    <Calendar className="w-4 h-4" /> <span>Registrado:</span>
                                </div>
                                <span className="font-bold text-slate-900">
                                    {new Date(customer.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* History */}
                    <div className="space-y-4 pb-8">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Últimas Facturas</h4>
                        {isLoading ? (
                            <div className="animate-pulse space-y-2">
                                {[1, 2, 3].map(i => <div key={i} className="h-12 bg-slate-50 rounded-lg"></div>)}
                            </div>
                        ) : history.length === 0 ? (
                            <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed text-slate-400 text-xs">
                                No se registran facturas
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {history.map((inv, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100 transition-colors cursor-pointer group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                                <FileText className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 leading-none mb-1">{inv.ncfSequence}</p>
                                                <p className="text-xs font-bold text-slate-700">{new Date(inv.date).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="text-right">
                                                <span className="text-xs font-bold text-primary block">RD$ {inv.total.toLocaleString()}</span>
                                                {inv.balancePendiente !== undefined && inv.balancePendiente > 0 && (
                                                    <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded">Pendiente</span>
                                                )}
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <SheetFooter className="p-6 bg-slate-50 border-t flex flex-col gap-2 shrink-0">
                    <Link
                        href={`/nueva-factura?${new URLSearchParams({
                            rnc: customer.rnc || "",
                            name: customer.name || "",
                            ...(customer.phone ? { phone: customer.phone } : {})
                        }).toString()}`}
                        className="w-full"
                        onClick={() => onClose()}
                    >
                        <Button className="w-full h-12 text-sm font-bold shadow-lg shadow-primary/20 gap-2">
                            <Receipt className="w-5 h-5" /> Nueva Factura para este cliente
                        </Button>
                    </Link>
                    <Button variant="ghost" className="w-full text-slate-500 h-12" onClick={onClose}>Cerrar</Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
