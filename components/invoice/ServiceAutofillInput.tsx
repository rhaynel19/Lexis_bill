"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api-service";
import { Loader2, Package } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AutofillService {
    description: string;
    price: number;
    isExempt: boolean;
    count?: number;
}

interface ServiceAutofillInputProps {
    itemId: string;
    value: string;
    onChange: (value: string) => void;
    onSelectService: (service: AutofillService) => void;
    placeholder?: string;
    className?: string;
    exemptDefault?: boolean;
}

function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const t = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(t);
    }, [value, delay]);
    return debouncedValue;
}

const formatCurrency = (n: number) =>
    new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP", maximumFractionDigits: 0 }).format(n);

export function ServiceAutofillInput({
    itemId,
    value,
    onChange,
    onSelectService,
    placeholder = "Descripción...",
    className,
}: ServiceAutofillInputProps) {
    const [suggestions, setSuggestions] = useState<AutofillService[]>([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [highlight, setHighlight] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);
    const debouncedQ = useDebounce(value.trim(), 250);

    const fetchSuggestions = useCallback(async (q: string) => {
        setLoading(true);
        try {
            const res = await api.getAutofillSuggestions({ q: q || "" });
            setSuggestions(res.services || []);
            setHighlight(-1);
        } catch {
            setSuggestions([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (debouncedQ.length >= 1) {
            fetchSuggestions(debouncedQ);
            setOpen(true);
        } else {
            setSuggestions([]);
            setOpen(false);
        }
    }, [debouncedQ, fetchSuggestions]);

    const handleSelect = useCallback(
        (s: AutofillService) => {
            onChange(s.description);
            onSelectService(s);
            setSuggestions([]);
            setOpen(false);
        },
        [onChange, onSelectService]
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

    const showDropdown = open && (suggestions.length > 0 || loading) && debouncedQ.length >= 1;

    return (
        <div ref={containerRef} className={cn("relative", className)}>
            <div className="relative">
    <Input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onFocus={() => setOpen(true)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    className={cn(
                        "pr-8 min-h-[2.25rem]",
                        "text-slate-900 dark:text-slate-100 placeholder:text-muted-foreground",
                        "bg-white dark:bg-slate-900 border-input",
                        "caret-slate-900 dark:caret-slate-100",
                        className
                    )}
                    autoComplete="off"
                />
            </div>

            {showDropdown && (
                <div className="absolute z-50 w-full mt-0.5 rounded-lg border bg-popover shadow-lg max-h-[200px] overflow-auto">
                    {loading && suggestions.length === 0 ? (
                        <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Buscando servicios...
                        </div>
                    ) : (
                        suggestions.map((s, i) => (
                            <button
                                key={`${s.description}-${i}`}
                                type="button"
                                className={cn(
                                    "w-full text-left px-3 py-2 flex items-center justify-between gap-2 transition-colors",
                                    i === highlight ? "bg-accent/20 text-accent-foreground" : "hover:bg-muted/50"
                                )}
                                onClick={() => handleSelect(s)}
                            >
                                <span className="truncate font-medium text-foreground">{s.description}</span>
                                <span className="text-xs text-muted-foreground shrink-0">
                                    {formatCurrency(s.price)}
                                    {s.isExempt && " • Exento"}
                                </span>
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
