"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, MessageCircle, X } from "lucide-react";

// Interfaz para cotizaciones
export interface Quote {
    id: string;
    clientName: string;
    rnc: string;
    clientPhone?: string;
    items: Array<{
        id: string;
        description: string;
        quantity: number;
        price: number;
        isExempt?: boolean;
    }>;
    subtotal: number;
    itbis: number;
    total: number;
    date: string;
    validUntil?: string;
    status?: string;
}

// Interfaz para facturas (compatible con Invoice de FacturaTable)
export interface Invoice {
    id: string;
    _id?: string;
    clientName: string;
    rnc: string;
    clientRnc?: string;
    ncfSequence?: string;
    type?: string;
    total: number;
    itbis?: number;
    subtotal?: number;
    items?: Array<{
        description: string;
        quantity: number;
        price: number;
        isExempt?: boolean;
    }>;
    date: string;
    clientPhone?: string;
    isrRetention?: number;
    itbisRetention?: number;
}

interface DocumentViewerProps {
    isOpen: boolean;
    onClose: () => void;
    document: Quote | Invoice | null;
    type: "quote" | "invoice";
    onDownloadPDF?: () => void;
    onSendWhatsApp?: () => void;
    isGeneratingPDF?: boolean;
}

export function DocumentViewer({
    isOpen,
    onClose,
    document,
    type,
    onDownloadPDF,
    onSendWhatsApp,
    isGeneratingPDF = false
}: DocumentViewerProps) {
    if (!document) return null;

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("es-DO", {
            style: "currency",
            currency: "DOP",
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("es-DO", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };

    // Obtener nombre de la empresa desde localStorage
    const getCompanyName = () => {
        if (typeof window === "undefined") return "Lexis Bill";
        
        try {
            const storedConfig = localStorage.getItem("appConfig");
            const storedUser = localStorage.getItem("user");
            
            if (storedUser) {
                const user = JSON.parse(storedUser);
                if (user?.fiscalStatus?.confirmed) {
                    return user.fiscalStatus.confirmed;
                }
            }
            
            if (storedConfig) {
                const config = JSON.parse(storedConfig);
                return config.companyName || "Lexis Bill";
            }
            
            return "Lexis Bill";
        } catch {
            return "Lexis Bill";
        }
    };

    const getCompanyRnc = () => {
        if (typeof window === "undefined") return "N/A";
        
        try {
            const storedUser = localStorage.getItem("user");
            if (storedUser) {
                const user = JSON.parse(storedUser);
                return user?.rnc || "N/A";
            }
            return "N/A";
        } catch {
            return "N/A";
        }
    };

    const companyName = getCompanyName();
    const companyRnc = getCompanyRnc();
    const documentNumber = type === "quote" 
        ? (document as Quote).id 
        : (document as Invoice).ncfSequence || (document as Invoice).id;
    
    const documentDate = document.date;
    const clientName = document.clientName;
    const clientRnc = document.rnc || (document as Invoice).clientRnc || "";
    
    // Calcular items y totales
    const items = type === "quote" 
        ? (document as Quote).items.map(item => ({
            description: item.description,
            quantity: item.quantity,
            price: item.price,
            subtotal: item.quantity * item.price
        }))
        : (document as Invoice).items?.map(item => ({
            description: item.description,
            quantity: item.quantity,
            price: item.price,
            subtotal: item.quantity * item.price
        })) || [];
    
    const subtotal = type === "quote"
        ? (document as Quote).subtotal
        : (document as Invoice).subtotal || ((document as Invoice).total - ((document as Invoice).itbis || 0));
    
    const itbis = type === "quote"
        ? (document as Quote).itbis
        : (document as Invoice).itbis || 0;
    
    const total = document.total;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold">
                        {type === "quote" ? "Cotización" : "Factura"}
                    </DialogTitle>
                    <DialogDescription>
                        Documento {documentNumber}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Información de la Empresa */}
                    <div className="border-b pb-4">
                        <h3 className="font-bold text-lg mb-2">{companyName}</h3>
                        <p className="text-sm text-gray-600">RNC: {companyRnc}</p>
                    </div>

                    {/* Información del Documento */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm font-semibold text-gray-700 mb-1">
                                {type === "quote" ? "Número de Cotización" : "NCF"}
                            </p>
                            <p className="text-sm">{documentNumber}</p>
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-gray-700 mb-1">Fecha</p>
                            <p className="text-sm">{formatDate(documentDate)}</p>
                        </div>
                        {type === "quote" && (document as Quote).validUntil && (
                            <div>
                                <p className="text-sm font-semibold text-gray-700 mb-1">Válida hasta</p>
                                <p className="text-sm">{formatDate((document as Quote).validUntil!)}</p>
                            </div>
                        )}
                    </div>

                    {/* Información del Cliente */}
                    <div className="border-t pt-4">
                        <h4 className="font-semibold mb-2">Cliente</h4>
                        <p className="text-sm"><strong>Nombre:</strong> {clientName}</p>
                        <p className="text-sm"><strong>RNC/Cédula:</strong> {clientRnc}</p>
                    </div>

                    {/* Tabla de Items */}
                    <div className="border-t pt-4">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Descripción</TableHead>
                                    <TableHead className="text-center">Cantidad</TableHead>
                                    <TableHead className="text-right">Precio Unit.</TableHead>
                                    <TableHead className="text-right">Subtotal</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center text-gray-500 py-4">
                                            No hay items registrados
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    items.map((item, index) => (
                                        <TableRow key={index}>
                                            <TableCell>{item.description || "Sin descripción"}</TableCell>
                                            <TableCell className="text-center">{item.quantity}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                                            <TableCell className="text-right font-medium">
                                                {formatCurrency(item.quantity * item.price)}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Totales */}
                    <div className="border-t pt-4">
                        <div className="flex justify-end">
                            <div className="w-64 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span>Subtotal:</span>
                                    <span className="font-medium">{formatCurrency(subtotal)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>ITBIS (18%):</span>
                                    <span className="font-medium">{formatCurrency(itbis)}</span>
                                </div>
                                <div className="border-t pt-2 flex justify-between font-bold text-lg">
                                    <span>Total:</span>
                                    <span>{formatCurrency(total)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Botones de Acción */}
                    <div className="flex gap-3 justify-end border-t pt-4">
                        <Button
                            variant="outline"
                            onClick={onClose}
                        >
                            <X className="w-4 h-4 mr-2" />
                            Cerrar
                        </Button>
                        {onDownloadPDF && (
                            <Button
                                onClick={onDownloadPDF}
                                disabled={isGeneratingPDF}
                                className="bg-[#D4AF37] hover:bg-[#B8962E] text-white"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                {isGeneratingPDF ? "Generando..." : "Descargar PDF"}
                            </Button>
                        )}
                        {onSendWhatsApp && (
                            <Button
                                onClick={onSendWhatsApp}
                                variant="outline"
                                className="text-green-600 border-green-200 hover:bg-green-50"
                            >
                                <MessageCircle className="w-4 h-4 mr-2" />
                                Enviar por WhatsApp
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
