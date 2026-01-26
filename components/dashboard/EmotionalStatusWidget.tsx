"use client";

import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, AlertTriangle, AlertCircle } from "lucide-react";
import { usePreferences } from "@/components/providers/PreferencesContext";
import { cn } from "@/lib/utils";

interface EmotionalStatusProps {
    ncfHealthy: boolean;
    blockers: string[]; // List of things blocking (e.g., "RNC no configurado", "NCF vencido")
}

export function EmotionalStatusWidget({ ncfHealthy, blockers }: EmotionalStatusProps) {
    const { mode } = usePreferences();

    // Logic to determine state
    // Green: No blockers, healthy NCF
    // Yellow: Minor warnings (e.g., Low NCF)
    // Red: Critical blockers (Subscription, Missing RNC)

    let status: "green" | "yellow" | "red" = "green";
    let title = "Todo está en orden";
    let message = "Puedes dedicarte a trabajar, nosotros cuidamos tus cuentas.";
    let Icon = CheckCircle2;

    if (blockers.length > 0) {
        status = "red";
        title = "Necesita atención";
        message = "Hay un detalle importante antes de seguir facturando.";
        Icon = AlertCircle;
    } else if (!ncfHealthy) {
        status = "yellow";
        title = "Revisa esto cuando puedas";
        message = "Te quedan pocos comprobantes, pero aún puedes facturar hoy.";
        Icon = AlertTriangle;
    }

    // If in Simple Mode, ensure copy is very comforting.
    if (mode === "simple") {
        if (status === "green") {
            message = "Este mes estás bien. No tienes que hacer nada ahora.";
        }
    }

    return (
        <Card className={cn("border-none shadow-lg transition-all overflow-hidden relative",
            status === "green" ? "bg-emerald-500/10" :
                status === "yellow" ? "bg-amber-500/10" : "bg-red-500/10"
        )}>
            {/* Background decoration */}
            <div className={cn("absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl opacity-20 -mr-10 -mt-10",
                status === "green" ? "bg-emerald-500" :
                    status === "yellow" ? "bg-amber-500" : "bg-red-500"
            )}></div>

            <CardContent className="p-6 md:p-8 flex items-start gap-6 relative z-10">
                <div className={cn("w-14 h-14 rounded-full flex items-center justify-center shrink-0 shadow-sm",
                    status === "green" ? "bg-emerald-500 text-white" :
                        status === "yellow" ? "bg-amber-500 text-white" : "bg-red-500 text-white"
                )}>
                    <Icon className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                    <h3 className={cn("text-2xl font-serif font-bold",
                        status === "green" ? "text-emerald-900" :
                            status === "yellow" ? "text-amber-900" : "text-red-900"
                    )}>
                        {title}
                    </h3>
                    <p className={cn("text-lg font-light leading-relaxed",
                        status === "green" ? "text-emerald-800" :
                            status === "yellow" ? "text-amber-800" : "text-red-800"
                    )}>
                        {message}
                    </p>
                    {status !== 'green' && (
                        <div className="pt-2 text-sm opacity-80 font-medium">
                            {blockers.map(b => <div key={b}>• {b}</div>)}
                            {!ncfHealthy && !blockers.length && <div>• Secuencia de facturas baja</div>}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
