"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
    CheckCircle2, 
    User, 
    Users, 
    FileText, 
    Send, 
    TrendingUp,
    Sparkles,
    ArrowRight,
    X,
    Zap
} from "lucide-react";
import { useRouter } from "next/navigation";
import { usePreferences } from "@/components/providers/PreferencesContext";
import { useAuth } from "@/components/providers/AuthContext";
import { cn } from "@/lib/utils";
import Link from "next/link";

const TUTORIAL_STORAGE_KEY = "lexis_tutorial_completed";
const TUTORIAL_PROGRESS_KEY = "lexis_tutorial_progress";

// Ejemplos dinámicos según profesión
const professionExamples: Record<string, { service: string; client: string; price: number }> = {
    medic: { service: "Consulta médica", client: "Paciente", price: 2500 },
    lawyer: { service: "Honorarios legales", client: "Cliente", price: 5000 },
    technical: { service: "Servicio técnico", client: "Cliente", price: 3000 },
    freelance: { service: "Diseño gráfico", client: "Cliente", price: 4000 },
    consultant: { service: "Consultoría profesional", client: "Cliente", price: 6000 },
    other: { service: "Servicio profesional", client: "Cliente", price: 3500 },
};

interface TutorialStep {
    id: string;
    title: string;
    description: string;
    action: string;
    actionUrl: string;
    keyMessage: string;
    microReinforcement: string;
    completed?: boolean;
}

export function SmartTutorial() {
    const router = useRouter();
    const { profession } = usePreferences();
    const { user } = useAuth();
    const [isVisible, setIsVisible] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [progress, setProgress] = useState(0);
    const [dismissed, setDismissed] = useState(false);

    const steps: TutorialStep[] = [
        {
            id: "profile",
            title: "Configura tu perfil",
            description: "Completa tu información profesional para que tus facturas se vean profesionales y generen más confianza.",
            action: "Ir a Configuración",
            actionUrl: "/configuracion",
            keyMessage: "Esto hará que tus facturas se vean profesionales y generen más confianza.",
            microReinforcement: "👉 Perfecto, esto te ahorrará tiempo cada mes.",
        },
        {
            id: "client",
            title: "Agrega tu primer cliente",
            description: `Guarda a "${professionExamples[profession]?.client || professionExamples.other.client}" para evitar escribir los mismos datos una y otra vez.`,
            action: "Agregar Cliente",
            actionUrl: "/clientes",
            keyMessage: "Guardar clientes evita que escribas los mismos datos una y otra vez.",
            microReinforcement: "👉 Excelente, ahora puedes facturar más rápido.",
        },
        {
            id: "invoice",
            title: "Crea tu primera factura",
            description: `Emite una factura por "${professionExamples[profession]?.service || professionExamples.other.service}" y verás lo fácil que es.`,
            action: "Crear Factura",
            actionUrl: "/nueva-factura",
            keyMessage: "En menos de 2 minutos tendrás tu primera factura lista.",
            microReinforcement: "👉 Listo. Ya estás facturando como un profesional organizado.",
        },
        {
            id: "send",
            title: "Envíala en segundos",
            description: "Comparte tu factura por WhatsApp, Email o descarga el PDF.",
            action: "Ver Facturas",
            actionUrl: "/documentos",
            keyMessage: "Mientras más rápido facturas, más rápido cobras.",
            microReinforcement: "👉 Perfecto, ahora tienes control total.",
        },
        {
            id: "dashboard",
            title: "Controla tus ingresos",
            description: "Ve tus facturas pagadas, pendientes y tus ingresos en tiempo real.",
            action: "Ver Dashboard",
            actionUrl: "/dashboard",
            keyMessage: "Lo que no se mide, no se mejora. Aquí tienes el control.",
            microReinforcement: "👉 ¡Excelente! Ya dominas lo esencial.",
        },
    ];

    useEffect(() => {
        // Verificar si el tutorial ya fue completado
        const completed = localStorage.getItem(TUTORIAL_STORAGE_KEY);
        const progressData = localStorage.getItem(TUTORIAL_PROGRESS_KEY);
        
        if (completed === "true" || completed === "skipped") {
            setIsVisible(false);
            return;
        }

        // Verificar progreso del usuario
        const checkProgress = async () => {
            try {
                const { api } = await import("@/lib/api-service");
                
                // Verificar si tiene facturas (tutorial completado implícitamente)
                const invoices = await api.getInvoices(1, 1);
                if (invoices?.data && invoices.data.length > 0) {
                    localStorage.setItem(TUTORIAL_STORAGE_KEY, "true");
                    setIsVisible(false);
                    return;
                }

                // Verificar perfil completo
                const me = await api.getMe();
                const hasProfile = me?.rnc && me?.name;
                
                // Verificar clientes
                const clients = await api.getCustomers();
                const hasClients = clients && clients.length > 0;

                // Determinar paso actual basado en progreso real
                let step = 0;
                if (hasProfile) step = 1;
                if (hasClients) step = 2;

                // Mostrar tutorial
                if (progressData) {
                    const parsed = JSON.parse(progressData);
                    step = Math.max(step, parsed.step || 0);
                    setProgress(parsed.progress || (step / steps.length) * 100);
                } else {
                    setProgress((step / steps.length) * 100);
                }
                
                setCurrentStep(step);
                setIsVisible(true);
            } catch {
                // Si hay error, mostrar desde el inicio
                if (progressData) {
                    const parsed = JSON.parse(progressData);
                    setCurrentStep(parsed.step || 0);
                    setProgress(parsed.progress || 0);
                }
                setIsVisible(true);
            }
        };

        checkProgress();
    }, [profession]);


    const handleStepComplete = (stepId: string) => {
        const updatedSteps = steps.map((s, idx) => 
            idx === currentStep && s.id === stepId ? { ...s, completed: true } : s
        );
        
        const newProgress = ((currentStep + 1) / steps.length) * 100;
        setProgress(newProgress);
        
        // Guardar progreso
        localStorage.setItem(TUTORIAL_PROGRESS_KEY, JSON.stringify({
            step: currentStep + 1,
            progress: newProgress
        }));

        if (currentStep < steps.length - 1) {
            setTimeout(() => {
                setCurrentStep(currentStep + 1);
            }, 500);
        } else {
            // Tutorial completado
            localStorage.setItem(TUTORIAL_STORAGE_KEY, "true");
            setTimeout(() => {
                setIsVisible(false);
            }, 2000);
        }
    };

    const handleDismiss = () => {
        setDismissed(true);
        setIsVisible(false);
        localStorage.setItem(TUTORIAL_STORAGE_KEY, "skipped");
    };

    const handleSkip = () => {
        localStorage.setItem(TUTORIAL_STORAGE_KEY, "true");
        setIsVisible(false);
    };

    if (!isVisible || dismissed) return null;

    const currentStepData = steps[currentStep];
    const isLastStep = currentStep === steps.length - 1;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={cn(
                    "fixed z-50 max-w-md",
                    "top-4 left-4 right-4 w-[calc(100vw-2rem)]",
                    "md:top-auto md:bottom-6 md:left-6 md:right-auto md:w-full"
                )}
            >
                <Card className="border-2 border-primary/20 shadow-2xl bg-gradient-to-br from-background to-primary/5">
                    <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-lg bg-primary/10">
                                    <Sparkles className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg">Autotutorial Inteligente</CardTitle>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Paso {currentStep + 1} de {steps.length}
                                    </p>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={handleDismiss}
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                        
                        {/* Barra de progreso */}
                        <div className="mt-4 space-y-2">
                            <Progress value={progress} className="h-2" />
                            <p className="text-xs text-muted-foreground text-right">
                                {Math.round(progress)}% completado
                            </p>
                        </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentStep}
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="space-y-4"
                            >
                                {/* Icono del paso */}
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "p-3 rounded-xl",
                                        currentStep === 0 && "bg-blue-100 dark:bg-blue-900/20",
                                        currentStep === 1 && "bg-green-100 dark:bg-green-900/20",
                                        currentStep === 2 && "bg-purple-100 dark:bg-purple-900/20",
                                        currentStep === 3 && "bg-orange-100 dark:bg-orange-900/20",
                                        currentStep === 4 && "bg-amber-100 dark:bg-amber-900/20"
                                    )}>
                                        {currentStep === 0 && <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />}
                                        {currentStep === 1 && <Users className="w-6 h-6 text-green-600 dark:text-green-400" />}
                                        {currentStep === 2 && <FileText className="w-6 h-6 text-purple-600 dark:text-purple-400" />}
                                        {currentStep === 3 && <Send className="w-6 h-6 text-orange-600 dark:text-orange-400" />}
                                        {currentStep === 4 && <TrendingUp className="w-6 h-6 text-amber-600 dark:text-amber-400" />}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-lg">{currentStepData.title}</h3>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {currentStepData.description}
                                        </p>
                                    </div>
                                </div>

                                {/* Mensaje clave */}
                                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                                    <p className="text-sm font-medium text-primary">
                                        {currentStepData.keyMessage}
                                    </p>
                                </div>

                                {/* Micro-refuerzo si está completado */}
                                {currentStepData.completed && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400"
                                    >
                                        <CheckCircle2 className="w-4 h-4" />
                                        <span>{currentStepData.microReinforcement}</span>
                                    </motion.div>
                                )}

                                {/* Acciones */}
                                <div className="flex gap-2 pt-2">
                                    <Button
                                        asChild
                                        className="flex-1"
                                        onClick={() => handleStepComplete(currentStepData.id)}
                                    >
                                        <Link href={currentStepData.actionUrl}>
                                            {currentStepData.action}
                                            <ArrowRight className="w-4 h-4 ml-2" />
                                        </Link>
                                    </Button>
                                    {!isLastStep && (
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setCurrentStep(currentStep + 1);
                                                const newProgress = ((currentStep + 1) / steps.length) * 100;
                                                setProgress(newProgress);
                                                localStorage.setItem(TUTORIAL_PROGRESS_KEY, JSON.stringify({
                                                    step: currentStep + 1,
                                                    progress: newProgress
                                                }));
                                            }}
                                        >
                                            Saltar
                                        </Button>
                                    )}
                                </div>

                                {/* Indicadores de pasos */}
                                <div className="flex items-center justify-center gap-2 pt-2">
                                    {steps.map((_, idx) => (
                                        <div
                                            key={idx}
                                            className={cn(
                                                "h-2 rounded-full transition-all",
                                                idx === currentStep && "w-8 bg-primary",
                                                idx < currentStep && "w-2 bg-green-500",
                                                idx > currentStep && "w-2 bg-muted"
                                            )}
                                        />
                                    ))}
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </CardContent>

                    {/* Cierre inteligente cuando se completa */}
                    {isLastStep && currentStepData.completed && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-t border-green-200 dark:border-green-800"
                        >
                            <div className="flex items-start gap-3">
                                <Zap className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <p className="font-semibold text-green-900 dark:text-green-100">
                                        ¡Excelente progreso!
                                    </p>
                                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                                        En menos de 5 minutos ya diste un paso que muchos profesionales tardan años en organizar. Lexis Bill ahora trabaja por ti.
                                    </p>
                                    <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-800">
                                        <p className="text-xs font-medium text-green-800 dark:text-green-200 mb-2">
                                            👉 Recomendación:
                                        </p>
                                        <Link href="/configuracion">
                                            <Button variant="outline" size="sm" className="w-full text-xs">
                                                Crea 3 servicios frecuentes para facturar aún más rápido
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </Card>
            </motion.div>
        </AnimatePresence>
    );
}
