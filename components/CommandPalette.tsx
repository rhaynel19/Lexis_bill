"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { 
    Search, 
    FileText, 
    Users as UsersIcon, 
    Plus, 
    CreditCard, 
    LayoutDashboard, 
    X,
    FolderLock,
    Settings,
    ShieldCheck,
    ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface CommandItem {
    id: string;
    title: string;
    description?: string;
    icon: any;
    href?: string;
    action?: () => void;
    category: "navegacion" | "acciones" | "admin";
    isAdmin?: boolean;
}

export function CommandPalette({ userFromApi }: { userFromApi?: any }) {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [selectedIndex, setSelectedIndex] = useState(0);
    const router = useRouter();

    const isAdmin = userFromApi?.role === "admin" || userFromApi?.role === "ceo";

    const commands: CommandItem[] = useMemo(() => [
        // Navegación
        { id: "dash", title: "Dashboard", description: "Vista general de facturación", icon: LayoutDashboard, href: "/dashboard", category: "navegacion" },
        { id: "inv", title: "Mis Facturas", description: "Ver y gestionar comprobantes", icon: FileText, href: "/facturas", category: "navegacion" },
        { id: "cli", title: "Clientes", description: "Directorio de clientes", icon: UsersIcon, href: "/clientes", category: "navegacion" },
        { id: "rep", title: "Reportes Fiscales", description: "606, 607 y otros reportes", icon: FolderLock, href: "/reportes", category: "navegacion" },
        
        // Acciones
        { id: "new-inv", title: "Nueva Factura", description: "Crear un nuevo comprobante NCF", icon: Plus, href: "/facturas/nueva", category: "acciones" },
        { id: "new-cli", title: "Nuevo Cliente", description: "Agregar un cliente al directorio", icon: Plus, href: "/clientes?action=new", category: "acciones" },
        
        // Admin
        { id: "adm-dash", title: "Panel CEO / Estadísticas", description: "Métricas globales del sistema", icon: ShieldCheck, href: "/admin/dashboard", category: "admin", isAdmin: true },
        { id: "adm-pay", title: "Gestión de Pagos", description: "Validar suscripciones pendientes", icon: CreditCard, href: "/admin", category: "admin", isAdmin: true },
        { id: "adm-usr", title: "Usuarios y Clientes", description: "Administrar base de usuarios", icon: UsersIcon, href: "/admin/usuarios", category: "admin", isAdmin: true },
    ], []);

    const filteredCommands = useMemo(() => {
        return commands.filter(cmd => {
            const matchesRole = cmd.isAdmin ? isAdmin : true;
            const matchesQuery = cmd.title.toLowerCase().includes(query.toLowerCase()) || 
                               cmd.description?.toLowerCase().includes(query.toLowerCase());
            return matchesRole && matchesQuery;
        });
    }, [query, isAdmin, commands]);

    // Keyboard handlers
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setIsOpen(prev => !prev);
            }
            if (e.key === "Escape") setIsOpen(false);
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    const handleSelect = useCallback((cmd: CommandItem) => {
        setIsOpen(false);
        setQuery("");
        if (cmd.href) router.push(cmd.href);
        if (cmd.action) cmd.action();
    }, [router]);

    // Handle navigation keys
    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
        } else if (e.key === "Enter" && filteredCommands[selectedIndex]) {
            e.preventDefault();
            handleSelect(filteredCommands[selectedIndex]);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] px-4">
                {/* Backdrop */}
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setIsOpen(false)}
                    className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
                />

                {/* Modal */}
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: -20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -20 }}
                    className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col"
                >
                    <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
                        <Search className="w-5 h-5 text-slate-400" />
                        <input 
                            autoFocus
                            placeholder="¿Qué deseas hacer? (Escribe para buscar...)"
                            className="flex-1 bg-transparent border-none outline-none text-slate-900 dark:text-white placeholder:text-slate-500 text-lg"
                            value={query}
                            onChange={(e) => {
                                setQuery(e.target.value);
                                setSelectedIndex(0);
                            }}
                            onKeyDown={onKeyDown}
                        />
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] font-bold text-slate-500">
                            <span>ESC</span>
                        </div>
                    </div>

                    <div className="max-h-[60vh] overflow-y-auto p-2 scrollbar-thin">
                        {filteredCommands.length === 0 ? (
                            <div className="py-12 text-center">
                                <Search className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                                <p className="text-slate-500">No encontramos resultados para "{query}"</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {["navegacion", "acciones", "admin"].map(category => {
                                    const items = filteredCommands.filter(c => c.category === category);
                                    if (items.length === 0) return null;
                                    
                                    return (
                                        <div key={category} className="space-y-1">
                                            <p className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                {category === "navegacion" ? "Navegación" : category === "acciones" ? "Acciones Rápidas" : "Administración"}
                                            </p>
                                            {items.map((cmd) => {
                                                const globalIndex = filteredCommands.indexOf(cmd);
                                                const isActive = selectedIndex === globalIndex;
                                                const Icon = cmd.icon;
                                                
                                                return (
                                                    <button
                                                        key={cmd.id}
                                                        onClick={() => handleSelect(cmd)}
                                                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                                                        className={cn(
                                                            "w-full flex items-center gap-4 px-3 py-3 rounded-xl transition-all text-left group",
                                                            isActive 
                                                                ? "bg-primary text-white shadow-lg shadow-primary/20 scale-[1.01]" 
                                                                : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                                                        )}
                                                    >
                                                        <div className={cn(
                                                            "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                                                            isActive ? "bg-white/20" : "bg-slate-100 dark:bg-slate-800 group-hover:bg-white/10"
                                                        )}>
                                                            <Icon className={cn("w-5 h-5", isActive ? "text-white" : "text-slate-500")} />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-bold text-sm truncate">{cmd.title}</p>
                                                            <p className={cn(
                                                                "text-xs truncate",
                                                                isActive ? "text-white/80" : "text-slate-500"
                                                            )}>{cmd.description}</p>
                                                        </div>
                                                        {isActive && <ArrowRight className="w-4 h-4 ml-auto animate-in slide-in-from-left-2" />}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                        <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1"><span className="p-1 px-1.5 bg-slate-200 dark:bg-slate-800 rounded">↵</span> Seleccionar</span>
                            <span className="flex items-center gap-1"><span className="p-1 px-1.5 bg-slate-200 dark:bg-slate-800 rounded">↑↓</span> Navegar</span>
                        </div>
                        <p>Trinalyze Search 1.0</p>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
