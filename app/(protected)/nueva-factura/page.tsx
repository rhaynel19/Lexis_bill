"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { useState, useEffect, useRef, Fragment } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { validateRNCOrCedula, autoFormatRNCOrCedula } from "@/lib/validators";
import { validateRNC } from "@/lib/rnc-validator";
import { numberToText } from "@/lib/number-to-text";
import { downloadInvoicePDF, previewInvoicePDF, type InvoiceData } from "@/lib/pdf-generator";
import { getNextSequenceNumber, SERIE_B_TYPES, SERIE_E_TYPES } from "@/lib/config";
import { getDominicanDate } from "@/lib/date-utils";
import { generateInvoiceWhatsAppMessage, openWhatsApp } from "@/lib/whatsapp-utils";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Search, Mic, Save, BookOpen, Loader2, CheckCircle, MessageCircle, UserPlus, FileText, Eye, Sparkles, AlertTriangle, Zap, Copy, ClipboardPaste, CheckCircle2 } from "lucide-react";
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
import { PaymentTypeSelector, type PagoMixtoItem } from "@/components/invoice/PaymentTypeSelector";
import { ClientAutofillInput, type AutofillLastInvoice } from "@/components/invoice/ClientAutofillInput";
import { ServiceAutofillInput, type AutofillService } from "@/components/invoice/ServiceAutofillInput";

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
    /** Serie E (electrónica) cuando true; Serie B (tradicional) cuando false. Viene de Configuración > Facturación Electrónica Activa. */
    const [useSerieE, setUseSerieE] = useState<boolean>(true);
    const [clientName, setClientName] = useState("");
    const [rnc, setRnc] = useState("");
    const [clientPhone, setClientPhone] = useState("");
    const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [rncError, setRncError] = useState("");
    const [applyRetentions, setApplyRetentions] = useState(false);
    const [itbisRetentionRate, setItbisRetentionRate] = useState(0.30); // 30% por defecto
    const [showPreview, setShowPreview] = useState(false);
    const [showPasteItemsDialog, setShowPasteItemsDialog] = useState(false);
    const [pasteItemsText, setPasteItemsText] = useState("");
    const [focusItemId, setFocusItemId] = useState<string | null>(null);

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

    // Tipo de Pago (obligatorio)
    const [tipoPago, setTipoPago] = useState("efectivo");
    const [tipoPagoOtro, setTipoPagoOtro] = useState("");
    const [pagoMixto, setPagoMixto] = useState<PagoMixtoItem[]>([{ tipo: "efectivo", monto: 0 }]);

    // Autofill inteligente
    const [lastInvoiceFromAutofill, setLastInvoiceFromAutofill] = useState<AutofillLastInvoice | null>(null);
    const [habitualTipoPago, setHabitualTipoPago] = useState<string | undefined>(undefined);

    // Métricas de tiempo (para "Factura creada en tiempo récord")
    const invoiceCreateStartRef = useRef<number>(Date.now());

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

        // Load Profession and User Details from Config/User (incl. Serie B vs E)
        const config = JSON.parse(localStorage.getItem("appConfig") || "{}");
        if (config.exequatur) setExequatur(config.exequatur);
        setUseSerieE(config.hasElectronicBilling === true);
    }, [authUser]);

    // Ajustar tipo de comprobante al rango configurado (Serie B o E)
    useEffect(() => {
        const allowed = useSerieE ? (SERIE_E_TYPES as readonly string[]) : (SERIE_B_TYPES as readonly string[]);
        if (invoiceType && !allowed.includes(invoiceType)) {
            setInvoiceType(useSerieE ? "32" : "02");
        } else if (!invoiceType) {
            setInvoiceType(useSerieE ? "32" : "02");
        }
    }, [useSerieE, invoiceType]);

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

    const handleSelectClient = async (clientRnc: string) => {
        const client = savedClients.find(c => c.rnc === clientRnc);
        if (client) {
            setClientName(client.name);
            setRnc(client.rnc);
            if (client.phone) setClientPhone(client.phone);
            setIsClientLocked(true);
            suggestNCF(client.rnc, client.name);
            try {
                const { api } = await import("@/lib/api-service");
                const res = await api.getAutofillSuggestions({ rnc: client.rnc.replace(/[^\d]/g, "") });
                if (res.lastInvoice) {
                    setLastInvoiceFromAutofill(res.lastInvoice);
                    setHabitualTipoPago(res.lastInvoice.tipoPago);
                    setTipoPago(res.lastInvoice.tipoPago);
                    toast.success("Cliente frecuente detectado.", { description: "Puedes usar «Repetir última factura»." });
                } else {
                    setLastInvoiceFromAutofill(null);
                    setHabitualTipoPago(undefined);
                    toast.success("Cliente cargado. Los datos están listos para facturar.");
                }
            } catch {
                setLastInvoiceFromAutofill(null);
                toast.success("Cliente cargado. Los datos están listos para facturar.");
            }
        }
    };

    const handleAutofillSelectClient = (client: { name: string; rnc: string; phone?: string; usualTipoPago?: string; count?: number }, lastInvoice?: AutofillLastInvoice | null) => {
        setClientName(client.name);
        setRnc(client.rnc);
        if (client.phone) setClientPhone(client.phone);
        setIsClientLocked(true);
        setLastInvoiceFromAutofill(lastInvoice || null);
        setHabitualTipoPago(client.usualTipoPago);
        if (client.usualTipoPago) setTipoPago(client.usualTipoPago);
        suggestNCF(client.rnc, client.name);
        if (client.count && client.count > 1) toast.success("Cliente frecuente detectado.", { description: "He aplicado la configuración habitual." });
        else toast.success("Cliente cargado. Los datos están listos para facturar.");
    };

    const handleUseSameConfig = () => {
        const inv = lastInvoiceFromAutofill;
        if (!inv?.items?.length) return;
        const its = inv.items.map((i, idx) => ({
            id: Date.now().toString() + idx,
            description: i.description,
            quantity: i.quantity ?? 1,
            price: i.price ?? 0,
            isExempt: i.isExempt ?? false,
        }));
        setItems(its);
        if (inv.tipoPago) setTipoPago(inv.tipoPago);
        if (inv.ncfType) setInvoiceType(inv.ncfType);
        setLastInvoiceFromAutofill(null);
        toast.success("Configuración aplicada.", { description: "Precio sugerido basado en tus últimas facturas." });
    };

    const handleSelectService = (itemId: string, serviceName: string) => {
        const service = savedServices.find(s => (s as any).name === serviceName || (s as any).description === serviceName);
        if (service) {
            updateItem(itemId, "description", (service as any).name || (service as any).description || serviceName);
            updateItem(itemId, "price", (service as any).price ?? 0);
        }
    };

    const handleAutofillSelectService = (itemId: string) => (s: AutofillService) => {
        updateItem(itemId, "description", s.description);
        updateItem(itemId, "price", s.price);
        updateItem(itemId, "isExempt", s.isExempt);
        toast.success("Precio sugerido basado en tus últimas facturas.", { duration: 2500 });
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

    // Función para agregar una nueva línea de ítem (y enfocar la descripción de la nueva fila)
    const addItem = () => {
        const newItem: InvoiceItem = {
            id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            description: "",
            quantity: 1,
            price: 0,
            isExempt: invoiceType === "44", // Auto-exempt if E44
        };
        setItems([...items, newItem]);
        setFocusItemId(newItem.id);
    };

    // Función para eliminar un ítem
    const removeItem = (id: string) => {
        if (items.length > 1) {
            setItems(items.filter((item) => item.id !== id));
        }
    };

    // Duplicar ítem (copia descripción, cantidad y precio)
    const duplicateItem = (id: string) => {
        const item = items.find((i) => i.id === id);
        if (!item) return;
        const newItem: InvoiceItem = {
            id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            description: item.description,
            quantity: item.quantity,
            price: item.price,
            isExempt: item.isExempt,
        };
        const idx = items.findIndex((i) => i.id === id);
        const next = [...items];
        next.splice(idx + 1, 0, newItem);
        setItems(next);
        toast.success("Ítem duplicado. Edita cantidad o precio si necesitas.");
    };

    // Pegar ítems desde Excel/lista (líneas con Descripción, Cantidad, Precio separados por tab o coma)
    const handlePasteItems = () => {
        const text = pasteItemsText.trim();
        if (!text) {
            toast.error("Pega el contenido primero (ej. desde Excel).");
            return;
        }
        const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        const newItems: InvoiceItem[] = lines.map((line) => {
            const parts = line.includes("\t") ? line.split("\t") : line.split(/,\s*/);
            const desc = (parts[0] || "").trim();
            const qty = parts.length >= 2 ? (parseFloat(parts[1]) || 1) : 1;
            const price = parts.length >= 3 ? (parseFloat(parts[2].replace(/[^0-9.]/g, "")) || 0) : 0;
            return {
                id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
                description: desc,
                quantity: qty,
                price: price,
                isExempt: invoiceType === "44",
            };
        });
        if (newItems.length === 0) {
            toast.error("No se encontraron líneas válidas. Usa tab o coma entre Descripción, Cantidad y Precio.");
            return;
        }
        setItems((prev) => [...prev, ...newItems]);
        setShowPasteItemsDialog(false);
        setPasteItemsText("");
        toast.success(`${newItems.length} ítem(s) agregado(s). Revisa y ajusta si hace falta.`);
    };

    // Función para actualizar un ítem específico
    const updateItem = (id: string, field: keyof InvoiceItem, value: string | number | boolean) => {
        setItems(
            items.map((item) =>
                item.id === id ? { ...item, [field]: value } : item
            )
        );
    };

    const isItemComplete = (item: InvoiceItem) =>
        String(item.description).trim() !== "" && Number(item.quantity) > 0 && Number(item.price) >= 0;

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

    const buildProformaInvoiceData = (): InvoiceData => {
        const validItems = items.filter(
            (item) => item.description && Number(item.quantity) > 0 && Number(item.price) > 0
        );
        return {
            id: "proforma",
            sequenceNumber: "BORRADOR",
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
            isrRetention: isrRetention,
            itbisRetention,
            total: invoiceTotal,
        };
    };

    const handleDownloadProformaPDF = async () => {
        const invoiceData = buildProformaInvoiceData();
        const companyOverride = authUser ? { companyName: authUser.fiscalStatus?.confirmed, rnc: authUser.rnc } : undefined;
        await downloadInvoicePDF(invoiceData, companyOverride);
        toast.success("Proforma descargada. Puedes enviarla al cliente antes de confirmar y emitir.");
    };

    const handleSendProformaWhatsApp = () => {
        const companyName = authUser?.fiscalStatus?.confirmed || undefined;
        const message = generateInvoiceWhatsAppMessage(
            { clientName, ncfSequence: "PROFORMA", id: "proforma", total: invoiceTotal },
            companyName
        );
        openWhatsApp(clientPhone || undefined, message);
        toast.info("Abriendo WhatsApp. Adjunta el PDF de la proforma (descárgalo antes con «Solo Descargar PDF») antes de enviar.", { duration: 5000 });
    };

    const handlePreSubmit = (e: React.FormEvent) => {
        e.preventDefault();
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
        if (tipoPago === "mixto") {
            const sumMixto = pagoMixto.reduce((s, p) => s + (p.monto || 0), 0);
            if (Math.abs(sumMixto - total) > 1) {
                toast.error("Los montos del pago mixto deben cuadrar con el total de la factura");
                return;
            }
        }
        setShowPreview(true);
    }

    const [showCreditRiskConfirm, setShowCreditRiskConfirm] = useState(false);
    const [creditRiskData, setCreditRiskData] = useState<{ message?: string; riskScore?: number } | null>(null);
    const [pendingConfirmSave, setPendingConfirmSave] = useState(false);

    const handleConfirmSave = async (skipRiskCheck = false) => {
        if (isGenerating) return;
        if (tipoPago === "credito" && !skipRiskCheck && rnc.replace(/[^0-9]/g, "").length >= 9) {
            try {
                const { api } = await import("@/lib/api-service");
                const risk = await api.getClientPaymentRisk(rnc);
                if (risk && risk.level === "alto_riesgo" && risk.message) {
                    setCreditRiskData({ message: risk.message, riskScore: risk.riskScore });
                    setShowCreditRiskConfirm(true);
                    setPendingConfirmSave(true);
                    return;
                }
            } catch { /* continue */ }
        }
        setPendingConfirmSave(false);
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

            const invoiceData: Record<string, unknown> = {
                clientName: cleanClientName,
                clientRnc: cleanRnc,
                ncfType: invoiceType,
                items: validItems,
                date: invoiceDate ? new Date(invoiceDate).toISOString() : new Date().toISOString(),
                subtotal,
                itbis,
                total,
                isrRetention,
                tipoPago,
            };
            if (tipoPago === "otro" && tipoPagoOtro?.trim()) invoiceData.tipoPagoOtro = tipoPagoOtro.trim();
            if (tipoPago === "mixto" && pagoMixto.length > 0) {
                invoiceData.pagoMixto = pagoMixto.filter((p) => (p.monto || 0) > 0).map((p) => ({ tipo: p.tipo, monto: p.monto }));
            }

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
            const elapsedSec = (Date.now() - invoiceCreateStartRef.current) / 1000;
            if (elapsedSec < 15) {
                toast.success("Factura creada en tiempo récord.", { description: `Menos de ${Math.round(elapsedSec)} segundos. ¡Increíble!` });
            }
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

    const handleCreditRiskContinue = () => {
        setShowCreditRiskConfirm(false);
        setCreditRiskData(null);
        handleConfirmSave(true);
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
                    onDownloadPDF={handleDownloadProformaPDF}
                    onSendWhatsApp={handleSendProformaWhatsApp}
                    isProforma
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
                    <p className="text-muted-foreground">
                        {useSerieE ? "Crear comprobante fiscal electrónico (e-CF, Serie E)" : "Crear comprobante fiscal (Serie B)"}
                    </p>
                    <p className="text-xs text-muted-foreground/80 mt-1">Según configuración. Tu borrador se guarda automáticamente.</p>
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
                                        {useSerieE
                                            ? "Serie E (electrónica): según tu configuración. NCF con código QR al emitir."
                                            : "Serie B (tradicional): según tu configuración. Sin código QR."}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Selector de Tipo según Serie B o E (configuración) */}
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <Label htmlFor="invoice-type">Tipo de Comprobante *</Label>
                                            <ContextualHelp text="NCF: Número de Comprobante Fiscal. El rango (Serie B o E) lo defines en Configuración. B01/E31 para empresas (RNC 9 dígitos), B02/E32 para consumidor final." mode="popover" />
                                        </div>
                                        <Select value={invoiceType} onValueChange={setInvoiceType}>
                                            <SelectTrigger id="invoice-type">
                                                <SelectValue placeholder="Selecciona el tipo de comprobante" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {useSerieE ? (
                                                    <>
                                                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/30">Serie E (electrónica)</div>
                                                        <SelectItem value="31">31 - Crédito Fiscal</SelectItem>
                                                        <SelectItem value="32">32 - Consumo</SelectItem>
                                                        <SelectItem value="33">33 - Nota de Débito</SelectItem>
                                                        <SelectItem value="34">34 - Nota de Crédito</SelectItem>
                                                        <SelectItem value="44">44 - Regímenes Especiales</SelectItem>
                                                        <SelectItem value="45">45 - Gubernamental</SelectItem>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/30">Serie B (tradicional)</div>
                                                        <SelectItem value="01">01 - Crédito Fiscal</SelectItem>
                                                        <SelectItem value="02">02 - Consumo</SelectItem>
                                                        <SelectItem value="04">04 - Nota de Crédito</SelectItem>
                                                        <SelectItem value="14">14 - Regímenes Especiales</SelectItem>
                                                        <SelectItem value="15">15 - Gubernamental</SelectItem>
                                                    </>
                                                )}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-xs text-muted-foreground">
                                            {useSerieE ? "💡 Tipo 31 incluye retención de ISR del 10%. Cambia a Serie B en Configuración si facturas sin e-CF." : "💡 Sin código QR. Activa Facturación Electrónica en Configuración para Serie E."}
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
                                    {/* Autofill inteligente + Selector rápido */}
                                    <div className="space-y-3">
                                        <Label className="text-muted-foreground">🔍 Buscar cliente (autofill inteligente)</Label>
                                        <ClientAutofillInput
                                            value={clientName}
                                            onChange={(v) => { setClientName(v); if (!v) { setLastInvoiceFromAutofill(null); setHabitualTipoPago(undefined); } }}
                                            onSelectClient={handleAutofillSelectClient}
                                            placeholder="Escribe nombre o RNC para buscar..."
                                            disabled={isClientLocked}
                                            className="w-full"
                                        />
                                        {savedClients.length > 0 && (
                                            <Select onValueChange={handleSelectClient}>
                                                <SelectTrigger className="h-8 text-sm">
                                                    <SelectValue placeholder="O seleccionar de mi lista..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {savedClients.map((c, i) => (
                                                        <SelectItem key={i} value={c.rnc}>{c.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    </div>

                                    {/* USAR LA MISMA + Repetir última factura */}
                                    {lastInvoiceFromAutofill?.items?.length && rnc && (
                                        <div className="p-4 rounded-lg border-2 border-accent/40 bg-accent/10 space-y-2">
                                            <p className="text-sm font-medium text-foreground">¿Deseas usar la misma configuración que la última factura?</p>
                                            <div className="flex flex-wrap gap-2 items-center">
                                                <Button type="button" size="sm" onClick={handleUseSameConfig} className="gap-1.5 bg-accent text-accent-foreground hover:bg-accent/90 font-semibold shadow-sm">
                                                    <Zap className="w-4 h-4" /> Repetir última factura
                                                </Button>
                                                <span className="text-xs text-muted-foreground">Clonar ítems, tipo de pago y NCF — &lt;10 seg</span>
                                            </div>
                                        </div>
                                    )}

                                    {isClientLocked && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] bg-success/20 text-success px-2 py-0.5 rounded-full font-bold">✨ Cliente seleccionado</span>
                                            <button type="button" onClick={() => { setIsClientLocked(false); setLastInvoiceFromAutofill(null); setHabitualTipoPago(undefined); }} className="text-xs text-muted-foreground hover:text-foreground underline">Cambiar</button>
                                        </div>
                                    )}

                                    <div className="grid gap-4 md:grid-cols-2">
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
                                        <div className="space-y-2">
                                            <Label htmlFor="client-phone">Teléfono / WhatsApp (Opcional)</Label>
                                            <Input
                                                id="client-phone"
                                                placeholder="Ej: 8095551234"
                                                value={clientPhone}
                                                onChange={(e) => setClientPhone(e.target.value)}
                                            />
                                        </div>
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
                                        Agrega los productos o servicios a facturar. Escribe en Descripción o elige de tu lista; usa el micrófono para dictar.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {/* Vista tabla (escritorio) */}
                                    <div className="hidden md:block overflow-x-auto">
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
                                                        <TableRow
                                                            data-item-row
                                                            className={isItemComplete(item) ? "border-l-4 border-l-green-500/80 bg-green-500/5" : ""}
                                                        >
                                                            {/* Descripción con autofill inteligente */}
                                                            <TableCell>
                                                                <div className="relative flex gap-1">
                                                                    <ServiceAutofillInput
                                                                        itemId={item.id}
                                                                        value={item.description}
                                                                        onChange={(v) => updateItem(item.id, "description", v)}
                                                                        onSelectService={handleAutofillSelectService(item.id)}
                                                                        placeholder="Ej: Consultoría, Reparación, Honorarios..."
                                                                        focusIfId={focusItemId}
                                                                        onFocused={() => setFocusItemId(null)}
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleVoiceDictation(item.id)}
                                                                        className="shrink-0 p-2 text-muted-foreground hover:text-accent transition-colors rounded"
                                                                        title="Dictado por voz"
                                                                    >
                                                                        <Mic className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                                {savedServices.length > 0 && (
                                                                    <div className="mt-1">
                                                                        <Select onValueChange={(val) => handleSelectService(item.id, val)}>
                                                                            <SelectTrigger id={`select-saved-service-${item.id}`} className="h-6 text-xs border-0 bg-transparent text-accent p-0 hover:underline shadow-none">
                                                                                <SelectValue placeholder="✨ O cargar de mi lista..." />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                {savedServices.map((s, i) => (
                                                                                    <SelectItem key={i} value={(s as any).name || (s as any).description || ""}>{(s as any).name || (s as any).description} - ${(s as any).price}</SelectItem>
                                                                                ))}
                                                                            </SelectContent>
                                                                        </Select>
                                                                    </div>
                                                                )}
                                                            </TableCell>

                                                            {/* Cantidad */}
                                                            <TableCell>
                                                                <Input
                                                                    data-item-field="quantity"
                                                                    type="number"
                                                                    min="1"
                                                                    value={item.quantity}
                                                                    onFocus={(e) => e.target.select()}
                                                                    onKeyDown={(e) => {
                                                                        handleNumericKeyDown(e, false);
                                                                        if (e.key === "Enter") {
                                                                            e.preventDefault();
                                                                            (e.target as HTMLInputElement).closest("tr")?.querySelector<HTMLInputElement>('[data-item-field="price"]')?.focus();
                                                                        }
                                                                    }}
                                                                    onChange={(e) =>
                                                                        updateItem(item.id, "quantity", e.target.value)
                                                                    }
                                                                />
                                                            </TableCell>

                                                            {/* Precio */}
                                                            <TableCell>
                                                                <Input
                                                                    data-item-field="price"
                                                                    type="number"
                                                                    min="0"
                                                                    step="0.01"
                                                                    placeholder="0.00"
                                                                    value={item.price}
                                                                    onFocus={(e) => e.target.select()}
                                                                    onKeyDown={(e) => {
                                                                        handleNumericKeyDown(e, true);
                                                                        if (e.key === "Enter") {
                                                                            e.preventDefault();
                                                                            const tr = (e.target as HTMLInputElement).closest("tr[data-item-row]");
                                                                            const tbody = tr?.closest("tbody");
                                                                            const itemRowsList = tbody ? Array.from(tbody.querySelectorAll("tr[data-item-row]")) : [];
                                                                            const idx = tr ? itemRowsList.indexOf(tr) : -1;
                                                                            const nextTr = idx >= 0 && idx < itemRowsList.length - 1 ? itemRowsList[idx + 1] : null;
                                                                            const nextQ = nextTr?.querySelector<HTMLInputElement>('[data-item-field="quantity"]');
                                                                            if (nextQ) nextQ.focus();
                                                                            else addItem();
                                                                        }
                                                                    }}
                                                                    onChange={(e) =>
                                                                        updateItem(item.id, "price", e.target.value)
                                                                    }
                                                                />
                                                            </TableCell>

                                                            {/* Subtotal del ítem */}
                                                            <TableCell className="font-semibold text-foreground">
                                                                {formatCurrency(Number(item.quantity) * Number(item.price))}
                                                            </TableCell>

                                                            {/* Acciones: completo, duplicar y eliminar */}
                                                            <TableCell className="space-x-1">
                                                                {isItemComplete(item) && (
                                                                    <span className="text-green-600 dark:text-green-400" title="Fila completa">
                                                                        <CheckCircle2 className="w-4 h-4 inline" aria-hidden />
                                                                    </span>
                                                                )}
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => duplicateItem(item.id)}
                                                                    className="text-muted-foreground hover:text-foreground"
                                                                    title="Duplicar ítem"
                                                                    aria-label="Duplicar ítem"
                                                                >
                                                                    <Copy className="w-4 h-4" />
                                                                </Button>
                                                                {items.length > 1 && (
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => removeItem(item.id)}
                                                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                                        title="Eliminar ítem"
                                                                        aria-label="Eliminar ítem"
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
                                                                            checked={item.isExempt || false}
                                                                            onChange={(e) => updateItem(item.id, "isExempt", e.target.checked)}
                                                                            className="rounded border-border/30 text-accent focus:ring-accent"
                                                                            aria-label="Gasto legal o suplido no gravable (ítem)"
                                                                            title="Exento ITBIS"
                                                                        />
                                                                        <span className="font-normal text-muted-foreground">
                                                                            Gasto Legal / Suplido (No Gravable)
                                                                        </span>
                                                                    </div>
                                                                </TableCell>
                                                            </TableRow>
                                                        )}
                                                    </Fragment>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>

                                    {/* Vista tarjetas (móvil) */}
                                    <div className="md:hidden space-y-4">
                                        {items.map((item) => (
                                            <div
                                                key={item.id}
                                                className={`rounded-xl border p-4 space-y-3 ${isItemComplete(item) ? "border-green-500/50 bg-green-500/5" : "border-border"}`}
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex-1 min-w-0">
                                                        <Label className="text-xs text-muted-foreground">Descripción</Label>
                                                        <div className="flex gap-1 mt-1">
                                                            <ServiceAutofillInput
                                                                itemId={item.id}
                                                                value={item.description}
                                                                onChange={(v) => updateItem(item.id, "description", v)}
                                                                onSelectService={handleAutofillSelectService(item.id)}
                                                                placeholder="Ej: Consultoría..."
                                                                focusIfId={focusItemId}
                                                                onFocused={() => setFocusItemId(null)}
                                                            />
                                                            <button type="button" onClick={() => handleVoiceDictation(item.id)} className="shrink-0 p-2 text-muted-foreground hover:text-accent rounded" title="Dictado"><Mic className="w-4 h-4" /></button>
                                                        </div>
                                                        {savedServices.length > 0 && (
                                                            <Select onValueChange={(val) => handleSelectService(item.id, val)}>
                                                                <SelectTrigger id={`select-saved-service-mob-${item.id}`} className="h-6 text-xs border-0 bg-transparent text-accent p-0 mt-1 shadow-none"><SelectValue placeholder="✨ Cargar de mi lista..." /></SelectTrigger>
                                                                <SelectContent>
                                                                    {savedServices.slice(0, 5).map((s, i) => (
                                                                        <SelectItem key={i} value={(s as any).name || (s as any).description || ""}>{(s as any).name || (s as any).description} - ${(s as any).price}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        )}
                                                    </div>
                                                    {isItemComplete(item) && <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />}
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <Label className="text-xs text-muted-foreground">Cantidad</Label>
                                                        <Input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(item.id, "quantity", e.target.value)} className="mt-1" />
                                                    </div>
                                                    <div>
                                                        <Label className="text-xs text-muted-foreground">Precio Unit.</Label>
                                                        <Input type="number" min="0" step="0.01" value={item.price} onChange={(e) => updateItem(item.id, "price", e.target.value)} className="mt-1" />
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between pt-2 border-t">
                                                    <span className="font-semibold text-foreground">{formatCurrency(Number(item.quantity) * Number(item.price))}</span>
                                                    <div className="flex gap-1">
                                                        <Button type="button" variant="ghost" size="sm" onClick={() => duplicateItem(item.id)} title="Duplicar"><Copy className="w-4 h-4" /></Button>
                                                        {items.length > 1 && (
                                                            <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(item.id)} className="text-destructive hover:bg-destructive/10"><span aria-hidden>✕</span></Button>
                                                        )}
                                                    </div>
                                                </div>
                                                {profession === "lawyer" && (
                                                    <div className="flex items-center gap-2 text-sm pt-1">
                                                        <input type="checkbox" checked={item.isExempt || false} onChange={(e) => updateItem(item.id, "isExempt", e.target.checked)} className="rounded border-border" aria-label="Gasto legal o suplido no gravable (ítem)" title="Exento ITBIS" />
                                                        <span className="text-muted-foreground">Gasto Legal / Suplido (No Gravable)</span>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Botones: agregar ítem y pegar desde Excel/lista */}
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={addItem}
                                            className="w-full sm:w-auto"
                                        >
                                            ➕ Agregar Ítem
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setShowPasteItemsDialog(true)}
                                            className="w-full sm:w-auto gap-1.5"
                                        >
                                            <ClipboardPaste className="w-4 h-4" />
                                            Pegar ítems
                                        </Button>
                                    </div>
                                    {savedServices.length > 0 && (
                                        <div className="mt-3">
                                            <p className="text-xs text-muted-foreground mb-2">Cargar de tu lista (un clic):</p>
                                            <div className="flex flex-wrap gap-2">
                                                {savedServices.slice(0, 5).map((s, i) => (
                                                    <Button
                                                        key={i}
                                                        type="button"
                                                        variant="secondary"
                                                        size="sm"
                                                        className="text-xs h-8"
                                                        onClick={() => {
                                                            const desc = (s as any).name || (s as any).description || "";
                                                            const price = (s as any).price ?? 0;
                                                            const newItem: InvoiceItem = { id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, description: desc, quantity: 1, price: price, isExempt: invoiceType === "44" };
                                                            setItems([...items, newItem]);
                                                            setFocusItemId(newItem.id);
                                                            toast.success(`"${desc}" agregado`);
                                                        }}
                                                    >
                                                        {(s as any).name || (s as any).description} — {formatCurrency(Number((s as any).price) || 0)}
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <p className="mt-2 text-xs text-muted-foreground">
                                        Pegar ítems: copia desde Excel o una lista (cada línea = un ítem; separa Descripción, Cantidad y Precio con tab o coma).
                                    </p>

                                    <Dialog open={showPasteItemsDialog} onOpenChange={setShowPasteItemsDialog}>
                                        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
                                            <DialogHeader>
                                                <DialogTitle>Pegar ítems desde Excel o lista</DialogTitle>
                                                <DialogDescription>
                                                    Pega aquí las líneas copiadas. Cada línea = un ítem. Separa Descripción, Cantidad y Precio con tabulador (Excel) o coma.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <textarea
                                                value={pasteItemsText}
                                                onChange={(e) => setPasteItemsText(e.target.value)}
                                                placeholder={"Consultoría\t1\t2500\nReparación\t2\t1500"}
                                                className="min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                aria-label="Texto a pegar"
                                            />
                                            <DialogFooter>
                                                <Button type="button" variant="outline" onClick={() => { setShowPasteItemsDialog(false); setPasteItemsText(""); }}>
                                                    Cancelar
                                                </Button>
                                                <Button type="button" onClick={handlePasteItems}>
                                                    Cargar ítems
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>

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

                            {/* Tipo de Pago */}
                            <Card className="border-l-4 border-l-blue-500/50">
                                <CardHeader>
                                    <CardTitle className="text-base">Tipo de Pago</CardTitle>
                                    <CardDescription>
                                        Registra cómo pagó el cliente para insights financieros en Lexis
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <PaymentTypeSelector
                                        tipoPago={tipoPago}
                                        onTipoPagoChange={(v) => {
                                            setTipoPago(v);
                                            if (v === "mixto" && pagoMixto.length === 0) setPagoMixto([{ tipo: "efectivo", monto: 0 }]);
                                        }}
                                        tipoPagoOtro={tipoPagoOtro}
                                        onTipoPagoOtroChange={setTipoPagoOtro}
                                        pagoMixto={pagoMixto}
                                        onPagoMixtoChange={setPagoMixto}
                                        total={total}
                                        habitualTipoPago={habitualTipoPago}
                                    />
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

            {/* Modo preventivo: alerta venta a crédito a cliente de riesgo */}
            <Dialog open={showCreditRiskConfirm} onOpenChange={(open) => {
                if (!open) {
                    setShowCreditRiskConfirm(false);
                    setCreditRiskData(null);
                    setPendingConfirmSave(false);
                }
            }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="w-5 h-5" /> Cliente con historial de pago irregular
                        </DialogTitle>
                        <DialogDescription>
                            {creditRiskData?.message || "Este cliente suele pagar con retraso. ¿Deseas continuar con la venta a crédito?"}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => { setShowCreditRiskConfirm(false); setCreditRiskData(null); setPendingConfirmSave(false); }}>
                            Cancelar
                        </Button>
                        <Button onClick={handleCreditRiskContinue}>
                            Sí, continuar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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
