"use client";

import { useEffect, useState } from "react";
import { Sparkles, ArrowRight, Clock } from "lucide-react";
import { api } from "@/lib/api-service";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function TrialBanner() {
    const [status, setStatus] = useState<any>(null);

    useEffect(() => {
        api.getSubscriptionStatus()
            .then(data => setStatus(data))
            .catch(err => console.error("Error fetching trial status:", err));
    }, []);

    if (!status || status.subscriptionStatus !== 'Trial') return null;

    const { daysRemaining } = status;

    return (
        <div className="relative group overflow-hidden rounded-2xl mb-8 p-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 shadow-xl shadow-blue-500/20">
            <div className="relative bg-white/95 backdrop-blur-md rounded-[14px] p-5 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4 text-center md:text-left">
                    <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 shrink-0 animate-pulse">
                        <Clock className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-black text-slate-900 leading-tight flex items-center gap-2 justify-center md:justify-start">
                            CONVIÉRTETE EN PRO <Sparkles className="w-4 h-4 text-amber-500" />
                        </h4>
                        <p className="text-sm text-slate-500 font-medium mt-1">
                            Tu prueba gratuita vence en <span className="text-blue-600 font-black">{daysRemaining} días</span>. Activa tu suscripción para seguir facturando sin límites.
                        </p>
                    </div>
                </div>

                <Link href="/pagos" className="w-full md:w-auto">
                    <Button className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white font-black px-8 py-6 rounded-xl shadow-lg shadow-blue-600/20 group-hover:scale-105 transition-transform flex gap-2">
                        Activar Cuenta PRO <ArrowRight className="w-4 h-4" />
                    </Button>
                </Link>
            </div>

            {/* Glossy overlay effect */}
            <div className="absolute top-0 -left-[100%] w-[50%] h-full bg-white/20 skew-x-[-30deg] animate-[shimmer_3s_infinite]"></div>
        </div>
    );
}
