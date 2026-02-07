"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import { useState, useEffect, FormEvent, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getDominicanDate } from "@/lib/date-utils";
import { Loader2, ArrowLeft, Eye } from "lucide-react";
import { toast } from "sonner";
import { handleNumericKeyDown } from "@/lib/input-validators";
import { DocumentPreview } from "@/components/DocumentPreview";
import { validateRNCOrCedula } from "@/lib/validators";
import { Suspense } from "react";
import { api } from "@/lib/api-service";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

interface QuoteItem {
    id: string;
    description: string;
    quantity: number | string;
    price: number | string;
    isExempt?: boolean;
}

function NewQuoteForm() {
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

    // Cargar cotización desde API si modo edición
    useEffect(() => {
        if (editId) {
            api.getQuotes().then(quotes => {
                const toEdit = (quotes || []).find((q: { id?: string; _id?: { toString: () => string } }) => (q.id || (q._id as { toString?: () => string })?.toString?.()) === editId);
                if (toEdit) {
                    setClientName((toEdit as { clientName?: string }).clientName || "");
                    setRnc((toEdit as { clientRnc?: string; rnc?: string }).clientRnc || (toEdit as { rnc?: string }).rnc || "");
                    setClientPhone((toEdit as { clientPhone?: string }).clientPhone || "");
                    const its = (toEdit as { items?: QuoteItem[] }).items;
                    if (Array.isArray(its) && its.length) {
                        setItems(its.map((it: QuoteItem, i: number) => ({ ...it, id: it.id || String(i + 1) })));
                    }
                    setStatus((toEdit as { status?: string }).status === "converted" ? "converted" : "editada");
                    const vu = (toEdit as { validUntil?: string }).validUntil;
                    const dt = (toEdit as { date?: string; createdAt?: string }).date || (toEdit as { createdAt?: string }).createdAt;
                    if (vu && dt) {
                        const d1 = new Date(vu).getTime();
                        const d2 = new Date(dt).getTime();
                        if (!isNaN(d1) && !isNaN(d2)) {
                            const diffDays = Math.round(Math.abs(d1 - d2) / (1000 * 60 * 60 * 24));
                            setValidityDays(String(Math.max(1, diffDays)));
                        }
                    }
                    setIsClientLocked(true);
                    toast.info("Editando cotización");
                }
            }).catch(() => toast.error("Error al cargar la cotización"));
        }
    }, [editId]);

    useEffect(() => {
        api.getCustomers().then(data => setSavedClients(data || [])).catch(() => {
            const local = localStorage.getItem("clients");
            if (local) setSavedClients(JSON.parse(local));
        });
    }, []);

    // Pre-fill from Clientes list (Cotizar desde listado)
    useEffect(() => {
        if (editId) return;
        const qRnc = searchParams.get("rnc");
        const qName = searchParams.get("name");
        const qPhone = searchParams.get("phone");
        if (qRnc || qName) {
            if (qRnc) setRnc(qRnc);
            if (qName) setClientName(qName);
            if (qPhone) setClientPhone(qPhone);
            setIsClientLocked(true);
        }
    }, [editId, searchParams]);

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

    const subtotal = items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.price)), 0);
    const taxableSubtotal = items.reduce((sum, item) => item.isExempt ? sum : sum + (Number(item.quantity) * Number(item.price)), 0);
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

        const emptyPrice = items.some(item => Number(item.price) <= 0 && item.description.trim());
        if (emptyPrice) {
            toast.warning("Hay ítems con precio RD$0.00. ¿Desea continuar?");
        }

        setShowPreview(true);
    };

    const handleConfirmSave = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);

        try {
            const validUntil = new Date(Date.now() + parseInt(validityDays || "15") * 24 * 60 * 60 * 1000).toISOString();
            const payload = {
                clientName: clientName.trim(),
                clientRnc: rnc.replace(/\D/g, "") || rnc,
                clientPhone,
                items: items
                    .filter(item => item.description.trim() !== "")
                    .map(item => ({
                        description: item.description,
                        quantity: Number(item.quantity) || 1,
                        price: Number(item.price) || 0,
                        isExempt: item.isExempt
                    })),
                subtotal,
                itbis,
                total,
                validUntil,
                status: editId ? "sent" : "draft"
            };

            if (editId) {
                await api.updateQuote(editId, payload);
                toast.success("✅ Cotización actualizada");
            } else {
                await api.createQuote(payload);
                toast.success("✅ Cotización guardada");
            }
            router.push("/cotizaciones");
        } catch (error) {
            toast.error("Error al guardar la cotización");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Auto-guardado cada 30s solo para cotizaciones existentes (editId)
    const lastSaveRef = useRef<string>("");
    useEffect(() => {
        if (!editId || status === "converted" || !clientName.trim() || total <= 0) return;
        const t = setInterval(() => {
            const key = `${clientName}-${rnc}-${items.length}-${total}`;
            if (key === lastSaveRef.current) return;
            lastSaveRef.current = key;
            const payload = {
                clientName: clientName.trim(),
                clientRnc: rnc.replace(/\D/g, "") || rnc,
                clientPhone,
                items: items.filter(i => i.description.trim()).map(i => ({ description: i.description, quantity: Number(i.quantity) || 1, price: Number(i.price) || 0, isExempt: i.isExempt })),
                subtotal,
                itbis,
                total,
                validUntil: new Date(Date.now() + parseInt(validityDays || "15") * 24 * 60 * 60 * 1000).toISOString()
            };
            api.updateQuote(editId, payload).then(() => { lastSaveRef.current = key; }).catch(() => { lastSaveRef.current = ""; });
        }, 30000);
        return () => clearInterval(t);
    }, [editId, clientName, rnc, clientPhone, items, subtotal, itbis, total, validityDays, status]);

    return (
        <div className="container mx-auto px-4 py-8 pb-24 md:pb-8 max-w-5xl flex-1 min-h-[calc(100vh-6rem)]">
            <Breadcrumbs items={[{ label: "Inicio", href: "/dashboard" }, { label: "Cotizaciones", href: "/cotizaciones" }, { label: editId ? "Editar cotización" : "Nueva cotización" }]} className="mb-4 text-muted-foreground" />
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-black text-foreground font-serif lowercase tracking-tighter">
                        {editId ? `editando cotización` : "nueva cotización"}
                    </h1>
                    <p className="text-muted-foreground font-medium">Cree una propuesta profesional para su cliente</p>
                </div>
                <Link href="/cotizaciones">
                        <Button variant="ghost" className="text-muted-foreground hover:text-foreground px-0 md:px-4">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Volver al listado
                    </Button>
                </Link>
            </div>

            <form onSubmit={handlePreSubmit}>
                <div className="grid gap-6">
                    <Card className="border border-border shadow-xl rounded-2xl overflow-hidden bg-card">
                        <CardHeader className="bg-muted/50 border-b border-border">
                            <CardTitle className="text-lg font-bold text-foreground">Información del Cliente</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-6">
                            {savedClients.length > 0 && !editId && (
                                <div className="space-y-2 mb-4 p-4 bg-primary/5 rounded-xl border border-primary/20">
                                    <Label className="text-primary font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                                        <Loader2 className="w-3 h-3 animate-pulse" /> Sugerencia: Clientes Frecuentes
                                    </Label>
                                    <Select onValueChange={handleSelectClient}>
                                        <SelectTrigger className="bg-background border-border h-11 text-foreground">
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
                                    <Label className="font-bold text-foreground">Nombre del Cliente <span className="text-red-500">*</span></Label>
                                    <div className="relative">
                                        <Input
                                            value={clientName}
                                            onChange={e => setClientName(e.target.value)}
                                            readOnly={isClientLocked}
                                            placeholder="Nombre completo o razón social"
                                            className={isClientLocked ? "bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/50 text-foreground font-bold pr-10 h-11" : "h-11 text-foreground bg-background"}
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
                                    <Label className="font-bold text-foreground">RNC / Cédula</Label>
                                    <Input
                                        value={rnc}
                                        onChange={e => handleRncChange(e.target.value)}
                                        placeholder="Ej: 131234567"
                                        className="h-11 font-mono text-foreground bg-background"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-bold text-foreground">Teléfono (WhatsApp)</Label>
                                    <Input
                                        value={clientPhone}
                                        onChange={e => setClientPhone(e.target.value)}
                                        placeholder="Ej: 8095551234"
                                        className="h-11 text-foreground bg-background"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-bold text-foreground">Validez de Oferta</Label>
                                    <Select value={validityDays} onValueChange={setValidityDays}>
                                        <SelectTrigger className="h-11 bg-background text-foreground">
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

                    <Card className="border border-border shadow-xl rounded-2xl overflow-hidden bg-card">
                        <CardHeader className="bg-muted/50 border-b border-border">
                            <CardTitle className="text-lg font-bold text-foreground">Conceptos de la Propuesta</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="overflow-x-auto -mx-6 px-6 md:mx-0 md:px-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/30 hover:bg-transparent">
                                            <TableHead className="w-[45%] font-bold text-foreground">Descripción</TableHead>
                                            <TableHead className="w-[10%] text-center font-bold text-foreground">Cant.</TableHead>
                                            <TableHead className="w-[20%] text-right font-bold text-foreground">Precio</TableHead>
                                            <TableHead className="w-[10%] text-center font-bold text-foreground">ITBIS</TableHead>
                                            <TableHead className="w-[15%] text-right font-bold text-foreground">Total</TableHead>
                                            <TableHead className="w-[50px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {items.map(item => (
                                            <TableRow key={item.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                                                <TableCell>
                                                    <Input
                                                        value={item.description}
                                                        onChange={e => updateItem(item.id, "description", e.target.value)}
                                                        placeholder="Nombre del servicio o producto..."
                                                        className="border-none bg-transparent shadow-none px-0 focus-visible:ring-0 font-medium text-foreground h-10 placeholder:opacity-100"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        min="1"
                                                        value={item.quantity}
                                                        onKeyDown={(e: any) => handleNumericKeyDown(e, false)}
                                                        onChange={e => updateItem(item.id, "quantity", e.target.value)}
                                                        className="text-center h-10 text-foreground"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        value={item.price}
                                                        onKeyDown={(e: any) => handleNumericKeyDown(e, true)}
                                                        onChange={e => updateItem(item.id, "price", e.target.value)}
                                                        className="text-right h-10 text-foreground"
                                                    />
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <div className="flex items-center justify-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={!item.isExempt}
                                                            onChange={e => updateItem(item.id, "isExempt", !e.target.checked)}
                                                            className="w-4 h-4 text-indigo-600 rounded-md border-slate-300 focus:ring-indigo-500 cursor-pointer"
                                                            aria-label={item.isExempt ? "Exento de ITBIS - Marcar para gravar" : "Gravado con ITBIS - Marcar para exentar"}
                                                            title={item.isExempt ? "Exento de ITBIS" : "Gravado con ITBIS"}
                                                        />
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-black text-right text-foreground">
                                                    {formatCurrency(Number(item.quantity) * Number(item.price))}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {items.length > 1 && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => removeItem(item.id)}
                                                            className="text-muted-foreground hover:text-red-500 w-8 h-8"
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

                            <Button type="button" variant="outline" size="sm" onClick={addItem} className="mt-6 border-dashed border-2 border-border text-muted-foreground hover:text-primary hover:border-primary/50 hover:bg-primary/5 w-full font-bold">
                                + Agregar otro ítem
                            </Button>

                            <div className="flex justify-end mt-10">
                                <div className="bg-muted/50 p-6 rounded-2xl w-full md:w-80 space-y-3 border border-border">
                                    <div className="flex justify-between items-center text-sm font-medium text-muted-foreground">
                                        <span>Subtotal:</span>
                                        <span className="font-bold text-foreground">{formatCurrency(subtotal)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm font-medium text-muted-foreground">
                                        <span>ITBIS (18%):</span>
                                        <span className="font-bold text-foreground">{formatCurrency(itbis)}</span>
                                    </div>
                                    <div className="flex justify-between items-center font-black text-xl border-t-2 border-border pt-3 mt-3">
                                        <span className="text-foreground uppercase tracking-tighter">Total:</span>
                                        <span className="text-primary drop-shadow-sm">{formatCurrency(total)}</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
                        <Link href="/cotizaciones" className="w-full sm:w-auto">
                            <Button variant="outline" type="button" className="w-full h-12 text-muted-foreground font-bold px-8">Cancelar</Button>
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

export default function NewQuote() {
    return (
        <Suspense fallback={
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        }>
            <NewQuoteForm />
        </Suspense>
    );
}

