"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { useState, useEffect, Fragment } from "react";
import { useRouter } from "next/navigation";
import { validateRNCOrCedula, autoFormatRNCOrCedula } from "@/lib/validators";
import { validateRNC } from "@/lib/rnc-validator";
import { numberToText } from "@/lib/number-to-text";
import { downloadInvoicePDF, previewInvoicePDF, type InvoiceData } from "@/lib/pdf-generator";
import { getNextSequenceNumber } from "@/lib/config";
import { getDominicanDate } from "@/lib/date-utils";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Search, Mic, Save, BookOpen, Loader2, CheckCircle, MessageCircle, UserPlus, FileText, Eye, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { handleNumericKeyDown } from "@/lib/input-validators";
import { InvoicePreview } from "@/components/invoice/InvoicePreview";
import { usePreferences } from "@/components/providers/PreferencesContext";
import { AIService } from "@/lib/ai-service-mock";
import { ValidatorService } from "@/lib/validator-service";
import { SuggestionWidget } from "@/components/ui/suggestion-widget";
import { DocumentPreview } from "@/components/DocumentPreview";

// Interfaz para definir la estructura de un ítem de factura
interface InvoiceItem {
    id: string;
    description: string;
    quantity: number;
    price: number;
    isExempt?: boolean; // Para gastos no gravables (Abogados)
}

export default function NewInvoice() {
    const router = useRouter();

    // Estados para los campos del formulario
    const [invoiceType, setInvoiceType] = useState("");
    const [clientName, setClientName] = useState("");
    const [rnc, setRnc] = useState("");
    const [clientPhone, setClientPhone] = useState("");
    const [rncError, setRncError] = useState("");
    const [applyRetentions, setApplyRetentions] = useState(false);
    const [itbisRetentionRate, setItbisRetentionRate] = useState(0.30); // 30% por defecto
    const [showPreview, setShowPreview] = useState(false);

    const { profession, setProfession } = usePreferences();

    // Estados para lógica vertical (Profesiones)
    // const [profession, setProfession] = useState(""); // Managed by context now
    const [ars, setArs] = useState(""); // Médicos
    const [exequatur, setExequatur] = useState(""); // Médicos
    const [projectDesc, setProjectDesc] = useState(""); // Ingenieros
    const [propertyRef, setPropertyRef] = useState(""); // Inmobiliaria


    // CRM States
    const [saveClient, setSaveClient] = useState(false);
    const [isSearchingRNC, setIsSearchingRNC] = useState(false);
    const [savedClients, setSavedClients] = useState<any[]>([]);
    const [savedServices, setSavedServices] = useState<any[]>([]);

    const [items, setItems] = useState<InvoiceItem[]>([
        { id: "1", description: "", quantity: 1, price: 0, isExempt: false }
    ]);

    // Success Modal & PDF State
    const [isGenerating, setIsGenerating] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [lastInvoiceNCF, setLastInvoiceNCF] = useState("");

    // Load CRM Data and Check for Cloned Invoice
    useEffect(() => {
        // 0. Security Check
        const token = localStorage.getItem("token");
        const storedUser = JSON.parse(localStorage.getItem("user") || "{}");

        if (!token) {
            router.push("/login");
            return;
        }

        if (!storedUser.fiscalStatus?.confirmed) {
            router.push("/dashboard?setup=required");
            return;
        }

        // Clients from Backend
        const fetchClients = async () => {
            try {
                const { api } = await import("@/lib/api-service");
                const data = await api.getCustomers();
                setSavedClients(data);
            } catch (e) {
                console.error("Error loading clients:", e);
            }
        };
        fetchClients();

        // Services (Still localStorage for now or default)
        const services = localStorage.getItem("services");
        if (services) setSavedServices(JSON.parse(services));

        // Clone Invoice
        const invoiceToClone = localStorage.getItem("invoiceToClone");
        if (invoiceToClone) {
            const inv = JSON.parse(invoiceToClone);
            setClientName(inv.clientName);
            setRnc(inv.rnc);
            // Default to 31/32 if not valid, or try to match
            const typeMap: any = { "e-CF 31 - Crédito Fiscal": "31", "e-CF 32 - Consumo": "32" };
            setInvoiceType(typeMap[inv.type] || "32");

            // Clone items with new IDs
            if (inv.items) {
                setItems(inv.items.map((i: any) => ({
                    id: Date.now().toString() + Math.random().toString().slice(2),
                    description: i.description,
                    quantity: i.quantity,
                    price: i.price,
                    isExempt: i.isExempt
                })));
            }
            localStorage.removeItem("invoiceToClone");
        } else {
            // Restore Draft if exists
            const draft = localStorage.getItem("invoiceDraft");
            if (draft) {
                try {
                    const d = JSON.parse(draft);
                    if (d.items) setItems(d.items);
                    if (d.clientName) setClientName(d.clientName);
                    if (d.rnc) setRnc(d.rnc);
                    if (d.invoiceType) setInvoiceType(d.invoiceType);
                    toast.info("📂 Borrador restaurado automáticamente.");
                } catch (e) { localStorage.removeItem("invoiceDraft"); }
            }
        }

        // Load Profession and User Details from Config/User
        const config = JSON.parse(localStorage.getItem("appConfig") || "{}");
        // Profession handled by Context now
        if (config.exequatur) setExequatur(config.exequatur);
    }, []);

    // Save Draft on Change
    useEffect(() => {
        if (!isGenerating && !showSuccessModal) {
            const draft = { items, clientName, rnc, invoiceType };
            localStorage.setItem("invoiceDraft", JSON.stringify(draft));
        }
    }, [items, clientName, rnc, invoiceType, isGenerating, showSuccessModal]);

    useEffect(() => {
        // Lógica automática al cambiar tipo de comprobante
        if (invoiceType === "44") {
            // E44: Todo Exento
            setItems(prevItems => prevItems.map(item => ({ ...item, isExempt: true })));
            toast.info("ℹ️ E44 seleccionado: Se ha marcado todo como EXENTO de ITBIS automáticamente.");
        } else if (invoiceType === "45") {
            // E45: Gastos Menores
            setClientName("Proveedor Informal / Gastos Menores");
            setRnc("000000000"); // RNC Genérico o dejar vacío si el validador lo permite
            toast.info("ℹ️ E45 seleccionado: Modo simplificado para gastos menores.");
        }
    }, [invoiceType]);

    // Hotkeys Listener
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "s") {
                e.preventDefault();
                // Trigger submit programmatically
                const form = document.querySelector('form');
                if (form) form.requestSubmit();
            }
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                addItem();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [items, invoiceType]); // Deps for context

    // Template Logic
    const handleSaveTemplate = () => {
        const name = prompt("Nombre de la plantilla (Ej: Iguala Mensual):");
        if (name) {
            const template = { name, invoiceType, items, clientName, rnc };
            const existing = localStorage.getItem("invoiceTemplates");
            const templates = existing ? JSON.parse(existing) : [];
            templates.push(template);
            templates.push(template);
            localStorage.setItem("invoiceTemplates", JSON.stringify(templates));
            toast.success("✅ Plantilla guardada exitosamente.");
        }
    }

    const handleLoadTemplate = (t: any) => {
        setInvoiceType(t.invoiceType);
        setClientName(t.clientName);
        setRnc(t.rnc);
        setItems(t.items);
        setItems(t.items);
        toast.success(`📂 Plantilla "${t.name}" cargada.`);
    }

    // CRM Handlers
    const handleRNCSearch = async () => {
        if (!rnc) return;
        setIsSearchingRNC(true);
        setRncError("");
        try {
            const { api } = await import("@/lib/api-service");
            const result: any = await api.validateRnc(rnc);

            if (result.valid) {
                setClientName(result.name);
                // Auto-set type based on RNC type
                if (result.type === "JURIDICA") setApplyRetentions(true);
            } else {
                setRncError("Contribuyente no encontrado o RNC inválido");
            }
        } catch (e: any) {
            console.error(e);
            setRncError(e.message || "Error al conectar con DGII");
        } finally {
            setIsSearchingRNC(false);
        }
    };

    const handleSelectClient = (clientRnc: string) => {
        const client = savedClients.find(c => c.rnc === clientRnc);
        if (client) {
            setClientName(client.name);
            setRnc(client.rnc);
            if (client.phone) setClientPhone(client.phone);
        }
    };

    const handleSelectService = (itemId: string, serviceName: string) => {
        const service = savedServices.find(s => s.name === serviceName);
        if (service) {
            updateItem(itemId, "description", service.name);
            updateItem(itemId, "price", service.price);
        }
    };

    // AI Magic Input
    const [magicCommand, setMagicCommand] = useState("");
    const [isParsingAI, setIsParsingAI] = useState(false);

    const handleMagicParse = async () => {
        if (!magicCommand.trim()) return;
        setIsParsingAI(true);
        try {
            const parsedItems = await AIService.parseInvoiceText(magicCommand);

            // Map parsed items to InvoiceItem structure with ID
            const newItems: InvoiceItem[] = parsedItems.map(p => ({
                id: Date.now().toString() + Math.random().toString().slice(2),
                description: p.description,
                quantity: p.quantity,
                price: p.price,
                isExempt: invoiceType === "44"
            }));

            // If it's the first empty item, replace it, otherwise append
            if (items.length === 1 && !items[0].description && items[0].price === 0) {
                setItems(newItems);
            } else {
                setItems(prev => [...prev, ...newItems]);
            }

            setMagicCommand("");
            toast.success(`✨ Agregados ${newItems.length} ítems mágicamente`);

        } catch (e) {
            console.error(e);
            toast.error("No pude entender eso. Intenta ser más claro.");
        } finally {
            setIsParsingAI(false);
        }
    };

    // Voice Dictation Mock
    const handleVoiceDictation = (itemId: string) => {
        toast.info("🎤 Escuchando... (Simulación: 'Honorarios Profesionales por Asesoría Legal')");
        updateItem(itemId, "description", "Honorarios Profesionales por Asesoría Legal");
    };

    // Función para agregar una nueva línea de ítem
    const addItem = () => {
        const newItem: InvoiceItem = {
            id: Date.now().toString(),
            description: "",
            quantity: 1,
            price: 0,
            isExempt: invoiceType === "44", // Auto-exempt if E44
        };
        setItems([...items, newItem]);
    };

    // Función para eliminar un ítem
    const removeItem = (id: string) => {
        if (items.length > 1) {
            setItems(items.filter((item) => item.id !== id));
        }
    };

    // Función para actualizar un ítem específico
    const updateItem = (id: string, field: keyof InvoiceItem, value: string | number | boolean) => {
        setItems(
            items.map((item) =>
                item.id === id ? { ...item, [field]: value } : item
            )
        );
    };

    // CÁLCULOS AUTOMÁTICOS

    // Calcular el subtotal (suma de todos los ítems)
    const subtotal = items.reduce((sum, item) => {
        return sum + (item.quantity * item.price);
    }, 0);

    // Calcular Base Imponible (ítems no exentos)
    const taxableSubtotal = items.reduce((sum, item) => {
        return item.isExempt ? sum : sum + (item.quantity * item.price);
    }, 0);

    // Calcular ITBIS (18% de la base imponible)
    const itbis = taxableSubtotal * 0.18;

    // Calcular Retenciones (solo si se activan)
    // ISR: 10% de la base imponible (Servicios Profesionales)
    const isrRetention = applyRetentions ? taxableSubtotal * 0.10 : 0;

    // Retención ITBIS: 30% del ITBIS (Norma 02-05 para servicios)
    const itbisRetention = applyRetentions ? itbis * itbisRetentionRate : 0;

    // Total Factura (lo que paga el cliente antes de retenciones)
    // Nota: En e-CF, el total de la factura incluye ITBIS. Las retenciones son informativas para el pago.
    // Sin embargo, para "cuánto recibiré neto", calculamos:
    const invoiceTotal = subtotal + itbis;

    // Total a Recibir (Neto)
    const totalNeto = invoiceTotal - isrRetention - itbisRetention;

    // Usaremos invoiceTotal para el documento, pero mostraremos el des desglose
    const total = invoiceTotal;

    // Función para formatear números como moneda dominicana
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("es-DO", {
            style: "currency",
            currency: "DOP",
        }).format(amount);
    };

    // Validar RNC/Cédula en tiempo real
    const handleRncChange = (value: string) => {
        setRnc(value);

        // Validar solo si hay contenido
        if (value.trim()) {
            const validation = validateRNCOrCedula(value);
            if (!validation.isValid) {
                setRncError(validation.error || "");
            } else {
                setRncError("");
            }
        } else {
            setRncError("");
        }
    };

    // Auto-formatear RNC/Cédula al perder el foco y detectar tipo de persona
    const handleRncBlur = () => {
        if (rnc.trim()) {
            const formatted = autoFormatRNCOrCedula(rnc);
            setRnc(formatted);

            // Trigger Smart Search
            handleRNCSearch();

            // Si es RNC (9 dígitos) probablemente es Persona Jurídica -> Sugerir retenciones
            const cleanRnc = rnc.replace(/[^0-9]/g, "");
            if (cleanRnc.length === 9) {
                setApplyRetentions(true);
            }
        }
    };

    // Función para generar vista previa del PDF
    const handlePreviewPDF = async () => {
        if (!invoiceType || !clientName || !rnc) {
            toast.error("Por favor completa todos los campos obligatorios antes de generar el PDF");
            return;
        }

        const validItems = items.filter(
            (item) => item.description && item.quantity > 0 && item.price > 0
        );

        if (validItems.length === 0) {
            toast.error("Por favor agrega al menos un ítem válido a la factura");
            return;
        }

        const sequenceNumber = getNextSequenceNumber(invoiceType);

        const invoiceData: InvoiceData = {
            id: Date.now().toString(),
            sequenceNumber,
            type: invoiceType,
            clientName,
            rnc,
            date: getDominicanDate(),
            items: validItems.map(item => ({
                description: item.description,
                quantity: item.quantity,
                price: item.price,
            })),
            subtotal,
            itbis,
            isrRetention,
            itbisRetention,
            total: invoiceTotal,
        };

        await previewInvoicePDF(invoiceData);
    };

    const handlePreSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Validar que todos los campos estén completos
        if (!invoiceType || !clientName || !rnc) {
            toast.error("Por favor completa todos los campos obligatorios");
            return;
        }

        const validItems = items.filter(
            (item) => item.description && item.quantity > 0 && item.price > 0
        );

        if (validItems.length === 0) {
            toast.error("Por favor agrega al menos un ítem válido a la factura");
            return;
        }
        setShowPreview(true);
    }

    const handleConfirmSave = async () => {
        if (isGenerating) return;
        setIsGenerating(true);

        try {
            const cleanClientName = clientName.trim();
            const cleanRnc = rnc.replace(/[^0-9]/g, "");
            const validItems = items.filter(
                (item) => item.description && item.quantity > 0 && item.price > 0
            );

            const invoiceData = {
                clientName: cleanClientName,
                rnc: cleanRnc,
                type: invoiceType,
                items: validItems,
                date: new Date().toISOString(),
                subtotal,
                itbis,
                total,
                isrRetention
            };

            const { api } = await import("@/lib/api-service");
            const response = await api.createInvoice(invoiceData);
            const { ncf, invoice: savedInvoice } = response;

            // Generar y descargar PDF automáticamente con el NCF real
            const pdfData: InvoiceData = {
                id: savedInvoice._id,
                sequenceNumber: ncf,
                type: invoiceType,
                clientName,
                rnc,
                date: getDominicanDate(),
                items: validItems.map((item) => ({
                    description: item.description,
                    quantity: item.quantity,
                    price: item.price,
                })),
                subtotal,
                itbis,
                isrRetention,
                itbisRetention,
                total: invoiceTotal,
            };

            await downloadInvoicePDF(pdfData);

            // CRM: Guardar Cliente en Backend
            if (saveClient) {
                const customerData = { name: clientName, rnc, phone: clientPhone, email: "" };
                await api.saveCustomer(customerData);
            }

            setLastInvoiceNCF(ncf);
            setShowSuccessModal(true);
            localStorage.removeItem("invoiceDraft"); // Clear draft on success

        } catch (error: any) {
            console.error(error);
            toast.error(`❌ Error al guardar factura: ${error.message || "Error desconocido"}`);
            setIsGenerating(false);
        } finally {
            if (!showSuccessModal) setIsGenerating(false);
        }
    };


    // Silent Validation Logic
    const [suggestion, setSuggestion] = useState<string | null>(null);

    useEffect(() => {
        // Debounce validation slightly
        const timer = setTimeout(() => {
            let msg = ValidatorService.checkRNCFormat(rnc);
            if (!msg) msg = ValidatorService.checkTypeConsistency(invoiceType, rnc);
            if (!msg) msg = ValidatorService.checkPriceAnomalies(items);

            setSuggestion(msg);
        }, 800);
        return () => clearTimeout(timer);
    }, [rnc, invoiceType, items]);

    const handleWhatsAppShare = () => {
        const text = `Hola *${clientName}*! 🇩🇴\n\nAdjunto su Comprobante Fiscal *${lastInvoiceNCF}* por valor de *${formatCurrency(total)}*.\n\nGracias por preferirnos.`;
        let phone = clientPhone.replace(/[^\d]/g, '');
        // Auto-fix Dominican Numbers (10 digits -> 1 + 10 digits)
        if (phone.length === 10 && (phone.startsWith("809") || phone.startsWith("829") || phone.startsWith("849"))) {
            phone = "1" + phone;
        }
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
    };

    // Función auxiliar para obtener el nombre del tipo de comprobante
    const getInvoiceTypeName = (type: string) => {
        const types: { [key: string]: string } = {
            "31": "e-CF 31 - Crédito Fiscal",
            "32": "e-CF 32 - Consumo",
            "33": "e-CF 33 - Nota de Débito",
            "34": "e-CF 34 - Nota de Crédito",
        };
        return types[type] || type;
    };

    if (showPreview) {
        return (
            <div className="container mx-auto px-4 py-8">
                <DocumentPreview
                    type="invoice"
                    data={{ clientName, rnc, clientPhone, items, subtotal, itbis, total, invoiceType }}
                    onEdit={() => setShowPreview(false)}
                    onConfirm={handleConfirmSave}
                    isProcessing={isGenerating}
                />
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-5xl">
            {/* Encabezado */}
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-primary">Nueva Factura</h2>
                    <p className="text-gray-600">Crear comprobante fiscal electrónico (e-CF)</p>
                </div>
                <Link href="/">
                    <Button variant="outline">← Volver</Button>
                </Link>
            </div>

            {/* Template Bar */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                <Button variant="secondary" size="sm" onClick={handleSaveTemplate} className="gap-2">
                    <Save className="h-4 w-4" /> Guardar como Plantilla
                </Button>
                <div className="h-8 w-[1px] bg-slate-200 mx-2"></div>
                {/* Loader Mock */}
                <Select onValueChange={(val) => {
                    const templates = JSON.parse(localStorage.getItem("invoiceTemplates") || "[]");
                    const t = templates.find((tmp: any) => tmp.name === val);
                    if (t) handleLoadTemplate(t);
                }}>
                    <SelectTrigger className="w-[200px] h-9">
                        <SelectValue placeholder="Cargar Plantilla..." />
                    </SelectTrigger>
                    <SelectContent>
                        {(typeof window !== 'undefined' ? JSON.parse(localStorage.getItem("invoiceTemplates") || "[]") : []).map((t: any, i: number) => (
                            <SelectItem key={i} value={t.name}>{t.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="grid lg:grid-cols-2 gap-8 items-start">
                {/* Form Side */}
                <div className="lg:col-span-1">
                    <form onSubmit={handlePreSubmit}>
                        <div className="space-y-6">
                            {/* Información del Comprobante */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Información del Comprobante</CardTitle>
                                    <CardDescription>
                                        Selecciona el tipo de comprobante fiscal electrónico
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Selector de Tipo de e-CF */}
                                    <div className="space-y-2">
                                        <Label htmlFor="invoice-type">Tipo de Comprobante (e-CF) *</Label>
                                        <Select value={invoiceType} onValueChange={setInvoiceType}>
                                            <SelectTrigger id="invoice-type">
                                                <SelectValue placeholder="Selecciona el tipo de comprobante" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="31">
                                                    31 - Factura de Crédito Fiscal
                                                </SelectItem>
                                                <SelectItem value="32">
                                                    32 - Factura de Consumo
                                                </SelectItem>
                                                <SelectItem value="33">
                                                    33 - Nota de Débito
                                                </SelectItem>
                                                <SelectItem value="34">
                                                    34 - Nota de Crédito
                                                </SelectItem>
                                                <SelectItem value="44">
                                                    44 - Regímenes Especiales (Ingresos Exentos)
                                                </SelectItem>
                                                <SelectItem value="45">
                                                    45 - Comprobante de Gastos Menores
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <p className="text-xs text-gray-500">
                                            💡 Tipo 31 incluye retención de ISR del 10%
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Información del Cliente */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Información del Cliente</CardTitle>
                                    <CardDescription>
                                        Datos del cliente o empresa
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Selector de Cliente Guardado */}
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
                                            <Label htmlFor="client-name">Nombre del Cliente *</Label>
                                            <Input
                                                id="client-name"
                                                placeholder="Razón Social o Nombre"
                                                value={clientName}
                                                onChange={(e) => setClientName(e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="client-rnc">RNC / Cédula *</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    id="client-rnc"
                                                    placeholder="Ej: 131234567"
                                                    value={rnc}
                                                    onChange={(e) => handleRncChange(e.target.value)}
                                                    onBlur={handleRncBlur}
                                                    className={rncError ? "border-red-500 focus-visible:ring-red-500" : ""}
                                                    required
                                                />
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={handleRNCSearch}
                                                    disabled={isSearchingRNC}
                                                    title="Buscar en DGII (Simulado)"
                                                >
                                                    <Search className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            {rncError && (
                                                <p className="text-xs text-red-500">{rncError}</p>
                                            )}
                                        </div>
                                    </div>


                                    <div className="space-y-2">
                                        <Label htmlFor="client-phone">Teléfono / WhatsApp (Opcional)</Label>
                                        <Input
                                            id="client-phone"
                                            placeholder="Ej: 8095551234"
                                            value={clientPhone}
                                            onChange={(e) => setClientPhone(e.target.value)}
                                        />
                                    </div>

                                    <div className="flex items-center space-x-2 mt-2">
                                        <input
                                            type="checkbox"
                                            id="save-client"
                                            checked={saveClient}
                                            onChange={(e) => setSaveClient(e.target.checked)}
                                            className="h-4 w-4 text-blue-600 rounded border-gray-300"
                                        />
                                        <Label htmlFor="save-client" className="text-sm font-normal text-gray-600 cursor-pointer">
                                            Guardar en mi lista de clientes
                                        </Label>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Selector de Profesión / Vertical */}
                            <Card className="border-l-4 border-l-purple-500">
                                <CardHeader>
                                    <CardTitle>Perfil de Facturación</CardTitle>
                                    <CardDescription>
                                        Configura los campos específicos según tu actividad profesional
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="profession">Profesión / Actividad *</Label>
                                        <Select value={profession} onValueChange={(val: any) => setProfession(val)}>
                                            <SelectTrigger id="profession">
                                                <SelectValue placeholder="Selecciona tu actividad" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="general">Servicios Generales / Venta</SelectItem>
                                                <SelectItem value="medic">Médico / Salud</SelectItem>
                                                <SelectItem value="lawyer">Abogado / Legal</SelectItem>
                                                <SelectItem value="technical">Ingeniero / Arquitecto / Técnico</SelectItem>
                                                <SelectItem value="other">Inmobiliaria / Consultor / Otro</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Campos para Médicos */}
                                    {profession === "medic" && (
                                        <div className="grid gap-4 md:grid-cols-2 mt-4 p-4 bg-purple-50 rounded-lg">
                                            <div className="space-y-2">
                                                <Label htmlFor="ars">ARS (Aseguradora)</Label>
                                                <Select value={ars} onValueChange={setArs}>
                                                    <SelectTrigger id="ars">
                                                        <SelectValue placeholder="Selecciona ARS" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="senasa">SeNaSa</SelectItem>
                                                        <SelectItem value="mapfre">Mapfre Salud</SelectItem>
                                                        <SelectItem value="humano">Primera ARS (Humano)</SelectItem>
                                                        <SelectItem value="universal">ARS Universal</SelectItem>
                                                        <SelectItem value="palic">ARS Palic</SelectItem>
                                                        <SelectItem value="other">Otras / Privado</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="exequatur">Exequátur / Autorización</Label>
                                                <Input
                                                    id="exequatur"
                                                    placeholder="Ej: 1234-56"
                                                    value={exequatur}
                                                    onChange={(e) => setExequatur(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Campos para Ingenieros (Technical) */}
                                    {profession === "technical" && (
                                        <div className="space-y-2 mt-4 p-4 bg-orange-50 rounded-lg">
                                            <Label htmlFor="project-desc">Descripción de la Obra / Proyecto</Label>
                                            <Input
                                                id="project-desc"
                                                placeholder="Ej: Remodelación Apartamento 4B, Torre Azul"
                                                value={projectDesc}
                                                onChange={(e) => setProjectDesc(e.target.value)}
                                            />
                                            <p className="text-xs text-gray-500">Se incluirá como referencia en la factura.</p>
                                        </div>
                                    )}

                                    {/* Campos para Inmobiliaria (Mapped to Other for now) */}
                                    {profession === "other" && (
                                        <div className="space-y-2 mt-4 p-4 bg-green-50 rounded-lg">
                                            <Label htmlFor="property-ref">Referencia de Inmueble (Opcional)</Label>
                                            <Input
                                                id="property-ref"
                                                placeholder="Ej: Apto. en Evaristo Morales, Ref. #4590"
                                                value={propertyRef}
                                                onChange={(e) => setPropertyRef(e.target.value)}
                                            />
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* AI Magic Input */}
                            <Card className="bg-gradient-to-r from-violet-500/5 to-fuchsia-500/5 border-violet-100">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-violet-700 flex items-center gap-2 text-lg">
                                        <Sparkles className="w-5 h-5" />
                                        Generador Mágico (AI)
                                    </CardTitle>
                                    <CardDescription>
                                        Describe lo que vendiste y deja que la IA llene los ítems por ti.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <Input
                                                placeholder="Ej: Instalación de 2 cámaras por 3500 pesos..."
                                                className="pr-10 border-violet-200 focus-visible:ring-violet-500"
                                                value={magicCommand}
                                                onChange={(e) => setMagicCommand(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        handleMagicParse();
                                                    }
                                                }}
                                            />
                                            <Mic className="w-4 h-4 text-slate-400 absolute right-3 top-3 cursor-pointer hover:text-violet-600" />
                                        </div>
                                        <Button
                                            type="button"
                                            onClick={handleMagicParse}
                                            disabled={isParsingAI || !magicCommand.trim()}
                                            className="bg-violet-600 hover:bg-violet-700 text-white gap-2"
                                        >
                                            {isParsingAI ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                            {isParsingAI ? "Pensando..." : "Generar"}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Ítems de la Factura */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Ítems de la Factura</CardTitle>
                                    <CardDescription>
                                        Agrega los productos o servicios a facturar
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-[40%]">Descripción</TableHead>
                                                    <TableHead className="w-[15%]">Cantidad</TableHead>
                                                    <TableHead className="w-[20%]">Precio Unit.</TableHead>
                                                    <TableHead className="w-[20%]">Subtotal</TableHead>
                                                    <TableHead className="w-[5%]"></TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {items.map((item) => (
                                                    <Fragment key={item.id}>
                                                        <TableRow>
                                                            {/* Descripción */}
                                                            <TableCell>
                                                                <div className="relative">
                                                                    <Input
                                                                        type="text"
                                                                        placeholder="Descripción..."
                                                                        value={item.description}
                                                                        onChange={(e) =>
                                                                            updateItem(item.id, "description", e.target.value)
                                                                        }
                                                                        className="pr-8"
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleVoiceDictation(item.id)}
                                                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors"
                                                                        title="Dictado por voz"
                                                                    >
                                                                        <Mic className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                                {savedServices.length > 0 && (
                                                                    <div className="mt-1">
                                                                        <Select onValueChange={(val) => handleSelectService(item.id, val)}>
                                                                            <SelectTrigger className="h-6 text-xs border-0 bg-transparent text-blue-600 p-0 hover:underline shadow-none">
                                                                                <SelectValue placeholder="✨ Cargar servicio..." />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                {savedServices.map((s, i) => (
                                                                                    <SelectItem key={i} value={s.name}>{s.name} - ${s.price}</SelectItem>
                                                                                ))}
                                                                            </SelectContent>
                                                                        </Select>
                                                                    </div>
                                                                )}
                                                            </TableCell>

                                                            {/* Cantidad */}
                                                            <TableCell>
                                                                <Input
                                                                    type="number"
                                                                    min="1"
                                                                    value={item.quantity}
                                                                    onKeyDown={(e) => handleNumericKeyDown(e, false)}
                                                                    onChange={(e) =>
                                                                        updateItem(item.id, "quantity", parseInt(e.target.value) || 1)
                                                                    }
                                                                />
                                                            </TableCell>

                                                            {/* Precio */}
                                                            <TableCell>
                                                                <Input
                                                                    type="number"
                                                                    min="0"
                                                                    step="0.01"
                                                                    placeholder="0.00"
                                                                    value={item.price}
                                                                    onKeyDown={(e) => handleNumericKeyDown(e, true)}
                                                                    onChange={(e) =>
                                                                        updateItem(item.id, "price", parseFloat(e.target.value) || 0)
                                                                    }
                                                                />
                                                            </TableCell>

                                                            {/* Subtotal del ítem */}
                                                            <TableCell className="font-semibold">
                                                                {formatCurrency(item.quantity * item.price)}
                                                            </TableCell>

                                                            {/* Botón eliminar */}
                                                            <TableCell>
                                                                {items.length > 1 && (
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => removeItem(item.id)}
                                                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                                    >
                                                                        ✕
                                                                    </Button>
                                                                )}
                                                            </TableCell>
                                                        </TableRow>
                                                        {/* Fila extra para opciones por ítem (Solo Abogados por ahora) */}
                                                        {profession === "lawyer" && (
                                                            <TableRow className="border-0 bg-gray-50/50">
                                                                <TableCell colSpan={5} className="pt-0 pb-2">
                                                                    <div className="flex items-center space-x-2 text-sm pl-2">
                                                                        <input
                                                                            type="checkbox"
                                                                            id={`exempt-${item.id}`}
                                                                            checked={item.isExempt || false}
                                                                            onChange={(e) => updateItem(item.id, "isExempt", e.target.checked)}
                                                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                                        />
                                                                        <Label htmlFor={`exempt-${item.id}`} className="font-normal text-gray-600">
                                                                            Gasto Legal / Suplido (No Gravable)
                                                                        </Label>
                                                                    </div>
                                                                </TableCell>
                                                            </TableRow>
                                                        )}
                                                    </Fragment>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>

                                    {/* Botón para agregar más ítems */}
                                    <div className="mt-4">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={addItem}
                                            className="w-full md:w-auto"
                                        >
                                            ➕ Agregar Ítem
                                        </Button>
                                    </div>

                                    {/* Opciones de Retención */}
                                    <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                        <div className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                id="apply-retentions"
                                                checked={applyRetentions}
                                                onChange={(e) => setApplyRetentions(e.target.checked)}
                                                className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                            />
                                            <Label htmlFor="apply-retentions" className="font-medium text-gray-900 cursor-pointer">
                                                Aplicar Retenciones de Ley (Persona Jurídica)
                                            </Label>
                                        </div>
                                        {applyRetentions && (
                                            <div className="mt-3 ml-6 grid gap-4 grid-cols-1 md:grid-cols-2">
                                                <div className="text-sm text-gray-600">
                                                    <span className="block font-medium text-gray-700">ISR (10%)</span>
                                                    Se retiene el 10% del subtotal por servicios profesionales.
                                                </div>
                                                <div>
                                                    <Label htmlFor="itbis-ret-rate" className="text-xs">Tasa Retención ITBIS</Label>
                                                    <Select
                                                        value={itbisRetentionRate.toString()}
                                                        onValueChange={(val) => setItbisRetentionRate(parseFloat(val))}
                                                    >
                                                        <SelectTrigger id="itbis-ret-rate" className="h-8">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="0.30">30% (Servicios Profesionales)</SelectItem>
                                                            <SelectItem value="1.00">100% (Casos Especiales)</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Resumen de Totales */}
                            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                                <CardHeader>
                                    <CardTitle className="text-blue-900">Resumen de Totales</CardTitle>
                                    <CardDescription className="text-blue-700">
                                        Cálculos automáticos de impuestos y retenciones
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {/* Subtotal */}
                                    <div className="flex justify-between items-center py-2 border-b border-blue-200">
                                        <span className="text-gray-700 font-medium">Subtotal:</span>
                                        <span className="text-xl font-semibold text-gray-900">
                                            {formatCurrency(subtotal)}
                                        </span>
                                    </div>

                                    {/* ITBIS */}
                                    <div className="flex justify-between items-center py-2 border-b border-blue-200">
                                        <span className="text-gray-700 font-medium">
                                            ITBIS (18%):
                                            <span className="text-xs text-gray-500 ml-2">
                                                💡 Impuesto automático
                                            </span>
                                        </span>
                                        <span className="text-xl font-semibold text-green-700">
                                            + {formatCurrency(itbis)}
                                        </span>
                                    </div>

                                    {/* Retención ISR */}
                                    {isrRetention > 0 && (
                                        <div className="flex justify-between items-center py-2 border-b border-blue-200 text-red-600">
                                            <span className="font-medium">
                                                Retención ISR (10%):
                                            </span>
                                            <span className="text-xl font-semibold">
                                                - {formatCurrency(isrRetention)}
                                            </span>
                                        </div>
                                    )}

                                    {/* Retención ITBIS */}
                                    {itbisRetention > 0 && (
                                        <div className="flex justify-between items-center py-2 border-b border-blue-200 text-red-600">
                                            <span className="font-medium">
                                                Retención ITBIS ({itbisRetentionRate * 100}%):
                                            </span>
                                            <span className="text-xl font-semibold">
                                                - {formatCurrency(itbisRetention)}
                                            </span>
                                        </div>
                                    )}

                                    {/* Total Factura (Comprobante) */}
                                    <div className="flex justify-between items-center py-2 border-b-2 border-blue-900 mt-2">
                                        <span className="text-lg font-bold text-blue-900">Total Factura:</span>
                                        <span className="text-lg font-bold text-blue-900">
                                            {formatCurrency(total)}
                                        </span>
                                    </div>

                                    {/* Total a Recibir (Neto) */}
                                    <div className="flex justify-between items-center py-3 bg-green-500 text-white rounded-lg px-4 mt-4 shadow-lg">
                                        <span className="text-lg font-bold">NETO A RECIBIR:</span>
                                        <span className="text-2xl font-bold">
                                            {formatCurrency(totalNeto)}
                                        </span>
                                    </div>

                                    {/* Total en Letras */}
                                    {total > 0 && (
                                        <div className="mt-4 p-3 bg-white rounded-lg border border-blue-300">
                                            <p className="text-xs text-gray-600 mb-1">Son:</p>
                                            <p className="text-sm font-medium text-gray-900 italic">
                                                {numberToText(total)}
                                            </p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Botones de Acción */}
                            <div className="flex flex-col md:flex-row gap-4 justify-end">
                                <Link href="/">
                                    <Button type="button" variant="outline" className="w-full md:w-auto">
                                        Cancelar
                                    </Button>
                                </Link>
                                <Sheet>
                                    <SheetTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="w-full md:w-auto border-blue-600 text-blue-600 hover:bg-blue-50 lg:hidden"
                                        >
                                            <Eye className="w-4 h-4 mr-2" />
                                            Vista Previa
                                        </Button>
                                    </SheetTrigger>
                                    <SheetContent side="bottom" className="h-[85vh] overflow-y-auto rounded-t-3xl p-0">
                                        <div className="p-4 bg-slate-50 sticky top-0 z-10 border-b flex justify-between items-center">
                                            <h3 className="font-bold text-lg">Vista Previa</h3>
                                            <Button size="sm" onClick={handlePreviewPDF}>Descargar PDF</Button>
                                        </div>
                                        <div className="p-4">
                                            <InvoicePreview data={{
                                                invoiceType,
                                                clientName,
                                                rnc,
                                                items,
                                                subtotal,
                                                itbis,
                                                total,
                                                date: new Date(),
                                                ncf: lastInvoiceNCF
                                            }} />
                                        </div>
                                    </SheetContent>
                                </Sheet>
                                <Button
                                    type="submit"
                                    size="lg"
                                    className="w-full md:w-auto bg-blue-600 hover:bg-blue-700"
                                    disabled={!!rncError || isSearchingRNC || isGenerating}
                                >
                                    {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isSearchingRNC ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "💾")} {isGenerating ? "Generando..." : "Guardar y Descargar PDF"}
                                </Button>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Preview Side (Sticky) */}
                <div className="hidden lg:block lg:col-span-1 sticky top-24 self-start">
                    <InvoicePreview data={{
                        invoiceType,
                        clientName,
                        rnc,
                        items,
                        subtotal,
                        itbis,
                        total,
                        date: new Date(),
                        ncf: lastInvoiceNCF
                    }} />
                </div>
            </div>

            {/* Loading Overlay */}
            {
                isGenerating && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center z-50">
                        <Loader2 className="h-16 w-16 text-white animate-spin mb-4" />
                        <h2 className="text-white text-xl font-semibold">Generando comprobante fiscal en la nube...</h2>
                        <p className="text-white/80 text-sm">Validando secuencia NCF y firmando documento</p>
                    </div>
                )
            }

            {/* Success Modal */}
            <Dialog open={showSuccessModal} onOpenChange={() => router.push('/')}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <div className="mx-auto bg-green-100 p-3 rounded-full mb-4">
                            <CheckCircle className="h-10 w-10 text-green-600" />
                        </div>
                        <DialogTitle className="text-center text-xl">¡Factura Emitida Exitosamente!</DialogTitle>
                        <DialogDescription className="text-center text-lg font-mono text-slate-900 font-bold mt-2">
                            {lastInvoiceNCF}
                        </DialogDescription>
                        <DialogDescription className="text-center">
                            El comprobante ha sido registrado y el PDF descargado.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <Button onClick={handleWhatsAppShare} className="w-full bg-[#25D366] hover:bg-[#128C7E] flex gap-2">
                            <MessageCircle className="w-4 h-4" /> Enviar por WhatsApp
                        </Button>
                        <div className="grid grid-cols-2 gap-2">
                            <Button variant="outline" onClick={() => router.push('/')} className="gap-2">
                                <FileText className="w-4 h-4" /> Ir al Dashboard
                            </Button>
                            <Button variant="outline" onClick={() => {
                                setShowSuccessModal(false);
                                setItems([{ id: "1", description: "", quantity: 1, price: 0, isExempt: false }]);
                                setClientName("");
                                setRnc("");
                                setLastInvoiceNCF("");
                            }} className="gap-2">
                                <UserPlus className="w-4 h-4" /> Nueva Factura
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <SuggestionWidget message={suggestion} type="warning" />
        </div >
    );
}
