"use client";

import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Mail, Phone, Calendar, Hash, FileText, ChevronRight, UserCircle2 } from "lucide-react";
import { api } from "@/lib/api-service";

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
        const cleanPhone = customer.phone.replace(/[^\d]/g, '');
        window.open(`https://wa.me/${cleanPhone}`, '_blank');
    };

    if (!customer) return null;

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="sm:max-w-md border-none shadow-2xl bg-white p-0">
                {/* Header Decoration */}
                <div className="h-32 bg-primary relative">
                    <div className="absolute -bottom-12 left-6">
                        <div className="w-24 h-24 bg-white rounded-3xl shadow-xl flex items-center justify-center border-4 border-white overflow-hidden">
                            <span className="text-4xl font-black text-primary/20">
                                {customer.name.substring(0, 2).toUpperCase()}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="pt-16 px-6 space-y-8">
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
                    <div className="grid grid-cols-3 gap-3">
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
                                            <span className="text-xs font-bold text-primary">RD$ {inv.total.toLocaleString()}</span>
                                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <SheetFooter className="p-6 bg-slate-50 border-t flex flex-col gap-2">
                    <Button className="w-full h-12 text-sm font-bold shadow-lg shadow-primary/20">Nueva Factura</Button>
                    <Button variant="ghost" className="w-full text-slate-500 h-12">Editar Datos</Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
