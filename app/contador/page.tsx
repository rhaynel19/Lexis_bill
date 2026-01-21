"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Share2, Lock, FileSpreadsheet, Eye } from "lucide-react";
import { useState } from "react";

export default function AccountantModule() {
    const [linkGenerated, setLinkGenerated] = useState(false);
    const inviteLink = "https://lexis-bill.app/invite/c7f8a9... (Simulado)";

    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
                        <Lock className="w-6 h-6 text-slate-400" /> Portal del Contador
                    </h1>
                    <p className="text-gray-500">Acceso seguro y simplificado para gestión fiscal.</p>
                </div>
                {!linkGenerated ? (
                    <Button onClick={() => setLinkGenerated(true)} className="bg-blue-600 hover:bg-blue-700">
                        <Share2 className="w-4 h-4 mr-2" /> Generar Link de Invitación
                    </Button>
                ) : (
                    <div className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-lg border border-green-200 animate-in fade-in">
                        <span className="text-sm font-medium">Link activo:</span>
                        <code className="text-xs bg-white px-2 py-1 rounded border overflow-hidden max-w-[150px] text-ellipsis whitespace-nowrap">{inviteLink}</code>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => alert("Copiado!")}>📋</Button>
                    </div>
                )}
            </div>

            <div className="grid gap-6 md:grid-cols-3 mb-8">
                {/* 606 Card */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex justify-between">
                            Reporte 606 (Gastos)
                            <FileSpreadsheet className="text-slate-400" />
                        </CardTitle>
                        <CardDescription>Compras de Bienes y Servicios</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold mb-4">12 Registros</div>
                        <Button variant="outline" className="w-full" onClick={() => alert("⬇️ Descargando DGII_606_YYYYMM.txt...")}>
                            <Download className="w-4 h-4 mr-2" /> Descargar TXT
                        </Button>
                    </CardContent>
                </Card>

                {/* 607 Card */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex justify-between">
                            Reporte 607 (Ventas)
                            <FileSpreadsheet className="text-slate-400" />
                        </CardTitle>
                        <CardDescription>Ventas de Bienes y Servicios</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold mb-4">45 Registros</div>
                        <Button variant="outline" className="w-full" onClick={() => alert("⬇️ Descargando DGII_607_YYYYMM.txt...")}>
                            <Download className="w-4 h-4 mr-2" /> Descargar TXT
                        </Button>
                    </CardContent>
                </Card>

                {/* IT-1 Card */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex justify-between">
                            Declaración IT-1
                            <FileSpreadsheet className="text-slate-400" />
                        </CardTitle>
                        <CardDescription>ITBIS Mensual (Borrador)</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold mb-4">Generado</div>
                        <Button variant="outline" className="w-full" onClick={() => alert("⬇️ Descargando Borrador IT-1...")}>
                            <Eye className="w-4 h-4 mr-2" /> Visualizar
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Vista Previa de Movimientos (Solo Lectura)</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border p-8 text-center bg-slate-50 text-slate-500">
                        <Lock className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p>El contador tiene acceso completo de lectura a todas las facturas y gastos.</p>
                        <p className="text-xs mt-2">No puede editar ni eliminar registros.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
