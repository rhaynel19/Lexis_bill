"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileSpreadsheet, Download, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { api } from "@/lib/api-service";
import { toast } from "sonner";

export function CustomerMigration({ onImportSuccess }: { onImportSuccess: () => void }) {
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [results, setResults] = useState<{ success: boolean; message: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDownloadTemplate = () => {
        const csvContent = "rnc,name,phone,email,notes\n101010101,Ejemplo Empresa SRL,8095550000,contacto@ejemplo.com,Cliente preferencial\n";
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "lexis_bill_clientes_plantilla.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const processFile = async (file: File) => {
        if (!file.name.endsWith('.csv') && !file.name.endsWith('.json')) {
            toast.error("Solo se admiten archivos .csv o .json. Si tienes Excel, expórtalo como CSV.");
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            toast.error("El archivo supera el límite de 2 MB.");
            return;
        }

        setIsUploading(true);
        setResults(null);

        try {
            const text = await file.text();
            let data: any[] = [];

            if (file.name.endsWith('.csv')) {
                const lines = text.split('\n');
                const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
                data = lines.slice(1).filter(l => l.trim()).map(line => {
                    const values = line.split(',');
                    const obj: any = {};
                    headers.forEach((h, i) => obj[h] = values[i]?.trim());
                    return obj;
                });
            } else {
                data = JSON.parse(text);
            }

            const response = await api.importCustomers(data);
            const msg = response.message || "Clientes importados correctamente.";
            setResults({ success: true, message: msg });
            toast.success(msg);
            onImportSuccess();
        } catch (error: any) {
            const errMsg = error.message || "Error al procesar el archivo. Revisa el formato (RNC, nombre).";
            setResults({ success: false, message: errMsg });
            toast.error(errMsg);
        } finally {
            setIsUploading(false);
        }
    };

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) processFile(file);
    };

    return (
        <Card className="border-none shadow-xl bg-white/50 backdrop-blur-sm overflow-hidden mb-8">
            <CardHeader className="bg-primary/5 pb-4">
                <CardTitle className="text-primary flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5" aria-hidden /> Subir planilla de clientes
                </CardTitle>
                <CardDescription>Migra tus clientes desde un CSV o desde Excel (exportado como CSV). Sin copiar a mano.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
                <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                            <h4 className="font-bold text-blue-900 text-sm mb-2 flex items-center gap-2">
                                <Download className="w-4 h-4" aria-hidden /> ¿No tienes una plantilla?
                            </h4>
                            <p className="text-xs text-blue-700 leading-relaxed mb-4">
                                Descarga el formato estándar (CSV). Si usas Excel, guarda como &quot;CSV (delimitado por comas)&quot; y súbelo aquí.
                            </p>
                            <Button variant="outline" size="sm" className="w-full bg-white border-blue-200 text-blue-700 hover:bg-blue-50" onClick={handleDownloadTemplate}>
                                Descargar plantilla CSV
                            </Button>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <h4 className="font-bold text-slate-900 text-sm mb-2">Formato de la planilla</h4>
                            <ul className="text-[11px] text-slate-500 space-y-1 list-disc pl-4">
                                <li><strong>RNC:</strong> 9 u 11 dígitos (obligatorio).</li>
                                <li><strong>Nombre:</strong> Razón social o nombre del cliente.</li>
                                <li><strong>Opcional:</strong> phone, email, notes.</li>
                                <li>Si un RNC ya existe, se actualiza con los nuevos datos.</li>
                            </ul>
                        </div>
                    </div>

                    <div
                        className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-all ${isDragging ? "border-primary bg-primary/5" : "border-slate-200 bg-slate-50/50"}`}
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={onDrop}
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
                            accept=".csv,.json"
                            aria-label="Subir archivo CSV o JSON para migración"
                            title="Subir archivo"
                        />

                        {isUploading ? (
                            <div className="space-y-4">
                                <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
                                <p className="text-sm font-medium text-slate-600">Procesando archivo...</p>
                            </div>
                        ) : results ? (
                            <div className="space-y-4 animate-in zoom-in">
                                {results.success ? (
                                    <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
                                ) : (
                                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
                                )}
                                <p className={`text-sm font-bold ${results.success ? "text-green-700" : "text-red-700"}`}>
                                    {results.message}
                                </p>
                                <Button variant="ghost" size="sm" onClick={() => setResults(null)}>Subir otro archivo</Button>
                            </div>
                        ) : (
                            <>
                                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 mb-4">
                                    <Upload className="w-8 h-8 text-primary" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 capitalize">Arrastra tu planilla aquí</h3>
                                <p className="text-xs text-slate-500 mt-1 mb-6 px-4">CSV o JSON, hasta 2 MB. Excel: expórtalo como CSV.</p>
                                <Button onClick={() => fileInputRef.current?.click()} className="shadow-lg shadow-primary/20" aria-label="Seleccionar archivo CSV o JSON">
                                    Seleccionar archivo
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
