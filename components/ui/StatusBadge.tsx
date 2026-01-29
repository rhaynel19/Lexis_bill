"use client";

import { cn } from "@/lib/utils";
import { CheckCircle2, Clock, AlertCircle, Send, FileEdit, Ban } from "lucide-react";

type StatusType =
    | "borrador" | "enviada" | "editada" | "aprobada" | "vencida"  // Quotes
    | "emitida" | "pagada" | "anulada" | "pending";               // Invoices

interface StatusBadgeProps {
    status: StatusType | string;
    className?: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    borrador: { label: "Borrador", color: "bg-slate-100 text-slate-600 border-slate-200", icon: Clock },
    enviada: { label: "Enviada", color: "bg-blue-50 text-blue-700 border-blue-100", icon: Send },
    editada: { label: "Editada", color: "bg-amber-50 text-amber-700 border-amber-100", icon: FileEdit },
    aprobada: { label: "Aprobada", color: "bg-emerald-50 text-emerald-700 border-emerald-100", icon: CheckCircle2 },
    vencida: { label: "Vencida", color: "bg-red-50 text-red-700 border-red-100", icon: AlertCircle },
    emitida: { label: "Emitida", color: "bg-indigo-50 text-indigo-700 border-indigo-100", icon: Send },
    pagada: { label: "Pagada", color: "bg-emerald-50 text-emerald-700 border-emerald-100", icon: CheckCircle2 },
    anulada: { label: "Anulada", color: "bg-red-50 text-red-700 border-red-100", icon: Ban },
    pending: { label: "Pendiente", color: "bg-amber-50 text-amber-700 border-amber-100", icon: Clock },
    // Compatibilidad con estados previos
    open: { label: "Abierta", color: "bg-blue-50 text-blue-700 border-blue-100", icon: Send },
    paid: { label: "Pagada", color: "bg-emerald-50 text-emerald-700 border-emerald-100", icon: CheckCircle2 },
    cancelled: { label: "Anulada", color: "bg-red-50 text-red-700 border-red-100", icon: Ban },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
    const normalizedStatus = status.toLowerCase();
    const config = statusConfig[normalizedStatus] || {
        label: status,
        color: "bg-slate-100 text-slate-600 border-slate-200",
        icon: Clock
    };

    const Icon = config.icon;

    return (
        <span className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-sm transition-all",
            config.color,
            className
        )}>
            <Icon className="w-3.5 h-3.5" />
            {config.label}
        </span>
    );
}
