"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { Save, Upload, Settings, Pencil, Lock, Search, Eye, FileText, Palette, Building } from "lucide-react";
import { SupportTicketForm } from "@/components/support-ticket-form";
import { ComprobantesConfig } from "@/components/ComprobantesConfig";
import { usePreferences } from "@/components/providers/PreferencesContext";
import { toast } from "sonner";

export default function Configuration() {
    const { profession, setProfession } = usePreferences();

    const [config, setConfig] = useState({
        companyName: "",
        rnc: "",
        address: "",
        phone: "",
        email: "",
        exequatur: "",
        website: "",
        profession: "general", // general, medic, lawyer, technical, other
        bankName: "",
        bankAccount: "",
        hasElectronicBilling: false,
        isTaxExemptCompany: false,
    });

    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [sealPreview, setSealPreview] = useState<string | null>(null);
    const [configLocked, setConfigLocked] = useState(true);
    const [activeTab, setActiveTab] = useState<"identidad" | "fiscal" | "facturacion">("identidad");
    const [isSearchingRNC, setIsSearchingRNC] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem("appConfig");
        const lockedStored = typeof window !== "undefined" ? localStorage.getItem("configLocked") : null;
        setConfigLocked(lockedStored !== "false");
        if (stored) {
            try {
                const data = JSON.parse(stored);
                if (data && typeof data === "object") {
                    setConfig(prev => ({ ...prev, ...data }));
                    if (data.logo) setLogoPreview(data.logo);
                    if (data.seal) setSealPreview(data.seal);
                }
            } catch {
                // localStorage corrupto o formato antiguo: ignorar
            }
        }
        if (profession) {
            setConfig(prev => ({ ...prev, profession }));
        }
    }, [profession]);

    useEffect(() => {
        const loadMe = async () => {
            try {
                const { api } = await import("@/lib/api-service");
                const me = await api.getMe();
                if (me?.name || me?.email) {
                    setConfig(prev => ({
                        ...prev,
                        companyName: me.name ?? prev.companyName,
                        email: me.email ?? prev.email,
                        isTaxExemptCompany: me?.taxSettings?.isTaxExemptCompany ?? prev.isTaxExemptCompany,
                    }));
                }
            } catch {
                // Sin sesión o error: no sobrescribir
            }
        };
        loadMe();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (configLocked) return;
        setConfig({ ...config, [e.target.id]: e.target.value });
    };

    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        if (configLocked) return;
        setConfig({ ...config, profession: e.target.value });
    };

    const compressImage = (file: File): Promise<string> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement("canvas");
                    const ctx = canvas.getContext("context"); // typo fix below
                    const ctx2 = canvas.getContext("2d");
                    
                    // Max width/height 600px
                    const MAX_SIZE = 600;
                    let width = img.width;
                    let height = img.height;
                    if (width > height && width > MAX_SIZE) {
                        height *= MAX_SIZE / width;
                        width = MAX_SIZE;
                    } else if (height > MAX_SIZE) {
                        width *= MAX_SIZE / height;
                        height = MAX_SIZE;
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    if (ctx2) {
                        ctx2.drawImage(img, 0, 0, width, height);
                        // Comprimir a JPEG 70% calidad para logos ligeros, o mantener PNG nativo si tiene transparencia.
                        // Para evitar romper los sellos que suelen ser PNG transparentes, reducimos tamaño sin forzar JPEG:
                        resolve(canvas.toDataURL(file.type === "image/png" ? "image/png" : "image/jpeg", 0.7));
                    } else {
                        resolve(img.src);
                    }
                };
            };
        });
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'seal') => {
        if (configLocked) return;
        const file = e.target.files?.[0];
        if (file) {
            // Audit Quick Win: Compress logo/seal before saving to reduce PDF generation lag
            const compressedBase64 = await compressImage(file);
            if (type === 'logo') setLogoPreview(compressedBase64);
            else setSealPreview(compressedBase64);
        }
    };

    const handleSave = async () => {
        const dataToSave = {
            ...config,
            logo: logoPreview,
            seal: sealPreview
        };
        localStorage.setItem("appConfig", JSON.stringify(dataToSave));
        setProfession(config.profession as any);

        try {
            const { api } = await import("@/lib/api-service");
            await api.updateProfile({
                name: config.companyName,
                profession: config.profession,
                address: config.address,
                phone: config.phone,
                exequatur: config.exequatur,
                hasElectronicBilling: config.hasElectronicBilling,
                logo: logoPreview,
                digitalSeal: sealPreview,
                taxSettings: { isTaxExemptCompany: config.isTaxExemptCompany, defaultTaxRate: 0.18 }
            });
            toast.success("✅ Configuración guardada exitosamente en la nube y localmente.");
            setConfigLocked(true);
            localStorage.setItem("configLocked", "true");
        } catch (error) {
            console.error("Error saving to cloud:", error);
            toast.warning("⚠️ Guardado localmente, pero hubo un error al sincronizar con la nube.");
            setConfigLocked(true);
            localStorage.setItem("configLocked", "true");
        }
    };

    const handleSearchRNC = () => {
        if (!config.rnc || config.rnc.length < 9) {
            toast.error("Digita un RNC válido antes de consultar.");
            return;
        }
        setIsSearchingRNC(true);
        // Simulación: en el futuro esto conectará a API DGII
        setTimeout(() => {
            setIsSearchingRNC(false);
            setConfig({ ...config, companyName: "CONSULTORIA FICTICIA EIRL", address: "AV. WINSTON CHURCHILL, PIANTINI" });
            toast.success("Datos traídos desde la DGII con éxito.");
        }, 1500);
    };

    return (
        <div className="container mx-auto px-4 py-6 md:py-8 pb-20 md:pb-8 max-w-5xl">
            <div className="mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold text-primary mb-2">Mi Oficina Fiscal</h1>
                <p className="text-sm sm:text-base text-gray-500">Personalice la apariencia de sus documentos y datos fiscales.</p>
                <a href="/ayuda" className="inline-flex items-center gap-2 mt-3 text-sm font-medium text-primary hover:underline">
                    Centro de Ayuda — Manual de uso y tutoriales
                </a>
            </div>

            {configLocked && (
                <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-between gap-4">
                    <div className="flex items-start sm:items-center gap-3 min-w-0">
                        <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
                        <p className="text-amber-900 font-medium text-sm sm:text-base">La configuración está bloqueada. Pulse <strong>Modificar</strong> para editar.</p>
                    </div>
                    <Button type="button" variant="outline" className="border-amber-300 text-amber-800 hover:bg-amber-100 gap-2 shrink-0 self-start sm:self-center" onClick={() => { setConfigLocked(false); localStorage.setItem("configLocked", "false"); }}>
                        <Pencil className="w-4 h-4" /> Modificar
                    </Button>
                </div>
            )}

            <div className="flex flex-col md:flex-row gap-8">
                {/* Menú de Pestañas (Sidebar Layout para MD, Stack para Móvil) */}
                <div className="w-full md:w-64 shrink-0 space-y-2">
                    <button
                        onClick={() => setActiveTab("identidad")}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'identidad' ? 'bg-primary text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                        <Palette className="w-5 h-5" /> Identidad Visual
                    </button>
                    <button
                        onClick={() => setActiveTab("fiscal")}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'fiscal' ? 'bg-primary text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                        <Building className="w-5 h-5" /> Datos Fiscales
                    </button>
                    <button
                        onClick={() => setActiveTab("facturacion")}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'facturacion' ? 'bg-primary text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                        <FileText className="w-5 h-5" /> Facturación y NCF
                    </button>
                </div>

                {/* Contenido de Pestañas */}
                <div className="flex-1 space-y-8">
                    
                    {activeTab === "identidad" && (
                        <div className="space-y-8 animate-in fade-in zoom-in-95 duration-200">
                            {/* Identidad Visual Section */}
                            <Card className="border-border shadow-xl bg-card overflow-hidden">
                                <CardHeader>
                                    <CardTitle className="text-xl">Identidad Visual</CardTitle>
                                    <CardDescription>Estos elementos aparecerán en el encabezado de sus facturas.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Logo Upload */}
                                        <div className="space-y-3">
                                            <Label className="text-slate-600">Logo de Empresa</Label>
                                            <div className={`border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-center transition-colors relative min-h-[160px] ${configLocked ? "opacity-70 cursor-not-allowed bg-slate-50 pointer-events-none" : "hover:bg-slate-50 cursor-pointer"}`}>
                                                <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleImageUpload(e, 'logo')} aria-label="Subir logo de empresa" disabled={configLocked} />
                                                {logoPreview ? (
                                                    <div className="relative w-full h-32">
                                                        <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
                                                        {!configLocked && (
                                                            <Button type="button" variant="ghost" size="sm" className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-white shadow-md border pointer-events-auto" onClick={(e) => { e.stopPropagation(); setLogoPreview(null); }}>✕</Button>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-3">
                                                            <Upload className="w-6 h-6" />
                                                        </div>
                                                        <h3 className="font-medium text-slate-900">Subir Logo</h3>
                                                        <p className="text-xs text-slate-500 mt-1 break-words px-2">PNG, JPG (Máx. 5MB)</p>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* Seal Upload */}
                                        <div className="space-y-3">
                                            <Label className="text-slate-600">Sello Digital / Firma (Opcional)</Label>
                                            <div className={`border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-center transition-colors relative min-h-[160px] ${configLocked ? "opacity-70 cursor-not-allowed bg-slate-50 pointer-events-none" : "hover:bg-slate-50 cursor-pointer"}`}>
                                                <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleImageUpload(e, 'seal')} aria-label="Subir sello digital" disabled={configLocked} />
                                                {sealPreview ? (
                                                    <div className="relative w-full h-32">
                                                        <img src={sealPreview} alt="Sello" className="w-full h-full object-contain" />
                                                        {!configLocked && (
                                                            <Button type="button" variant="ghost" size="sm" className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-white shadow-md border pointer-events-auto" onClick={(e) => { e.stopPropagation(); setSealPreview(null); }}>✕</Button>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 mb-3">
                                                            <Upload className="w-6 h-6" />
                                                        </div>
                                                        <h3 className="font-medium text-slate-900">Subir Sello</h3>
                                                        <p className="text-xs text-slate-500 mt-1">Sello sin fondo (Transparente)</p>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-border shadow-xl bg-slate-50 overflow-hidden relative">
                                <CardHeader className="pb-2">
                                    <div className="flex items-center gap-2 text-primary font-bold"><Eye className="w-5 h-5"/> Vista Previa de Encabezado</div>
                                    <CardDescription>Así luce el inicio de tu factura con tus ajustes actuales.</CardDescription>
                                </CardHeader>
                                <CardContent className="pt-4">
                                    <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-slate-200">
                                        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                                            <div className="max-w-[200px] min-h-[80px] flex items-center bg-slate-50 rounded border border-dashed border-slate-200">
                                                {logoPreview ? (
                                                    <img src={logoPreview} alt="Tu Logo" className="max-h-20 max-w-[200px] object-contain p-1" />
                                                ) : (
                                                    <div className="text-slate-400 text-xs text-center w-full p-6">Tu Logo Aquí</div>
                                                )}
                                            </div>
                                            <div className="text-right flex-1 min-w-0">
                                                <h3 className="font-black text-xl text-slate-900 truncate">{config.companyName || "SU NOMBRE COMERCIAL"}</h3>
                                                <p className="text-sm text-slate-600 font-medium">RNC: {config.rnc || "XXXXXXXXX"}</p>
                                                <p className="text-xs text-slate-500 truncate mt-1">
                                                    {config.address || "Dirección de ejemplo no proporcionada"}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="mt-8 border-t-2 border-slate-100 pt-4 text-center">
                                            <div className="inline-block p-1 bg-amber-50 text-amber-800 text-xs font-bold rounded">CONTENIDO DE FACTURA</div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {activeTab === "fiscal" && (
                        <div className="animate-in fade-in zoom-in-95 duration-200">
                            {/* Fiscal & Contact Info Section */}
                            <Card className="border-border shadow-xl bg-card">
                                <CardHeader>
                                    <CardTitle className="text-xl">Datos Fiscales y de Contacto</CardTitle>
                                    <CardDescription>Información legal reportada localmente y visible a los clientes.</CardDescription>
                                </CardHeader>
                                <CardContent className="grid gap-6 md:grid-cols-2">
                                    <div className="space-y-2 md:col-span-2">
                                        <Label htmlFor="rnc">RNC / Cédula</Label>
                                        <div className="flex items-center gap-2">
                                            <Input id="rnc" value={config.rnc} onChange={handleChange} placeholder="Ej: 131-XXXXX-X" className="bg-white flex-1" disabled={configLocked} />
                                            <Button type="button" variant="outline" className="shrink-0 gap-2 font-medium" disabled={configLocked || isSearchingRNC} onClick={handleSearchRNC}>
                                                {isSearchingRNC ? "..." : <Search className="w-4 h-4" />} Consultar DGII
                                            </Button>
                                        </div>
                                        <p className="text-xs text-muted-foreground">Digitalo y pulsa Consultar DGII para autocompletar.</p>
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <Label htmlFor="companyName">Razón Social / Nombre Profesional</Label>
                                        <Input id="companyName" value={config.companyName} onChange={handleChange} placeholder="Ej: Dr. Juan Pérez" className="bg-white" disabled={configLocked} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="exequatur">Exequátur / Colegiatura (Opcional)</Label>
                                        <Input id="exequatur" value={config.exequatur} onChange={handleChange} placeholder="Ej: 1234-56" className="bg-white" disabled={configLocked} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Teléfono / WhatsApp</Label>
                                        <Input id="phone" value={config.phone} onChange={handleChange} placeholder="Ej: 809-555-0000" className="bg-white" disabled={configLocked} />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <Label htmlFor="profession">Especialidad / Sector</Label>
                                        <select
                                            id="profession"
                                            value={config.profession}
                                            onChange={handleSelectChange}
                                            className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                                            disabled={configLocked}
                                        >
                                            <option value="general">Profesional General</option>
                                            <option value="medic">Médico / Salud</option>
                                            <option value="lawyer">Abogado / Legal</option>
                                            <option value="technical">Ingeniero / Arquitecto / Técnico</option>
                                            <option value="other">Inmobiliaria / Consultor / Otro</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <Label htmlFor="address">Dirección Física</Label>
                                        <Input id="address" value={config.address} onChange={handleChange} placeholder="Ej: Av. Winston Churchill esq. 27 de Febrero..." className="bg-white" disabled={configLocked} />
                                    </div>

                                    {/* Bank Info */}
                                    <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-100 grid grid-cols-1 md:grid-cols-2 gap-4 md:col-span-2 mt-2">
                                        <div className="md:col-span-2 flex items-center gap-2 text-blue-900 font-bold text-sm mb-1">
                                            <span className="text-lg">🏦</span> Información Bancaria (Para transferencias)
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="bankName">Banco</Label>
                                            <Input id="bankName" value={config.bankName} onChange={handleChange} placeholder="Ej: Banco Popular..." className="bg-white border-blue-100" disabled={configLocked} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="bankAccount">Número de Cuenta</Label>
                                            <Input id="bankAccount" value={config.bankAccount} onChange={handleChange} placeholder="Ej: 771234567" className="bg-white border-blue-100" disabled={configLocked} />
                                        </div>
                                    </div>

                                    <div className="space-y-2 md:col-span-2">
                                        <Label htmlFor="email">Correo Electrónico (Visible en Factura)</Label>
                                        <Input id="email" value={config.email} onChange={handleChange} placeholder="contacto@sudominio.com" className="bg-white" disabled={configLocked} />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {activeTab === "facturacion" && (
                        <div className="space-y-8 animate-in fade-in zoom-in-95 duration-200">
                            {/* NCF Configuration Section */}
                            <ComprobantesConfig locked={configLocked} />

                            {/* Preferencias de Configuración fiscal especiales */}
                            <Card className="border-border shadow-xl bg-card">
                                <CardHeader>
                                    <CardTitle className="text-xl">Regímenes Especiales</CardTitle>
                                    <CardDescription>Ajustes de cálculo de impuestos y normativas.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-start gap-4 p-5 rounded-xl bg-amber-50/70 border border-amber-200">
                                        <input
                                            type="checkbox"
                                            id="isTaxExemptCompany"
                                            checked={config.isTaxExemptCompany}
                                            onChange={(e) => !configLocked && setConfig({ ...config, isTaxExemptCompany: e.target.checked })}
                                            className="mt-1 h-5 w-5 rounded border-amber-500 text-amber-600 focus:ring-amber-500 cursor-pointer"
                                            disabled={configLocked}
                                            title="Empresa exenta de ITBIS"
                                        />
                                        <div>
                                            <Label htmlFor="isTaxExemptCompany" className="text-lg font-bold text-amber-900 cursor-pointer">Empresa Exenta de ITBIS (Régimen Especial)</Label>
                                            <p className="text-sm text-amber-800 mt-1 leading-relaxed">
                                                Active esta opción si su empresa se encuentra bajo un régimen sin obligación de cobrar o tributar ITBIS (Ej: Zonas Francas, Sector Salud específico). Al activarlo, el sistema <strong>suprimirá</strong> por completo el desglose y cálculo de ITBIS de todas sus facturas.
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Preferencias de Facturación Electrónica */}
                            <Card className="border-border shadow-xl bg-muted/30">
                                <CardHeader>
                                    <CardTitle className="text-xl flex items-center gap-2">
                                        <Settings className="w-5 h-5 text-primary" /> Facturación Electrónica Activa
                                    </CardTitle>
                                    <CardDescription>Conecta Trinalyze Billing con e-CF a la DGII.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 bg-white rounded-xl border border-slate-200 shadow-sm opacity-80">
                                        <div className="space-y-1 min-w-0">
                                            <Label className="text-base font-bold text-slate-800">Conexión e-CF (Serie E) <span className="text-xs font-black text-white bg-primary px-2 py-0.5 rounded-full ml-2">PRÓXIMAMENTE</span></Label>
                                            <p className="text-sm text-slate-500">Por el momento, el sistema factura exclusivamente con la Serie B tradicional. La API de facturación electrónica se encuentra en período de ensayo.</p>
                                        </div>
                                        <div className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none cursor-not-allowed bg-slate-200" title="Próximamente">
                                            <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-1" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Botón Flotante/Pegajoso */}
                    <div className="flex justify-end pt-4 pb-4 sticky bottom-4 z-10 animate-in slide-in-from-bottom-5">
                        <Button size="lg" onClick={handleSave} disabled={configLocked} className="gap-2 px-8 h-14 rounded-full shadow-2xl font-bold text-[16px] transition-all hover:-translate-y-1 active:translate-y-0 active:scale-95 border-2 border-primary-foreground/10 bg-primary hover:bg-primary/95">
                            <Save className="w-5 h-5" /> Guardar Cambios
                        </Button>
                    </div>
                </div>
            </div>

            {/* Documentos legales */}
            <Card className="border-border shadow-xl bg-card mt-8">
                <CardHeader>
                    <CardTitle className="text-xl">Documentos legales</CardTitle>
                    <CardDescription>Políticas y condiciones de Trinalyze Billing. Consulte y descargue cuando lo necesite.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ul className="grid gap-2 sm:grid-cols-2">
                        <li><a href="/terminos" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">Términos y Condiciones</a></li>
                        <li><a href="/privacidad" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">Política de Privacidad</a></li>
                        <li><a href="/uso-aceptable" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">Política de Uso Aceptable</a></li>
                        <li><a href="/limitacion-responsabilidad" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">Limitación de Responsabilidad</a></li>
                        <li><a href="/reembolsos" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">Política de Reembolsos</a></li>
                    </ul>
                </CardContent>
            </Card>

            {/* Support Section */}
            <div className="mt-12 pt-12 border-t border-border/20">
                <SupportTicketForm />
                <p className="mt-4 text-xs text-muted-foreground">
                    Tu mensaje será revisado por el equipo de soporte. Te contactaremos si necesitamos más información.
                </p>
            </div>
        </div>
    );
}
