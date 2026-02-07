"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { Save, Upload, Settings, Pencil, Lock } from "lucide-react";
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
    });

    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [sealPreview, setSealPreview] = useState<string | null>(null);
    const [configLocked, setConfigLocked] = useState(true);

    useEffect(() => {
        const stored = localStorage.getItem("appConfig");
        const lockedStored = typeof window !== "undefined" ? localStorage.getItem("configLocked") : null;
        if (lockedStored !== "false") setConfigLocked(true);
        if (stored) {
            try {
                const data = JSON.parse(stored);
                setConfig(prev => ({ ...prev, ...data }));
                if (data.logo) setLogoPreview(data.logo);
                if (data.seal) setSealPreview(data.seal);
            } catch {}
        }
        if (profession) {
            setConfig(prev => ({ ...prev, profession }));
        }
    }, [profession]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setConfig({ ...config, [e.target.id]: e.target.value });
    };

    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setConfig({ ...config, profession: e.target.value });
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'seal') => {
        if (configLocked) return;
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                if (type === 'logo') setLogoPreview(result);
                else setSealPreview(result);
            };
            reader.readAsDataURL(file);
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
                digitalSeal: sealPreview
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

    return (
        <div className="container mx-auto px-4 py-6 md:py-8 pb-28 md:pb-12 max-w-5xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-primary mb-2">Mi Oficina Fiscal</h1>
                <p className="text-gray-500">Personalice la apariencia de sus documentos y datos fiscales.</p>
            </div>

            {configLocked && (
                <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Lock className="w-5 h-5 text-amber-600 shrink-0" />
                        <p className="text-amber-900 font-medium">La configuración está bloqueada. Pulse <strong>Modificar</strong> para editar.</p>
                    </div>
                    <Button type="button" variant="outline" className="border-amber-300 text-amber-800 hover:bg-amber-100 gap-2" onClick={() => { setConfigLocked(false); localStorage.setItem("configLocked", "false"); }}>
                        <Pencil className="w-4 h-4" /> Modificar
                    </Button>
                </div>
            )}

            <div className="grid gap-8">
                {/* Identidad Visual Section */}
                <Card className="border-none shadow-lg bg-white/50 backdrop-blur-sm overflow-hidden">
                    <CardHeader>
                        <CardTitle className="text-xl">Identidad Visual</CardTitle>
                        <CardDescription>Estos elementos aparecerán en el encabezado de sus facturas.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Logo Upload */}
                            <div className="space-y-3">
                                <Label className="text-slate-600">Logo de Empresa</Label>
                                <div className={`border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-center transition-colors relative min-h-[160px] ${configLocked ? "opacity-70 cursor-not-allowed bg-slate-50" : "hover:bg-slate-50 cursor-pointer"}`}>
                                    <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleImageUpload(e, 'logo')} aria-label="Subir logo de empresa" title="Subir logo" disabled={configLocked} />
                                    {logoPreview ? (
                                        <div className="relative w-full h-32">
                                            <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
                                            <Button variant="ghost" size="sm" className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-white shadow-md border" onClick={(e) => { e.stopPropagation(); setLogoPreview(null) }}>✕</Button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-3">
                                                <Upload className="w-6 h-6" />
                                            </div>
                                            <h3 className="font-medium text-slate-900">Subir Logo</h3>
                                            <p className="text-xs text-slate-500 mt-1">PNG, JPG (Recomendado 400x150px)</p>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Seal Upload */}
                            <div className="space-y-3">
                                <Label className="text-slate-600">Sello Digital / Firma</Label>
                                <div className={`border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-center transition-colors relative min-h-[160px] ${configLocked ? "opacity-70 cursor-not-allowed bg-slate-50" : "hover:bg-slate-50 cursor-pointer"}`}>
                                    <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleImageUpload(e, 'seal')} aria-label="Subir sello digital o firma" title="Subir sello" disabled={configLocked} />
                                    {sealPreview ? (
                                        <div className="relative w-full h-32">
                                            <img src={sealPreview} alt="Sello" className="w-full h-full object-contain" />
                                            <Button variant="ghost" size="sm" className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-white shadow-md border" onClick={(e) => { e.stopPropagation(); setSealPreview(null) }}>✕</Button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 mb-3">
                                                <Upload className="w-6 h-6" />
                                            </div>
                                            <h3 className="font-medium text-slate-900">Subir Sello</h3>
                                            <p className="text-xs text-slate-500 mt-1">Sello o firma escaneada (Transparente)</p>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* NCF Configuration Section */}
                <ComprobantesConfig />

                {/* Preferencias de Facturación */}
                <Card className="border-none shadow-lg bg-indigo-50/50 backdrop-blur-sm border-indigo-100 italic">
                    <CardHeader>
                        <CardTitle className="text-xl text-indigo-900 flex items-center gap-2">
                            <Settings className="w-5 h-5" /> Preferencias de Facturación
                        </CardTitle>
                        <CardDescription>Configure cómo Lexis Bill automatiza sus comprobantes.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-indigo-100 shadow-sm">
                            <div className="space-y-0.5">
                                <Label className="text-base font-bold text-slate-800">Facturación Electrónica Activa</Label>
                                <p className="text-sm text-slate-500">Lexis Bill sugerirá Serie E (E31, E32...) en lugar de Serie B.</p>
                            </div>
                            <div
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${configLocked ? "cursor-not-allowed opacity-70" : "cursor-pointer"} ${config.hasElectronicBilling ? 'bg-indigo-600' : 'bg-slate-200'}`}
                                onClick={() => !configLocked && setConfig({ ...config, hasElectronicBilling: !config.hasElectronicBilling })}
                                title="Activar o desactivar facturación electrónica"
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out ${config.hasElectronicBilling ? 'translate-x-6' : 'translate-x-1'}`} />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Fiscal & Contact Info Section */}
                <Card className="border-none shadow-lg bg-white/50 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-xl">Datos Fiscales y de Contacto</CardTitle>
                        <CardDescription>Información legal que aparecerá en sus comprobantes.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="companyName">Nombre Comercial / Profesional</Label>
                            <Input id="companyName" value={config.companyName} onChange={handleChange} placeholder="Ej: Dr. Juan Pérez" className="bg-white" disabled={configLocked} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="rnc">RNC / Cédula</Label>
                            <Input id="rnc" value={config.rnc} onChange={handleChange} placeholder="Ej: 131-XXXXX-X" className="bg-white" disabled={configLocked} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="exequatur">Exequátur / Colegiatura (Opcional)</Label>
                            <Input id="exequatur" value={config.exequatur} onChange={handleChange} placeholder="Ej: 1234-56" className="bg-white" disabled={configLocked} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Teléfono / WhatsApp</Label>
                            <Input id="phone" value={config.phone} onChange={handleChange} placeholder="Ej: 809-555-0000" className="bg-white" disabled={configLocked} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="profession">Especialidad / Sector</Label>
                            <select
                                id="profession"
                                value={config.profession}
                                onChange={handleSelectChange}
                                title="Especialidad o sector profesional"
                                aria-label="Especialidad o sector profesional"
                                className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                                <Input id="bankAccount" value={config.bankAccount} onChange={handleChange} placeholder="Ej: 771234567" className="bg-white border-blue-100" />
                            </div>
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="email">Correo Electrónico (Visible en Factura)</Label>
                            <Input id="email" value={config.email} onChange={handleChange} placeholder="contacto@sudominio.com" className="bg-white" disabled={configLocked} />
                        </div>
                    </CardContent>
                </Card>

                {/* Save Button Container */}
                <div className="flex justify-end pt-4 pb-12">
                    <Button size="lg" onClick={handleSave} disabled={configLocked} className="bg-[#D4AF37] hover:bg-amber-600 text-white gap-2 px-8 h-12 rounded-xl shadow-lg transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100">
                        <Save className="w-5 h-5" /> Guardar Cambios
                    </Button>
                </div>
            </div>

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
