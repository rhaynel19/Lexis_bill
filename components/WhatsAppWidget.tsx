"use client";

import { MessageCircle } from "lucide-react";

export default function WhatsAppWidget() {
    return (
        <a
            href="https://wa.me/18298495890656"
            target="_blank"
            rel="noopener noreferrer"
            className="fixed bottom-8 right-8 z-[100] group flex items-center gap-3"
        >
            <span className="bg-[#0A192F]/90 backdrop-blur-md text-[#F9F6EE] text-[10px] font-bold py-2 px-4 rounded-full border border-[#D4AF37]/30 shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0 whitespace-nowrap uppercase tracking-widest">
                Asistencia Premium
            </span>
            <div className="w-14 h-14 bg-[#D4AF37] rounded-full flex items-center justify-center shadow-2xl shadow-[#D4AF37]/30 group-hover:bg-[#B8962E] transition-all duration-300 group-hover:scale-110 active:scale-95">
                <MessageCircle className="w-7 h-7 text-[#0A192F] group-hover:rotate-12 transition-transform" />
            </div>
        </a>
    );
}
