"use client";

import { useState } from "react";
import { MessageCircle, Headphones, CreditCard, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SupportChat() {
    const [isOpen, setIsOpen] = useState(false);

    const handleWhatsApp = (type: "tech" | "billing") => {
        const phone = "18095550000"; // Reemplazar con real
        let message = "";

        // Try to get user name from local storage
        let userName = "Usuario";
        if (typeof window !== "undefined") {
            const user = localStorage.getItem("user");
            if (user) userName = JSON.parse(user).name || "Usuario";
        }

        if (type === "tech") {
            message = `Hola, soy ${userName} de Lexis Bill y necesito Soporte Técnico Especializado con...`;
        } else {
            message = `Hola, soy ${userName} de Lexis Bill y tengo una consulta de Facturación/Pagos sobre...`;
        }

        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank");
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 hidden md:block">
            {isOpen ? (
                <div className="bg-white rounded-lg shadow-2xl border border-gray-200 mb-4 w-72 overflow-hidden animate-in slide-in-from-bottom-5">
                    <div className="bg-[#25D366] p-4 text-white flex justify-between items-center">
                        <div>
                            <h3 className="font-bold">Soporte Lexis Bill</h3>
                            <p className="text-xs opacity-90">● En línea ahora</p>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-white hover:bg-white/20 rounded-full p-1">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                    <div className="p-4 space-y-2">
                        <Button
                            variant="outline"
                            className="w-full justify-start gap-2 hover:bg-green-50 hover:text-green-700 hover:border-green-200"
                            onClick={() => handleWhatsApp("tech")}
                        >
                            <Headphones className="h-4 w-4" />
                            Soporte Técnico
                        </Button>
                        <Button
                            variant="outline"
                            className="w-full justify-start gap-2 hover:bg-green-50 hover:text-green-700 hover:border-green-200"
                            onClick={() => handleWhatsApp("billing")}
                        >
                            <CreditCard className="h-4 w-4" />
                            Facturación y Pagos
                        </Button>
                    </div>
                    <div className="bg-gray-50 p-2 text-center text-[10px] text-gray-400">
                        Respuesta estimada: &lt; 5 min
                    </div>
                </div>
            ) : null}

            <button
                onClick={() => setIsOpen(!isOpen)}
                className="h-14 w-14 bg-[#25D366] text-white rounded-full shadow-xl shadow-green-500/30 flex items-center justify-center hover:scale-110 transition-all relative"
            >
                <MessageCircle className="h-8 w-8" />
                <span className="absolute top-0 right-0 h-3 w-3 bg-red-500 border-2 border-white rounded-full"></span>
            </button>
        </div>
    );
}
