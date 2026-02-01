"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldAlert, LayoutDashboard, CreditCard, ArrowLeft, Users } from "lucide-react";
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
                <div className="container mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/admin">
                            <h1 className="text-xl font-bold flex items-center gap-2">
                                <ShieldAlert className="w-6 h-6 text-amber-500" />
                                Panel Admin
                            </h1>
                        </Link>
                        <nav className="flex gap-2">
                            <Link href="/admin">
                                <Button variant="outline" size="sm" className="gap-2">
                                    <CreditCard className="w-4 h-4" /> Pagos Pendientes
                                </Button>
                            </Link>
                            <Link href="/admin/partners">
                                <Button variant="outline" size="sm" className="gap-2">
                                    <Users className="w-4 h-4" /> Partners
                                </Button>
                            </Link>
                            <Link href="/admin/dashboard">
                                <Button variant="outline" size="sm" className="gap-2">
                                    <LayoutDashboard className="w-4 h-4" /> Estadísticas CEO
                                </Button>
                            </Link>
                        </nav>
                    </div>
                    <Link href="/dashboard">
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
