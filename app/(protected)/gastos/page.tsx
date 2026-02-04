"use client";

import { useState, useEffect, useRef } from "react";
import {
    Plus,
    Search,
    Filter,
    Receipt,
    ScanLine,
    Trash2,
    Calendar,
    Building2,
    DollarSign,
    Loader2,
    FileText,
    TrendingUp,
    ShieldCheck,
    ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api-service";
import { DGIIQRParser } from "@/lib/qr-parser";
import { parseTirillaText, hasUsefulData } from "@/lib/tirilla-ocr-parser";
import { ContextualHelp } from "@/components/ui/contextual-help";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import jsQR from "jsqr";
import { ZoomIn, ZoomOut, Maximize2, Layers, Keyboard, Upload } from "lucide-react";
import styles from "./gastos.module.css";

const EXPENSE_CATEGORIES = [
    { id: "01", name: "Gastos de Personal" },
    { id: "02", name: "Gastos por Trabajos, Suministros y Servicios" },
    { id: "03", name: "Arrendamientos" },
    { id: "04", name: "Gastos de Activos Fijos" },
    { id: "05", name: "Gastos de Representación" },
    { id: "06", name: "Gastos Financieros" },
    { id: "07", name: "Gastos de Seguros" },
    { id: "08", name: "Gastos por Comisiones" },
    { id: "09", name: "Gastos por Honorarios y Gastos Legales" },
    { id: "10", name: "Gastos por Reparaciones y Mantenimiento" },
    { id: "11", name: "Gastos por Donaciones" },
];

export default function GastosPage() {
    const [expenses, setExpenses] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [isAddOpen, setIsAddOpen] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        supplierName: "",
        supplierRnc: "",
        ncf: "",
        amount: "",
        itbis: "",
        category: "02",
        date: new Date().toISOString().split('T')[0]
    });

    const [scannedImage, setScannedImage] = useState<string | null>(null);
    const [zoom, setZoom] = useState(1);
    const [extraPhotos, setExtraPhotos] = useState<string[]>([]);
    const [dataFromScan, setDataFromScan] = useState(false); // true cuando los datos vienen del escaneo (aviso de verificación)
    const invoiceImgRef = useRef<HTMLImageElement>(null);

    useEffect(() => {
        loadExpenses();
    }, []);

    useEffect(() => {
        if (invoiceImgRef.current) {
            invoiceImgRef.current.style.setProperty("--invoice-zoom", String(zoom));
        }
    }, [zoom]);

    const loadExpenses = async () => {
        setIsLoading(true);
        setLoadError(null);
        try {
            const data = await api.getExpenses();
            setExpenses(data);
        } catch (error) {
            setLoadError("No se pudieron cargar los gastos. Revisa tu conexión e intenta de nuevo.");
            toast.error("Error al cargar los gastos");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveExpense = async () => {
        if (!formData.supplierName || !formData.supplierRnc || !formData.ncf || !formData.amount) {
            toast.error("Por favor completa los campos requeridos");
            return;
        }

        setIsSaving(true);
        try {
            const payload = {
                ...formData,
                amount: parseFloat(formData.amount),
                itbis: parseFloat(formData.itbis) || 0,
            };
            await api.saveExpense(payload);
            toast.success("Gasto registrado correctamente");
            setIsAddOpen(false);
            resetForm();
            loadExpenses();
        } catch (error) {
            toast.error("Error al guardar el gasto. Revisa tu conexión e intenta de nuevo.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteExpense = async (id: string) => {
        if (!confirm("¿Estás seguro de eliminar este gasto?")) return;
        try {
            await api.deleteExpense(id);
            toast.success("Gasto eliminado");
            loadExpenses();
        } catch (error) {
            toast.error("Error al eliminar");
        }
    };

    const handleScan = async (e: React.ChangeEvent<HTMLInputElement>, dialogAlreadyOpen = false) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = "";

        setIsScanning(true);
        setScannedImage((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return URL.createObjectURL(file);
        });

        // 1. Try QR Scanning first
        try {
            const qrResult = await scanForQR(file);
            if (qrResult) {
                const parsed = DGIIQRParser.parseURL(qrResult);
                if (parsed) {
                    setFormData({
                        supplierName: "Detectado por QR",
                        supplierRnc: parsed.supplierRnc,
                        ncf: parsed.ncf,
                        amount: parsed.amount ?? "",
                        itbis: parsed.itbis ?? "",
                        category: "02",
                        date: parsed.date ? parsed.date.split("-").reverse().join("-") : new Date().toISOString().split("T")[0],
                    });
                    setDataFromScan(true);
                    if (!dialogAlreadyOpen) setIsAddOpen(true);
                    toast.success("Factura detectada por QR. Revisa los datos antes de guardar.");
                    setIsScanning(false);
                    return;
                }
            }
        } catch (err) {
            console.warn("QR no detectado, intentando leer texto de la tirilla...");
        }

        // 2. OCR con Tesseract (tirilla sin QR)
        toast.info("Leyendo texto del comprobante...");
        try {
            const { createWorker } = await import("tesseract.js");
            const worker = await createWorker("spa");
            const { data } = await worker.recognize(file);
            await worker.terminate();
            const rawText = data?.text?.trim() || "";

            if (rawText.length > 0) {
                const parsed = parseTirillaText(rawText);
                if (hasUsefulData(parsed)) {
                    setFormData({
                        supplierName: parsed.supplierName,
                        supplierRnc: parsed.supplierRnc,
                        ncf: parsed.ncf,
                        amount: parsed.amount.toString(),
                        itbis: parsed.itbis.toString(),
                        category: parsed.category,
                        date: parsed.date || new Date().toISOString().split("T")[0],
                    });
                    setDataFromScan(true);
                    if (!dialogAlreadyOpen) setIsAddOpen(true);
                    toast.success("Datos extraídos. Revisa y corrige si hay errores antes de guardar.");
                    setIsScanning(false);
                    return;
                }
            }
        } catch (ocrErr) {
            console.warn("OCR falló:", ocrErr);
        }

        // 3. No usar datos aleatorios: abrir formulario vacío para entrada manual
        toast.warning("No se pudo extraer datos del comprobante. Completa el formulario manualmente.");
        setDataFromScan(false);
        setFormData({
            supplierName: "",
            supplierRnc: "",
            ncf: "",
            amount: "",
            itbis: "",
            category: "02",
            date: new Date().toISOString().split("T")[0],
        });
        if (!dialogAlreadyOpen) setIsAddOpen(true);
        setIsScanning(false);
    };

    const scanForQR = (file: File): Promise<string | null> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement("canvas");
                    const context = canvas.getContext("2d");
                    if (!context) return resolve(null);

                    canvas.width = img.width;
                    canvas.height = img.height;
                    context.drawImage(img, 0, 0);

                    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                    const code = jsQR(imageData.data, imageData.width, imageData.height);

                    if (code) {
                        resolve(code.data);
                    } else {
                        resolve(null);
                    }
                };
                img.src = e.target?.result as string;
            };
            reader.readAsDataURL(file);
        });
    };

    const handleAddExtraPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setExtraPhotos(prev => [...prev, url]);
            toast.success("Foto adicional añadida");
        }
    };

    const resetForm = () => {
        setFormData({
            supplierName: "",
            supplierRnc: "",
            ncf: "",
            amount: "",
            itbis: "",
            category: "02",
            date: new Date().toISOString().split("T")[0],
        });
        setDataFromScan(false);
        if (scannedImage) {
            URL.revokeObjectURL(scannedImage);
            setScannedImage(null);
        }
        setExtraPhotos((prev) => {
            prev.forEach((url) => URL.revokeObjectURL(url));
            return [];
        });
        setZoom(1);
    };

    const openManualForm = () => {
        resetForm();
        setIsAddOpen(true);
    };

    const filteredExpenses = expenses.filter(exp =>
        exp.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exp.ncf.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exp.supplierRnc.includes(searchQuery)
    );

    const totalGastos = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    return (
        <div className="container mx-auto px-4 py-8 pb-32">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                <div>
                    <h1 className="text-4xl font-serif font-black tracking-tight flex items-center gap-3">
                        <Receipt className="w-10 h-10 text-accent" />
                        GASTOS <span className="text-muted-foreground/30 font-light">606</span>
                    </h1>
                    <p className="text-muted-foreground mt-2 max-w-md">
                        Gestiona tus compras y gastos. La IA te ayuda a registrar tus facturas en segundos para tu reporte 606.
                    </p>
                </div>

                <div className="flex flex-wrap gap-3 w-full md:w-auto">
                    <div className="relative overflow-hidden group w-full sm:w-auto">
                        <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={(e) => handleScan(e, false)}
                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                            disabled={isScanning}
                            aria-label="Subir imagen de factura o tirilla (QR o lectura de texto)"
                            title="Subir imagen de factura o tirilla"
                        />
                        <Button
                            variant="outline"
                            className="w-full border-accent/20 bg-accent/5 text-accent hover:bg-accent/10 h-12 px-6 font-bold flex items-center gap-2 group-hover:scale-[1.02] transition-all"
                            disabled={isScanning}
                        >
                            {isScanning ? <Loader2 className="w-5 h-5 animate-spin" /> : <ScanLine className="w-5 h-5" />}
                            Escaneo QR / Tirilla
                        </Button>
                        <p className="text-[10px] text-muted-foreground mt-1 px-1">Sube foto o PDF. Los datos extraídos son orientativos; revisa antes de guardar.</p>
                    </div>

                    <Dialog open={isAddOpen} onOpenChange={(open) => { setIsAddOpen(open); if (!open) resetForm(); }}>
                        <Button
                            variant="secondary"
                            className="w-full sm:w-auto h-12 px-6 font-bold flex items-center gap-2 border-2 border-dashed"
                            onClick={openManualForm}
                        >
                            <Keyboard className="w-5 h-5" />
                            Entrada manual (sin escanear)
                        </Button>
                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-background border-border/20 shadow-2xl">
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-serif">Registrar Gasto 606</DialogTitle>
                                <DialogDescription>
                                    Completa los datos del comprobante. Puedes subir una foto o PDF después (opcional) o escanear primero y corregir aquí.
                                </DialogDescription>
                            </DialogHeader>

                            {dataFromScan && (
                                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
                                    Los datos del escaneo son orientativos y pueden tener errores. Verifica suplidor, RNC, NCF, monto e ITBIS antes de guardar.
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">
                                {/* Vista previa / subir comprobante: en móvil abajo, en desktop izquierda */}
                                <div className="space-y-4 order-2 md:order-1">
                                    <div className="relative border rounded-xl overflow-hidden bg-slate-50 min-h-[200px] md:min-h-[400px] flex flex-col">
                                        <div className="flex items-center justify-between p-2 border-b bg-white">
                                            <span className="text-[10px] font-bold uppercase text-slate-400 px-2 tracking-widest">Comprobante (opcional)</span>
                                            {scannedImage && (
                                                <div className="flex gap-1">
                                                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setZoom((prev) => Math.max(0.5, prev - 0.25))}><ZoomOut className="w-4 h-4" /></Button>
                                                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setZoom((prev) => Math.min(3, prev + 0.25))}><ZoomIn className="w-4 h-4" /></Button>
                                                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setZoom(1)}><Maximize2 className="w-4 h-4" /></Button>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 overflow-auto p-4 flex items-start justify-center min-h-[160px]">
                                            {scannedImage ? (
                                                <img
                                                    ref={invoiceImgRef}
                                                    src={scannedImage}
                                                    alt="Comprobante"
                                                    className={cn(styles.invoicePreviewImg, "shadow-md rounded shadow-black/10 max-w-full")}
                                                />
                                            ) : (
                                                <label className="flex flex-col items-center justify-center w-full text-slate-400 gap-3 py-6 cursor-pointer" htmlFor="gastos-upload-comprobante">
                                                    <Upload className="w-10 h-10 opacity-50" />
                                                    <p className="text-xs font-medium">Subir comprobante o factura (opcional)</p>
                                                    <span className="inline-flex items-center gap-2 rounded-md border border-dashed px-4 py-2 text-sm font-medium hover:bg-muted/50">
                                                        {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                                        {isScanning ? "Leyendo…" : "Elegir archivo"}
                                                    </span>
                                                    <input
                                                        id="gastos-upload-comprobante"
                                                        type="file"
                                                        accept="image/*,application/pdf"
                                                        className="hidden"
                                                        disabled={isScanning}
                                                        onChange={(e) => handleScan(e, true)}
                                                        aria-label="Subir comprobante"
                                                    />
                                                </label>
                                            )}
                                        </div>

                                        {extraPhotos.length > 0 && (
                                            <div className="p-3 border-t bg-white flex gap-2 overflow-x-auto">
                                                {extraPhotos.map((img, idx) => (
                                                    <div key={idx} className="relative w-12 h-12 rounded border overflow-hidden flex-shrink-0 group cursor-pointer" onClick={() => setScannedImage(img)}>
                                                        <img src={img} alt={`Foto adicional ${idx + 1}`} className="w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                            <ScanLine className="w-4 h-4 text-white" />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {scannedImage && (
                                        <div className="relative">
                                            <input type="file" accept="image/*" onChange={handleAddExtraPhoto} className="absolute inset-0 opacity-0 cursor-pointer" aria-label="Añadir página o foto adicional" />
                                            <Button variant="outline" className="w-full border-dashed gap-2 h-10 text-xs">
                                                <Layers className="w-4 h-4" /> Añadir página/foto adicional
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                {/* Formulario: en móvil arriba para ver todas las opciones (Tipo de Gasto, Fecha, etc.) */}
                                <div className="space-y-4 order-1 md:order-2">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Suplidor / Comercio</label>
                                        <Input
                                            placeholder="Ej: Altice Dominicana"
                                            value={formData.supplierName}
                                            onChange={e => setFormData({ ...formData, supplierName: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">RNC Suplidor</label>
                                            <Input
                                                placeholder="RNC / Cédula"
                                                value={formData.supplierRnc}
                                                onChange={e => setFormData({ ...formData, supplierRnc: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">NCF</label>
                                            <Input
                                                placeholder="B01..."
                                                value={formData.ncf}
                                                onChange={e => setFormData({ ...formData, ncf: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Monto Base</label>
                                            <div className="relative">
                                                <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    type="number"
                                                    className="pl-9"
                                                    value={formData.amount}
                                                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">ITBIS (Opcional)</label>
                                            <Input
                                                type="number"
                                                value={formData.itbis}
                                                onChange={e => setFormData({ ...formData, itbis: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Tipo de Gasto (DGII)</label>
                                            <ContextualHelp text="Categoría del gasto para el reporte 606. Ej: 01 Personal, 02 Trabajos y servicios, 03 Arrendamientos. Debe coincidir con la clasificación de la DGII." mode="popover" />
                                        </div>
                                        <Select
                                            value={formData.category}
                                            onValueChange={val => setFormData({ ...formData, category: val })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecciona categoría" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {EXPENSE_CATEGORIES.map(cat => (
                                                    <SelectItem key={cat.id} value={cat.id}>{cat.id} - {cat.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Fecha de Factura</label>
                                        <Input
                                            type="date"
                                            value={formData.date}
                                            onChange={e => setFormData({ ...formData, date: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsAddOpen(false)} disabled={isSaving}>Cancelar</Button>
                                <Button onClick={handleSaveExpense} disabled={isSaving}>
                                    {isSaving ? "Guardando…" : "Guardar Gasto"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <Card className="bg-gradient-to-br from-accent/5 to-transparent border-accent/20">
                    <CardContent className="p-6">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Total del Periodo</p>
                        <h3 className="text-2xl font-black text-foreground">RD$ {totalGastos.toLocaleString()}</h3>
                        <div className="flex items-center gap-1 mt-2 text-xs text-accent">
                            <TrendingUp className="w-3 h-3" />
                            <span>Calculado en tiempo real</span>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-border/10 bg-card/50">
                    <CardContent className="p-6">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Gastos Registrados</p>
                        <h3 className="text-2xl font-black text-foreground">{filteredExpenses.length}</h3>
                        <p className="text-[10px] text-muted-foreground mt-2">Listos para el envío mensual</p>
                    </CardContent>
                </Card>
                <BonusCard title="Salud Fiscal" icon={ShieldCheck} text="88%" color="text-green-500" />
                <BonusCard title="Reporte 606" icon={FileText} text="Pendiente" color="text-amber-500" />
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por suplidor o NCF..."
                        className="pl-10 h-10 border-border/10 focus-visible:ring-accent/30"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
                <Button variant="outline" className="h-10 border-border/10 gap-2">
                    <Filter className="w-4 h-4" />
                    Filtros
                </Button>
            </div>

            {/* List Section */}
            <div className="space-y-3">
                {loadError && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                        <p className="text-sm text-destructive font-medium">{loadError}</p>
                        <Button variant="outline" size="sm" onClick={loadExpenses} className="shrink-0">Reintentar</Button>
                    </div>
                )}
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="w-10 h-10 text-accent animate-spin" />
                        <p className="text-sm font-medium text-muted-foreground capitalize tracking-widest">Cargando registros...</p>
                    </div>
                ) : filteredExpenses.length === 0 ? (
                    <Card className="border-dashed border-border/40 bg-transparent py-40">
                        <CardContent className="flex flex-col items-center justify-center text-center">
                            <div className="w-20 h-20 rounded-full bg-accent/5 flex items-center justify-center mb-6">
                                <Receipt className="w-10 h-10 text-accent/30" />
                            </div>
                            <h3 className="text-xl font-serif font-bold mb-2">No hay gastos registrados</h3>
                            <p className="text-muted-foreground max-w-xs">
                                Comienza subiendo una foto de tus facturas o regístralas manualmente para alimentar tu 606.
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    filteredExpenses.map((exp) => (
                        <ExpenseItem
                            key={exp._id}
                            expense={exp}
                            onDelete={() => handleDeleteExpense(exp._id)}
                        />
                    ))
                )}
            </div>

            <div className="mt-8 text-center text-[10px] text-muted-foreground/30 uppercase tracking-[0.3em]">
                Lexis Bill Smart Ledger &bull; Dominican Republic
            </div>
        </div>
    );
}

function ExpenseItem({ expense, onDelete }: { expense: any, onDelete: () => void }) {
    const categoryName = EXPENSE_CATEGORIES.find(c => c.id === expense.category)?.name || "Gasto";

    return (
        <Card className="group border-border/10 hover:border-accent/30 bg-card hover:shadow-xl hover:shadow-accent/5 transition-all duration-300">
            <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center group-hover:bg-accent/10 transition-colors">
                        <Building2 className="w-6 h-6 text-muted-foreground group-hover:text-accent" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h4 className="font-bold text-lg text-foreground leading-tight">{expense.supplierName}</h4>
                            <Badge variant="secondary" className="text-[10px] bg-secondary/50 font-normal">
                                {expense.category}
                            </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground font-medium">
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(expense.date).toLocaleDateString()}</span>
                            <span className="flex items-center gap-1 uppercase tracking-tighter font-mono">NCF: {expense.ncf}</span>
                            <span className="hidden sm:inline opacity-30 text-[8px]">•</span>
                            <span className="italic">{categoryName}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-6 pl-16 sm:pl-0 border-t sm:border-0 pt-4 sm:pt-0">
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">Monto Total</p>
                        <p className="text-xl font-black text-foreground">RD$ {expense.amount.toLocaleString()}</p>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors"
                        onClick={onDelete}
                    >
                        <Trash2 className="w-5 h-5" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

function BonusCard({ title, icon: Icon, text, color }: { title: string, icon: any, text: string, color: string }) {
    return (
        <Card className="bg-card/30 border-border/5">
            <CardContent className="p-6">
                <div className="flex justify-between items-center mb-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{title}</p>
                    <Icon className={cn("w-4 h-4", color)} />
                </div>
                <h3 className="text-lg font-black">{text}</h3>
            </CardContent>
        </Card>
    );
}
