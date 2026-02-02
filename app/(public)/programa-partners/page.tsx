"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, FileText, Handshake } from "lucide-react";

const TERMS_CONTENT = `
Términos del Programa de Partners Lexis Bill

• La cartera de clientes referidos pertenece a Lexis Bill. El partner recibe comisión mientras el cliente permanezca activo dentro del programa.

• La comisión se paga mensualmente, 30 días después del cobro efectivo al cliente.

• El partner se compromete a brindar soporte básico de onboarding a sus referidos.

• Lexis Bill se reserva el derecho de modificar tasas de comisión con 30 días de anticipación.

• Lexis Bill puede suspender al partner por incumplimiento de términos o conducta fraudulenta.
`.trim();

export default function ProgramaPartnersPage() {
    return (
        <div className="min-h-screen bg-[#0F172A] px-4 py-8">
            <div className="max-w-2xl mx-auto">
                <Link href="/unirse-como-partner">
                    <Button variant="ghost" className="text-slate-400 hover:text-amber-400 mb-6 -ml-2">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Volver al Programa Partners
                    </Button>
                </Link>
                <Card className="bg-white/95 dark:bg-card border-none shadow-2xl overflow-hidden rounded-2xl">
                    <div className="h-2 w-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-700" />
                    <CardHeader className="text-center pb-2 pt-8">
                        <div className="flex justify-center mb-2">
                            <Handshake className="w-10 h-10 text-amber-500" />
                        </div>
                        <CardTitle className="text-xl font-black text-slate-900 dark:text-foreground flex items-center justify-center gap-2">
                            <FileText className="w-5 h-5 text-amber-500" />
                            Términos del Programa de Partners Lexis Bill
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-6 md:px-10 pb-10">
                        <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                            {TERMS_CONTENT}
                        </pre>
                        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
                            <Link href="/unirse-como-partner">
                                <Button className="w-full bg-amber-500 hover:bg-amber-600 text-white">
                                    Unirse como Partner
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
