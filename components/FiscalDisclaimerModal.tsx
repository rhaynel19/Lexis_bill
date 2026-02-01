"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Download, Loader2 } from "lucide-react";

const FISCAL_DISCLAIMER_TEXT =
    "LexisBill genera archivos con base en la información suministrada por el usuario. Debes pre-validar los archivos con la herramienta oficial de la DGII antes de presentarlos. La validación y presentación ante la DGII es responsabilidad del contribuyente.";

export interface FiscalDisclaimerModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    reportType: "606" | "607";
    reportLabel: string;
    onConfirmDownload: () => void | Promise<void>;
    isDownloading?: boolean;
    validationErrors?: string[];
}

export function FiscalDisclaimerModal({
    open,
    onOpenChange,
    reportType,
    reportLabel,
    onConfirmDownload,
    isDownloading = false,
    validationErrors = []
}: FiscalDisclaimerModalProps) {
    const [confirmed, setConfirmed] = useState(false);
    const hasValidationErrors = validationErrors.length > 0;

    const handleClose = () => {
        setConfirmed(false);
        onOpenChange(false);
    };

    const handleConfirm = async () => {
        if (!confirmed) return;
        try {
            await onConfirmDownload();
            handleClose();
        } catch {
            // Error ya manejado en el parent (isDownloading se resetea)
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-md bg-background border-border/20 shadow-2xl">
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${hasValidationErrors ? "bg-red-500/10" : "bg-amber-500/10"}`}>
                            <ShieldAlert className={`w-5 h-5 ${hasValidationErrors ? "text-red-600" : "text-amber-600"}`} />
                        </div>
                        <div>
                            <DialogTitle className="text-lg">
                                {hasValidationErrors ? "El archivo no cumple el formato DGII" : `Antes de descargar el Reporte ${reportType}`}
                            </DialogTitle>
                            <DialogDescription>
                                {hasValidationErrors ? "Corrija los siguientes errores antes de descargar." : reportLabel}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    {hasValidationErrors ? (
                        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                            <p className="text-sm font-semibold text-red-800 dark:text-red-200 mb-2">
                                Errores de validación:
                            </p>
                            <ul className="list-disc list-inside text-sm text-red-700 dark:text-red-300 space-y-1">
                                {validationErrors.map((err, i) => (
                                    <li key={i}>{err}</li>
                                ))}
                            </ul>
                        </div>
                    ) : (
                        <>
                            <p className="text-sm text-muted-foreground leading-relaxed p-4 rounded-xl bg-muted/50 border border-border/20">
                                {FISCAL_DISCLAIMER_TEXT}
                            </p>
                            <label
                                htmlFor="fiscal-disclaimer-checkbox"
                                className="flex items-start gap-3 p-4 rounded-xl bg-muted/30 border border-border/20 cursor-pointer hover:bg-muted/50 transition-colors"
                            >
                                <input
                                    id="fiscal-disclaimer-checkbox"
                                    type="checkbox"
                                    checked={confirmed}
                                    onChange={(e) => setConfirmed(e.target.checked)}
                                    className="mt-0.5 w-4 h-4 rounded border-border text-accent focus:ring-accent"
                                    aria-required="true"
                                    aria-describedby="disclaimer-checkbox-desc"
                                />
                                <span id="disclaimer-checkbox-desc" className="text-sm font-medium text-foreground">
                                    Confirmo que revisaré el archivo antes de enviarlo a la DGII
                                </span>
                            </label>
                        </>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose} disabled={isDownloading}>
                        {hasValidationErrors ? "Cerrar" : "Cancelar"}
                    </Button>
                    {!hasValidationErrors && (
                        <Button
                            onClick={handleConfirm}
                            disabled={!confirmed || isDownloading}
                            className="gap-2"
                        >
                            {isDownloading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Procesando...
                                </>
                            ) : (
                                <>
                                    <Download className="w-4 h-4" />
                                    Descargar {reportType}
                                </>
                            )}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
