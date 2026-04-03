"use client";

import Link from "next/link";
import { Plus, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NewInvoiceButtonProps {
    variant?: "fab" | "sidebar" | "inline" | "card";
    className?: string;
}

export function NewInvoiceButton({ variant = "inline", className }: NewInvoiceButtonProps) {
    if (variant === "fab") {
        return (
            <Link href="/nueva-factura">
                <button
                    className={cn(
                        "h-16 w-16 bg-slate-950 text-[#DEB23E] rounded-full",
                        "shadow-2xl shadow-amber-600/40 flex items-center justify-center",
                        "border-2 border-[#DEB23E]/40 hover:scale-110 active:scale-95 transition-all",
                        className
                    )}
                    aria-label="Nueva factura"
                    title="Nueva factura"
                >
                    <Plus className="h-9 w-9" />
                </button>
            </Link>
        );
    }
    
    if (variant === "sidebar") {
        return (
            <Link href="/nueva-factura">
                <Button className={cn("flex items-center gap-3 px-4 py-3 rounded-lg bg-sidebar-primary text-sidebar-primary-foreground font-bold shadow-lg shadow-sidebar-primary/20 hover:bg-sidebar-primary/90 hover:text-sidebar-primary-foreground hover:scale-[1.02] transition-all", className)}>
                    <Plus className="w-5 h-5" />
                    <span>Nueva Factura</span>
                </Button>
            </Link>
        );
    }
    
    if (variant === "card") {
        return (
            <Link href="/nueva-factura">
                <Button size="sm" className={cn("bg-gradient-to-r from-slate-700 via-blue-600 to-violet-600 text-white border-0 hover:opacity-90", className)}>
                    <FileText className="w-3.5 h-3.5 mr-1.5" />
                    Nueva factura
                </Button>
            </Link>
        );
    }
    
    // inline (default)
    return (
        <Link href="/nueva-factura">
            <Button className={cn(
                "gap-2 bg-slate-950 hover:bg-slate-900 text-[#DEB23E] border border-[#DEB23E]/30 shadow-lg shadow-amber-900/20 font-bold",
                className
            )}>
                <Plus className="w-4 h-4" />
                Nueva Factura
            </Button>
        </Link>
    );
}
