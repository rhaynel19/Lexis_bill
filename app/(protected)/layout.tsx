"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CommandMenu } from "@/components/command-menu";
import { Plus, FileText, Settings, LayoutDashboard, Download, Menu, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { TrialHeaderBadge } from "@/components/TrialHeaderBadge";
import { SupportChat } from "@/components/support-chat";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";

export default function ProtectedLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            router.push("/login");
        } else {
            setIsLoading(false);
        }
    }, [router]);

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        // Clear caches from api-service if any
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith("cache_")) {
                localStorage.removeItem(key);
            }
        });
        toast.success("Sesión cerrada correctamente");
        router.push("/");
    };

    if (isLoading) {
        return (
            <div className="h-screen w-full bg-[#0A192F] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-[#D4AF37] font-serif tracking-widest uppercase text-xs">Verificando Credenciales...</p>
                </div>
            </div>
        );
    }
    return (
        <div className="flex flex-col h-screen bg-background text-foreground transition-colors duration-300">
            <div className="flex-none border-b border-[#D4AF37]/20 bg-[#0A192F] shadow-lg sticky top-0 z-50 transition-colors duration-300">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <Link href="/dashboard">
                        <div className="group">
                            <h1 className="text-2xl font-extrabold tracking-tight cursor-pointer transition-transform group-hover:scale-105">
                                <span className="text-[#D4AF37]">LEXIS</span> <span className="text-[#F9F6EE] font-light">BILL</span>
                            </h1>
                            <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-medium group-hover:text-[#D4AF37] transition-colors">
                                El orden que te deja tranquilo
                            </p>
                        </div>
                    </Link>

                    <div className="flex items-center gap-2 sm:gap-4">
                        <TrialHeaderBadge />
                        <ThemeToggle />

                        {/* Mobile Menu Trigger */}
                        <Sheet>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="icon" className="md:hidden text-white hover:bg-white/10">
                                    <Menu className="w-6 h-6" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="left" className="bg-[#0A192F] text-[#F9F6EE] border-r border-[#D4AF37]/20 p-0 w-72 flex flex-col">
                                <SheetHeader className="p-6 border-b border-[#D4AF37]/10 flex-none">
                                    <SheetTitle className="text-[#D4AF37] text-left uppercase tracking-tighter font-black">LEXIS BILL</SheetTitle>
                                </SheetHeader>
                                <nav className="flex-1 overflow-y-auto p-4">
                                    <SidebarLinks isMobile onLogout={handleLogout} />
                                </nav>
                            </SheetContent>
                        </Sheet>

                        {/* Mobile Search Trigger Hint */}
                        <div className="hidden sm:block text-xs text-slate-400 border border-slate-600 rounded px-2 py-1">
                            Ctrl+K
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden h-full">
                {/* Desktop Sidebar */}
                <aside className="hidden md:flex w-64 flex-col bg-[#0A192F] text-[#F9F6EE] border-r border-[#D4AF37]/10 h-full overflow-y-auto">
                    <nav className="flex-1 px-4 py-8 flex flex-col">
                        <SidebarLinks onLogout={handleLogout} />
                    </nav>
                    <div className="p-6 border-t border-[#D4AF37]/5 text-center">
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest">Lexis Bill Pro</p>
                    </div>
                </aside>

                {/* Contenido principal */}
                <main className="flex-grow overflow-y-auto bg-slate-50">
                    {children}
                </main>
            </div>

            <SupportChat />
            <CommandMenu />

            {/* Mobile FAB (Floating Action Button) */}
            <div className="fixed bottom-24 right-6 md:hidden z-50">
                <Link href="/nueva-factura">
                    <button className="h-14 w-14 bg-[#D4AF37] text-white rounded-full shadow-xl shadow-amber-500/30 flex items-center justify-center hover:scale-110 active:scale-95 transition-all">
                        <Plus className="h-8 w-8" />
                    </button>
                </Link>
            </div>

            {/* Mobile Bottom Navigation Bar */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0A192F] border-t border-[#D4AF37]/20 px-4 py-2 flex justify-around items-center z-40 shadow-[0_-2px_15px_rgba(0,0,0,0.3)]">
                <Link href="/dashboard" className="flex flex-col items-center gap-1 text-slate-400 hover:text-[#D4AF37]">
                    <LayoutDashboard className="w-6 h-6" />
                    <span className="text-[10px] font-medium uppercase">Inicio</span>
                </Link>
                <Link href="/cotizaciones" className="flex flex-col items-center gap-1 text-slate-400 hover:text-[#D4AF37]">
                    <FileText className="w-6 h-6" />
                    <span className="text-[10px] font-medium uppercase">Cotiza</span>
                </Link>
                <div className="w-12"></div> {/* Space for FAB */}
                <Link href="/reportes" className="flex flex-col items-center gap-1 text-slate-400 hover:text-[#D4AF37]">
                    <Plus className="w-6 h-6 rotate-45" />
                    <span className="text-[10px] font-medium uppercase">Fiscal</span>
                </Link>
                <Link href="/configuracion" className="flex flex-col items-center gap-1 text-slate-400 hover:text-[#D4AF37]">
                    <Settings className="w-6 h-6" />
                    <span className="text-[10px] font-medium uppercase">Perfil</span>
                </Link>
            </nav>
        </div>
    );
}

function SidebarLinks({ isMobile = false, onLogout }: { isMobile?: boolean, onLogout?: () => void }) {
    return (
        <div className="flex flex-col h-full justify-between">
            <div className="space-y-2">
                <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[#D4AF37]/10 transition-colors group">
                    <LayoutDashboard className="w-5 h-5 text-[#D4AF37]" />
                    <span className="font-medium">Dashboard</span>
                </Link>
                <Link href="/nueva-factura" className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[#D4AF37] text-[#0A192F] font-bold shadow-lg shadow-amber-500/20 hover:scale-[1.02] transition-all">
                    <Plus className="w-5 h-5" />
                    <span>Nueva Factura</span>
                </Link>
                <div className="pt-4 pb-2 px-4 text-[10px] text-slate-500 uppercase tracking-widest font-bold border-t border-[#D4AF37]/5 mt-2">Documentos</div>
                <Link href="/nueva-cotizacion" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[#D4AF37]/10 transition-colors">
                    <FileText className="w-5 h-5 text-slate-400" />
                    <span className="text-sm">Nueva Cotización</span>
                </Link>
                <Link href="/cotizaciones" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[#D4AF37]/10 transition-colors">
                    <FileText className="w-5 h-5 text-slate-400" />
                    <span className="text-sm">Ver Cotizaciones</span>
                </Link>
                <div className="pt-4 pb-2 px-4 text-[10px] text-slate-500 uppercase tracking-widest font-bold border-t border-[#D4AF37]/5 mt-2">Gestión</div>
                <Link href="/reportes" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[#D4AF37]/10 transition-colors">
                    <Download className="w-5 h-5 text-slate-400" />
                    <span className="text-sm">Reportes 606/607</span>
                </Link>
                <Link href="/configuracion" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[#D4AF37]/10 transition-colors">
                    <Settings className="w-5 h-5 text-slate-400" />
                    <span className="text-sm">Configuración</span>
                </Link>
            </div>

            {onLogout && (
                <div className="mt-auto pt-8">
                    <button
                        onClick={onLogout}
                        className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-colors border-t border-[#D4AF37]/5"
                    >
                        <LogOut className="w-5 h-5" />
                        <span className="text-sm font-medium">Cerrar Sesión</span>
                    </button>
                </div>
            )}
        </div>
    );
}
