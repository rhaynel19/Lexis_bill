"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ShieldAlert, User, Wallet, Users, Settings, Building2, Phone, Mail, FileText, Loader2, ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";

export default function AdminDashboard() {
    const [clients, setClients] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedClient, setSelectedClient] = useState<any | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);

    // Stats states
    const [totalRevenue, setTotalRevenue] = useState(0);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const { api } = await import("@/lib/api-service");

                // Fetch Clients
                const data = await api.getCustomers();
                setClients(data || []);

                // Fetch Invoices for Revenue stats (Optional enhancement)
                const invoices = await api.getInvoices().catch(() => []);
                const revenue = invoices?.reduce((acc: number, inv: any) => acc + (inv.total || 0), 0) || 0;
                setTotalRevenue(revenue);

            } catch (error) {
                console.error("Error fetching admin data:", error);
                toast.error("Error al cargar datos del panel.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleViewDetails = (client: any) => {
        setSelectedClient(client);
        setShowDetailsModal(true);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("es-DO", {
            style: "currency",
            currency: "DOP",
            maximumFractionDigits: 0
        }).format(amount);
    };

    return (
        <div className="min-h-screen bg-[#F9F6EE] p-6 lg:p-12">
            <div className="max-w-6xl mx-auto space-y-8">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="font-serif text-3xl font-bold mb-1">
                            <span className="text-[#D4AF37]">Lexis</span>{" "}
                            <span className="text-[#0A192F]">Bill</span>
                        </h1>
                        <p className="text-slate-500 text-sm">Gestión centralizada de socios y activos.</p>
                    </div>
                    <div className="flex gap-3 items-center">
                        <Link href="/configuracion">
                            <Button variant="outline" className="gap-2 border-[#0A192F]/20 text-[#0A192F]">
                                <Settings className="w-4 h-4" /> Configuración
                            </Button>
                        </Link>
                        <Link href="/nueva-factura">
                            <Button className="bg-[#0A192F] text-white hover:bg-[#112240]">
                                + Nueva Factura
                            </Button>
                        </Link>
                        <Badge variant="outline" className="border-[#0A192F] text-[#0A192F] font-bold px-3 py-1 hidden lg:flex">
                            ADMIN ACCESS
                        </Badge>
                    </div>
                </header>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="bg-[#0A192F] text-[#F9F6EE] border-none shadow-xl transition-transform hover:scale-[1.02]">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-bold uppercase tracking-widest opacity-60 flex items-center gap-2">
                                <Users className="w-3 h-3 text-[#D4AF37]" /> Total Clientes
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <span className="font-serif text-4xl font-bold text-[#D4AF37]">
                                {isLoading ? "..." : clients.length}
                            </span>
                        </CardContent>
                    </Card>
                    <Card className="bg-white border-none shadow-lg transition-transform hover:scale-[1.02]">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                <Wallet className="w-3 h-3 text-[#0A192F]" /> Recaudación Total
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <span className="font-serif text-4xl font-bold text-[#0A192F]">
                                {isLoading ? "..." : formatCurrency(totalRevenue)}
                            </span>
                        </CardContent>
                    </Card>
                    <Card className="bg-white border-none shadow-lg transition-transform hover:scale-[1.02]">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                <ShieldAlert className="w-3 h-3 text-red-500" /> Estado del Sistema
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
                                <span className="font-serif text-2xl font-bold text-[#0A192F]">Operativo</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Table */}
                <Card className="border-none shadow-2xl bg-white overflow-hidden">
                    <CardHeader className="border-b border-slate-100 pb-6">
                        <CardTitle className="text-xl font-bold text-[#0A192F]">Directorio de Clientes</CardTitle>
                        <CardDescription>Monitoreo en tiempo real de su cartera de clientes.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        {isLoading ? (
                            <div className="p-12 flex justify-center text-slate-400">
                                <Loader2 className="w-8 h-8 animate-spin" />
                            </div>
                        ) : clients.length === 0 ? (
                            <div className="p-12 text-center text-slate-400">
                                <p>No hay clientes registrados.</p>
                                <Link href="/nueva-factura" className="text-[#D4AF37] hover:underline text-sm font-bold mt-2 inline-block">crear primera factura</Link>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-slate-50 hover:bg-slate-50">
                                            <TableHead className="font-bold text-[#0A192F] md:w-[300px]">Nombre del Cliente</TableHead>
                                            <TableHead className="font-bold text-[#0A192F] hidden md:table-cell">RNC / Cédula</TableHead>
                                            <TableHead className="font-bold text-[#0A192F] hidden lg:table-cell">Contacto</TableHead>
                                            <TableHead className="text-right pr-6"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {clients.map((client, index) => (
                                            <TableRow key={index} className="hover:bg-slate-50/50 transition-colors">
                                                <TableCell className="font-medium text-slate-700 py-4 flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                                                        <User className="w-4 h-4" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span>{client.name}</span>
                                                        <span className="text-[10px] text-slate-400 md:hidden">{client.rnc}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-slate-600 font-mono text-sm hidden md:table-cell">
                                                    {client.rnc}
                                                </TableCell>
                                                <TableCell className="hidden lg:table-cell text-slate-500 text-sm">
                                                    {client.phone ? client.phone : <span className="text-slate-300 italic">No registrado</span>}
                                                </TableCell>
                                                <TableCell className="text-right pr-6">
                                                    <button
                                                        onClick={() => handleViewDetails(client)}
                                                        className="text-[10px] font-bold text-[#0A192F] hover:text-[#D4AF37] uppercase tracking-widest transition-colors flex items-center gap-1 justify-end ml-auto"
                                                    >
                                                        Ver Detalles <ArrowRight className="w-3 h-3" />
                                                    </button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Client Details Modal */}
            <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-[#0A192F]">
                            <User className="w-5 h-5" /> Información del Cliente
                        </DialogTitle>
                        <DialogDescription>Ficha técnica del contribuyente</DialogDescription>
                    </DialogHeader>

                    {selectedClient && (
                        <div className="grid gap-4 py-4">
                            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 flex flex-col items-center text-center">
                                <div className="w-16 h-16 bg-[#0A192F] text-[#D4AF37] rounded-full flex items-center justify-center text-2xl font-serif font-bold mb-2">
                                    {selectedClient.name.charAt(0)}
                                </div>
                                <h3 className="font-bold text-lg text-slate-800">{selectedClient.name}</h3>
                                <p className="text-sm text-slate-500 font-mono tracking-wider">{selectedClient.rnc}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs text-slate-400 uppercase font-bold flex items-center gap-1">
                                        <Phone className="w-3 h-3" /> Teléfono
                                    </label>
                                    <p className="text-sm font-medium border-b border-slate-100 pb-1">
                                        {selectedClient.phone || "N/A"}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-slate-400 uppercase font-bold flex items-center gap-1">
                                        <Mail className="w-3 h-3" /> Email
                                    </label>
                                    <p className="text-sm font-medium border-b border-slate-100 pb-1 truncate" title={selectedClient.email}>
                                        {selectedClient.email || "N/A"}
                                    </p>
                                </div>
                                <div className="space-y-1 col-span-2">
                                    <label className="text-xs text-slate-400 uppercase font-bold flex items-center gap-1">
                                        <Building2 className="w-3 h-3" /> Dirección
                                    </label>
                                    <p className="text-sm font-medium border-b border-slate-100 pb-1">
                                        {selectedClient.address || "Dirección no registrada"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDetailsModal(false)}>Cerrar</Button>
                        <Link href={`/nueva-factura`}>
                            <Button className="bg-[#0A192F] text-white" onClick={() => {
                                // Pre-fill clone logic could go here, for now just redirect
                                setShowDetailsModal(false);
                            }}>
                                <FileText className="w-4 h-4 mr-2" /> Facturar a este Cliente
                            </Button>
                        </Link>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
