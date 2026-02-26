"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { FileCheck, CheckCircle2, Loader2, Info } from "lucide-react";
import { api } from "@/lib/api-service";
import { usePreferences } from "@/components/providers/PreferencesContext";
import { toast } from "sonner";

export default function OnboardingPage() {
    const router = useRouter();
    const { completeOnboarding: completePrefs } = usePreferences();
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [form, setForm] = useState({
        name: "",
        rnc: "",
        address: "",
        phone: "",
        email: "",
        confirmedFiscalName: "",
    });
    const [rncValid, setRncValid] = useState<boolean | null>(null);
    const [user, setUser] = useState<{ name?: string; rnc?: string; email?: string } | null>(null);

    useEffect(() => {
        const loadUser = async () => {
            try {
                const me = await api.getMe();
                setUser(me || null);
                const confirmed = me?.fiscalStatus?.confirmed?.trim() || "";
                const noUsarComoFiscal = !confirmed || confirmed.toUpperCase() === "CONTRIBUYENTE REGISTRADO";
                setForm((f) => ({
                    ...f,
                    name: me?.name ?? f.name,
                    rnc: me?.rnc ?? f.rnc,
                    email: me?.email ?? f.email,
                    confirmedFiscalName: noUsarComoFiscal ? "" : confirmed,
                }));
            } catch {
                router.push("/login");
            }
        };
        loadUser();
    }, [router]);

    const validateRnc = async () => {
        const clean = (form.rnc || "").replace(/[^0-9]/g, "");
        if (clean.length < 9) {
            setRncValid(false);
            return false;
        }
        try {
            const res = await api.validateRncPost(clean);
            setRncValid(res?.valid ?? false);
            const nombreDesdeRnc = (res?.name || "").trim();
            const esPlaceholder = nombreDesdeRnc.toUpperCase() === "CONTRIBUYENTE REGISTRADO";
            if (res?.valid && nombreDesdeRnc && !esPlaceholder) {
                setForm((f) => ({ ...f, confirmedFiscalName: nombreDesdeRnc || f.confirmedFiscalName }));
            }
            return res?.valid ?? false;
        } catch {
            setRncValid(clean.length >= 9 && clean.length <= 11);
            return clean.length >= 9 && clean.length <= 11;
        }
    };

    const handleSubmit = async () => {
        if (step === 1) {
            const valid = await validateRnc();
            if (!valid) {
                toast.error("RNC inválido. Debe tener 9 u 11 dígitos.");
                return;
            }
            if (!form.confirmedFiscalName?.trim()) {
                toast.error("El nombre fiscal es obligatorio.");
                return;
            }
            if (!form.address?.trim()) {
                toast.error("La dirección es obligatoria.");
                return;
            }
            setStep(2);
            return;
        }

        setIsSubmitting(true);
        try {
            await api.completeOnboarding({
                name: form.confirmedFiscalName || form.name,
                rnc: form.rnc?.replace(/[^0-9]/g, ""),
                address: form.address,
                phone: form.phone || undefined,
                confirmedFiscalName: form.confirmedFiscalName,
            });
            completePrefs();
            toast.success("¡Configuración completada!");
            router.replace("/configuracion");
        } catch (e) {
            toast.error((e as Error)?.message || "Error al guardar. Intenta de nuevo.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="container max-w-2xl mx-auto px-4 py-12">
            <div className="mb-8">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                    Configuración inicial
                </h1>
                <p className="text-muted-foreground mt-1">
                    Completa tus datos para empezar a facturar con Lexis Bill
                </p>
            </div>

            <div className="flex gap-2 mb-8">
                {[1, 2].map((i) => (
                    <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                            step >= i ? "bg-accent" : "bg-muted"
                        }`}
                    />
                ))}
            </div>

            <AnimatePresence mode="wait">
                {step === 1 && (
                    <motion.div
                        key="step1"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                    >
                        <Card>
                            <CardContent className="pt-6 space-y-6">
                                <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
                                    <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                                    <p className="text-sm text-muted-foreground">
                                        Esto es necesario para cumplir con la DGII y emitir comprobantes fiscales válidos.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="rnc">RNC o Cédula *</Label>
                                    <Input
                                        id="rnc"
                                        placeholder="001-0000000-0"
                                        value={form.rnc}
                                        onChange={(e) => {
                                            setForm({ ...form, rnc: e.target.value });
                                            setRncValid(null);
                                        }}
                                        className={rncValid === false ? "border-destructive" : ""}
                                    />
                                    {rncValid === true && (
                                        <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                                            <CheckCircle2 className="w-4 h-4" /> RNC válido
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="confirmedFiscalName">Nombre fiscal (razón social) *</Label>
                                    <Input
                                        id="confirmedFiscalName"
                                        placeholder="Ej: Juan Pérez o Empresa SRL"
                                        value={form.confirmedFiscalName}
                                        onChange={(e) => setForm({ ...form, confirmedFiscalName: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="address">Dirección *</Label>
                                    <Input
                                        id="address"
                                        placeholder="Calle, número, sector, ciudad"
                                        value={form.address}
                                        onChange={(e) => setForm({ ...form, address: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Teléfono</Label>
                                        <Input
                                            id="phone"
                                            placeholder="809-555-0000"
                                            value={form.phone}
                                            onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="correo@ejemplo.com"
                                            value={form.email}
                                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {step === 2 && (
                    <motion.div
                        key="step2"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                    >
                        <Card>
                            <CardContent className="pt-6 space-y-6">
                                <div className="text-center py-8">
                                    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <FileCheck className="w-8 h-8 text-green-600 dark:text-green-400" />
                                    </div>
                                    <h3 className="text-lg font-semibold">Siguiente paso</h3>
                                    <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                                        Configura tus rangos de NCF en la página de Configuración. Sin NCF no puedes emitir facturas.
                                    </p>
                                </div>

                                <div className="flex gap-2">
                                    <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                                        Atrás
                                    </Button>
                                    <Button
                                        onClick={handleSubmit}
                                        disabled={isSubmitting}
                                        className="flex-1 gap-2"
                                    >
                                        {isSubmitting ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <CheckCircle2 className="w-4 h-4" />
                                        )}
                                        Finalizar configuración
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            {step === 1 && (
                <div className="mt-6 flex justify-end">
                    <Button onClick={handleSubmit}>Continuar</Button>
                </div>
            )}
        </div>
    );
}
