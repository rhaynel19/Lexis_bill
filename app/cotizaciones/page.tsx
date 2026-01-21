"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, FileText, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Quotes() {
    const [quotes, setQuotes] = useState<any[]>([]);
    const router = useRouter();

    useEffect(() => {
        const stored = localStorage.getItem("quotes");
        if (stored) {
            setQuotes(JSON.parse(stored).reverse());
        }
    }, []);

    const handleConvertToInvoice = (quote: any) => {
        // Prepare invoice data sans ID/Date to be fresh
        const invoiceToClone = {
            clientName: quote.clientName,
            rnc: quote.rnc,
            items: quote.items,
            type: "32" // Default to Consumo, user can change
        };
        localStorage.setItem("invoiceToClone", JSON.stringify(invoiceToClone));
        router.push("/nueva-factura");
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-primary">Cotizaciones</h1>
                    <p className="text-gray-500">Gestione sus propuestas comerciales</p>
                </div>
                <Link href="/nueva-cotizacion">
                    <Button className="bg-[#D4AF37] hover:bg-amber-600 text-white gap-2">
                        <Plus className="w-4 h-4" /> Nueva Cotización
                    </Button>
                </Link>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Historial de Cotizaciones</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Total</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {quotes.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                        No hay cotizaciones registradas.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                quotes.map((q) => (
                                    <TableRow key={q.id}>
                                        <TableCell className="font-medium">{q.id}</TableCell>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium">{q.clientName}</p>
                                                <p className="text-xs text-gray-500">{q.rnc}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>{new Date(q.date).toLocaleDateString("es-DO")}</TableCell>
                                        <TableCell className="font-bold">
                                            {new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format(q.total)}
                                        </TableCell>
                                        <TableCell>
                                            <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                                                Abierta
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="gap-2 text-green-700 hover:text-green-800 hover:bg-green-50 border-green-200"
                                                onClick={() => handleConvertToInvoice(q)}
                                            >
                                                Convertir <ArrowRight className="w-3 h-3" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
