"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api-service";
import { AlertTriangle, Plus, CheckCircle2, Loader2 } from "lucide-react";

export function ComprobantesConfig() {
    const [batches, setBatches] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const [newBatch, setNewBatch] = useState({
        type: "31",
        sequenceType: "electronic",
        initialNumber: 1,
        finalNumber: 100,
        expiryDate: "2026-12-31"
    });

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const data = await api.getNcfSettings();
            setBatches(data);
        } catch (error) {
            console.error("Error loading NCF settings:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddBatch = async () => {
        setIsSaving(true);
        try {
            await api.saveNcfSetting(newBatch);
            await loadSettings();
            alert("Lote de NCF agregado exitosamente");
        } catch (error: any) {
            alert("Error: " + (error.message || "No se pudo agregar el lote"));
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card className="border-none shadow-lg bg-white/80 backdrop-blur-md">
                <CardHeader className="bg-primary/5 rounded-t-xl">
                    <CardTitle className="text-primary flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5" /> Gestión de Comprobantes (NCF)
                    </CardTitle>
                    <CardDescription>Configura tus lotes de números autorizados por DGII</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                    {/* Formulario para Nuevo Lote */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="space-y-2">
                            <Label>Modo de Facturación</Label>
                            <Select
                                value={newBatch.sequenceType}
                                onValueChange={(v) => {
                                    const defaultType = v === "electronic" ? "31" : "01";
                                    setNewBatch({ ...newBatch, sequenceType: v, type: defaultType });
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="electronic">Factura Electrónica (E)</SelectItem>
                                    <SelectItem value="traditional">Tradicional (B)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Tipo de Comprobante</Label>
                            <Select value={newBatch.type} onValueChange={(v) => setNewBatch({ ...newBatch, type: v })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {newBatch.sequenceType === "electronic" ? (
                                        <>
                                            <SelectItem value="31">E31 - Crédito Fiscal</SelectItem>
                                            <SelectItem value="32">E32 - Consumo</SelectItem>
                                            <SelectItem value="34">E34 - Nota de Crédito</SelectItem>
                                            <SelectItem value="44">E44 - Regímenes Especiales</SelectItem>
                                            <SelectItem value="45">E45 - Gubernamentales</SelectItem>
                                        </>
                                    ) : (
                                        <>
                                            <SelectItem value="01">B01 - Crédito Fiscal</SelectItem>
                                            <SelectItem value="02">B02 - Consumo</SelectItem>
                                            <SelectItem value="04">B04 - Nota de Crédito</SelectItem>
                                            <SelectItem value="14">B14 - Regímenes Especiales</SelectItem>
                                            <SelectItem value="15">B15 - Gubernamentales</SelectItem>
                                        </>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Desde</Label>
                            <Input type="number" value={newBatch.initialNumber} onChange={(e) => setNewBatch({ ...newBatch, initialNumber: parseInt(e.target.value) })} />
                        </div>
                        <div className="space-y-2">
                            <Label>Hasta</Label>
                            <Input type="number" value={newBatch.finalNumber} onChange={(e) => setNewBatch({ ...newBatch, finalNumber: parseInt(e.target.value) })} />
                        </div>
                        <div className="flex items-end">
                            <Button className="w-full gap-2" onClick={handleAddBatch} disabled={isSaving}>
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                Agregar Lote
                            </Button>
                        </div>
                    </div>

                    {/* Listado de Lotes */}
                    <div className="rounded-xl border border-slate-100 overflow-hidden">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead>Rango</TableHead>
                                    <TableHead>Actual</TableHead>
                                    <TableHead>Disponibles</TableHead>
                                    <TableHead>Estado</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-400">Cargando...</TableCell></TableRow>
                                ) : batches.length === 0 ? (
                                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-400">No hay lotes configurados</TableCell></TableRow>
                                ) : batches.map((batch, i) => {
                                    const available = batch.finalNumber - batch.currentValue;
                                    const isLow = available < 10;
                                    const isElectronic = batch.sequenceType === "electronic" || batch.series === "E";
                                    const label = isElectronic ? `e-CF ${batch.type}` : `B${batch.type}`;
                                    return (
                                        <TableRow key={i} className={isLow ? "bg-red-50/30" : ""}>
                                            <TableCell className="font-medium text-slate-700">{label}</TableCell>
                                            <TableCell className="text-slate-500">{batch.initialNumber} - {batch.finalNumber}</TableCell>
                                            <TableCell className="text-slate-700 font-bold">{batch.currentValue}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <span className={isLow ? "text-red-600 font-bold" : "text-green-600 font-bold"}>
                                                        {available}
                                                    </span>
                                                    {isLow && <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse" />}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${batch.isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                                                    {batch.isActive ? "Activo" : "Agotado"}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
