"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { Upload, FileText, Trash2, Eye, ShieldCheck } from "lucide-react";

interface Doc {
    id: string;
    name: string;
    type: string;
    date: string;
    url?: string; // Mock URL for simulation
}

export default function DocumentVault() {
    const [docs, setDocs] = useState<Doc[]>([]);

    useEffect(() => {
        // Mock loading documents
        const savedDocs = localStorage.getItem("userDocs");
        if (savedDocs) {
            setDocs(JSON.parse(savedDocs));
        } else {
            // Initial mock data
            setDocs([
                { id: "1", name: "Registro Mercantil.pdf", type: "Legal", date: new Date().toISOString() },
                { id: "2", name: "Tarjeta RNC.jpg", type: "Fiscal", date: new Date().toISOString() }
            ]);
        }
    }, []);

    const handleUpload = () => {
        const fileInput = document.getElementById('file-upload') as HTMLInputElement;
        if (fileInput?.files?.[0]) {
            const file = fileInput.files[0];
            const newDoc: Doc = {
                id: Date.now().toString(),
                name: file.name,
                type: "Personal",
                date: new Date().toISOString()
            };
            const updatedDocs = [...docs, newDoc];
            setDocs(updatedDocs);
            localStorage.setItem("userDocs", JSON.stringify(updatedDocs));
            alert("✅ Documento subido exitosamente a la bóveda encriptada.");
            fileInput.value = ''; // Reset
        }
    };

    const handleDelete = (id: string) => {
        if (confirm("¿Estás seguro de eliminar este documento?")) {
            const updatedDocs = docs.filter(d => d.id !== id);
            setDocs(updatedDocs);
            localStorage.setItem("userDocs", JSON.stringify(updatedDocs));
        }
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl text-slate-900">
            <div className="mb-8 flex items-end justify-between">
                <div>
                    <h2 className="text-4xl font-extrabold text-primary tracking-tight flex items-center gap-3">
                        <ShieldCheck className="h-10 w-10 text-secondary" />
                        Bóveda de Documentos
                    </h2>
                    <p className="text-slate-500 mt-2 text-lg">Respaldo seguro de títulos, RNC y contratos.</p>
                </div>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
                {/* Upload Area */}
                <Card className="md:col-span-1 border-dashed border-2 border-slate-300 bg-slate-50/50">
                    <CardHeader>
                        <CardTitle className="text-xl">Subir Documento</CardTitle>
                        <CardDescription>Formatos aceptados: PDF, JPG, PNG</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-slate-200 rounded-lg bg-white hover:bg-slate-50 transition-colors cursor-pointer group" onClick={() => document.getElementById('file-upload')?.click()}>
                            <Upload className="h-12 w-12 text-slate-400 group-hover:text-primary transition-colors" />
                            <p className="mt-2 text-sm text-slate-500 font-medium">Click para seleccionar</p>
                            <input type="file" id="file-upload" className="hidden" onChange={handleUpload} accept=".pdf,.jpg,.jpeg,.png" />
                        </div>
                        <Button className="w-full" onClick={handleUpload}>
                            Guardar en Bóveda
                        </Button>
                    </CardContent>
                </Card>

                {/* Docs List */}
                <Card className="md:col-span-2 shadow-xl shadow-slate-200/50 border-none">
                    <CardHeader>
                        <CardTitle>Mis Archivos Protegidos</CardTitle>
                        <CardDescription>{docs.length} documentos almacenados</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {docs.length === 0 ? (
                                <p className="text-center py-8 text-slate-400">La bóveda está vacía.</p>
                            ) : (
                                docs.map((doc) => (
                                    <div key={doc.id} className="flex items-center justify-between p-4 bg-white border rounded-lg hover:shadow-md transition-shadow group">
                                        <div className="flex items-center gap-4">
                                            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                                                <FileText className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-slate-800">{doc.name}</h4>
                                                <p className="text-xs text-slate-500">
                                                    Subido el {new Date(doc.date).toLocaleDateString("es-DO")} • {doc.type}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" title="Ver (Mock)">
                                                <Eye className="h-4 w-4 text-slate-600" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(doc.id)} className="hover:bg-red-50">
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
