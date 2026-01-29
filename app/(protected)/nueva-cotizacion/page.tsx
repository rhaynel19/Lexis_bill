"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import { useState, useEffect, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getDominicanDate } from "@/lib/date-utils";
import { Loader2, ArrowLeft, Save, Eye } from "lucide-react";
import { InvoiceData } from "@/lib/pdf-generator";
import { toast } from "sonner";
import { handleNumericKeyDown } from "@/lib/input-validators";
import { DocumentPreview } from "@/components/DocumentPreview";
import { validateRNCOrCedula } from "@/lib/validators";

interface QuoteItem {
    id: string;
    description: string;
    quantity: number;
    price: number;
    isExempt?: boolean;
}

export default function NewQuote() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const editId = searchParams.get("edit");

    const [clientName, setClientName] = useState("");
    const [rnc, setRnc] = useState("");
    const [clientPhone, setClientPhone] = useState("");
    const [validityDays, setValidityDays] = useState("15");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [status, setStatus] = useState("borrador");

    // Smart RNC State
    const [isClientLocked, setIsClientLocked] = useState(false);

    const [items, setItems] = useState<QuoteItem[]>([
        { id: "1", description: "", quantity: 1, price: 0, isExempt: false }
    ]);
    const [savedClients, setSavedClients] = useState<any[]>([]);

    // Cargar datos si estamos en modo edición
    useEffect(() => {
        if (editId) {
            const stored = localStorage.getItem("quotes");
            if (stored) {
                const quotes = JSON.parse(stored);
                const toEdit = quotes.find((q: any) => q.id === editId);
                if (toEdit) {
                    setClientName(toEdit.clientName);
                    setRnc(toEdit.rnc);
                    setClientPhone(toEdit.clientPhone || "");
                    setItems(toEdit.items);
                    setStatus(toEdit.status || "editada");
                    // Detectar validez
                    if (toEdit.validUntil && toEdit.date) {
                        const diffTime = Math.abs(new Date(toEdit.validUntil).getTime() - new Date(toEdit.date).getTime());
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        setValidityDays(diffDays.toString());
                    }
                    setIsClientLocked(true);
                    toast.info(`Editando cotización ${editId}`);
                }
            }
        }
    }, [editId]);

    useEffect(() => {
        const clients = localStorage.getItem("clients");
        if (clients) setSavedClients(JSON.parse(clients));
    }, []);

    const handleRncChange = (value: string) => {
        setRnc(value);

        if (!value) {
            setIsClientLocked(false);
            setClientName("");
            return;
        }

        const cleanValue = value.replace(/[^0-9]/g, "");
        const matchedClient = savedClients.find(c => c.rnc.replace(/[^0-9]/g, "") === cleanValue);

        if (matchedClient) {
            if (!isClientLocked) {
                setClientName(matchedClient.name);
                if (matchedClient.phone) setClientPhone(matchedClient.phone);
                setIsClientLocked(true);
                toast.success("✨ Cliente frecuente detectado");
            }
        } else {
            if (isClientLocked) {
                setIsClientLocked(false);
                setClientName("");
                setClientPhone("");
            }
        }
    };

    const addItem = () => {
        setItems([...items, { id: Date.now().toString(), description: "", quantity: 1, price: 0, isExempt: false }]);
    };

    const removeItem = (id: string) => {
        if (items.length > 1) {
            setItems(items.filter((item) => item.id !== id));
        }
    };

    const updateItem = (id: string, field: keyof QuoteItem, value: string | number | boolean) => {
        setItems(items.map((item) => item.id === id ? { ...item, [field]: value } : item));
    };

    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const taxableSubtotal = items.reduce((sum, item) => item.isExempt ? sum : sum + (item.quantity * item.price), 0);
    const itbis = taxableSubtotal * 0.18;
    const total = subtotal + itbis;

    const handleSelectClient = (clientRnc: string) => {
        const client = savedClients.find(c => c.rnc === clientRnc);
        if (client) {
            setClientName(client.name);
            setRnc(client.rnc);
            if (client.phone) setClientPhone(client.phone);
            setIsClientLocked(true);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format(amount);
    };

    const handlePreSubmit = (e: FormEvent) => {
        e.preventDefault();

        // --- VALIDACIONES INTELIGENTES ---
        if (!clientName.trim()) {
            toast.error("El nombre del cliente es obligatorio");
            return;
        }

        if (rnc) {
            const rncValid = validateRNCOrCedula(rnc);
            if (!rncValid.isValid) {
                toast.error(rncValid.error);
                return;
            }
        }

        if (items.length === 0 || items.every(item => !item.description.trim())) {
            toast.error("Debe agregar al menos un ítem con descripción");
            return;
        }

        if (total <= 0) {
            toast.error("El total de la cotización debe ser mayor a cero");
            return;
        }

        const emptyPrice = items.some(item => item.price <= 0 && item.description.trim());
        if (emptyPrice) {
            toast.warning("Hay ítems con precio RD$0.00. ¿Desea continuar?");
        }

        setShowPreview(true);
    };

    const handleConfirmSave = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);

        try {
            const quoteData = {
                id: editId || `COT-${Date.now().toString().slice(-6)}`,
                clientName: clientName.trim(),
                rnc: rnc.replace(/-/g, ""),
                clientPhone,
                items: items.filter(item => item.description.trim() !== ""),
                subtotal,
                itbis,
                total,
                date: editId ? undefined : getDominicanDate(), // Mantener fecha original si es edición
                validUntil: new Date(Date.now() + parseInt(validityDays) * 24 * 60 * 60 * 1000).toISOString(),
                status: editId ? "editada" : "borrador"
            };

            const existing = localStorage.getItem("quotes");
            let quotes = existing ? JSON.parse(existing) : [];

            if (editId) {
                // Actualizar existente
                quotes = quotes.map((q: any) => q.id === editId ? { ...q, ...quoteData, date: q.date } : q);
            } else {
                // Crear nueva
                quotes.push(quoteData);
            }

            localStorage.setItem("quotes", JSON.stringify(quotes));
            toast.success(editId ? "✅ Cotización actualizada" : "✅ Cotización guardada");
            router.push("/cotizaciones");
        } catch (error) {
            toast.error("Error al guardar la cotización");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-5xl">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 font-serif lowercase tracking-tighter">
                        {editId ? `editando ${editId}` : "nueva cotización"}
                    </h1>
                    <p className="text-slate-500 font-medium">Cree una propuesta profesional para su cliente</p>
                </div>
                <Link href="/cotizaciones">
                    <Button variant="ghost" className="text-slate-400 hover:text-slate-600 px-0 md:px-4">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Volver al listado
                    </Button>
                </Link>
            </div>

            <form onSubmit={handlePreSubmit}>
                <div className="grid gap-6">
                    <Card className="border-none shadow-xl shadow-slate-200/50 rounded-2xl overflow-hidden">
                        <CardHeader className="bg-slate-50 border-b border-slate-100">
                            <CardTitle className="text-lg font-bold text-slate-800">Información del Cliente</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-6">
                            {savedClients.length > 0 && !editId && (
                                <div className="space-y-2 mb-4 p-4 bg-indigo-50/30 rounded-xl border border-indigo-100/50">
                                    <Label className="text-indigo-600 font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                                        <Loader2 className="w-3 h-3 animate-pulse" /> Sugerencia: Clientes Frecuentes
                                    </Label>
                                    <Select onValueChange={handleSelectClient}>
                                        <SelectTrigger className="bg-white border-indigo-200 focus:ring-indigo-500 h-11">
                                            <SelectValue placeholder="Seleccionar cliente guardado..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {savedClients.map((c, i) => (
                                                <SelectItem key={i} value={c.rnc}>{c.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                            <div className="grid gap-6 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label className="font-bold text-slate-700">Nombre del Cliente <span className="text-red-500">*</span></Label>
                                    <div className="relative">
                                        <Input
                                            value={clientName}
                                            onChange={e => setClientName(e.target.value)}
                                            readOnly={isClientLocked}
                                            placeholder="Nombre completo o razón social"
                                            className={isClientLocked ? "bg-emerald-50/30 border-emerald-200 text-slate-700 font-bold pr-10 h-11" : "h-11"}
                                            required
                                        />
                                        {isClientLocked && (
                                            <button
                                                type="button"
                                                onClick={() => setIsClientLocked(false)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 transition-colors"
                                                title="Editar nombre"
                                            >
                                                <ArrowLeft className="w-4 h-4 rotate-180" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-bold text-slate-700">RNC / Cédula</Label>
                                    <Input
                                        value={rnc}
                                        onChange={e => handleRncChange(e.target.value)}
                                        placeholder="Ej: 131234567"
                                        className="h-11 font-mono"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-bold text-slate-700">Teléfono (WhatsApp)</Label>
                                    <Input
                                        value={clientPhone}
                                        onChange={e => setClientPhone(e.target.value)}
                                        placeholder="Ej: 8095551234"
                                        className="h-11"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-bold text-slate-700">Validez de Oferta</Label>
                                    <Select value={validityDays} onValueChange={setValidityDays}>
                                        <SelectTrigger className="h-11">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="7">7 Días</SelectItem>
                                            <SelectItem value="15">15 Días</SelectItem>
                                            <SelectItem value="30">30 Días</SelectItem>
                                            <SelectItem value="60">60 Días</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-xl shadow-slate-200/50 rounded-2xl overflow-hidden">
                        <CardHeader className="bg-slate-50 border-b border-slate-100">
                            <CardTitle className="text-lg font-bold text-slate-800">Conceptos de la Propuesta</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="overflow-x-auto -mx-6 px-6 md:mx-0 md:px-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-slate-50/50 hover:bg-transparent">
                                            <TableHead className="w-[45%] font-bold text-slate-700">Descripción</TableHead>
                                            <TableHead className="w-[10%] text-center font-bold text-slate-700">Cant.</TableHead>
                                            <TableHead className="w-[20%] text-right font-bold text-slate-700">Precio</TableHead>
                                            <TableHead className="w-[10%] text-center font-bold text-slate-700">ITBIS</TableHead>
                                            <TableHead className="w-[15%] text-right font-bold text-slate-700">Total</TableHead>
                                            <TableHead className="w-[50px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {items.map(item => (
                                            <TableRow key={item.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/30">
                                                <TableCell>
                                                    <Input
                                                        value={item.description}
                                                        onChange={e => updateItem(item.id, "description", e.target.value)}
                                                        placeholder="Nombre del servicio o producto..."
                                                        className="border-none bg-transparent shadow-none px-0 focus-visible:ring-0 font-medium text-slate-800 h-10"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        min="1"
                                                        value={item.quantity}
                                                        onKeyDown={(e: any) => handleNumericKeyDown(e, false)}
                                                        onChange={e => updateItem(item.id, "quantity", parseInt(e.target.value) || 1)}
                                                        className="text-center h-10"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        value={item.price}
                                                        onKeyDown={(e: any) => handleNumericKeyDown(e, true)}
                                                        onChange={e => updateItem(item.id, "price", parseFloat(e.target.value) || 0)}
                                                        className="text-right h-10"
                                                    />
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <div className="flex items-center justify-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={!item.isExempt}
                                                            onChange={e => updateItem(item.id, "isExempt", !e.target.checked)}
                                                            className="w-4 h-4 text-indigo-600 rounded-md border-slate-300 focus:ring-indigo-500 cursor-pointer"
                                                        />
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-black text-right text-slate-900">
                                                    {formatCurrency(item.quantity * item.price)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {items.length > 1 && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => removeItem(item.id)}
                                                            className="text-slate-300 hover:text-red-500 w-8 h-8"
                                                        >
                                                            ✕
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            <Button type="button" variant="outline" size="sm" onClick={addItem} className="mt-6 border-dashed border-2 border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50/50 w-full font-bold">
                                + Agregar otro ítem
                            </Button>

                            <div className="flex justify-end mt-10">
                                <div className="bg-slate-50 p-6 rounded-2xl w-full md:w-80 space-y-3 border border-slate-100">
                                    <div className="flex justify-between items-center text-sm font-medium text-slate-500">
                                        <span>Subtotal:</span>
                                        <span className="font-bold text-slate-800">{formatCurrency(subtotal)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm font-medium text-slate-500">
                                        <span>ITBIS (18%):</span>
                                        <span className="font-bold text-slate-800">{formatCurrency(itbis)}</span>
                                    </div>
                                    <div className="flex justify-between items-center font-black text-xl border-t-2 border-slate-200 pt-3 mt-3">
                                        <span className="text-slate-900 uppercase tracking-tighter">Total:</span>
                                        <span className="text-indigo-700 drop-shadow-sm">{formatCurrency(total)}</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
                        <Link href="/cotizaciones" className="w-full sm:w-auto">
                            <Button variant="outline" type="button" className="w-full h-12 text-slate-500 font-bold px-8">Cancelar</Button>
                        </Link>
                        <Button
                            type="submit"
                            size="lg"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-black h-12 px-10 shadow-lg shadow-indigo-100 w-full sm:w-auto"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Procesando...</>
                            ) : (
                                <><Eye className="w-5 h-5 mr-2" /> Previsualizar Propuesta</>
                            )}
                        </Button>
                    </div>
                </div>
            </form>

            <DocumentPreview
                isOpen={showPreview}
                onClose={() => setShowPreview(false)}
                onEdit={() => setShowPreview(false)}
                onConfirm={handleConfirmSave}
                isProcessing={isSubmitting}
                type="quote"
                data={{
                    id: editId || "",
                    sequenceNumber: editId || "BORRADOR",
                    type: "quote",
                    clientName,
                    rnc,
                    clientPhone,
                    date: getDominicanDate(),
                    items: items.filter(item => item.description.trim() !== ""),
                    subtotal,
                    itbis,
                    isrRetention: 0,
                    total,
                    validUntil: new Date(Date.now() + parseInt(validityDays) * 24 * 60 * 60 * 1000).toISOString()
                }}
            />
        </div>
    );
}

