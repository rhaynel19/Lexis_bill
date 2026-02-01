"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Upload, FileText, Trash2, Eye, ShieldCheck, Loader2 } from "lucide-react";
import { api } from "@/lib/api-service";
import { toast } from "sonner";

interface Doc {
    id: string;
    name: string;
    type: string;
    date: string;
}

export default function DocumentVault() {
    const [docs, setDocs] = useState<Doc[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    const loadDocs = async () => {
        try {
            const data = await api.getDocuments();
            setDocs(data);
        } catch {
            setDocs([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDocs();
    }, []);

    const handleUpload = async () => {
        const fileInput = document.getElementById("file-upload") as HTMLInputElement;
        if (!fileInput?.files?.[0]) return;
        const file = fileInput.files[0];
        if (file.size > 5 * 1024 * 1024) {
            toast.error("El archivo no debe superar 5MB");
            return;
        }
        setUploading(true);
        try {
            const data = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = () => reject(new Error("Error leyendo archivo"));
                reader.readAsDataURL(file);
            });
            await api.uploadDocument(file.name, "Personal", data);
            toast.success("Documento guardado correctamente");
            loadDocs();
            fileInput.value = "";
        } catch {
            toast.error("Error al subir el documento");
        } finally {
            setUploading(false);
        }
    };

    const handleView = async (id: string) => {
        try {
            const doc = await api.getDocument(id);
            if (doc?.data) {
                const isPdf = doc.mimeType?.includes("pdf") || doc.name?.toLowerCase().endsWith(".pdf");
                const w = window.open("", "_blank");
                if (w) {
                    w.document.write(
                        isPdf
                            ? `<iframe src="${doc.data}" style="width:100%;height:100vh;border:none" title="${doc.name}"></iframe>`
                            : `<img src="${doc.data}" style="max-width:100%" alt="${doc.name}" />`
                    );
                    w.document.close();
                }
            }
        } catch {
            toast.error("No se pudo abrir el documento");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Estás seguro de eliminar este documento?")) return;
        try {
            await api.deleteDocument(id);
            toast.success("Documento eliminado");
            loadDocs();
        } catch {
            toast.error("Error al eliminar");
        }
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl">
            <div className="mb-8 flex flex-col gap-4">
                <div>
                    <h2 className="text-4xl font-extrabold text-primary tracking-tight flex items-center gap-3">
                        <ShieldCheck className="h-10 w-10 text-secondary" />
                        Bóveda de Documentos
                    </h2>
                    <p className="text-muted-foreground mt-2 text-lg">Respaldo seguro de títulos, RNC y contratos en la nube.</p>
                </div>
                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 px-4 py-3 text-emerald-800 dark:text-emerald-200 text-sm">
                    <strong>✓ Almacenamiento en la nube:</strong> Tus documentos se guardan de forma segura y estarán disponibles desde cualquier dispositivo.
                </div>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
                <Card className="md:col-span-1 border-dashed border-2">
                    <CardHeader>
                        <CardTitle className="text-xl">Subir Documento</CardTitle>
                        <CardDescription>PDF, JPG o PNG. Máx. 5MB</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div
                            className="flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
                            onClick={() => document.getElementById("file-upload")?.click()}
                        >
                            <Upload className="h-12 w-12 text-muted-foreground group-hover:text-primary transition-colors" />
                            <p className="mt-2 text-sm text-muted-foreground font-medium">Click para seleccionar</p>
                            <input
                                type="file"
                                id="file-upload"
                                className="hidden"
                                onChange={handleUpload}
                                accept=".pdf,.jpg,.jpeg,.png"
                                aria-label="Subir documento"
                            />
                        </div>
                        <Button className="w-full" onClick={handleUpload} disabled={uploading}>
                            {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Guardar en Bóveda
                        </Button>
                    </CardContent>
                </Card>

                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Mis Archivos</CardTitle>
                        <CardDescription>{docs.length} documentos almacenados</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex justify-center py-12">
                                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : docs.length === 0 ? (
                            <p className="text-center py-8 text-muted-foreground">La bóveda está vacía. Sube tu primer documento.</p>
                        ) : (
                            <div className="space-y-2">
                                {docs.map((doc) => (
                                    <div
                                        key={doc.id}
                                        className="flex items-center justify-between p-4 bg-muted/30 border rounded-lg hover:bg-muted/50 transition-colors group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                                <FileText className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <h4 className="font-semibold">{doc.name}</h4>
                                                <p className="text-xs text-muted-foreground">
                                                    Subido el {new Date(doc.date).toLocaleDateString("es-DO")} • {doc.type}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" onClick={() => handleView(doc.id)} title="Ver">
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(doc.id)} className="hover:bg-destructive/10 hover:text-destructive" title="Eliminar">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
