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

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
    borrador: { label: "Borrador", color: "bg-muted/50 text-muted-foreground border-border/20", icon: Clock },
    draft: { label: "Borrador", color: "bg-muted/50 text-muted-foreground border-border/20", icon: Clock },
    enviada: { label: "Enviada", color: "bg-accent/10 text-accent border-accent/20", icon: Send },
    sent: { label: "Enviada", color: "bg-accent/10 text-accent border-accent/20", icon: Send },
    converted: { label: "Facturada", color: "bg-success/10 text-success border-success/20", icon: CheckCircle2 },
    editada: { label: "Editada", color: "bg-warning/10 text-warning border-warning/20", icon: FileEdit },
    aprobada: { label: "Aprobada", color: "bg-success/10 text-success border-success/20", icon: CheckCircle2 },
    vencida: { label: "Vencida", color: "bg-destructive/10 text-destructive border-destructive/20", icon: AlertCircle },
    emitida: { label: "Emitida", color: "bg-accent/10 text-accent border-accent/20", icon: Send },
    pagada: { label: "Pagada", color: "bg-success/10 text-success border-success/20", icon: CheckCircle2 },
    anulada: { label: "Anulada", color: "bg-destructive/10 text-destructive border-destructive/20", icon: Ban },
    pending: { label: "Pendiente", color: "bg-warning/10 text-warning border-warning/20", icon: Clock },
    // Compatibilidad con estados previos
    open: { label: "Abierta", color: "bg-accent/10 text-accent border-accent/20", icon: Send },
    paid: { label: "Pagada", color: "bg-success/10 text-success border-success/20", icon: CheckCircle2 },
    cancelled: { label: "Anulada", color: "bg-destructive/10 text-destructive border-destructive/20", icon: Ban },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
    const normalizedStatus = status.toLowerCase();
    const config = statusConfig[normalizedStatus] || {
        label: status,
        color: "bg-muted/50 text-muted-foreground border-border/20",
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
