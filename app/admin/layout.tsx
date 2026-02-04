"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldAlert, LayoutDashboard, CreditCard, ArrowLeft, Users, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const check = async () => {
            try {
                const { api } = await import("@/lib/api-service");
                const me = await api.getMe();
                if (me?.role === "admin") {
                    setIsAdmin(true);
                } else {
                    router.replace("/dashboard");
                }
            } catch {
                router.replace("/login");
            } finally {
                setIsLoading(false);
            }
        };
        check();
    }, [router]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
                    <p className="text-muted-foreground text-sm">Verificando acceso...</p>
                </div>
            </div>
        );
    }

    if (!isAdmin) return null;

    return (
        <div className="min-h-screen bg-background">
            <header className="border-b border-border/20 bg-card sticky top-0 z-40">
                <div className="container mx-auto px-4 py-4 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
                        <Link href="/admin" className="shrink-0">
                            <h1 className="text-xl font-bold flex items-center gap-2">
                                <ShieldAlert className="w-6 h-6 text-amber-500" />
                                Panel Admin
                            </h1>
                        </Link>
                        <nav className="flex gap-2 overflow-x-auto overflow-y-hidden min-w-0 flex-1 md:flex-initial md:overflow-visible pb-1 -mb-1 [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-thumb]:rounded-full">
                            <Link href="/admin" className="shrink-0">
                                <Button variant="outline" size="sm" className="gap-2 whitespace-nowrap">
                                    <CreditCard className="w-4 h-4 shrink-0" /> Pagos Pendientes
                                </Button>
                            </Link>
                            <Link href="/admin/usuarios" className="shrink-0">
                                <Button variant="outline" size="sm" className="gap-2 whitespace-nowrap">
                                    <UserCircle className="w-4 h-4 shrink-0" /> Usuarios
                                </Button>
                            </Link>
                            <Link href="/admin/partners" className="shrink-0">
                                <Button variant="outline" size="sm" className="gap-2 whitespace-nowrap">
                                    <Users className="w-4 h-4 shrink-0" /> Partners
                                </Button>
                            </Link>
                            <Link href="/admin/dashboard" className="shrink-0">
                                <Button variant="outline" size="sm" className="gap-2 whitespace-nowrap">
                                    <LayoutDashboard className="w-4 h-4 shrink-0" /> Estadísticas CEO
                                </Button>
                            </Link>
                        </nav>
                    </div>
                    <Link href="/dashboard" className="shrink-0 self-start sm:self-center">
                        <Button variant="ghost" size="sm" className="gap-2">
                            <ArrowLeft className="w-4 h-4" /> Volver a LexisBill
                        </Button>
                    </Link>
                </div>
            </header>
            <main className="container mx-auto px-4 py-8">{children}</main>
        </div>
    );
}
