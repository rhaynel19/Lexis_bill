"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-service";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CreditCard, Calendar, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { motion } from "framer-motion";

export function MembershipStatusCard() {
    const [status, setStatus] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getSubscriptionStatus()
            .then(data => setStatus(data))
            .finally(() => setLoading(false));
    }, []);

    if (loading || !status) return null;

    const { daysRemaining, plan, status: state, internalStatus } = status;
    const isFree = plan === "free";
    const isPro = plan === "pro" || plan === "premium";
    
    // Calcular porcentaje de tiempo restante (asumiendo ciclo de 30 días para visualización simple si no hay más info)
    // Si daysRemaining > 30, asumimos año (365)
    const maxDays = daysRemaining > 31 ? 365 : 30;
    const percentage = Math.max(0, Math.min(100, (daysRemaining / maxDays) * 100));
    
    const isUrgent = daysRemaining <= 7;
    const isWarning = daysRemaining <= 15;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
        >
            <Card className="overflow-hidden border-none shadow-xl bg-gradient-to-br from-slate-900 to-slate-800 text-white">
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="space-y-4 flex-1 w-full">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/10 rounded-lg">
                                    <CreditCard className="w-5 h-5 text-trinalyze-gold" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Estado de Membresía</p>
                                    <h3 className="text-xl font-bold flex items-center gap-2">
                                        Plan {plan.toUpperCase()} 
                                        {state === "Activo" && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                                    </h3>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-sm font-medium">
                                    <span className="text-slate-300">Tiempo restante</span>
                                    <span className={isUrgent ? "text-red-400 animate-pulse" : isWarning ? "text-amber-400" : "text-emerald-400"}>
                                        {daysRemaining} días
                                    </span>
                                </div>
                                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${percentage}%` }}
                                        transition={{ duration: 1, ease: "easeOut" }}
                                        className={`h-full rounded-full ${
                                            isUrgent ? "bg-red-500" : isWarning ? "bg-amber-500" : "bg-emerald-500"
                                        }`}
                                    />
                                </div>
                                <p className="text-[10px] text-slate-500 italic">
                                    * Tu acceso se renovará automáticamente al completar el pago del próximo ciclo.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 w-full md:w-auto">
                            <Link href="/pagos" className="w-full">
                                <Button className="w-full bg-trinalyze-gold hover:bg-trinalyze-gold-hover text-white font-bold border-none shadow-lg shadow-trinalyze-gold/20">
                                    {isUrgent ? "PAGAR AHORA" : "GESTIONAR PLAN"}
                                </Button>
                            </Link>
                            <Link href="/admin/historial-pagos" className="w-full">
                                <Button variant="ghost" className="w-full text-slate-400 hover:text-white hover:bg-white/5 text-xs">
                                    Ver historial de facturación
                                </Button>
                            </Link>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}
