"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle, Headphones, CreditCard, X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/AuthContext";

const SUPPORT_PHONE = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || "18495890656";

export function SupportChat() {
    const [isOpen, setIsOpen] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);
    const pathname = usePathname();
    const { user } = useAuth();

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (isOpen && panelRef.current && !panelRef.current.contains(e.target as Node)) {
                const target = e.target as HTMLElement;
                if (!target.closest('[data-support-trigger]')) {
                    setIsOpen(false);
                }
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    const handleWhatsApp = (type: "tech" | "billing") => {
        // Nombre para el mensaje: perfil (appConfig) > nombre fiscal > nombre de usuario
        let displayName = user?.name || "Usuario";
        try {
            const raw = typeof window !== "undefined" ? localStorage.getItem("appConfig") : null;
            const appConfig = raw ? JSON.parse(raw) : {};
            const fromConfig = appConfig.companyName || appConfig.name;
            if (fromConfig) displayName = fromConfig;
            else if (user?.fiscalStatus?.confirmed) displayName = user.fiscalStatus.confirmed;
        } catch {
            if (user?.fiscalStatus?.confirmed) displayName = user.fiscalStatus.confirmed;
        }
        const pantalla = pathname ? pathname.replace(/^\//, "") || "inicio" : "";
        const desde = pantalla ? `, desde ${pantalla}.` : ".";

        let message = "";
        if (type === "tech") {
            message = `Hola, soy ${displayName} de Lexis Bill${desde} Necesito soporte técnico con...`;
        } else {
            message = `Hola, soy ${displayName} de Lexis Bill${desde} Tengo una consulta de facturación o pagos sobre...`;
        }

        window.open(`https://wa.me/${SUPPORT_PHONE}?text=${encodeURIComponent(message)}`, "_blank");
    };

    return (
        <div
            className="fixed z-50 bottom-28 left-4 md:bottom-6 md:left-auto md:right-6"
            role="complementary"
            aria-label="Widget de soporte"
        >
            {isOpen ? (
                <div
                    ref={panelRef}
                    className="bg-card rounded-lg shadow-2xl border border-border mb-4 w-72 overflow-hidden animate-in slide-in-from-bottom-5"
                    role="dialog"
                    aria-labelledby="support-title"
                    aria-modal="true"
                >
                    <div className="p-4 text-white flex justify-between items-center bg-[#25D366]">
                        <div>
                            <h3 id="support-title" className="font-bold">
                                Soporte Lexis Bill
                            </h3>
                            <p className="text-xs opacity-90 flex items-center gap-1.5 mt-0.5">
                                <Clock className="w-3 h-3" aria-hidden />
                                Lun–Vie 9:00–18:00
                            </p>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-white hover:bg-white/20 rounded-full p-1 transition-colors"
                            aria-label="Cerrar soporte"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                    <div className="p-4 space-y-2 bg-background">
                        <Button
                            variant="outline"
                            className="w-full justify-start gap-2 hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                            onClick={() => handleWhatsApp("tech")}
                            aria-label="Abrir WhatsApp para Soporte Técnico"
                        >
                            <Headphones className="h-4 w-4 shrink-0" aria-hidden />
                            Soporte Técnico
                        </Button>
                        <Button
                            variant="outline"
                            className="w-full justify-start gap-2 hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                            onClick={() => handleWhatsApp("billing")}
                            aria-label="Abrir WhatsApp para Facturación y Pagos"
                        >
                            <CreditCard className="h-4 w-4 shrink-0" aria-hidden />
                            Facturación y Pagos
                        </Button>
                    </div>
                    <div className="bg-muted/50 p-2 text-center text-[10px] text-muted-foreground border-t border-border">
                        Respuesta estimada: &lt; 5 min
                    </div>
                </div>
            ) : null}

            <button
                data-support-trigger
                onClick={() => setIsOpen(!isOpen)}
                className="h-14 w-14 bg-[#25D366] text-white rounded-full shadow-xl shadow-green-500/30 flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
                aria-label={isOpen ? "Cerrar soporte" : "Abrir soporte Lexis Bill"}
                aria-expanded={isOpen ? "true" : "false"}
            >
                <MessageCircle className="h-8 w-8" aria-hidden />
            </button>
        </div>
    );
}
