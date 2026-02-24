"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Handshake, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

export default function PartnersInfoPage() {
    return (
        <div className="container mx-auto px-4 py-8 max-w-2xl">
            <Breadcrumbs items={[{ label: "Inicio", href: "/dashboard" }, { label: "Programa Partners" }]} className="mb-4" />
            <div className="mb-8">
                <h1 className="text-3xl font-black text-slate-900 dark:text-foreground font-serif lowercase tracking-tighter">
                    Programa Partners
                </h1>
                <p className="text-slate-500 dark:text-muted-foreground font-medium mt-1">
                    Gana comisiones recurrentes por cada cliente que refieras a Lexis Bill
                </p>
            </div>
            <Card className="border-amber-200/50 dark:border-amber-900/30 bg-gradient-to-br from-amber-50/50 to-white dark:from-amber-950/20 dark:to-background">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                        <Handshake className="w-5 h-5" />
                        Únete como Partner
                    </CardTitle>
                    <CardDescription>
                        Refiere negocios a Lexis Bill y recibe un porcentaje de sus suscripciones activas. Sin coste para ti.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <p className="text-sm text-muted-foreground">
                        Si ya tienes cuenta de partner, inicia sesión y serás redirigido a tu panel. Si quieres aplicar al programa, usa el botón siguiente.
                    </p>
                    <div className="flex flex-wrap gap-3">
                        <Button asChild className="gap-2 bg-amber-600 hover:bg-amber-700 text-white">
                            <Link href="/unirse-como-partner">
                                Aplicar al programa
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </Button>
                        <Button asChild variant="outline">
                            <Link href="/programa-partners" target="_blank" rel="noopener noreferrer">
                                Ver más información
                            </Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
