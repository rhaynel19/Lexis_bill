"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Handshake, LogOut, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LexisWord } from "@/components/LexisWord";
import { useAuth } from "@/components/providers/AuthContext";
import { toast } from "sonner";

export default function PartnerLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, refresh, logout, setUser, setLoading } = useAuth();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            setLoading(true);
            try {
                const me = await refresh();
                if (!me) {
                    router.replace("/");
                    return;
                }
                if (me.partner?.status !== "active") {
                    router.replace("/dashboard");
                    return;
                }
            } catch {
                setUser(null);
                router.replace("/");
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
        router.replace("/");
    };

    if (isLoading) {
        return (
            <div className="h-screen w-full bg-background flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-amber-600 dark:text-amber-400 font-medium uppercase tracking-widest text-xs">Panel Partner...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col bg-background text-foreground">
            <header className="shrink-0 border-b border-amber-500/20 bg-gradient-to-r from-amber-50/80 to-background dark:from-amber-950/20 dark:to-background sticky top-0 z-50">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <Link href="/partner/dashboard" className="flex items-baseline gap-2">
                        <LexisWord className="text-2xl text-accent" />
                        <span className="text-foreground font-light font-serif">BILL</span>
                        <span className="ml-2 text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider border-l border-amber-500/50 pl-2">
                            Partner
                        </span>
                    </Link>
                    <nav className="flex items-center gap-2">
                        <Link href="/partner/dashboard">
                            <Button
                                variant={pathname === "/partner/dashboard" ? "secondary" : "ghost"}
                                size="sm"
                                className="gap-2 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20"
                            >
                                <LayoutDashboard className="w-4 h-4" />
                                Dashboard
                            </Button>
                        </Link>
                        <ThemeToggle />
                        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-destructive" onClick={handleLogout}>
                            <LogOut className="w-4 h-4" />
                            Cerrar sesión
                        </Button>
                    </nav>
                </div>
            </header>
            <main className="flex-1">{children}</main>
        </div>
    );
}
