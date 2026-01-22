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
        profession: "general", // general, doctor, lawyer, engineer
        bankName: "",
        bankAccount: "",
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
                        <div className="space-y-2">
                            <Label htmlFor="profession">Especialidad / Sector</Label>
                            <select
                                id="profession"
                                value={config.profession}
                                onChange={(e) => setConfig({ ...config, profession: e.target.value })}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <option value="general">Profesional General</option>
                                <option value="doctor">Médico / Salud</option>
                                <option value="lawyer">Abogado / Legal</option>
                                <option value="engineer">Ingeniero / Arquitecto</option>
                            </select>
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="address">Dirección Física</Label>
                            <Input id="address" value={config.address} onChange={handleChange} placeholder="Ej: Av. Winston Churchill esq. 27 de Febrero, Torre Empresarial..." />
                        </div>

                        <div className="h-4 md:col-span-2"></div> {/* Added md:col-span-2 to ensure it takes full width in grid */}
                        <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 grid grid-cols-1 md:grid-cols-2 gap-4 md:col-span-2"> {/* Added md:col-span-2 */}
                            <div className="md:col-span-2 flex items-center gap-2 text-blue-800 font-bold text-sm">
                                🏦 Información Bancaria (Para cobros por transferencia)
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="bankName">Banco</Label>
                                <Input id="bankName" value={config.bankName} onChange={handleChange} placeholder="Ej: Banco Popular, Banreservas..." />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="bankAccount">Número de Cuenta</Label>
                                <Input id="bankAccount" value={config.bankAccount} onChange={handleChange} placeholder="Ej: 771234567 (Corriente/Ahorros)" />
                            </div>
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
