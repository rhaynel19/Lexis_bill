"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import {
    Calculator,
    CreditCard,
    FileText,
    LayoutDashboard,
    Settings,
    ShieldCheck,
    Wallet,
    Search,
    PlusCircle,
    BookOpen,
    TrendingUp
} from "lucide-react";

export function CommandMenu() {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const router = useRouter();

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        }
        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    const actions = [
        { name: "Nueva Factura", icon: PlusCircle, href: "/nueva-factura", shortcut: "N" },
        { name: "Nueva Cotización", icon: FileText, href: "/nueva-cotizacion", shortcut: "C" },
        { name: "Ver Cotizaciones", icon: BookOpen, href: "/cotizaciones" },
        { name: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
        { name: "Mis Reportes DGII", icon: TrendingUp, href: "/reportes", shortcut: "R" },
        { name: "Mis Clientes", icon: Wallet, href: "/clientes" },
        { name: "Mis Pagos", icon: CreditCard, href: "/pagos", shortcut: "P" },
        { name: "Mi Perfil / Config", icon: Settings, href: "/configuracion" },
        { name: "Modo Contador", icon: ShieldCheck, href: "/contador" },
        { name: "Ver Landing Page", icon: LayoutDashboard, href: "/" },
    ];

    const filteredActions = actions.filter(action =>
        action.name.toLowerCase().includes(search.toLowerCase())
    );

    const handleSelect = (href: string) => {
        router.push(href);
        setOpen(false);
        setSearch("");
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="p-0 overflow-hidden shadow-2xl max-w-xl top-[20%] translate-y-0">
                <div className="flex items-center border-b px-3 bg-slate-50/50">
                    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                    <input
                        className="flex h-14 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Escribe un comando o busca..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        autoFocus
                        aria-label="Buscar comando o acción"
                        title="Buscar comando"
                    />
                    <div className="text-xs text-slate-400 border border-slate-200 rounded px-1.5 py-0.5">ESC</div>
                </div>
                <div className="max-h-[300px] overflow-y-auto p-2">
                    {filteredActions.length === 0 ? (
                        <p className="p-4 text-sm text-slate-500 text-center">No se encontraron resultados.</p>
                    ) : (
                        <div className="grid gap-1">
                            <h4 className="px-2 py-1 text-xs font-medium text-slate-500 mb-1">ACCIONES RÁPIDAS</h4>
                            {filteredActions.map((action, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleSelect(action.href)}
                                    className="flex items-center gap-3 w-full rounded-lg px-3 py-3 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors text-left group"
                                >
                                    <div className="p-1.5 bg-slate-100 rounded-md group-hover:bg-blue-100/50 text-slate-500 group-hover:text-blue-600 transition-colors">
                                        <action.icon className="h-4 w-4" />
                                    </div>
                                    <span className="flex-1 font-medium">{action.name}</span>
                                    {action.shortcut && (
                                        <span className="text-xs text-slate-400 border border-slate-200 rounded px-1.5 bg-white">
                                            {action.shortcut}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <div className="border-t bg-slate-50 p-2 text-xs text-slate-400 flex justify-between px-4">
                    <span><strong>↑↓</strong> para navegar</span>
                    <span><strong>↵</strong> para seleccionar</span>
                </div>
            </DialogContent>
        </Dialog>
    );
}
