"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getDominicanDate } from "@/lib/date-utils";
import { Loader2 } from "lucide-react";
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

    const [clientName, setClientName] = useState("");
    const [rnc, setRnc] = useState("");
    const [clientPhone, setClientPhone] = useState("");
    const [validityDays, setValidityDays] = useState("15");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPreview, setShowPreview] = useState(false);

    // Smart RNC State
    const [isClientLocked, setIsClientLocked] = useState(false);

    const [items, setItems] = useState<QuoteItem[]>([
        { id: "1", description: "", quantity: 1, price: 0, isExempt: false }
    ]);
    const [savedClients, setSavedClients] = useState<any[]>([]);

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
            // Smart RNC: Lock it if selected from list
            setIsClientLocked(true);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format(amount);
    };

    const handlePreSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!clientName || !items.length) {
            toast.error("Complete los campos obligatorios");
            return;
        }
        setShowPreview(true);
    };

    const handleConfirmSave = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);

        const quote = {
            id: `COT-${Date.now().toString().slice(-6)}`,
            clientName,
            rnc,
            clientPhone,
            items,
            subtotal,
            itbis,
            total,
            date: getDominicanDate(),
            validUntil: new Date(Date.now() + parseInt(validityDays) * 24 * 60 * 60 * 1000).toISOString(),
            status: "open"
        };

        const existing = localStorage.getItem("quotes");
        const quotes = existing ? JSON.parse(existing) : [];
        quotes.push(quote);
        localStorage.setItem("quotes", JSON.stringify(quotes));

        toast.success("✅ Cotización guardada exitosamente.");
        router.push("/cotizaciones");
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-5xl">
            {/* ... header ... */}

            <form onSubmit={handlePreSubmit}>
                <div className="grid gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Cliente</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {savedClients.length > 0 && (
                                <div className="space-y-2 mb-4 p-4 bg-slate-50 rounded border border-slate-100">
                                    <Label className="text-slate-500">📂 Clientes Frecuentes</Label>
                                    <Select onValueChange={handleSelectClient}>
                                        <SelectTrigger>
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
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>Nombre Cliente</Label>
                                    <div className="relative">
                                        <Input
                                            value={clientName}
                                            onChange={e => setClientName(e.target.value)}
                                            readOnly={isClientLocked}
                                            className={isClientLocked ? "bg-slate-50 border-emerald-200 text-slate-700 font-semibold pr-10" : ""}
                                            required
                                        />
                                        {isClientLocked && (
                                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold hidden sm:inline-block">
                                                    ✨ Frecuente
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsClientLocked(false)}
                                                    className="text-slate-400 hover:text-slate-600"
                                                    title="Editar nombre"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>RNC / Cédula</Label>
                                    <Input value={rnc} onChange={e => handleRncChange(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Teléfono</Label>
                                    <Input value={clientPhone} onChange={e => setClientPhone(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Validez de Oferta (Días)</Label>
                                    <Select value={validityDays} onValueChange={setValidityDays}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="7">7 Días</SelectItem>
                                            <SelectItem value="15">15 Días</SelectItem>
                                            <SelectItem value="30">30 Días</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Servicios / Productos</CardTitle></CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[40%]">Descripción</TableHead>
                                            <TableHead className="w-[15%]">Cant.</TableHead>
                                            <TableHead className="w-[20%]">Precio</TableHead>
                                            <TableHead className="w-[10%] text-center">Exento</TableHead>
                                            <TableHead className="w-[15%]">Total</TableHead>
                                            <TableHead></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {items.map(item => (
                                            <TableRow key={item.id}>
                                                <TableCell>
                                                    <Input
                                                        value={item.description}
                                                        onChange={e => updateItem(item.id, "description", e.target.value)}
                                                        placeholder="Descripción del servicio..."
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        min="1"
                                                        value={item.quantity}
                                                        onKeyDown={(e: any) => handleNumericKeyDown(e, false)}
                                                        onChange={e => updateItem(item.id, "quantity", parseInt(e.target.value) || 1)}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        value={item.price}
                                                        onKeyDown={(e: any) => handleNumericKeyDown(e, true)}
                                                        onChange={e => updateItem(item.id, "price", parseFloat(e.target.value) || 0)}
                                                    />
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={item.isExempt}
                                                        onChange={e => updateItem(item.id, "isExempt", e.target.checked)}
                                                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                                    />
                                                </TableCell>
                                                <TableCell className="font-bold">
                                                    {formatCurrency(item.quantity * item.price)}
                                                </TableCell>
                                                <TableCell>
                                                    {items.length > 1 && (
                                                        <Button variant="ghost" size="sm" onClick={() => removeItem(item.id)} className="text-red-500">✕</Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                            <Button type="button" variant="outline" size="sm" onClick={addItem} className="mt-4">
                                + Agregar Ítem
                            </Button>

                            <div className="flex justify-end mt-4 text-right">
                                <div className="space-y-1">
                                    <div className="flex justify-between w-48 text-sm">
                                        <span>Subtotal:</span>
                                        <span>{formatCurrency(subtotal)}</span>
                                    </div>
                                    <div className="flex justify-between w-48 text-sm text-gray-500">
                                        <span>ITBIS (18%):</span>
                                        <span>{formatCurrency(itbis)}</span>
                                    </div>
                                    <div className="flex justify-between w-48 font-bold text-lg border-t pt-2">
                                        <span>Total:</span>
                                        <span className="text-blue-600">{formatCurrency(total)}</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-end gap-2">
                        <Link href="/cotizaciones">
                            <Button variant="outline" type="button">Cancelar</Button>
                        </Link>
                        <Button type="submit" size="lg" className="bg-[#D4AF37] hover:bg-amber-600 text-white" disabled={isSubmitting}>
                            {isSubmitting ? "Procesando..." : "Siguiente: Vista Previa"}
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    );
}
