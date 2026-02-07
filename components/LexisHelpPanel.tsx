"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { MessageCircle, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

const FAQ_ITEMS: { q: string; a: string }[] = [
    { q: "¿Qué tipo de comprobante usar?", a: "Si tu cliente es una empresa con RNC de 9 dígitos, usa B01 o E31 (Crédito Fiscal). Si es persona física o consumidor final, usa B02 o E32 (Consumo). Lexis te sugiere el tipo según el RNC." },
    { q: "¿Cuándo enviar el reporte 606?", a: "El 606 se presenta mensualmente a la DGII. Debes declarar las compras y gastos del mes. Lexis genera el archivo en formato DGII desde la sección Reportes Fiscales." },
    { q: "¿Cuándo enviar el reporte 607?", a: "El 607 declara las ventas del mes. Se presenta mensualmente junto con el 606. Genera ambos desde Reportes Fiscales antes del plazo de la DGII." },
    { q: "¿Qué significa retención ISR?", a: "Es el 10% que las empresas retienen de tus honorarios cuando facturas como profesional (B01/E31). Tú emites el monto bruto; ellos retienen el 10% y te pagan el neto. Es obligatorio para persona jurídica." },
    { q: "¿Cómo obtengo más NCF?", a: "Solicita nuevos rangos de NCF a la DGII. Cuando una secuencia esté por agotarse, Lexis te alertará. Ve a Configuración → Comprobantes Fiscales para gestionar tus secuencias." },
    { q: "¿Puedo cambiar una factura emitida?", a: "Una factura emitida no se edita. Si hay error, debes emitir una Nota de Crédito (B04/E34) que anula o corrige el comprobante original." },
];

function FaqItem({ q, a }: { q: string; a: string }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="border-b border-border/50 last:border-0">
            <button
                onClick={() => setOpen(!open)}
                className="w-full py-3 flex items-center justify-between text-left hover:bg-muted/50 px-2 rounded-lg transition-colors"
            >
                <span className="font-medium text-sm text-foreground">{q}</span>
                {open ? <ChevronUp className="w-4 h-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />}
            </button>
            {open && (
                <div className="px-2 pb-3 text-sm text-muted-foreground leading-relaxed">
                    {a}
                </div>
            )}
        </div>
    );
}

export function LexisHelpPanel() {
    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 text-amber-700 border-amber-200 hover:bg-amber-50 hover:border-amber-300 dark:text-amber-400 dark:border-amber-800 dark:hover:bg-amber-950/50"
                    aria-label="Preguntarle a Lexis"
                >
                    <MessageCircle className="w-4 h-4" />
                    Pregúntale a Lexis
                </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
                <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                        <MessageCircle className="w-5 h-5 text-amber-600" />
                        Pregúntale a Lexis
                    </SheetTitle>
                </SheetHeader>
                <p className="text-sm text-muted-foreground mt-2 mb-6">
                    Respuestas rápidas sobre facturación y reportes fiscales en RD.
                </p>
                <div className="space-y-0">
                    {FAQ_ITEMS.map((item, i) => (
                        <FaqItem key={i} q={item.q} a={item.a} />
                    ))}
                </div>
                <p className="mt-6 text-xs text-muted-foreground">
                    ¿Necesitas más ayuda? Usa el botón verde de WhatsApp para hablar con soporte.
                </p>
            </SheetContent>
        </Sheet>
    );
}
