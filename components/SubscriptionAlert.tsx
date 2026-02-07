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

    const { daysRemaining, graceDaysRemaining, status: state } = status;

    if (state === 'Activo' && daysRemaining > 7) return null; // Hide if active and healthy

    const variants: any = {
        VencePronto: {
            icon: AlertTriangle,
            color: "bg-amber-50 border-amber-200 text-amber-800",
            msg: `Tu suscripción vence en ${daysRemaining} días.`,
            action: "Renovar Ahora"
        },
        Gracia: {
            icon: Clock,
            color: "bg-orange-50 border-orange-200 text-orange-800",
            msg: `Suscripción vencida. Tienes ${graceDaysRemaining ?? 0} días de gracia antes del bloqueo.`,
            action: "Pagar Pendiente"
        },
        Bloqueado: {
            icon: Lock,
            color: "bg-red-50 border-red-200 text-red-800",
            msg: "Acceso bloqueado por falta de pago.",
            action: "Regularizar Cuenta"
        }
    };

    const config = variants[state];
    if (!config) return null;

    return (
        <div className={`flex items-center justify-between p-4 mb-6 border rounded-xl shadow-sm ${config.color}`}>
            <div className="flex items-center gap-3">
                <config.icon className="w-5 h-5" />
                <span className="text-sm font-semibold">{config.msg}</span>
            </div>
            <Link href="/pagos">
                <Button size="sm" variant="outline" className="bg-white/50 border-current hover:bg-white transition-colors h-8">
                    {config.action}
                </Button>
            </Link>
        </div>
    );
}
