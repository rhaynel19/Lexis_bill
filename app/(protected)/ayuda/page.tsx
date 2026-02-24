"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, FileText, HelpCircle, BookOpen, MessageCircle, ArrowRight, Sparkles } from "lucide-react";
import { useState } from "react";
import { generateManualPdf } from "@/lib/manual-pdf";
import { setShowGuideAgain } from "@/components/onboarding/FirstTimeGuide";

export default function AyudaPage() {
    const router = useRouter();
    const [downloading, setDownloading] = useState(false);

    const handleShowGuideAgain = () => {
        setShowGuideAgain();
        router.push("/dashboard");
    };

    const handleDownloadManual = async () => {
        setDownloading(true);
        try {
            await generateManualPdf();
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-6 md:py-8 max-w-4xl pb-20">
            <div className="mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold text-primary mb-2">Centro de Ayuda</h1>
                <p className="text-muted-foreground">Tutoriales, manual de uso y soporte para Lexis Bill.</p>
            </div>

            <div className="grid gap-6">
                {/* Manual en PDF */}
                <Card className="border-primary/20 shadow-lg">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                <BookOpen className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <CardTitle className="text-xl">Manual de Uso Oficial</CardTitle>
                                <CardDescription>Guía completa: facturas, NCF, reportes 606/607, suscripción y más.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Incluye: crear factura, nota de crédito, cotizaciones, clientes, rangos NCF, reportes 606 y 607, Resumen ITBIS, suscripción y preguntas frecuentes. Advertencias fiscales incluidas.
                        </p>
                        <Button
                            onClick={handleDownloadManual}
                            disabled={downloading}
                            className="gap-2 font-semibold"
                        >
                            <Download className="w-5 h-5" />
                            {downloading ? "Generando…" : "Descargar Manual en PDF"}
                        </Button>
                    </CardContent>
                </Card>

                {/* Guía de inicio de nuevo */}
                <Card className="border-primary/20">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                <Sparkles className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <CardTitle className="text-xl">Guía de inicio</CardTitle>
                                <CardDescription>¿Primera vez o quieres repasar los pasos? Vuelve a ver la guía rápida.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Button variant="outline" className="gap-2 w-full sm:w-auto" onClick={handleShowGuideAgain}>
                            <Sparkles className="w-4 h-4" />
                            Ver guía de inicio de nuevo
                        </Button>
                    </CardContent>
                </Card>

                {/* Guía rápida por módulo */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <HelpCircle className="w-5 h-5 text-primary" />
                            Guía por módulo
                        </CardTitle>
                        <CardDescription>Acceso rápido a cada sección de la app.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-3 text-sm">
                            <li className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                                <span className="font-medium">Facturación</span>
                                <Link href="/nueva-factura" className="text-primary hover:underline inline-flex items-center gap-1">
                                    Nueva factura <ArrowRight className="w-4 h-4" />
                                </Link>
                            </li>
                            <li className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                                <span className="font-medium">Cotizaciones</span>
                                <Link href="/cotizaciones" className="text-primary hover:underline inline-flex items-center gap-1">
                                    Ver cotizaciones <ArrowRight className="w-4 h-4" />
                                </Link>
                            </li>
                            <li className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                                <span className="font-medium">Clientes</span>
                                <Link href="/clientes" className="text-primary hover:underline inline-flex items-center gap-1">
                                    Gestionar clientes <ArrowRight className="w-4 h-4" />
                                </Link>
                            </li>
                            <li className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                                <span className="font-medium">Reportes 606 / 607</span>
                                <Link href="/reportes" className="text-primary hover:underline inline-flex items-center gap-1">
                                    Reportes fiscales <ArrowRight className="w-4 h-4" />
                                </Link>
                            </li>
                            <li className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                                <span className="font-medium">NCF y datos fiscales</span>
                                <Link href="/configuracion" className="text-primary hover:underline inline-flex items-center gap-1">
                                    Configuración <ArrowRight className="w-4 h-4" />
                                </Link>
                            </li>
                            <li className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                                <span className="font-medium">Suscripción y pagos</span>
                                <Link href="/pagos" className="text-primary hover:underline inline-flex items-center gap-1">
                                    Pagos <ArrowRight className="w-4 h-4" />
                                </Link>
                            </li>
                        </ul>
                    </CardContent>
                </Card>

                {/* Documentos legales */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <FileText className="w-5 h-5 text-primary" />
                            Documentos legales
                        </CardTitle>
                        <CardDescription>Términos, privacidad, uso aceptable, limitación de responsabilidad y reembolsos.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-3">
                            <Link href="/terminos" target="_blank" rel="noopener noreferrer">
                                <Button variant="outline" size="sm">Términos y Condiciones</Button>
                            </Link>
                            <Link href="/privacidad" target="_blank" rel="noopener noreferrer">
                                <Button variant="outline" size="sm">Privacidad</Button>
                            </Link>
                            <Link href="/uso-aceptable" target="_blank" rel="noopener noreferrer">
                                <Button variant="outline" size="sm">Uso Aceptable</Button>
                            </Link>
                            <Link href="/reembolsos" target="_blank" rel="noopener noreferrer">
                                <Button variant="outline" size="sm">Reembolsos</Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>

                {/* Soporte */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <MessageCircle className="w-5 h-5 text-primary" />
                            Soporte
                        </CardTitle>
                        <CardDescription>¿Algo no funciona o tienes dudas?</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                            En <strong>Configuración</strong> puedes enviar un ticket de soporte. También puedes contactarnos por WhatsApp o correo (info@lexisbill.do).
                        </p>
                        <Link href="/configuracion">
                            <Button variant="outline" className="gap-2">
                                Ir a Configuración y soporte
                                <ArrowRight className="w-4 h-4" />
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
