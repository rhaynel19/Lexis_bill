"use client";

import { useState } from "react";
import { MessageCircle, CreditCard, HeadphonesIcon, FileQuestion } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const SUPPORT_PHONE = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || "18495890656";

const OPTIONS = [
  {
    id: "plan",
    label: "Info del plan / precios",
    icon: CreditCard,
    message: "Hola, me interesa conocer el plan y precios de Lexis Bill. Me gustaría que me respondan sobre...",
  },
  {
    id: "soporte",
    label: "Soporte técnico",
    icon: HeadphonesIcon,
    message: "Hola, necesito soporte técnico con Lexis Bill. Me gustaría que me respondan sobre...",
  },
  {
    id: "cotizacion",
    label: "Cotización u otro",
    icon: FileQuestion,
    message: "Hola, tengo una consulta sobre Lexis Bill (cotización u otro). Me gustaría que me respondan sobre...",
  },
];

export default function WhatsAppWidget() {
  const [open, setOpen] = useState(false);

  const handleOption = (message: string) => {
    setOpen(false);
    const url = `https://wa.me/${SUPPORT_PHONE}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="fixed bottom-8 right-8 z-[100] group flex items-center gap-3 rounded-full focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:ring-offset-2 focus:ring-offset-[#0A192F]"
          aria-label="Abrir opciones de contacto por WhatsApp"
        >
          <span className="bg-[#0A192F]/90 backdrop-blur-md text-[#F9F6EE] text-[10px] font-bold py-2 px-4 rounded-full border border-[#D4AF37]/30 shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0 whitespace-nowrap uppercase tracking-widest pointer-events-none">
            ¿Hablamos?
          </span>
          <div className="w-14 h-14 bg-[#D4AF37] rounded-full flex items-center justify-center shadow-2xl shadow-[#D4AF37]/30 group-hover:bg-[#B8962E] transition-all duration-300 group-hover:scale-110 active:scale-95">
            <MessageCircle className="w-7 h-7 text-[#0A192F] group-hover:rotate-12 transition-transform" />
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="left"
        align="end"
        sideOffset={12}
        className="w-64 sm:w-72 p-0 rounded-xl border-[#D4AF37]/20 bg-[#0A192F] text-[#F9F6EE] shadow-xl"
      >
        <div className="p-3 border-b border-white/10">
          <p className="text-sm font-semibold text-[#D4AF37]">¿En qué podemos ayudarte?</p>
          <p className="text-xs text-slate-400 mt-0.5">Elige un tema y te abrimos WhatsApp con el mensaje listo.</p>
        </div>
        <div className="py-2">
          {OPTIONS.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleOption(opt.message)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm hover:bg-white/5 transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-[#D4AF37]/20 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-[#D4AF37]" />
                </div>
                <span className="font-medium">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
