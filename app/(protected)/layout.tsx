"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CommandMenu } from "@/components/command-menu";
import { Plus, FileText, Settings, LayoutDashboard, Download, Menu, LogOut, Receipt } from "lucide-react";
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
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        const user = localStorage.getItem("user");
        if (!user) {
            router.push("/login");
        } else {
            setIsLoading(false);
        }
    }, [router]);

    const handleLogout = async () => {
        try {
            const { api } = await import("@/lib/api-service");
            await api.logout();
        } catch {
            // Ignorar si falla (ej. offline)
        }
        localStorage.removeItem("user");
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith("cache_")) localStorage.removeItem(key);
        });
        toast.success("Sesión cerrada correctamente");
        router.push("/login");
    };

    if (isLoading) {
        return (
            <div className="h-screen w-full bg-background flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-accent font-serif tracking-widest uppercase text-xs">Verificando Credenciales...</p>
                </div>
            </div>
        );
    }
    return (
        <div className="flex flex-col h-screen bg-background text-foreground transition-colors duration-300">
            <div className="flex-none border-b border-border/20 bg-secondary shadow-lg sticky top-0 z-50 transition-colors duration-300">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <Link href="/dashboard">
                        <div className="group">
                            <h1 className="text-2xl font-extrabold tracking-tight cursor-pointer transition-transform group-hover:scale-105">
                                <span className="text-accent">LEXIS</span> <span className="text-foreground font-light">BILL</span>
                            </h1>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-medium group-hover:text-accent transition-colors">
                                El orden que te deja tranquilo
                            </p>
                        </div>
                    </Link>

                    <div className="flex items-center gap-2 sm:gap-4">
                        <TrialHeaderBadge />
                        <ThemeToggle />

                        {/* Mobile Menu Trigger */}
                        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="icon" className="md:hidden text-foreground hover:bg-foreground/10" aria-label="Abrir menú de navegación">
                                    <Menu className="w-6 h-6" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="left" className="bg-sidebar text-sidebar-foreground border-r border-sidebar-border p-0 w-72 flex flex-col">
                                <SheetHeader className="p-6 border-b border-sidebar-border/50 flex-none">
                                    <SheetTitle className="text-sidebar-primary text-left uppercase tracking-tighter font-black">LEXIS BILL</SheetTitle>
                                </SheetHeader>
                                <nav className="flex-1 overflow-y-auto p-4">
                                    <SidebarLinks isMobile onLogout={handleLogout} onNavigate={() => setMenuOpen(false)} />
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
                <aside className="hidden md:flex w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border h-full overflow-y-auto">
                    <nav className="flex-1 px-4 py-8 flex flex-col">
                        <SidebarLinks onLogout={handleLogout} />
                    </nav>
                    <div className="p-6 border-t border-sidebar-border/50 text-center">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Lexis Bill Pro</p>
                    </div>
                </aside>

                {/* Contenido principal */}
                <main className="flex-grow overflow-y-auto bg-background">
                    {children}
                </main>
            </div>

            <SupportChat />
            <CommandMenu />

            {/* Mobile FAB (Floating Action Button) */}
            <div className="fixed bottom-24 right-6 md:hidden z-50">
                <Link href="/nueva-factura">
                    <button className="h-14 w-14 bg-[#D4AF37] text-white rounded-full shadow-xl shadow-amber-500/30 flex items-center justify-center hover:scale-110 active:scale-95 transition-all" aria-label="Nueva factura" title="Nueva factura">
                        <Plus className="h-8 w-8" />
                    </button>
                </Link>
            </div>

            {/* Mobile Bottom Navigation Bar */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-secondary border-t border-border/20 px-4 py-2 flex justify-around items-center z-40 shadow-[0_-2px_15px_rgba(0,0,0,0.3)]">
                <Link href="/dashboard" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-accent">
                    <LayoutDashboard className="w-6 h-6" />
                    <span className="text-[10px] font-medium uppercase">Inicio</span>
                </Link>
                <Link href="/cotizaciones" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-accent">
                    <FileText className="w-6 h-6" />
                    <span className="text-[10px] font-medium uppercase">Cotiza</span>
                </Link>
                <div className="w-12"></div> {/* Space for FAB */}
                <Link href="/reportes" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-accent">
                    <Plus className="w-6 h-6 rotate-45" />
                    <span className="text-[10px] font-medium uppercase">Fiscal</span>
                </Link>
                <Link href="/configuracion" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-accent">
                    <Settings className="w-6 h-6" />
                    <span className="text-[10px] font-medium uppercase">Perfil</span>
                </Link>
            </nav>
        </div>
    );
}

function SidebarLinks({ isMobile = false, onLogout, onNavigate }: { isMobile?: boolean, onLogout?: () => void; onNavigate?: () => void }) {
    const NavLink = ({ href, children, ...props }: { href: string; children: React.ReactNode; [k: string]: unknown }) => (
        <Link href={href} onClick={onNavigate} className={props.className as string} {...props}>
            {children}
        </Link>
    );
    return (
        <div className="flex flex-col h-full justify-between">
            <div className="space-y-2">
                <NavLink href="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-sidebar-primary/10 transition-colors group">
                    <LayoutDashboard className="w-5 h-5 text-sidebar-primary" />
                    <span className="font-medium">Dashboard</span>
                </NavLink>
                <NavLink href="/nueva-factura" className="flex items-center gap-3 px-4 py-3 rounded-lg bg-sidebar-primary text-sidebar-primary-foreground font-bold shadow-lg shadow-sidebar-primary/20 hover:scale-[1.02] transition-all">
                    <Plus className="w-5 h-5" />
                    <span>Nueva Factura</span>
                </NavLink>
                <div className="pt-4 pb-2 px-4 text-[10px] text-sidebar-foreground/50 uppercase tracking-widest font-bold border-t border-sidebar-border/30 mt-2">Documentos</div>
                <NavLink href="/nueva-cotizacion" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-sidebar-accent transition-colors">
                    <FileText className="w-5 h-5 text-sidebar-foreground/60" />
                    <span className="text-sm">Nueva Cotización</span>
                </NavLink>
                <NavLink href="/cotizaciones" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-sidebar-accent transition-colors">
                    <FileText className="w-5 h-5 text-sidebar-foreground/60" />
                    <span className="text-sm">Ver Cotizaciones</span>
                </NavLink>
                <div className="pt-4 pb-2 px-4 text-[10px] text-sidebar-foreground/50 uppercase tracking-widest font-bold border-t border-sidebar-border/30 mt-2">Gestión</div>
                <NavLink href="/gastos" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-sidebar-accent transition-colors">
                    <Receipt className="w-5 h-5 text-sidebar-foreground/60" />
                    <span className="text-sm">Gastos (606)</span>
                </NavLink>
                <NavLink href="/reportes" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-sidebar-accent transition-colors">
                    <Download className="w-5 h-5 text-sidebar-foreground/60" />
                    <span className="text-sm">Reportes Fiscales</span>
                </NavLink>
                <NavLink href="/configuracion" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-sidebar-accent transition-colors">
                    <Settings className="w-5 h-5 text-sidebar-foreground/60" />
                    <span className="text-sm">Configuración</span>
                </NavLink>
            </div>

            {onLogout && (
                <div className="mt-auto pt-8">
                    <button
                        onClick={onLogout}
                        className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors border-t border-border/10"
                    >
                        <LogOut className="w-5 h-5" />
                        <span className="text-sm font-medium">Cerrar Sesión</span>
                    </button>
                </div>
            )}
        </div>
    );
}
