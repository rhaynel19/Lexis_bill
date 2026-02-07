"use client";

import { useState, useEffect } from "react";
import { ShieldAlert } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { CommandMenu } from "@/components/command-menu";
import { Plus, FileText, Settings, LayoutDashboard, Download, Menu, LogOut, Receipt, CreditCard, FolderLock, Users, Handshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { TrialHeaderBadge } from "@/components/TrialHeaderBadge";
import { SupportChat } from "@/components/support-chat";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { LexisWord } from "@/components/LexisWord";
import { LexisHelpPanel } from "@/components/LexisHelpPanel";
import { useAuth } from "@/components/providers/AuthContext";
import { cn } from "@/lib/utils";

export default function ProtectedLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const router = useRouter();
    const pathname = usePathname();
    const { user: userFromApi, setUser, setLoading, refresh, logout } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        const checkAuth = async () => {
            setLoading(true);
            try {
                const me = await refresh();
                if (me) {
                    if (me.onboardingCompleted === false && !window.location.pathname.startsWith("/onboarding")) {
                        router.replace("/onboarding");
                        return;
                    }
                } else {
                    router.push("/login");
                    return;
                }
            } catch {
                setUser(null);
                router.push("/login");
                return;
            } finally {
                setIsLoading(false);
                setLoading(false);
            }
        };
        checkAuth();
    }, [router, refresh, setUser, setLoading]);

    const handleLogout = async () => {
        await logout();
        toast.success("Sesión cerrada correctamente");
        router.push("/login");
    };

    if (isLoading) {
        return (
            <div className="h-screen w-full bg-background flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-accent font-serif tracking-widest uppercase text-xs">Lexis está verificando tu sesión...</p>
                </div>
            </div>
        );
    }

    const isOnboardingPage = pathname?.startsWith("/onboarding");

    if (isOnboardingPage) {
        return (
            <div className="min-h-screen bg-background">
                <header className="border-b border-border/20 bg-card sticky top-0 z-40">
                    <div className="container mx-auto px-4 py-4">
                        <Link href="/dashboard" className="flex items-baseline gap-1">
                            <LexisWord className="text-xl text-accent" /> <span className="text-foreground font-light font-serif">BILL</span>
                        </Link>
                    </div>
                </header>
                <main>{children}</main>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col bg-background text-foreground transition-colors duration-300">
            <header className="shrink-0 border-b border-border/20 bg-secondary shadow-lg sticky top-0 z-50 transition-colors duration-300">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <Link href="/dashboard">
                        <div className="group">
                            <h1 className="text-2xl font-extrabold tracking-tight cursor-pointer transition-transform group-hover:scale-105 flex items-baseline gap-1">
                                <LexisWord className="text-2xl text-accent" /> <span className="text-foreground font-light font-serif">BILL</span>
                            </h1>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-medium group-hover:text-accent transition-colors">
                                El orden que te deja tranquilo
                            </p>
                        </div>
                    </Link>

                    <div className="flex items-center gap-2 sm:gap-4">
                        {userFromApi?.role === "admin" && (
                            <Link href="/admin">
                                <Button variant="outline" size="sm" className="gap-2 border-amber-500/50 text-amber-600 hover:bg-amber-500/20 hover:text-amber-500 font-semibold">
                                    <ShieldAlert className="w-4 h-4" />
                                    <span className="hidden sm:inline">Admin</span>
                                </Button>
                            </Link>
                        )}
                        <TrialHeaderBadge />
                        <div className="hidden sm:block">
                            <LexisHelpPanel />
                        </div>
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
                                    <SidebarLinks isMobile isAdmin={userFromApi?.role === "admin"} isPartner={userFromApi?.partner?.status === "active"} onLogout={handleLogout} onNavigate={() => setMenuOpen(false)} />
                                </nav>
                            </SheetContent>
                        </Sheet>

                        {/* Mobile Search Trigger Hint */}
                        <div className="hidden sm:block text-xs text-slate-400 border border-slate-600 rounded px-2 py-1">
                            Ctrl+K
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex flex-1 min-h-0 overflow-hidden">
                {/* Desktop Sidebar */}
                <aside className="hidden md:flex w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border h-full overflow-y-auto">
                    <nav className="flex-1 px-4 py-8 flex flex-col">
                        <SidebarLinks isAdmin={userFromApi?.role === "admin"} isPartner={userFromApi?.partner?.status === "active"} onLogout={handleLogout} />
                    </nav>
                    <div className="p-6 border-t border-sidebar-border/50 text-center">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Lexis Bill Pro</p>
                    </div>
                </aside>

                {/* Contenido principal - flex-1 min-h-0 para scroll correcto sin forzar altura */}
                <main className="flex-1 min-w-0 min-h-0 overflow-y-auto bg-background">
                    {children}
                </main>
            </div>

            <SupportChat />
            <CommandMenu />

            {/* Mobile FAB (Floating Action Button) - bottom-28 evita solapamiento con barra nav */}
            <div className="fixed bottom-28 right-4 md:hidden z-50">
                <Link href="/nueva-factura">
                    <button className="h-14 w-14 bg-accent text-accent-foreground rounded-full shadow-xl shadow-amber-500/30 flex items-center justify-center hover:scale-110 active:scale-95 transition-all" aria-label="Nueva factura" title="Nueva factura">
                        <Plus className="h-8 w-8" />
                    </button>
                </Link>
            </div>

            {/* Mobile Bottom Navigation Bar */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-secondary border-t border-border/20 px-2 py-2 flex justify-around items-center z-40 shadow-[0_-2px_15px_rgba(0,0,0,0.3)]">
                <Link href="/dashboard" className={cn("flex flex-col items-center gap-0.5 min-w-0 flex-1 transition-colors", pathname === "/dashboard" ? "text-accent font-medium" : "text-muted-foreground hover:text-accent")}>
                    <LayoutDashboard className="w-5 h-5 shrink-0" />
                    <span className="text-[9px] font-medium uppercase truncate w-full text-center">Inicio</span>
                </Link>
                <Link href="/cotizaciones" className="flex flex-col items-center gap-0.5 text-muted-foreground hover:text-accent min-w-0 flex-1">
                    <FileText className="w-5 h-5 shrink-0" />
                    <span className="text-[9px] font-medium uppercase truncate w-full text-center">Cotiza</span>
                </Link>
                <Link href="/clientes" className="flex flex-col items-center gap-0.5 text-muted-foreground hover:text-accent min-w-0 flex-1">
                    <Users className="w-5 h-5 shrink-0" />
                    <span className="text-[9px] font-medium uppercase truncate w-full text-center">Clientes</span>
                </Link>
                <div className="w-10 shrink-0"></div> {/* Space for FAB */}
                <Link href="/reportes" className="flex flex-col items-center gap-0.5 text-muted-foreground hover:text-accent min-w-0 flex-1">
                    <Download className="w-5 h-5 shrink-0" />
                    <span className="text-[9px] font-medium uppercase truncate w-full text-center">Fiscal</span>
                </Link>
                <Link href="/pagos" className="flex flex-col items-center gap-0.5 text-amber-600 hover:text-amber-500 font-medium min-w-0 flex-1">
                    <CreditCard className="w-5 h-5 shrink-0" />
                    <span className="text-[9px] font-medium uppercase truncate w-full text-center">Pagar</span>
                </Link>
                <Link href="/configuracion" className="flex flex-col items-center gap-0.5 text-muted-foreground hover:text-accent min-w-0 flex-1">
                    <Settings className="w-5 h-5 shrink-0" />
                    <span className="text-[9px] font-medium uppercase truncate w-full text-center">Perfil</span>
                </Link>
            </nav>
        </div>
    );
}

function AdminNavLink({ isAdmin }: { isAdmin: boolean }) {
    if (!isAdmin) return null;
    return (
        <Link href="/admin" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-amber-500/20 transition-colors text-amber-600 border-l-2 border-amber-500/50 mt-2">
            <ShieldAlert className="w-5 h-5" />
            <span className="text-sm font-medium">Panel Admin</span>
        </Link>
    );
}

function SidebarLinks({ isMobile = false, isAdmin = false, isPartner = false, onLogout, onNavigate }: { isMobile?: boolean; isAdmin?: boolean; isPartner?: boolean; onLogout?: () => void; onNavigate?: () => void }) {
    const linkProps = (className: string) => ({ className, onClick: onNavigate });
    return (
        <div className="flex flex-col h-full justify-between">
            <div className="space-y-2">
                <Link href="/dashboard" {...linkProps("flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-sidebar-primary/10 transition-colors group")}>
                    <LayoutDashboard className="w-5 h-5 text-sidebar-primary" />
                    <span className="font-medium">Dashboard</span>
                </Link>
                <Link href="/nueva-factura" {...linkProps("flex items-center gap-3 px-4 py-3 rounded-lg bg-sidebar-primary text-sidebar-primary-foreground font-bold shadow-lg shadow-sidebar-primary/20 hover:scale-[1.02] transition-all")}>
                    <Plus className="w-5 h-5" />
                    <span>Nueva Factura</span>
                </Link>
                <div className="pt-4 pb-2 px-4 text-[10px] text-sidebar-foreground/50 uppercase tracking-widest font-bold border-t border-sidebar-border/30 mt-2">Documentos</div>
                <Link href="/nueva-cotizacion" {...linkProps("flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-sidebar-accent transition-colors")}>
                    <FileText className="w-5 h-5 text-sidebar-foreground/60" />
                    <span className="text-sm">Nueva Cotización</span>
                </Link>
                <Link href="/cotizaciones" {...linkProps("flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-sidebar-accent transition-colors")}>
                    <FileText className="w-5 h-5 text-sidebar-foreground/60" />
                    <span className="text-sm">Ver Cotizaciones</span>
                </Link>
                <div className="pt-4 pb-2 px-4 text-[10px] text-sidebar-foreground/50 uppercase tracking-widest font-bold border-t border-sidebar-border/30 mt-2">Gestión</div>
                <Link href="/clientes" {...linkProps("flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-sidebar-accent transition-colors")}>
                    <Users className="w-5 h-5 text-sidebar-foreground/60" />
                    <span className="text-sm">Clientes / Migrar</span>
                </Link>
                <Link href="/gastos" {...linkProps("flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-sidebar-accent transition-colors")}>
                    <Receipt className="w-5 h-5 text-sidebar-foreground/60" />
                    <span className="text-sm">Gastos (606)</span>
                </Link>
                <Link href="/reportes" {...linkProps("flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-sidebar-accent transition-colors")}>
                    <Download className="w-5 h-5 text-sidebar-foreground/60" />
                    <span className="text-sm">Reportes Fiscales</span>
                </Link>
                <Link href="/pagos" {...linkProps("flex items-center gap-3 px-4 py-3 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 transition-colors text-amber-600 border-l-2 border-amber-500/40")}>
                    <CreditCard className="w-5 h-5 text-amber-600" />
                    <span className="text-sm font-semibold">Pagar</span>
                </Link>
                <Link href="/documentos" {...linkProps("flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-sidebar-accent transition-colors")}>
                    <FolderLock className="w-5 h-5 text-sidebar-foreground/60" />
                    <span className="text-sm">Documentos</span>
                </Link>
                <Link href="/configuracion" {...linkProps("flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-sidebar-accent transition-colors")}>
                    <Settings className="w-5 h-5 text-sidebar-foreground/60" />
                    <span className="text-sm">Configuración</span>
                </Link>
                {isPartner && (
                    <Link href="/partners" {...linkProps("flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-amber-500/20 transition-colors text-amber-600 border-l-2 border-amber-500/50 mt-2")}>
                        <Handshake className="w-5 h-5" />
                        <span className="text-sm font-medium">Partner</span>
                    </Link>
                )}
                <AdminNavLink isAdmin={isAdmin} />
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
