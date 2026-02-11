"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle, Clock, Lock, AlertTriangle } from "lucide-react";
import { api } from "@/lib/api-service";
import { Button } from "@/components/ui/button";

export function SubscriptionAlert() {
    const [status, setStatus] = useState<any>(null);

    useEffect(() => {
        api.getSubscriptionStatus()
            .then(data => setStatus(data))
            .catch(err => console.error("Error fetching subscription status:", err));
    }, []);

    if (!status) return null;

    const { daysRemaining, graceDaysRemaining, status: state, internalStatus, hasPendingPayment, shouldRedirect, allowPartialAccess } = status;

    // ✅ Solo mostrar si necesita atención (no ocultar durante GRACE_PERIOD o PENDING_VALIDATION)
    // Mostrar siempre si allowPartialAccess es true o shouldRedirect es true
    if (state === 'Activo' && daysRemaining > 7 && !hasPendingPayment && !shouldRedirect && !allowPartialAccess) return null;

    const variants: any = {
        PendienteValidacion: {
            icon: Clock,
            color: "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-200",
            msg: "Tu suscripción requiere atención. Tienes acceso limitado hasta completar la validación del pago.",
            action: "Ver Estado",
            allowAccess: true
        },
        VencePronto: {
            icon: AlertTriangle,
            color: "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-200",
            msg: `Tu suscripción vence en ${daysRemaining} días.`,
            action: "Renovar Ahora",
            allowAccess: true
        },
        Gracia: {
            icon: Clock,
            color: "bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-950/30 dark:border-orange-800 dark:text-orange-200",
            msg: `Suscripción vencida. Tienes ${graceDaysRemaining ?? 0} días de gracia antes del bloqueo. Tienes acceso limitado hasta completar el pago.`,
            action: "Pagar Ahora",
            allowAccess: true
        },
        'En Revisión': {
            icon: Clock,
            color: "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-200",
            msg: "Tu pago está en revisión. Tienes acceso limitado hasta completar la validación.",
            action: "Ver Estado",
            allowAccess: true
        },
        Bloqueado: {
            icon: Lock,
            color: "bg-red-50 border-red-200 text-red-800 dark:bg-red-950/30 dark:border-red-800 dark:text-red-200",
            msg: "Acceso bloqueado por falta de pago.",
            action: "Regularizar Cuenta",
            allowAccess: false
        },
        Suspendido: {
            icon: Lock,
            color: "bg-red-50 border-red-200 text-red-800 dark:bg-red-950/30 dark:border-red-800 dark:text-red-200",
            msg: "Tu cuenta está suspendida. Contacta a soporte.",
            action: "Contactar Soporte",
            allowAccess: false
        }
    };

    // ✅ Mapear estados internos a variantes
    let variantKey = state;
    if (internalStatus === 'PENDING_PAYMENT' || internalStatus === 'UNDER_REVIEW') {
        variantKey = internalStatus === 'UNDER_REVIEW' ? 'En Revisión' : 'PendienteValidacion';
    } else if (internalStatus === 'GRACE_PERIOD') {
        variantKey = 'Gracia';
    } else if (internalStatus === 'PAST_DUE' || internalStatus === 'SUSPENDED') {
        variantKey = internalStatus === 'SUSPENDED' ? 'Suspendido' : 'Bloqueado';
    }
    
    const config = variants[variantKey] || variants[state];
    if (!config) return null;

    return (
        <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 mb-6 border rounded-xl shadow-sm ${config.color}`}>
            <div className="flex items-center gap-3 flex-1">
                <config.icon className="w-5 h-5 shrink-0" />
                <span className="text-sm font-semibold">{config.msg}</span>
            </div>
            <Link href={state === 'Suspendido' ? "/support" : "/pagos"}>
                <Button size="sm" variant="outline" className="bg-white/50 dark:bg-background/50 border-current hover:bg-white dark:hover:bg-background transition-colors h-8 shrink-0">
                    {config.action}
                </Button>
            </Link>
        </div>
    );
}
