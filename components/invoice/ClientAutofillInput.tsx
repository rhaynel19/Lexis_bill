"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api-service";
import { Loader2, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AutofillClient {
    name: string;
    rnc: string;
    phone: string;
    lastTotal?: number;
    count?: number;
    usualTipoPago?: string;
}

export interface AutofillLastInvoice {
    items: Array<{ description: string; quantity: number; price: number; isExempt?: boolean }>;
    tipoPago: string;
    ncfType?: string;
    total?: number;
    date?: string;
}

interface ClientAutofillInputProps {
    value: string;
    onChange: (value: string) => void;
    onSelectClient: (client: AutofillClient, lastInvoice?: AutofillLastInvoice | null) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    inputClassName?: string;
}

const formatCurrency = (n: number) =>
    new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP", maximumFractionDigits: 0 }).format(n);

const TIPO_PAGO_LABELS: Record<string, string> = {
    efectivo: "Efectivo",
    transferencia: "Transferencia",
    tarjeta: "Tarjeta",
    credito: "Crédito",
    mixto: "Mixto",
};

function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const t = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(t);
    }, [value, delay]);
    return debouncedValue;
}

export function ClientAutofillInput({
    value,
    onChange,
    onSelectClient,
    placeholder = "Buscar por nombre o RNC...",
    disabled,
    className,
    inputClassName,
}: ClientAutofillInputProps) {
    const [suggestions, setSuggestions] = useState<AutofillClient[]>([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [highlight, setHighlight] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);
    const debouncedQ = useDebounce(value.trim(), 280);

    const fetchSuggestions = useCallback(async (q: string) => {
        if (!q || q.length < 2) {
            setSuggestions([]);
            return;
        }
        setLoading(true);
        try {
            const res = await api.getAutofillSuggestions({ q });
            setSuggestions(res.clients || []);
            setHighlight(-1);
        } catch {
            setSuggestions([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (debouncedQ.length >= 2) {
            fetchSuggestions(debouncedQ);
            setOpen(true);
        } else {
            setSuggestions([]);
            setOpen(false);
        }
    }, [debouncedQ, fetchSuggestions]);

    const handleSelect = useCallback(
        async (client: AutofillClient) => {
            onChange(client.name);
            setSuggestions([]);
            setOpen(false);

            let lastInvoice: AutofillLastInvoice | null = null;
            const cleanRnc = client.rnc.replace(/[^\d]/g, "");
            if (cleanRnc.length >= 9) {
                try {
                    const res = await api.getAutofillSuggestions({ rnc: cleanRnc });
                    lastInvoice = res.lastInvoice || null;
                } catch {
                    lastInvoice = null;
                }
            }

            onSelectClient(client, lastInvoice);
        },
        [onChange, onSelectClient]
    );

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!open || suggestions.length === 0) return;
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlight((h) => (h < suggestions.length - 1 ? h + 1 : 0));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((h) => (h > 0 ? h - 1 : suggestions.length - 1));
        } else if (e.key === "Enter" && highlight >= 0 && suggestions[highlight]) {
            e.preventDefault();
            handleSelect(suggestions[highlight]);
        } else if (e.key === "Escape") {
            setOpen(false);
            setHighlight(-1);
        }
    };

    useEffect(() => {
        const onClick = (ev: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(ev.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", onClick);
        return () => document.removeEventListener("mousedown", onClick);
    }, []);

    const showDropdown = open && (suggestions.length > 0 || loading);

    return (
        <div ref={containerRef} className={cn("relative", className)}>
            <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onFocus={() => value.length >= 2 && setOpen(true)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    disabled={disabled}
                    className={cn("pl-9", inputClassName)}
                    autoComplete="off"
                />
                {loading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin pointer-events-none" />
                )}
            </div>

            {showDropdown && (
                <div className="absolute z-50 w-full mt-1 rounded-lg border bg-popover shadow-lg max-h-[280px] overflow-auto">
                    {loading && suggestions.length === 0 ? (
                        <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Buscando clientes...
                        </div>
                    ) : (
                        suggestions.map((c, i) => (
                            <button
                                key={`${c.rnc}-${i}`}
                                type="button"
                                className={cn(
                                    "w-full text-left px-3 py-2.5 flex flex-col gap-0.5 transition-colors",
                                    i === highlight ? "bg-accent/20 text-accent-foreground" : "hover:bg-muted/50"
                                )}
                                onClick={() => handleSelect(c)}
                            >
                                <div className="font-medium text-foreground">{c.name}</div>
                                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                                    <span>RNC: {c.rnc}</span>
                                    {c.lastTotal != null && <span>Último: {formatCurrency(c.lastTotal)}</span>}
                                    {c.usualTipoPago && (
                                        <span>Pago: {TIPO_PAGO_LABELS[c.usualTipoPago] || c.usualTipoPago}</span>
                                    )}
                                    {c.count != null && c.count > 1 && (
                                        <span className="text-accent font-medium">Cliente frecuente</span>
                                    )}
                                </div>
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
