"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { Save, Upload, Settings } from "lucide-react";
import { SupportTicketForm } from "@/components/support-ticket-form";
import { ComprobantesConfig } from "@/components/ComprobantesConfig";

export default function Configuration() {
    const [config, setConfig] = useState({
        companyName: "",
        rnc: "",
        address: "",
        phone: "",
        email: "",
        exequatur: "",
        website: "",
    });

    // Mock state for logos (in real app, use File List)
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [sealPreview, setSealPreview] = useState<string | null>(null);

    useEffect(() => {
        const stored = localStorage.getItem("appConfig");
        if (stored) {
            const data = JSON.parse(stored);
            setConfig(data);
            if (data.logo) setLogoPreview(data.logo);
            if (data.seal) setSealPreview(data.seal);
        } else {
            // Load from default config sim
            const user = localStorage.getItem("user");
            if (user) {
                const u = JSON.parse(user);
                // Pre-fill if useful
            }
        }
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setConfig({ ...config, [e.target.id]: e.target.value });
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'seal') => {
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

    const handleSave = () => {
        const dataToSave = {
            ...config,
            logo: logoPreview,
            seal: sealPreview
        };
        localStorage.setItem("appConfig", JSON.stringify(dataToSave));
        alert("✅ Configuración guardada exitosamente. Sus facturas se actualizarán.");
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <h1 className="text-3xl font-bold text-primary mb-2">Mi Oficina Fiscal</h1>
            <p className="text-gray-500 mb-8">Personalice la apariencia de sus documentos y datos fiscales.</p>

            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Identidad Visual</CardTitle>
                        <CardDescription>Estos elementos aparecerán en el encabezado de sus facturas.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Logo Upload */}
                            <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors cursor-pointer relative">
                                <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleImageUpload(e, 'logo')} />
                                {logoPreview ? (
                                    <div className="relative w-full h-32 mb-2">
                                        <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
                                        <Button variant="ghost" size="sm" className="absolute top-0 right-0 bg-white/80" onClick={(e) => { e.stopPropagation(); setLogoPreview(null) }}>✕</Button>
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

                            {/* Digital Seal Upload */}
                            <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors cursor-pointer relative">
                                <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleImageUpload(e, 'seal')} />
                                {sealPreview ? (
                                    <div className="relative w-full h-32 mb-2">
                                        <img src={sealPreview} alt="Sello" className="w-full h-full object-contain" />
                                        <Button variant="ghost" size="sm" className="absolute top-0 right-0 bg-white/80" onClick={(e) => { e.stopPropagation(); setSealPreview(null) }}>✕</Button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 mb-3">
                                            <Upload className="w-6 h-6" />
                                        </div>
                                        <h3 className="font-medium text-slate-900">Subir Sello Digital</h3>
                                        <p className="text-xs text-slate-500 mt-1">Firma escaneada o sello (Transparente)</p>
                                    </>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* --- NUEVO: Gestión de Comprobantes --- */}
                <ComprobantesConfig />

                <Card>
                    <CardHeader>
                        <CardTitle>Datos Fiscales y de Contacto</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="companyName">Nombre Comercial / Profesional</Label>
                            <Input id="companyName" value={config.companyName} onChange={handleChange} placeholder="Ej: Dr. Juan Pérez" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="rnc">RNC / Cédula</Label>
                            <Input id="rnc" value={config.rnc} onChange={handleChange} placeholder="Ej: 131-XXXXX-X" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="exequatur">Exequátur / Colegiatura (Opcional)</Label>
                            <Input id="exequatur" value={config.exequatur} onChange={handleChange} placeholder="Ej: 1234-56" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Teléfono / WhatsApp</Label>
                            <Input id="phone" value={config.phone} onChange={handleChange} placeholder="Ej: 809-555-0000" />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="address">Dirección Física</Label>
                            <Input id="address" value={config.address} onChange={handleChange} placeholder="Ej: Av. Winston Churchill esq. 27 de Febrero, Torre Empresarial..." />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="email">Correo Electrónico (Visible en Factura)</Label>
                            <Input id="email" value={config.email} onChange={handleChange} placeholder="contacto@sudominio.com" />
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end mb-8">
                    <Button size="lg" onClick={handleSave} className="bg-[#D4AF37] hover:bg-amber-600 text-white gap-2">
                        <Save className="w-5 h-5" /> Guardar Cambios
                    </Button>
                </div>
            </div>

            {/* Support Section */}
            <SupportTicketForm />
        </div>
    );
}
