"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { api } from "@/lib/api-service";
import { AlertTriangle, Plus, CheckCircle2, Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export function ComprobantesConfig({ locked = false }: { locked?: boolean }) {
    const [batches, setBatches] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const [newBatch, setNewBatch] = useState({
        type: "31",
        sequenceType: "electronic",
        initialNumber: 1,
        finalNumber: 100,
        expiryDate: ""
    });
    const [editBatch, setEditBatch] = useState<{ _id: string; initialNumber: number; finalNumber: number; expiryDate: string } | null>(null);
    const [editForm, setEditForm] = useState({ initialNumber: 1, finalNumber: 100, expiryDate: "" });
    const [isUpdating, setIsUpdating] = useState(false);

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
        if (!newBatch.initialNumber || newBatch.initialNumber <= 0) {
            toast.error("El número inicial (Desde) debe ser mayor a 0.");
            return;
        }
        if (!newBatch.finalNumber || newBatch.finalNumber < newBatch.initialNumber) {
            toast.error("El número final (Hasta) no puede ser menor al inicial.");
            return;
        }
        if (!newBatch.expiryDate) {
            toast.error("Por seguridad, debes especificar la fecha de vencimiento autorizada por la DGII.");
            return;
        }
        
        const existingActive = batches.find(b => b.type === newBatch.type && b.sequenceType === newBatch.sequenceType && b.isActive);
        if (existingActive) {
            const available = existingActive.finalNumber - existingActive.currentValue;
            if (available > 0) {
                if (!confirm(`⚠️ ¡ATENCIÓN! Tu lote actual aún tiene ${available} número(s) disponible(s). Al agregar este nuevo lote, el anterior quedará inactivo. ¿Estás seguro de proceder?`)) {
                    return;
                }
            }
        }

        setIsSaving(true);
        try {
            await api.saveNcfSetting(newBatch);
            await loadSettings();
            toast.success("Lote de NCF agregado exitosamente");
        } catch (error: any) {
            toast.error(error?.message || "No se pudo agregar el lote");
        } finally {
            setIsSaving(false);
        }
    };

    const openEdit = (batch: any) => {
        const expiry = batch.expiryDate ? new Date(batch.expiryDate).toISOString().slice(0, 10) : "";
        const isUsed = batch.currentValue !== batch.initialNumber;
        setEditBatch({ _id: batch._id, initialNumber: batch.initialNumber, finalNumber: batch.finalNumber, expiryDate: batch.expiryDate, isUsed });
        setEditForm({ initialNumber: batch.initialNumber, finalNumber: batch.finalNumber, expiryDate: expiry });
    };

    const handleUpdateBatch = async () => {
        if (!editBatch) return;
        setIsUpdating(true);
        try {
            await api.updateNcfSetting(editBatch._id, {
                initialNumber: editForm.initialNumber,
                finalNumber: editForm.finalNumber,
                expiryDate: editForm.expiryDate || undefined
            });
            toast.success("Lote actualizado.");
            setEditBatch(null);
            await loadSettings();
        } catch (error: any) {
            toast.error(error?.message || "No se pudo actualizar el lote");
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDeleteBatch = async (batch: any) => {
        if (batch.currentValue !== batch.initialNumber) {
            toast.error("No se puede borrar un lote que ya tiene comprobantes en uso.");
            return;
        }
        const confirmText = prompt(`Para confirmar, escribe "BORRAR" en mayúsculas.\nEsto eliminará permanentemente el lote de NCF de ${batch.initialNumber} al ${batch.finalNumber}.`);
        if (confirmText !== "BORRAR") {
             if (confirmText !== null) toast.info("Operación cancelada. Debes escribir BORRAR exactamente.");
             return;
        }
        try {
            await api.deleteNcfSetting(batch._id);
            toast.success("Lote eliminado.");
            await loadSettings();
        } catch (error: any) {
            toast.error(error?.message || "No se pudo eliminar el lote");
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
                    <div className={`p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-4 ${locked ? "opacity-70 pointer-events-none" : ""}`}>
                        {/* Fila 1: Modo y Tipo de Comprobante */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2 min-w-0">
                                <Label>Modo de Facturación</Label>
                                <Select
                                    value={newBatch.sequenceType}
                                    onValueChange={(v) => {
                                        const defaultType = v === "electronic" ? "31" : "01";
                                        setNewBatch({ ...newBatch, sequenceType: v, type: defaultType });
                                    }}
                                    disabled={locked}
                                >
                                    <SelectTrigger className="w-full truncate">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="electronic">Factura Electrónica (E)</SelectItem>
                                        <SelectItem value="traditional">Tradicional (B)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2 min-w-0">
                                <Label>Tipo de Comprobante</Label>
                                <Select value={newBatch.type} onValueChange={(v) => setNewBatch({ ...newBatch, type: v })} disabled={locked}>
                                    <SelectTrigger className="w-full truncate">
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
                        </div>
                        {/* Fila 2: Desde, Hasta, Vencimiento, Botón */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-end">
                            <div className="space-y-2">
                                <Label>Desde</Label>
                                <Input type="number" min="1" value={newBatch.initialNumber || ""} onChange={(e) => setNewBatch({ ...newBatch, initialNumber: parseInt(e.target.value) || 0 })} disabled={locked} />
                            </div>
                            <div className="space-y-2">
                                <Label>Hasta</Label>
                                <Input type="number" min="1" value={newBatch.finalNumber || ""} onChange={(e) => setNewBatch({ ...newBatch, finalNumber: parseInt(e.target.value) || 0 })} disabled={locked} />
                            </div>
                            <div className="space-y-2 col-span-2 sm:col-span-1">
                                <Label className="flex items-center gap-1 text-red-600 dark:text-red-400 font-semibold" title="Requerido por la DGII">Vence (DGII) <span className="text-[10px]">*</span></Label>
                                <Input type="date" value={newBatch.expiryDate} onChange={(e) => setNewBatch({ ...newBatch, expiryDate: e.target.value })} disabled={locked} />
                            </div>
                            <div className="col-span-2 sm:col-span-1">
                                <Button className="w-full gap-2 shadow-sm font-semibold" onClick={handleAddBatch} disabled={isSaving || locked}>
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                    Añadir Lote
                                </Button>
                            </div>
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
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-400">Cargando...</TableCell></TableRow>
                                ) : batches.length === 0 ? (
                                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-400">No hay lotes configurados</TableCell></TableRow>
                                ) : batches.map((batch, i) => {
                                    const available = batch.finalNumber - batch.currentValue;
                                    const isLow = available < 10;
                                    const isElectronic = batch.sequenceType === "electronic" || batch.series === "E";
                                    const label = isElectronic ? `e-CF ${batch.type}` : `B${batch.type}`;
                                    const canEditOrDelete = batch.currentValue === batch.initialNumber;
                                    return (
                                        <TableRow key={batch._id || i} className={isLow ? "bg-red-50/30" : ""}>
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
                                            <TableCell className="text-right">
                                                {locked ? (
                                                    <span className="text-xs text-slate-400">Bloqueado</span>
                                                ) : (
                                                    <div className="flex justify-end gap-2">
                                                        <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => openEdit(batch)} title="Modificar lote">
                                                            <Pencil className="w-3.5 h-3.5" /> Modificar
                                                        </Button>
                                                        <Button type="button" variant="outline" size="sm" className={`gap-1 ${canEditOrDelete ? "text-red-600 border-red-200 hover:bg-red-50" : "text-slate-400 border-slate-200"}`} onClick={() => handleDeleteBatch(batch)} title={canEditOrDelete ? "Borrar lote" : "En uso: No se puede borrar"} disabled={!canEditOrDelete}>
                                                            <Trash2 className="w-3.5 h-3.5" /> Borrar
                                                        </Button>
                                                    </div>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={!!editBatch} onOpenChange={(open) => !open && setEditBatch(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Modificar lote</DialogTitle>
                    </DialogHeader>
                    {/* @ts-ignore - isUsed is added dynamically above */}
                    <p className={`text-sm mb-4 ${editBatch?.isUsed ? 'text-amber-600 font-medium' : 'text-slate-500'}`}>
                        {/* @ts-ignore */}
                        {editBatch?.isUsed ? "⚠️ Este lote está en uso. Solo puedes extender el número límite final o actualizar la fecha de vencimiento." : "Puedes modificar los parámetros de este lote porque aún no se ha usado ningún comprobante."}
                    </p>
                    <div className="grid gap-4">
                        <div className="space-y-2">
                            <Label>Desde</Label>
                            {/* @ts-ignore */}
                            <Input type="number" min={1} value={editForm.initialNumber} onChange={(e) => setEditForm({ ...editForm, initialNumber: parseInt(e.target.value) || 1 })} disabled={editBatch?.isUsed} />
                        </div>
                        <div className="space-y-2">
                            <Label>Hasta</Label>
                            <Input type="number" min={1} value={editForm.finalNumber} onChange={(e) => setEditForm({ ...editForm, finalNumber: parseInt(e.target.value) || 1 })} />
                        </div>
                        <div className="space-y-2">
                            <Label>Fecha de vencimiento</Label>
                            <Input type="date" value={editForm.expiryDate} onChange={(e) => setEditForm({ ...editForm, expiryDate: e.target.value })} />
                        </div>
                    </div>
                    <DialogFooter className="mt-6">
                        <Button variant="outline" onClick={() => setEditBatch(null)}>Cancelar</Button>
                        <Button onClick={handleUpdateBatch} disabled={isUpdating}>
                            {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            Guardar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
