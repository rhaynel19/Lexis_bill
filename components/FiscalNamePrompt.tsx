"use client";

import { useState } from "react";
import { api } from "@/lib/api-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck, Info, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface FiscalNamePromptProps {
    initialSuggestedName: string;
    onConfirmed: (name: string) => void;
}

export function FiscalNamePrompt({ initialSuggestedName, onConfirmed }: FiscalNamePromptProps) {
    const [name, setName] = useState(initialSuggestedName);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleConfirm = async () => {
        if (!name.trim()) {
            toast.error("El nombre fiscal no puede estar vacío");
            return;
        }

        setIsSubmitting(true);
        try {
            await api.confirmFiscalName(name);
            setIsSuccess(true);
            toast.success("Identidad fiscal confirmada");
            setTimeout(() => onConfirmed(name), 1500);
        } catch (error) {
            toast.error("No pudimos guardar los cambios. Reintenta pronto.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <Card className="border-emerald-100 bg-emerald-50/50 shadow-sm animate-in fade-in zoom-in-95 duration-500">
                <CardContent className="p-6 flex flex-col items-center text-center space-y-3">
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-7 h-7" />
                    </div>
                    <h3 className="text-emerald-900 font-bold">¡Identidad Confirmada!</h3>
                    <p className="text-emerald-700 text-sm">Lexis Bill ya está listo para trabajar por ti.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-blue-100 bg-blue-50/30 shadow-lg overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <ShieldCheck className="w-20 h-20 text-blue-900" />
            </div>

            <CardContent className="p-6 md:p-8 space-y-5">
                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center shrink-0 mt-1">
                        <Info className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-lg font-bold text-blue-950">Detectamos tu identidad fiscal</h3>
                        <p className="text-sm text-slate-600 leading-relaxed">
                            Para cumplir con la DGII y emitir documentos válidos, necesitamos que confirmes tu nombre fiscal.
                            Puedes usar la sugerencia de abajo o ajustarla.
                        </p>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-black tracking-widest text-blue-900 pl-1">
                            Nombre Fiscal (Sugerido)
                        </label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value.toUpperCase())}
                            className="h-12 bg-white border-blue-200 text-blue-950 font-medium text-base shadow-inner"
                            placeholder="EJ: JUAN PEREZ S.R.L."
                        />
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
                        <Button
                            onClick={handleConfirm}
                            disabled={isSubmitting}
                            className="w-full sm:w-auto px-8 h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-95"
                        >
                            {isSubmitting ? "Guardando..." : "Confirmar Identidad"}
                        </Button>
                        <p className="text-[10px] text-slate-400 italic text-center sm:text-left leading-tight">
                            "Lexis Bill sugiere este nombre según fuentes públicas dominicanas. <br className="hidden sm:block" /> Tú tienes el control final."
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
