"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, FileText, Receipt, BarChart3, ChevronRight, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const TUTORIAL_STORAGE_KEY = "lexis_tutorial_completed";

const STEPS = [
    {
        id: "welcome",
        title: "Bienvenido a Lexis Bill",
        bullets: [
            "Facturación y reportes fiscales en un solo lugar.",
            "En pocos pasos estarás listo para facturar.",
        ],
        icon: Sparkles,
    },
    {
        id: "ncf",
        title: "Rangos de NCF",
        bullets: [
            "Sin rangos NCF no puedes emitir facturas.",
            "Configuración → Datos fiscales y NCF.",
            "Carga tus rangos vigentes (B01, B02, etc.).",
        ],
        icon: Receipt,
    },
    {
        id: "invoice",
        title: "Tu primera factura",
        bullets: [
            "Usa el botón «Nueva factura» o el menú.",
            "Completa cliente, concepto y monto.",
            "Genera el PDF y envíalo por WhatsApp o correo.",
        ],
        icon: FileText,
    },
    {
        id: "reports",
        title: "Reportes fiscales",
        bullets: [
            "Menú «Fiscal» o «Reportes».",
            "Ahí verás y descargarás 606 y 607.",
            "Todo listo para la DGII.",
        ],
        icon: BarChart3,
    },
];

export function FirstTimeGuide() {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState(0);
    const [mounted, setMounted] = useState(false);

    const checkShouldShow = useCallback(() => {
        if (typeof window === "undefined") return false;
        const completed = localStorage.getItem(TUTORIAL_STORAGE_KEY);
        const forceShow = sessionStorage.getItem("lexis_show_guide_once") === "1";
        if (forceShow) {
            sessionStorage.removeItem("lexis_show_guide_once");
            return true;
        }
        return completed !== "true" && completed !== "skipped";
    }, []);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;
        if (checkShouldShow()) setOpen(true);
    }, [mounted, checkShouldShow]);

    const handleClose = (completed: boolean) => {
        setOpen(false);
        localStorage.setItem(TUTORIAL_STORAGE_KEY, completed ? "true" : "skipped");
    };

    const handleNext = () => {
        if (step < STEPS.length - 1) {
            setStep((s) => s + 1);
        } else {
            handleClose(true);
        }
    };

    const handleSkip = () => {
        handleClose(false);
    };

    if (!mounted) return null;

    const current = STEPS[step];
    const isLast = step === STEPS.length - 1;
    const Icon = current.icon;

    return (
        <Dialog
            open={open}
            onOpenChange={(o) => {
                if (!o) handleSkip();
            }}
            className={cn(
                "max-w-md w-[calc(100vw-2rem)] sm:w-full mx-4 sm:mx-6 p-0",
                "max-h-[90vh] overflow-hidden flex flex-col",
                "bg-background text-foreground border border-border shadow-xl"
            )}
        >
            <DialogContent
                className="p-0 gap-0 border-0 flex flex-col max-h-[90vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Overlay is handled by Dialog (bg-black/50) */}

                <div className="flex flex-col min-h-0">
                    {/* Header: progress + close */}
                    <div className="flex items-center justify-between shrink-0 px-4 pt-4 pb-2 border-b border-border/50">
                        <p className="text-xs font-medium text-muted-foreground">
                            Paso {step + 1} de {STEPS.length}
                        </p>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-full"
                            onClick={handleSkip}
                            aria-label="Omitir guía"
                        >
                            <X className="w-5 h-5" />
                        </Button>
                    </div>

                    {/* Progress bar */}
                    <div className="shrink-0 px-4 pt-2">
                        <div className="flex gap-1">
                            {STEPS.map((_, i) => (
                                <div
                                    key={i}
                                    className={cn(
                                        "h-1 flex-1 rounded-full transition-colors",
                                        i <= step ? "bg-primary" : "bg-muted"
                                    )}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 px-4 py-6 overflow-y-auto">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={step}
                                initial={{ opacity: 0, x: 12 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -12 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-4"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                        <Icon className="h-6 w-6" />
                                    </div>
                                    <h2 className="text-lg font-semibold leading-tight text-foreground">
                                        {current.title}
                                    </h2>
                                </div>
                                <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
                                    {current.bullets.map((b, i) => (
                                        <li key={i} className="leading-relaxed">
                                            {b}
                                        </li>
                                    ))}
                                </ul>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Footer: actions */}
                    <div className="shrink-0 flex flex-col gap-2 p-4 pt-2 border-t border-border/50">
                        <Button
                            onClick={isLast ? () => { handleClose(true); router.push("/nueva-factura"); } : handleNext}
                            className="h-12 min-h-[44px] w-full gap-2 font-medium"
                        >
                            {isLast ? (
                                <>
                                    Ir a Nueva factura
                                    <ChevronRight className="h-5 w-5" />
                                </>
                            ) : (
                                <>
                                    Siguiente
                                    <ChevronRight className="h-5 w-5" />
                                </>
                            )}
                        </Button>
                        {!isLast && (
                            <Button
                                variant="ghost"
                                onClick={handleSkip}
                                className="h-11 min-h-[44px] text-muted-foreground"
                            >
                                Omitir guía
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

/** Llama desde Ayuda para reactivar la guía en la siguiente visita al dashboard. */
export function setShowGuideAgain() {
    if (typeof window === "undefined") return;
    localStorage.removeItem(TUTORIAL_STORAGE_KEY);
    sessionStorage.setItem("lexis_show_guide_once", "1");
}
