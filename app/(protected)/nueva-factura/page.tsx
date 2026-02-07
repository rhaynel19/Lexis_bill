"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { useState, useEffect, Fragment } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { useAuth } from "@/components/providers/AuthContext";
import { AIService } from "@/lib/ai-service-mock";
import { ValidatorService } from "@/lib/validator-service";
import { SuggestionWidget } from "@/components/ui/suggestion-widget";
import { DocumentPreview } from "@/components/DocumentPreview";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ContextualHelp } from "@/components/ui/contextual-help";

// Interfaz para definir la estructura de un ítem de factura
interface InvoiceItem {
    id: string;
    description: string;
    quantity: number | string;
    price: number | string;
    isExempt?: boolean; // Para gastos no gravables (Abogados)
}

export default function NewInvoice() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Estados para los campos del formulario
    const [invoiceType, setInvoiceType] = useState("");
    const [clientName, setClientName] = useState("");
    const [rnc, setRnc] = useState("");
    const [clientPhone, setClientPhone] = useState("");
    const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [rncError, setRncError] = useState("");
    const [applyRetentions, setApplyRetentions] = useState(false);
    const [itbisRetentionRate, setItbisRetentionRate] = useState(0.30); // 30% por defecto
    const [showPreview, setShowPreview] = useState(false);

    // Smart RNC States
    const [isClientLocked, setIsClientLocked] = useState(false);

    const { profession, setProfession } = usePreferences();
    const { user: authUser } = useAuth();

    // ... (Existing states) ...

    // Validar RNC/Cédula en tiempo real y buscar en memoria
    const handleRncChange = (value: string) => {
        setRnc(value);

        // Reset lock if cleared
        if (!value) {
            setIsClientLocked(false);
            setClientName("");
            setRncError("");
            return;
        }

        // Smart Search (Local Memory)
        const cleanValue = value.replace(/[^0-9]/g, "");
        const matchedClient = savedClients.find(c => c.rnc.replace(/[^0-9]/g, "") === cleanValue);

        if (matchedClient) {
            if (!isClientLocked) {
                setClientName(matchedClient.name);
                if (matchedClient.phone) setClientPhone(matchedClient.phone);
                setIsClientLocked(true);
                toast.success("Este RNC ya está en tu lista. He cargado los datos guardados.");

                // Auto-configure type if Corporate
                if (cleanValue.length === 9) setApplyRetentions(true);

                // Smart NCF Suggestion
                suggestNCF(cleanValue, matchedClient.name);
            }
            setRncError(""); // Valid by definition if in DB
        } else {
            // Unlock if user modifies a locked RNC to something unknown
            if (isClientLocked) {
                setIsClientLocked(false);
                setClientName("");
                setClientPhone("");
            }

            // Regular Validation
            if (cleanValue.length >= 9) {
                const validation = validateRNCOrCedula(value);
                setRncError(validation.isValid ? "" : (validation.error || ""));

                // Smart NCF Suggestion for new RNC
                if (validation.isValid) {
                    suggestNCF(cleanValue, clientName);
                }
            }
        }
    };

    // Smart NCF Logic
    const suggestNCF = (rncValue: string, name: string) => {
        const cleanRnc = rncValue.replace(/[^0-9]/g, "");
        const config = JSON.parse(localStorage.getItem("appConfig") || "{}");
        const hasElectronic = config.hasElectronicBilling || false;

        let clientType = "consumer";
        if (cleanRnc.length === 9) clientType = "business";

        // Government check
        if (cleanRnc.startsWith("4") || name.toLowerCase().includes("ministerio") || name.toLowerCase().includes("ayuntamiento") || name.toLowerCase().includes("gobierno")) {
            clientType = "government";
        }

        let suggested = "02"; // Default B02
        if (hasElectronic) {
            if (clientType === "business") suggested = "31";
            else if (clientType === "consumer") suggested = "32";
            else if (clientType === "government") suggested = "45";
        } else {
            if (clientType === "business") suggested = "01";
            else if (clientType === "consumer") suggested = "02";
            else if (clientType === "government") suggested = "15";
        }

        if (suggested !== invoiceType) {
            setInvoiceType(suggested);
            toast.info(`Por el tipo de cliente, te recomiendo ${getInvoiceTypeName(suggested)}`, {
                description: `Detectado como ${clientType === "business" ? "Empresa" : clientType === "government" ? "Gobierno" : "Consumidor"}. ¿Lo aplico?`,
            });
        }
    };

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
    const [savedTemplates, setSavedTemplates] = useState<any[]>([]);

    const [items, setItems] = useState<InvoiceItem[]>([
        { id: "1", description: "", quantity: 1, price: 0, isExempt: false }
    ]);

    // Success Modal & PDF State
    const [isGenerating, setIsGenerating] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [lastInvoiceNCF, setLastInvoiceNCF] = useState("");

    // Load CRM Data and Check for Cloned Invoice
    useEffect(() => {
        // 0. Security / Setup Check (auth desde contexto, cookie HttpOnly)
        if (!authUser?.email) {
            router.push("/login");
            return;
        }
        if (!authUser.fiscalStatus?.confirmed) {
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

        // Pre-fill from Clientes list (Facturar desde listado)
        const qRnc = searchParams.get("rnc");
        const qName = searchParams.get("name");
        const qPhone = searchParams.get("phone");
        if (qRnc || qName) {
            if (qRnc) setRnc(qRnc);
            if (qName) setClientName(qName);
            if (qPhone) setClientPhone(qPhone);
            if (qRnc || qName) setIsClientLocked(true);
        }

        // Services: API primero, fallback localStorage
        const fetchServices = async () => {
            try {
                const { api } = await import("@/lib/api-service");
                const list = await api.getServices();
                if (list && list.length > 0) setSavedServices(list);
                return;
            } catch {
                // fallback
            }
            const local = localStorage.getItem("services");
            if (local) setSavedServices(JSON.parse(local));
        };
        fetchServices();

        // Templates from API
        const fetchTemplates = async () => {
            try {
                const { api } = await import("@/lib/api-service");
                const templates = await api.getInvoiceTemplates();
                setSavedTemplates(templates || []);
            } catch {
                const local = localStorage.getItem("invoiceTemplates");
                if (local) setSavedTemplates(JSON.parse(local));
            }
        };
        fetchTemplates();

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
            // Restore Draft: API first, fallback localStorage
            const restoreDraft = async () => {
                try {
                    const { api } = await import("@/lib/api-service");
                    const d = await api.getInvoiceDraft();
                    if (d && (d.items?.length || d.clientName || d.rnc)) {
                        if (d.items?.length) setItems(d.items.map((i: any, idx: number) => ({
                            id: (i.id || Date.now() + idx).toString(),
                            description: i.description || "",
                            quantity: i.quantity ?? 1,
                            price: i.price ?? 0,
                            isExempt: i.isExempt
                        })));
                        if (d.clientName) setClientName(d.clientName);
                        if (d.rnc) setRnc(d.rnc);
                        if (d.invoiceType) setInvoiceType(d.invoiceType);
                        toast.info("📂 Borrador restaurado automáticamente.");
                        return;
                    }
                } catch {
                    // Fallback a localStorage
                }
                const local = localStorage.getItem("invoiceDraft");
                if (local) {
                    try {
                        const d = JSON.parse(local);
                        if (d.items) setItems(d.items);
                        if (d.clientName) setClientName(d.clientName);
                        if (d.rnc) setRnc(d.rnc);
                        if (d.invoiceType) setInvoiceType(d.invoiceType);
                        toast.info("📂 Borrador restaurado.");
                    } catch (e) { localStorage.removeItem("invoiceDraft"); }
                }
            };
            restoreDraft();
        }

        // Load Profession and User Details from Config/User
        const config = JSON.parse(localStorage.getItem("appConfig") || "{}");
        if (config.exequatur) setExequatur(config.exequatur);
    }, [authUser]);

    // Save Draft on Change (API + localStorage backup)
    useEffect(() => {
        if (!isGenerating && !showSuccessModal) {
            const draft = { items, clientName, rnc, invoiceType };
            localStorage.setItem("invoiceDraft", JSON.stringify(draft));
            const timer = setTimeout(() => {
                import("@/lib/api-service").then(({ api }) =>
                    api.saveInvoiceDraft(draft).catch(() => {})
                );
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [items, clientName, rnc, invoiceType, isGenerating, showSuccessModal]);

    // Auto-llenar nombre cuando el RNC tiene 9 u 11 dígitos (consulta DGII / API después de dejar de escribir)
    useEffect(() => {
        const clean = rnc.replace(/[^0-9]/g, "");
        if (clean.length !== 9 && clean.length !== 11) return;
        const timer = setTimeout(async () => {
            try {
                const { api } = await import("@/lib/api-service");
                const result: any = await api.validateRnc(rnc);
                if (result?.valid && result?.name) {
                    const nameFromApi = (result.name || "").trim();
                    if (nameFromApi.toUpperCase() !== "CONTRIBUYENTE REGISTRADO") {
                        setClientName((prev) => (prev.trim() ? prev : nameFromApi));
                        suggestNCF(clean, nameFromApi);
                        setRncError("");
                    }
                }
            } catch {
                // Silencioso: el usuario puede usar el botón "Buscar" o escribir el nombre a mano
            }
        }, 800);
        return () => clearTimeout(timer);
    }, [rnc]);

    useEffect(() => {
        // Lógica automática al cambiar tipo de comprobante
        if (invoiceType === "44" || invoiceType === "14") {
            // Regímenes Especiales: Todo Exento
            setItems(prevItems => prevItems.map(item => ({ ...item, isExempt: true })));
            toast.info(`ℹ️ ${invoiceType === "14" ? "B14" : "E44"} seleccionado: Se ha marcado todo como EXENTO de ITBIS automáticamente.`);
        } else if (invoiceType === "45" || invoiceType === "15") {
            // Gubernamentales
            toast.info(`ℹ️ ${invoiceType === "15" ? "B15" : "E45"} seleccionado: Configuración para instituciones gubernamentales.`);
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
    const handleSaveTemplate = async () => {
        const name = prompt("Nombre de la plantilla (Ej: Iguala Mensual):");
        if (!name) return;
        try {
            const { api } = await import("@/lib/api-service");
            await api.saveInvoiceTemplate({ name, invoiceType, items, clientName, rnc });
            setSavedTemplates((prev) => [...prev, { name, invoiceType, items, clientName, rnc }]);
            toast.success("✅ Plantilla guardada exitosamente.");
        } catch (e) {
            const template = { name, invoiceType, items, clientName, rnc };
            const existing = localStorage.getItem("invoiceTemplates");
            const templates = existing ? JSON.parse(existing) : [];
            templates.push(template);
            localStorage.setItem("invoiceTemplates", JSON.stringify(templates));
            setSavedTemplates(templates);
            toast.success("✅ Plantilla guardada (local).");
        }
    };

    const handleLoadTemplate = (t: any) => {
        setInvoiceType(t.invoiceType || "");
        setClientName(t.clientName || "");
        setRnc(t.rnc || "");
        const its = (t.items || []).map((i: any, idx: number) => ({
            id: (i.id || Date.now() + idx).toString(),
            description: i.description || "",
            quantity: i.quantity ?? 1,
            price: i.price ?? 0,
            isExempt: i.isExempt
        }));
        setItems(its.length ? its : [{ id: "1", description: "", quantity: 1, price: 0, isExempt: false }]);
        toast.success(`Plantilla "${t.name}" cargada. Los datos están listos para editar.`);
    };

    // CRM Handlers
    const handleRNCSearch = async () => {
        if (!rnc) return;
        setIsSearchingRNC(true);
        setRncError("");
        try {
            const { api } = await import("@/lib/api-service");
            const result: any = await api.validateRnc(rnc);

            if (result.valid) {
                // Rellenar nombre solo si la API trae un nombre real (nunca usar placeholder "CONTRIBUYENTE REGISTRADO")
                const nameFromApi = (result.name || "").trim();
                const isRealName = nameFromApi && nameFromApi.toUpperCase() !== "CONTRIBUYENTE REGISTRADO";
                setClientName((prev) => {
                    if (isRealName) return nameFromApi;
                    return prev;
                });
                // Auto-set type based on RNC type
                if (result.type === "JURIDICA") setApplyRetentions(true);

                // Smart NCF Suggestion
                suggestNCF(rnc, result.name || "");
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
            setIsClientLocked(true);
            toast.success("Cliente cargado. Los datos están listos para facturar.");

            // Smart NCF Suggestion
            suggestNCF(client.rnc, client.name);
        }
    };

    const handleSelectService = (itemId: string, serviceName: string) => {
        const service = savedServices.find(s => s.name === serviceName);
        if (service) {
            updateItem(itemId, "description", service.name);
            updateItem(itemId, "price", service.price);
        }
    };

    // AI Magic Input (colapsado por defecto para simplificar la pantalla)
    const [showMagicGenerator, setShowMagicGenerator] = useState(false);
    const [magicCommand, setMagicCommand] = useState("");
    const [isParsingAI, setIsParsingAI] = useState(false);

    const handleMagicParse = async () => {
        if (!magicCommand.trim()) return;
        setIsParsingAI(true);
        try {
            const parsedItems = await AIService.parseInvoiceText(magicCommand);

            const newItems: InvoiceItem[] = parsedItems.map(p => ({
                id: Date.now().toString() + Math.random().toString().slice(2),
                description: p.description,
                quantity: p.quantity,
                price: p.price,
                isExempt: invoiceType === "44"
            }));

            if (items.length === 1 && !items[0].description && items[0].price === 0) {
                setItems(newItems);
            } else {
                setItems(prev => [...prev, ...newItems]);
            }

            setMagicCommand("");
            toast.success(`He agregado ${newItems.length} ítems. Revisa y ajusta si hace falta.`);
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
        const qty = typeof item.quantity === 'string' ? (parseFloat(item.quantity) || 0) : item.quantity;
        const price = typeof item.price === 'string' ? (parseFloat(item.price) || 0) : item.price;
        return sum + (qty * price);
    }, 0);

    // Calcular Base Imponible (ítems no exentos)
    const taxableSubtotal = items.reduce((sum, item) => {
        const qty = typeof item.quantity === 'string' ? (parseFloat(item.quantity) || 0) : item.quantity;
        const price = typeof item.price === 'string' ? (parseFloat(item.price) || 0) : item.price;
        return item.isExempt ? sum : sum + (qty * price);
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
            (item) => item.description && Number(item.quantity) > 0 && Number(item.price) > 0
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
                quantity: Number(item.quantity),
                price: Number(item.price),
            })),
            subtotal,
            itbis,
            isrRetention,
            itbisRetention,
            total: invoiceTotal,
        };

        const companyOverride = authUser ? { companyName: authUser.fiscalStatus?.confirmed, rnc: authUser.rnc } : undefined;
        await previewInvoicePDF(invoiceData, companyOverride);
    };

    const handlePreSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Validar que todos los campos estén completos
        if (!invoiceType || !clientName || !rnc) {
            toast.error("Por favor completa todos los campos obligatorios");
            return;
        }

        const validItems = items.filter(
            (item) => item.description && Number(item.quantity) > 0 && Number(item.price) > 0
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
                (item) => item.description && Number(item.quantity) > 0 && Number(item.price) > 0
            );

            // Validación defensiva antes de llamar al API (evita "Cliente, RNC e items son requeridos")
            const isPlaceholderName = !cleanClientName || cleanClientName.toUpperCase().trim() === "CONTRIBUYENTE REGISTRADO";
            if (isPlaceholderName) {
                toast.error("Indica el nombre real del cliente antes de emitir la factura (no uses el placeholder).");
                setIsGenerating(false);
                return;
            }
            if (cleanRnc.length < 9) {
                toast.error("Indica un RNC o cédula válido (9 u 11 dígitos) antes de emitir.");
                setIsGenerating(false);
                return;
            }
            if (validItems.length === 0) {
                toast.error("Agrega al menos un ítem con descripción, cantidad y precio.");
                setIsGenerating(false);
                return;
            }

            const invoiceData = {
                clientName: cleanClientName,
                clientRnc: cleanRnc,
                ncfType: invoiceType,
                items: validItems,
                date: invoiceDate ? new Date(invoiceDate).toISOString() : new Date().toISOString(),
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
                    quantity: Number(item.quantity),
                    price: Number(item.price),
                })),
                subtotal,
                itbis,
                isrRetention,
                itbisRetention,
                total: invoiceTotal,
            };

            const companyOverride = authUser ? { companyName: authUser.fiscalStatus?.confirmed, rnc: authUser.rnc } : undefined;
            await downloadInvoicePDF(pdfData, companyOverride);

            // CRM: Guardar Cliente en Backend
            if (saveClient) {
                const customerData = { name: clientName, rnc, phone: clientPhone, email: "" };
                await api.saveCustomer(customerData);
            }

            setLastInvoiceNCF(ncf);
            setShowSuccessModal(true);
            localStorage.removeItem("invoiceDraft");
            api.deleteInvoiceDraft().catch(() => {});

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
        const text = `Hola *${clientName}*! 🇩🇴\n\nLe envío su comprobante fiscal *${lastInvoiceNCF}* por valor de *${formatCurrency(total)}*.\n\n📎 Te envío adjunto el PDF del comprobante.\n\nGracias por preferirnos.`;
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
            "01": "B01 - Crédito Fiscal",
            "02": "B02 - Consumo",
            "04": "B04 - Nota de Crédito",
            "14": "B14 - Regímenes Especiales",
            "15": "B15 - Gubernamental",
            "31": "e-CF 31 - Crédito Fiscal",
            "32": "e-CF 32 - Consumo",
            "33": "e-CF 33 - Nota de Débito",
            "34": "e-CF 34 - Nota de Crédito",
            "44": "e-CF 44 - Regímenes Especiales",
            "45": "e-CF 45 - Gubernamental",
        };
        return types[type] || type;
    };

    if (showPreview) {
        return (
            <div className="container mx-auto px-4 py-8 pb-20 md:pb-8">
                <DocumentPreview
                    type="invoice"
                    data={{ clientName, rnc, clientPhone, items, subtotal, itbis, total, invoiceType, date: invoiceDate }}
                    onEdit={() => setShowPreview(false)}
                    onConfirm={handleConfirmSave}
                    isProcessing={isGenerating}
                />
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 pb-20 md:pb-8 max-w-5xl">
            <Breadcrumbs items={[{ label: "Inicio", href: "/dashboard" }, { label: "Nueva factura" }]} className="mb-4 text-muted-foreground" />
            {/* Encabezado */}
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-accent">Nueva Factura</h2>
                    <p className="text-muted-foreground">Crear comprobante fiscal electrónico (e-CF)</p>
                    <p className="text-xs text-muted-foreground/80 mt-1">Tu borrador se guarda automáticamente y está disponible en todos tus dispositivos.</p>
                </div>
                <Link href="/dashboard">
                    <Button variant="outline">← Volver</Button>
                </Link>
            </div>

            {/* Template Bar */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                <Button variant="secondary" size="sm" onClick={handleSaveTemplate} className="gap-2">
                    <Save className="h-4 w-4" /> Guardar como Plantilla
                </Button>
                <div className="h-8 w-[1px] bg-border mx-2"></div>
                {/* Loader Mock */}
                <Select onValueChange={(val) => {
                    const t = savedTemplates.find((tmp: any) => tmp.name === val);
                    if (t) handleLoadTemplate(t);
                }}>
                    <SelectTrigger className="w-[200px] h-9">
                        <SelectValue placeholder="Cargar Plantilla..." />
                    </SelectTrigger>
                    <SelectContent>
                        {savedTemplates.map((t: any, i: number) => (
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
                                        <div className="flex items-center gap-2">
                                            <Label htmlFor="invoice-type">Tipo de Comprobante (e-CF) *</Label>
                                            <ContextualHelp text="NCF: Número de Comprobante Fiscal. B01/E31 para empresas (RNC 9 dígitos), B02/E32 para consumidor final. El tipo debe coincidir con el cliente." mode="popover" />
                                        </div>
                                        <Select value={invoiceType} onValueChange={setInvoiceType}>
                                            <SelectTrigger id="invoice-type">
                                                <SelectValue placeholder="Selecciona el tipo de comprobante" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/30">Comprobantes Tradicionales (B)</div>
                                                <SelectItem value="01">01 - Crédito Fiscal</SelectItem>
                                                <SelectItem value="02">02 - Consumo</SelectItem>
                                                <SelectItem value="04">04 - Nota de Crédito</SelectItem>
                                                <SelectItem value="14">14 - Regímenes Especiales</SelectItem>
                                                <SelectItem value="15">15 - Gubernamental</SelectItem>

                                                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/30 mt-2">Comprobantes Electrónicos (E)</div>
                                                <SelectItem value="31">31 - Crédito Fiscal</SelectItem>
                                                <SelectItem value="32">32 - Consumo</SelectItem>
                                                <SelectItem value="33">33 - Nota de Débito</SelectItem>
                                                <SelectItem value="34">34 - Nota de Crédito</SelectItem>
                                                <SelectItem value="44">44 - Regímenes Especiales</SelectItem>
                                                <SelectItem value="45">45 - Gubernamental</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <p className="text-xs text-muted-foreground">
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
                                        <div className="space-y-2 mb-4 p-4 bg-muted/30 rounded border border-border/10">
                                            <Label className="text-muted-foreground">📂 Clientes Frecuentes</Label>
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
                                            <div className="relative">
                                                <Input
                                                    id="client-name"
                                                    placeholder="Ej: Dr. Juan Pérez o Empresa ABC"
                                                    value={clientName}
                                                    onChange={(e) => setClientName(e.target.value)}
                                                    readOnly={isClientLocked}
                                                    className={isClientLocked ? "bg-muted/50 border-success/30 text-foreground font-semibold pr-10" : ""}
                                                    required
                                                />
                                                {isClientLocked && (
                                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                                        <span className="text-[10px] bg-success/20 text-success px-2 py-0.5 rounded-full font-bold hidden sm:inline-block">
                                                            ✨ Frecuente
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => setIsClientLocked(false)}
                                                            className="text-muted-foreground hover:text-foreground"
                                                            title="Editar nombre"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="client-rnc">RNC / Cédula *</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    id="client-rnc"
                                                    placeholder="Escribe o pega el RNC y lo valido"
                                                    value={rnc}
                                                    onChange={(e) => handleRncChange(e.target.value)}
                                                    onBlur={handleRncBlur}
                                                    className={rncError ? "border-destructive focus-visible:ring-destructive" : ""}
                                                    required
                                                />
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={handleRNCSearch}
                                                    disabled={isSearchingRNC}
                                                    title="Buscar nombre por RNC / Cédula"
                                                >
                                                    {isSearchingRNC ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                            <p className="text-xs text-muted-foreground">Al escribir 9 u 11 dígitos el nombre se completa automáticamente si está en DGII.</p>
                                            {rncError && (
                                                <p className="text-xs text-destructive">{rncError}</p>
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

                                    <div className="space-y-2">
                                        <Label htmlFor="invoice-date">Fecha de factura</Label>
                                        <Input
                                            id="invoice-date"
                                            type="date"
                                            value={invoiceDate}
                                            onChange={(e) => setInvoiceDate(e.target.value)}
                                            className="bg-white"
                                        />
                                        <p className="text-xs text-muted-foreground">Puedes elegir la fecha que aparecerá en la factura.</p>
                                    </div>

                                    <div className="flex items-center space-x-2 mt-2">
                                        <input
                                            type="checkbox"
                                            id="save-client"
                                            checked={saveClient}
                                            onChange={(e) => setSaveClient(e.target.checked)}
                                            className="h-4 w-4 text-accent rounded border-border/30"
                                            aria-label="Guardar cliente en mi lista"
                                            title="Guardar cliente"
                                        />
                                        <Label htmlFor="save-client" className="text-sm font-normal text-muted-foreground cursor-pointer">
                                            Guardar en mi lista de clientes
                                        </Label>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Selector de Profesión / Vertical */}
                            <Card className="border-l-4 border-l-accent">
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
                                        <div className="grid gap-4 md:grid-cols-2 mt-4 p-4 bg-accent/5 rounded-lg border border-accent/10">
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
                                        <div className="space-y-2 mt-4 p-4 bg-secondary/50 rounded-lg border border-border/10">
                                            <Label htmlFor="project-desc">Descripción de la Obra / Proyecto</Label>
                                            <Input
                                                id="project-desc"
                                                placeholder="Ej: Remodelación Apartamento 4B, Torre Azul"
                                                value={projectDesc}
                                                onChange={(e) => setProjectDesc(e.target.value)}
                                            />
                                            <p className="text-xs text-muted-foreground">Se incluirá como referencia en la factura.</p>
                                        </div>
                                    )}

                                    {/* Campos para Inmobiliaria (Mapped to Other for now) */}
                                    {profession === "other" && (
                                        <div className="space-y-2 mt-4 p-4 bg-secondary/50 rounded-lg border border-border/10">
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

                            {/* Generador Mágico: colapsable para no saturar la pantalla */}
                            {!showMagicGenerator ? (
                                <Button type="button" variant="outline" className="w-full border-dashed border-accent/30 text-accent hover:bg-accent/10 gap-2" onClick={() => setShowMagicGenerator(true)}>
                                    <Sparkles className="w-4 h-4" /> Usar Generador Mágico (AI)
                                </Button>
                            ) : (
                                <Card className="bg-gradient-to-r from-accent/5 to-primary/5 border-accent/10">
                                    <CardHeader className="pb-3 flex flex-row items-start justify-between gap-4">
                                        <div>
                                            <CardTitle className="text-accent flex items-center gap-2 text-lg">
                                                <Sparkles className="w-5 h-5" />
                                                Generador Mágico (AI)
                                            </CardTitle>
                                            <CardDescription>
                                                Describe lo que vendiste y deja que la IA llene los ítems por ti.
                                            </CardDescription>
                                        </div>
                                        <Button type="button" variant="ghost" size="sm" onClick={() => setShowMagicGenerator(false)}>Ocultar</Button>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <Input
                                                    placeholder="Ej: Instalación de 2 cámaras por 3500 pesos..."
                                                    className="pr-10 border-accent/20 focus-visible:ring-accent"
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
                                                className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2"
                                            >
                                                {isParsingAI ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                                {isParsingAI ? "Pensando..." : "Generar"}
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

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
                                                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-accent transition-colors"
                                                                        title="Dictado por voz"
                                                                    >
                                                                        <Mic className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                                {savedServices.length > 0 && (
                                                                    <div className="mt-1">
                                                                        <Select onValueChange={(val) => handleSelectService(item.id, val)}>
                                                                            <SelectTrigger className="h-6 text-xs border-0 bg-transparent text-accent p-0 hover:underline shadow-none">
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
                                                                    onFocus={(e) => e.target.select()}
                                                                    onKeyDown={(e) => handleNumericKeyDown(e, false)}
                                                                    onChange={(e) =>
                                                                        updateItem(item.id, "quantity", e.target.value)
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
                                                                    onFocus={(e) => e.target.select()}
                                                                    onKeyDown={(e) => handleNumericKeyDown(e, true)}
                                                                    onChange={(e) =>
                                                                        updateItem(item.id, "price", e.target.value)
                                                                    }
                                                                />
                                                            </TableCell>

                                                            {/* Subtotal del ítem */}
                                                            <TableCell className="font-semibold text-foreground">
                                                                {formatCurrency(Number(item.quantity) * Number(item.price))}
                                                            </TableCell>

                                                            {/* Botón eliminar */}
                                                            <TableCell>
                                                                {items.length > 1 && (
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => removeItem(item.id)}
                                                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                                    >
                                                                        ✕
                                                                    </Button>
                                                                )}
                                                            </TableCell>
                                                        </TableRow>
                                                        {/* Fila extra para opciones por ítem (Solo Abogados por ahora) */}
                                                        {profession === "lawyer" && (
                                                            <TableRow className="border-0 bg-muted/20">
                                                                <TableCell colSpan={5} className="pt-0 pb-2">
                                                                    <div className="flex items-center space-x-2 text-sm pl-2">
                                                                        <input
                                                                            type="checkbox"
                                                                            id={`exempt-${item.id}`}
                                                                            checked={item.isExempt || false}
                                                                            onChange={(e) => updateItem(item.id, "isExempt", e.target.checked)}
                                                                            className="rounded border-border/30 text-accent focus:ring-accent"
                                                                            aria-label="Gasto legal o suplido no gravable"
                                                                            title="Exento ITBIS"
                                                                        />
                                                                        <Label htmlFor={`exempt-${item.id}`} className="font-normal text-muted-foreground">
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
                                    <div className="mt-8 p-4 bg-muted/30 rounded-lg border border-border/10">
                                        <div className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                id="apply-retentions"
                                                checked={applyRetentions}
                                                onChange={(e) => setApplyRetentions(e.target.checked)}
                                                className="h-4 w-4 text-accent rounded border-border/30 focus:ring-accent"
                                                aria-label="Aplicar retenciones de ley para persona jurídica"
                                                title="Aplicar retenciones"
                                            />
                                            <Label htmlFor="apply-retentions" className="font-medium text-foreground cursor-pointer">
                                                Aplicar Retenciones de Ley (Persona Jurídica)
                                            </Label>
                                        </div>
                                        {applyRetentions && (
                                            <div className="mt-3 ml-6 grid gap-4 grid-cols-1 md:grid-cols-2">
                                                <div className="text-sm text-muted-foreground">
                                                    <span className="block font-medium text-foreground">ISR (10%)</span>
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
                            <Card className="bg-gradient-to-br from-accent/5 to-primary/5 border-accent/20">
                                <CardHeader>
                                    <CardTitle className="text-foreground">Resumen de Totales</CardTitle>
                                    <CardDescription className="text-muted-foreground">
                                        Cálculos automáticos de impuestos y retenciones
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {/* Subtotal */}
                                    <div className="flex justify-between items-center py-2 border-b border-border/10">
                                        <span className="text-muted-foreground font-medium">Subtotal:</span>
                                        <span className="text-xl font-semibold text-foreground">
                                            {formatCurrency(subtotal)}
                                        </span>
                                    </div>

                                    {/* ITBIS */}
                                    <div className="flex justify-between items-center py-2 border-b border-border/10">
                                        <span className="text-muted-foreground font-medium">
                                            ITBIS (18%):
                                            <span className="text-xs text-muted-foreground/50 ml-2">
                                                💡 Impuesto automático
                                            </span>
                                        </span>
                                        <span className="text-xl font-semibold text-success">
                                            + {formatCurrency(itbis)}
                                        </span>
                                    </div>

                                    {/* Retención ISR */}
                                    {isrRetention > 0 && (
                                        <div className="flex justify-between items-center py-2 border-b border-border/10 text-destructive">
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
                                        <div className="flex justify-between items-center py-2 border-b border-border/10 text-destructive">
                                            <span className="font-medium">
                                                Retención ITBIS ({itbisRetentionRate * 100}%):
                                            </span>
                                            <span className="text-xl font-semibold">
                                                - {formatCurrency(itbisRetention)}
                                            </span>
                                        </div>
                                    )}

                                    {/* Total Factura (Comprobante) */}
                                    <div className="flex justify-between items-center py-2 border-b-2 border-accent mt-2">
                                        <span className="text-lg font-bold text-accent">Total Factura:</span>
                                        <span className="text-lg font-bold text-accent">
                                            {formatCurrency(total)}
                                        </span>
                                    </div>

                                    {/* Total a Recibir (Neto) */}
                                    <div className="flex justify-between items-center py-3 bg-success text-success-foreground rounded-lg px-4 mt-4 shadow-lg">
                                        <span className="text-lg font-bold">NETO A RECIBIR:</span>
                                        <span className="text-2xl font-bold">
                                            {formatCurrency(totalNeto)}
                                        </span>
                                    </div>

                                    {/* Total en Letras */}
                                    {total > 0 && (
                                        <div className="mt-4 p-3 bg-background rounded-lg border border-accent/30">
                                            <p className="text-xs text-muted-foreground mb-1">Son:</p>
                                            <p className="text-sm font-medium text-foreground italic">
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
                                            className="w-full md:w-auto border-accent/30 text-accent hover:bg-accent/10 lg:hidden"
                                        >
                                            <Eye className="w-4 h-4 mr-2" />
                                            Vista Previa
                                        </Button>
                                    </SheetTrigger>
                                    <SheetContent side="bottom" className="h-[85vh] overflow-y-auto rounded-t-3xl p-0 bg-background border-t border-border/20">
                                        <div className="p-4 bg-secondary sticky top-0 z-10 border-b border-border/10 flex justify-between items-center">
                                            <h3 className="font-bold text-lg text-foreground">Vista Previa</h3>
                                            <Button size="sm" onClick={handlePreviewPDF} className="bg-primary text-primary-foreground">Descargar PDF</Button>
                                        </div>
                                        <div className="p-4">
                                            <InvoicePreview data={{
                                                invoiceType,
                                                clientName,
                                                rnc,
                                                items: items.map(i => ({
                                                    description: i.description,
                                                    quantity: i.quantity,
                                                    price: i.price
                                                })),
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
                                    className="w-full md:w-auto bg-primary hover:bg-primary/90 text-primary-foreground"
                                    disabled={!!rncError || isSearchingRNC || isGenerating}
                                >
                                    {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isSearchingRNC ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "💾")} {isGenerating ? "Generando..." : "Guardar y Descargar PDF"}
                                </Button>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Preview Side (Sticky): ancho mínimo para que la vista previa no se vea en blanco */}
                <div className="hidden lg:block lg:col-span-1 sticky top-24 self-start min-w-0 w-full lg:min-w-[380px]">
                    <InvoicePreview data={{
                        invoiceType,
                        clientName,
                        rnc,
                        items: items.map(i => ({
                            description: i.description,
                            quantity: i.quantity,
                            price: i.price
                        })),
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
                        <h2 className="text-white text-xl font-semibold">Generando tu comprobante...</h2>
                        <p className="text-white/80 text-sm">Validando NCF y firmando documento</p>
                    </div>
                )
            }

            {/* Success Modal */}
            <Dialog open={showSuccessModal} onOpenChange={() => router.push('/')}>
                <DialogContent className="sm:max-w-md bg-background border-border/20">
                    <DialogHeader>
                        <div className="mx-auto bg-success/10 p-3 rounded-full mb-4">
                            <CheckCircle className="h-10 w-10 text-success" />
                        </div>
                        <DialogTitle className="text-center text-xl text-foreground">¡Factura Emitida Exitosamente!</DialogTitle>
                        <DialogDescription className="text-center text-lg font-mono text-foreground font-bold mt-2">
                            {lastInvoiceNCF}
                        </DialogDescription>
                        <DialogDescription className="text-center">
                            El comprobante ha sido registrado y el PDF descargado.
                        </DialogDescription>
                        <p className="text-center text-xs text-muted-foreground mt-2">
                            Al abrir WhatsApp, <strong>adjunta el PDF</strong> descargado (botón 📎) antes de enviar.
                        </p>
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
