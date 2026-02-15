"use client";

import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Banknote, CreditCard, Landmark, Receipt, Split, MoreHorizontal, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

const TIPOS_PAGO = [
    { value: "efectivo", label: "Efectivo", icon: Banknote },
    { value: "transferencia", label: "Transferencia bancaria", icon: Landmark },
    { value: "tarjeta", label: "Tarjeta débito/crédito", icon: CreditCard },
    { value: "credito", label: "Venta a crédito", icon: Receipt },
    { value: "mixto", label: "Pago mixto", icon: Split },
    { value: "otro", label: "Otro", icon: MoreHorizontal },
] as const;

const TIPOS_MIXTO = [
    { value: "efectivo", label: "Efectivo" },
    { value: "transferencia", label: "Transferencia" },
    { value: "tarjeta", label: "Tarjeta" },
    { value: "credito", label: "Venta a crédito" },
];

export interface PagoMixtoItem {
    tipo: string;
    monto: number;
}

const TIPO_PAGO_LABELS: Record<string, string> = {
    efectivo: "efectivo",
    transferencia: "transferencia bancaria",
    tarjeta: "tarjeta débito/crédito",
    credito: "venta a crédito",
    mixto: "pago mixto",
};

interface PaymentTypeSelectorProps {
    tipoPago: string;
    onTipoPagoChange: (v: string) => void;
    tipoPagoOtro?: string;
    onTipoPagoOtroChange?: (v: string) => void;
    pagoMixto: PagoMixtoItem[];
    onPagoMixtoChange: (items: PagoMixtoItem[]) => void;
    total: number;
    disabled?: boolean;
    /** Si el cliente suele pagar con este método, mostrar: "Habitualmente paga por X" */
    habitualTipoPago?: string;
}

const formatCurrency = (n: number) =>
    new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP", maximumFractionDigits: 0 }).format(n);

export function PaymentTypeSelector({
    tipoPago,
    onTipoPagoChange,
    tipoPagoOtro = "",
    onTipoPagoOtroChange,
    pagoMixto,
    onPagoMixtoChange,
    total,
    disabled,
    habitualTipoPago,
}: PaymentTypeSelectorProps) {
    const sumMixto = pagoMixto.reduce((s, p) => s + (p.monto || 0), 0);
    const diffMixto = total - sumMixto;

    const addMixtoItem = () => {
        onPagoMixtoChange([...pagoMixto, { tipo: "efectivo", monto: 0 }]);
    };

    const updateMixtoItem = (i: number, field: "tipo" | "monto", value: string | number) => {
        const next = [...pagoMixto];
        if (field === "tipo") next[i] = { ...next[i], tipo: String(value) };
        else next[i] = { ...next[i], monto: Math.max(0, Number(value) || 0) };
        onPagoMixtoChange(next);
    };

    const removeMixtoItem = (i: number) => {
        onPagoMixtoChange(pagoMixto.filter((_, idx) => idx !== i));
    };

    const autoDistributeRemaining = () => {
        if (pagoMixto.length === 0 || diffMixto <= 0) return;
        const perItem = Math.floor(diffMixto / pagoMixto.length);
        const remainder = diffMixto - perItem * pagoMixto.length;
        onPagoMixtoChange(
            pagoMixto.map((p, i) => ({
                ...p,
                monto: p.monto + perItem + (i === 0 ? remainder : 0),
            }))
        );
    };

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label className="text-sm font-semibold flex items-center gap-2">
                    <Banknote className="w-4 h-4" /> Tipo de Pago *
                </Label>
                <Select value={tipoPago} onValueChange={onTipoPagoChange} disabled={disabled}>
                    <SelectTrigger className="bg-white dark:bg-slate-900">
                        <SelectValue placeholder="Selecciona cómo pagó el cliente" />
                    </SelectTrigger>
                    <SelectContent>
                        {TIPOS_PAGO.map((t) => {
                            const Icon = t.icon;
                            return (
                                <SelectItem key={t.value} value={t.value}>
                                    <span className="flex items-center gap-2">
                                        <Icon className="w-4 h-4" /> {t.label}
                                    </span>
                                </SelectItem>
                            );
                        })}
                    </SelectContent>
                </Select>
                {habitualTipoPago && tipoPago === habitualTipoPago && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                        ✓ Habitualmente paga por {TIPO_PAGO_LABELS[habitualTipoPago] || habitualTipoPago}.
                    </p>
                )}
            </div>

            {tipoPago === "otro" && (
                <div className="space-y-2">
                    <Label>Especificar (opcional)</Label>
                    <Input
                        placeholder="Ej: Cheque, Cripto, etc."
                        value={tipoPagoOtro}
                        onChange={(e) => onTipoPagoOtroChange?.(e.target.value)}
                        className="max-w-xs"
                        disabled={disabled}
                    />
                </div>
            )}

            {tipoPago === "mixto" && (
                <div className="space-y-3 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30">
                    <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Dividir montos</Label>
                        <span className="text-xs text-muted-foreground">Total: {formatCurrency(total)}</span>
                    </div>
                    {pagoMixto.map((item, i) => (
                        <div key={i} className="flex gap-2 items-center">
                            <Select
                                value={item.tipo}
                                onValueChange={(v) => updateMixtoItem(i, "tipo", v)}
                                disabled={disabled}
                            >
                                <SelectTrigger className="w-[140px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {TIPOS_MIXTO.map((t) => (
                                        <SelectItem key={t.value} value={t.value}>
                                            {t.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Input
                                type="number"
                                min={0}
                                step={1}
                                placeholder="0"
                                value={item.monto || ""}
                                onChange={(e) => updateMixtoItem(i, "monto", e.target.value)}
                                className="flex-1"
                                disabled={disabled}
                            />
                            <button
                                type="button"
                                onClick={() => removeMixtoItem(i)}
                                className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded"
                                disabled={disabled || pagoMixto.length <= 1}
                                aria-label="Quitar método de pago"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addMixtoItem}
                            disabled={disabled}
                            className="gap-1"
                        >
                            <Plus className="w-3.5 h-3.5" /> Agregar método
                        </Button>
                        {Math.abs(diffMixto) > 1 && (
                            <button
                                type="button"
                                onClick={autoDistributeRemaining}
                                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                            >
                                Distribuir {formatCurrency(Math.abs(diffMixto))} restante
                            </button>
                        )}
                    </div>
                    <p
                        className={cn(
                            "text-xs",
                            Math.abs(diffMixto) <= 1
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-amber-600 dark:text-amber-400"
                        )}
                    >
                        {Math.abs(diffMixto) <= 1
                            ? "✓ Montos cuadran"
                            : `Falta ${formatCurrency(Math.abs(diffMixto))} para cuadrar`}
                    </p>
                </div>
            )}
        </div>
    );
}
