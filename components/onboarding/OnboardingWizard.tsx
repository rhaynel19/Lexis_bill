"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { usePreferences } from "@/components/providers/PreferencesContext";
import { Briefcase, Stethoscope, Scale, Laptop, User, CheckCircle2, Factory } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const professions = [
    { id: "medic", label: "Médico / Salud", icon: Stethoscope },
    { id: "lawyer", label: "Abogado / Legal", icon: Scale },
    { id: "technical", label: "Técnico / Oficios", icon: Factory },
    { id: "freelance", label: "Freelancer / Digital", icon: Laptop },
    { id: "consultant", label: "Consultor", icon: Briefcase },
    { id: "other", label: "Otro", icon: User },
];

export function OnboardingWizard() {
    const { isOnboarded, completeOnboarding, setProfession } = usePreferences();
    const [step, setStep] = useState(1);
    const [selectedProf, setSelectedProf] = useState("");
    const [clientType, setClientType] = useState("");
    const [rncData, setRncData] = useState({ rnc: "", name: "" });

    if (isOnboarded) return null;

    const nextStep = () => setStep((p) => p + 1);

    return (
        <Dialog open={!isOnboarded}>
            <DialogContent className="sm:max-w-2xl bg-[#0A192F] border-[#D4AF37]/20 text-[#F9F6EE] p-0 overflow-hidden [&>button]:hidden">
                <div className="flex h-[500px]">
                    {/* Sidebar Progress */}
                    <div className="w-1/3 bg-[#081221] p-8 hidden md:flex flex-col justify-between border-r border-[#D4AF37]/10">
                        <div>
                            <h2 className="text-2xl font-serif font-bold text-[#D4AF37] mb-2">Lexis Bill</h2>
                            <p className="text-slate-400 text-sm">Configuración Inicial</p>
                        </div>
                        <div className="space-y-6">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <div
                                        className={cn(
                                            "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border transition-colors",
                                            step === i
                                                ? "bg-[#D4AF37] text-[#0A192F] border-[#D4AF37]"
                                                : step > i
                                                    ? "bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]/20"
                                                    : "border-slate-700 text-slate-500"
                                        )}
                                    >
                                        {step > i ? <CheckCircle2 className="w-4 h-4" /> : i}
                                    </div>
                                    <span className={cn("text-sm", step === i ? "text-white font-medium" : "text-slate-500")}>
                                        {i === 1 && "Profesión"}
                                        {i === 2 && "Clientes"}
                                        {i === 3 && "Fiscalidad"}
                                        {i === 4 && "Listo"}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div className="text-xs text-slate-500">
                            Solo toma unos minutos.
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 p-8 md:p-12 overflow-y-auto">
                        <AnimatePresence mode="wait">
                            {step === 1 && (
                                <motion.div
                                    key="step1"
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    className="space-y-6"
                                >
                                    <h3 className="text-2xl font-bold">Hola, soy Lexis 👋</h3>
                                    <p className="text-slate-400">Te ayudo con la facturación y los reportes fiscales. ¿A qué te dedicas? Así personalizo todo para ti.</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        {professions.map((p) => (
                                            <button
                                                key={p.id}
                                                onClick={() => {
                                                    setSelectedProf(p.id);
                                                    setProfession(p.id as any);
                                                    // Auto advance after selection for smoother UI
                                                    setTimeout(() => {
                                                        setStep(2);
                                                    }, 200);
                                                }}
                                                className={cn(
                                                    "flex flex-col items-center justify-center gap-3 p-4 rounded-xl border transition-all hover:scale-105",
                                                    selectedProf === p.id
                                                        ? "bg-[#D4AF37] text-[#0A192F] border-[#D4AF37] shadow-lg shadow-[#D4AF37]/20"
                                                        : "bg-white/5 border-white/10 hover:bg-white/10"
                                                )}
                                            >
                                                <p.icon className="w-6 h-6" />
                                                <span className="text-sm font-medium">{p.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {step === 2 && (
                                <motion.div
                                    key="step2"
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    className="space-y-6"
                                >
                                    <h3 className="text-2xl font-bold">¿A quién le facturas?</h3>
                                    <p className="text-slate-400">Esto me ayuda a sugerirte el tipo de comprobante correcto cada vez.</p>
                                    <div className="space-y-3">
                                        <button
                                            onClick={() => setClientType("b2b")}
                                            className={cn(
                                                "w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between group",
                                                clientType === "b2b"
                                                    ? "bg-[#D4AF37]/10 border-[#D4AF37] text-[#D4AF37]"
                                                    : "bg-white/5 border-white/10 hover:bg-white/10"
                                            )}
                                        >
                                            <div>
                                                <div className="font-bold">A Empresas</div>
                                                <div className="text-sm text-slate-400 group-hover:text-slate-300">Necesito Crédito Fiscal (B01)</div>
                                            </div>
                                            <Factory className="w-5 h-5 opacity-50" />
                                        </button>
                                        <button
                                            onClick={() => setClientType("b2c")}
                                            className={cn(
                                                "w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between group",
                                                clientType === "b2c"
                                                    ? "bg-[#D4AF37]/10 border-[#D4AF37] text-[#D4AF37]"
                                                    : "bg-white/5 border-white/10 hover:bg-white/10"
                                            )}
                                        >
                                            <div>
                                                <div className="font-bold">A Personas</div>
                                                <div className="text-sm text-slate-400 group-hover:text-slate-300">Necesito Consumo Final (B02)</div>
                                            </div>
                                            <User className="w-5 h-5 opacity-50" />
                                        </button>
                                        <button
                                            onClick={() => setClientType("both")}
                                            className={cn(
                                                "w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between group",
                                                clientType === "both"
                                                    ? "bg-[#D4AF37]/10 border-[#D4AF37] text-[#D4AF37]"
                                                    : "bg-white/5 border-white/10 hover:bg-white/10"
                                            )}
                                        >
                                            <div>
                                                <div className="font-bold">A Ambos</div>
                                                <div className="text-sm text-slate-400 group-hover:text-slate-300">Manejo de todo un poco</div>
                                            </div>
                                            <Briefcase className="w-5 h-5 opacity-50" />
                                        </button>
                                    </div>
                                    <div className="pt-4 flex justify-between">
                                        <Button variant="ghost" onClick={() => setStep(1)}>Atrás</Button>
                                        <Button onClick={() => nextStep()} disabled={!clientType} className="bg-[#D4AF37] text-[#0A192F] font-bold">Continuar</Button>
                                    </div>
                                </motion.div>
                            )}

                            {step === 3 && (
                                <motion.div
                                    key="step3"
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    className="space-y-6"
                                >
                                    <h3 className="text-2xl font-bold">Tu identidad fiscal</h3>
                                    <p className="text-slate-400">Necesito tu RNC o cédula para generar tus comprobantes. Si aún no tienes RNC, usa tu cédula por ahora.</p>

                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>RNC o Cédula</Label>
                                            <Input
                                                placeholder="001-0000000-0"
                                                className="bg-white/5 border-white/10 text-white"
                                                value={rncData.rnc}
                                                onChange={(e) => setRncData({ ...rncData, rnc: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Nombre Comercial (Opcional)</Label>
                                            <Input
                                                placeholder="Ej: Dr. Juan Pérez"
                                                className="bg-white/5 border-white/10 text-white"
                                                value={rncData.name}
                                                onChange={(e) => setRncData({ ...rncData, name: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="bg-[#D4AF37]/5 p-4 rounded-lg border border-[#D4AF37]/10">
                                        <div className="flex gap-3">
                                            <CheckCircle2 className="w-5 h-5 text-[#D4AF37] shrink-0" />
                                            <p className="text-xs text-slate-400">
                                                Tus datos están seguros. LexisBill solo los usa para generar tus reportes 606 y 607 automáticamente.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="pt-4 flex justify-between">
                                        <Button variant="ghost" onClick={() => setStep(2)}>Atrás</Button>
                                        <Button onClick={() => nextStep()} disabled={rncData.rnc.length < 9} className="bg-[#D4AF37] text-[#0A192F] font-bold">Validar y Continuar</Button>
                                    </div>
                                </motion.div>
                            )}

                            {step === 4 && (
                                <motion.div
                                    key="step4"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="text-center py-8 space-y-6"
                                >
                                    <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto text-green-500 mb-6">
                                        <CheckCircle2 className="w-10 h-10" />
                                    </div>
                                    <h3 className="text-3xl font-serif font-bold text-[#D4AF37]">¡Todo listo!</h3>
                                    <p className="text-slate-300 text-lg">
                                        Tu oficina virtual está configurada. Estoy listo para ayudarte a facturar.
                                    </p>
                                    <ul className="text-left text-slate-400 text-sm space-y-2 max-w-sm mx-auto bg-white/5 rounded-lg p-4 border border-white/10">
                                        <li><strong className="text-[#D4AF37]">Nueva Factura</strong> — Aquí creas y emites tus comprobantes fiscales.</li>
                                        <li><strong className="text-[#D4AF37]">Reportes Fiscales</strong> — Aquí ves y descargas tus reportes 606 y 607.</li>
                                        <li><strong className="text-[#D4AF37]">Clientes</strong> — Gestiona y migra tu planilla de clientes.</li>
                                    </ul>
                                    <p className="text-xs text-slate-500">
                                        Modo Simple activado. Si tienes dudas, pregúntame en cualquier momento.
                                    </p>

                                    <Button onClick={completeOnboarding} className="w-full h-14 text-lg bg-[#D4AF37] hover:bg-[#B8962E] text-[#0A192F] font-bold rounded-xl mt-8 shadow-xl shadow-[#D4AF37]/20 animate-pulse">
                                        Empezar a Facturar
                                    </Button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
