"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileSpreadsheet, Download, CheckCircle2, AlertCircle, Loader2, X, RefreshCw } from "lucide-react";
import { api } from "@/lib/api-service";
import { toast } from "sonner";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_ROWS = 20000;

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface CustomerRow {
    rnc?: string;
    name?: string;
    nombre?: string;
    phone?: string;
    email?: string;
    notes?: string;
    [key: string]: string | undefined;
}

interface ParsedData {
    data: CustomerRow[];
    error?: string;
}

export function CustomerMigration({ onImportSuccess }: { onImportSuccess: () => void }) {
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [results, setResults] = useState<{ success: boolean; message: string } | null>(null);
    const [selectedFile, setSelectedFile] = useState<{ file: File; parsed: ParsedData } | null>(null);
    const [lastError, setLastError] = useState<{ file: File; parsed: ParsedData } | null>(null);
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

    const parseFile = async (file: File): Promise<ParsedData> => {
        if (!file.name.endsWith('.csv') && !file.name.endsWith('.json')) {
            return { data: [], error: 'Solo se admiten archivos .csv o .json.' };
        }
        if (file.size > MAX_FILE_SIZE_BYTES) {
            return { data: [], error: `El archivo supera el límite de ${formatFileSize(MAX_FILE_SIZE_BYTES)}.` };
        }
        try {
            const text = await file.text();
            let data: CustomerRow[] = [];
            if (file.name.endsWith('.csv')) {
                const lines = text.split('\n').filter(l => l.trim());
                if (lines.length < 2) return { data: [], error: 'El CSV está vacío o solo tiene encabezados.' };
                const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
                data = lines.slice(1).filter(l => l.trim()).map(line => {
                    const values = line.split(',').map(v => v?.trim());
                    const obj: Record<string, string> = {};
                    headers.forEach((h, i) => obj[h] = values[i] ?? '');
                    return obj;
                });
            } else {
                const parsed = JSON.parse(text);
                data = Array.isArray(parsed) ? parsed : [];
            }
            if (data.length > MAX_ROWS) {
                return { data: [], error: `Máximo ${MAX_ROWS.toLocaleString('es-DO')} filas. Divide tu archivo.` };
            }
            const validRows = data.filter(r => {
                const rnc = String(r.rnc || '').replace(/[^0-9]/g, '');
                const name = (r.name || r.nombre || '').trim();
                return rnc.length >= 9 && rnc.length <= 11 && name.length > 0;
            });
            if (validRows.length === 0) {
                return { data: [], error: 'No hay filas válidas. RNC 9/11 dígitos y nombre son obligatorios.' };
            }
            return { data: validRows };
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Error al leer el archivo';
            if (msg.includes('JSON')) return { data: [], error: 'JSON inválido. Revisa el formato.' };
            return { data: [], error: msg };
        }
    };

    const onFileSelect = async (file: File) => {
        setResults(null);
        setLastError(null);
        const parsed = await parseFile(file);
        if (parsed.error) {
            toast.error(parsed.error);
            return;
        }
        setSelectedFile({ file, parsed });
    };

    const executeImport = async () => {
        if (!selectedFile) return;
        const { parsed } = selectedFile;
        setIsUploading(true);
        setResults(null);
        try {
            const response = await api.importCustomers(parsed.data);
            const msg = response.message || "Clientes importados correctamente.";
            setResults({ success: true, message: msg });
            toast.success(msg);
            setSelectedFile(null);
            onImportSuccess();
        } catch (error: unknown) {
            let errMsg = "Error al procesar el archivo. Revisa el formato (RNC, nombre).";
            if (error instanceof Error) {
                if (error.message.includes("fetch") || error.message.includes("network")) {
                    errMsg = "Error de conexión. Revisa tu internet e intenta de nuevo.";
                } else if (error.message.includes("401") || error.message.includes("403")) {
                    errMsg = "Sesión expirada. Inicia sesión de nuevo.";
                } else {
                    errMsg = error.message;
                }
            }
            setResults({ success: false, message: errMsg });
            setLastError(selectedFile);
            setSelectedFile(null);
            toast.error(errMsg);
        } finally {
            setIsUploading(false);
        }
    };

    const handleRetry = () => {
        if (lastError) {
            setSelectedFile(lastError);
            setLastError(null);
            setResults(null);
        }
    };

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) onFileSelect(file);
    };

    const clearSelection = () => {
        setSelectedFile(null);
        setResults(null);
        setLastError(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <Card className="border-none shadow-xl bg-card/80 backdrop-blur-sm overflow-hidden mb-8">
            <CardHeader className="bg-primary/5 pb-4">
                <CardTitle className="text-primary flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5" aria-hidden /> Subir planilla de clientes
                </CardTitle>
                <CardDescription>Migra tus clientes desde un CSV o desde Excel (exportado como CSV). Sin copiar a mano.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
                <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
                            <h4 className="font-bold text-primary text-sm mb-2 flex items-center gap-2">
                                <Download className="w-4 h-4" aria-hidden /> ¿No tienes una plantilla?
                            </h4>
                            <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                                Descarga el formato estándar (CSV). Si usas Excel, guarda como &quot;CSV (delimitado por comas)&quot; y súbelo aquí.
                            </p>
                            <Button variant="outline" size="sm" className="w-full border-primary/30 text-primary hover:bg-primary/10" onClick={handleDownloadTemplate}>
                                Descargar plantilla CSV
                            </Button>
                        </div>

                        <div className="p-4 bg-muted/50 rounded-xl border border-border">
                            <h4 className="font-bold text-foreground text-sm mb-2">Formato de la planilla</h4>
                            <ul className="text-[11px] text-muted-foreground space-y-1 list-disc pl-4">
                                <li><strong>RNC:</strong> 9 u 11 dígitos (obligatorio).</li>
                                <li><strong>Nombre:</strong> Razón social o nombre del cliente.</li>
                                <li><strong>Opcional:</strong> phone, email, notes.</li>
                                <li>Si un RNC ya existe, se actualiza con los nuevos datos.</li>
                                <li>Límite: 5 MB, hasta 20,000 clientes.</li>
                            </ul>
                        </div>
                    </div>

                    <div
                        className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-all ${isDragging ? "border-primary bg-primary/5" : "border-border bg-muted/30"}`}
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={onDrop}
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            onChange={(e) => e.target.files?.[0] && onFileSelect(e.target.files[0])}
                            accept=".csv,.json"
                            aria-label="Subir archivo CSV o JSON para migración"
                            title="Subir archivo"
                        />

                        {isUploading ? (
                            <div className="space-y-4">
                                <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
                                <p className="text-sm font-medium text-muted-foreground">Importando clientes...</p>
                                <p className="text-xs text-muted-foreground">Esto puede tardar unos segundos.</p>
                            </div>
                        ) : selectedFile ? (
                            <div className="space-y-4 w-full">
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                                    <FileSpreadsheet className="w-10 h-10 text-primary shrink-0" />
                                    <div className="text-left min-w-0 flex-1">
                                        <p className="font-medium text-foreground truncate">{selectedFile.file.name}</p>
                                        <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.file.size)} · {selectedFile.parsed.data.length.toLocaleString('es-DO')} clientes válidos</p>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={clearSelection} aria-label="Elegir otro archivo">
                                        <X className="w-5 h-5" />
                                    </Button>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Se importarán <strong>{selectedFile.parsed.data.length.toLocaleString('es-DO')}</strong> clientes. ¿Continuar?
                                </p>
                                <div className="flex gap-2">
                                    <Button onClick={executeImport} className="flex-1 gap-2">
                                        <Upload className="w-4 h-4" />
                                        Importar
                                    </Button>
                                    <Button variant="outline" onClick={clearSelection}>Cancelar</Button>
                                </div>
                            </div>
                        ) : results ? (
                            <div className="space-y-4 animate-in zoom-in">
                                {results.success ? (
                                    <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto dark:text-green-400" />
                                ) : (
                                    <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
                                )}
                                <p className={`text-sm font-bold ${results.success ? "text-green-700 dark:text-green-400" : "text-destructive"}`}>
                                    {results.message}
                                </p>
                                <div className="flex gap-2 justify-center">
                                    <Button variant="ghost" size="sm" onClick={clearSelection}>Subir otro archivo</Button>
                                    {!results.success && lastError && (
                                        <Button variant="outline" size="sm" onClick={handleRetry} className="gap-2">
                                            <RefreshCw className="w-4 h-4" />
                                            Reintentar
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="w-16 h-16 bg-background rounded-full flex items-center justify-center shadow-sm border border-border mb-4">
                                    <Upload className="w-8 h-8 text-primary" />
                                </div>
                                <h3 className="text-lg font-bold text-foreground capitalize">Arrastra tu planilla aquí</h3>
                                <p className="text-xs text-muted-foreground mt-1 mb-6 px-4">CSV o JSON, hasta 5 MB. Excel: expórtalo como CSV.</p>
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
