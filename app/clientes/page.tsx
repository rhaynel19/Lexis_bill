"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    Users,
    Search,
    Plus,
    FileDown,
    MessageCircle,
    Filter,
    ArrowRight,
    UserPlus,
    Building2,
    Calendar,
    Phone
} from "lucide-react";
import { api } from "@/lib/api-service";
import { CustomerMigration } from "@/components/CustomerMigration";
import { CustomerDrawer } from "@/components/CustomerDrawer";
import { Badge } from "@/components/ui/badge";

export default function CustomersPage() {
    const [customers, setCustomers] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [showMigration, setShowMigration] = useState(false);

    useEffect(() => {
        loadCustomers();
    }, []);

    const loadCustomers = async () => {
        setIsLoading(true);
        try {
            const data = await api.getCustomers();
            setCustomers(data);
        } catch (error) {
            console.error("Error loading customers:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.rnc.includes(searchTerm)
    );

    const openDetails = (customer: any) => {
        setSelectedCustomer(customer);
        setIsDrawerOpen(true);
    };

    const handleWhatsApp = (e: React.MouseEvent, phone?: string) => {
        e.stopPropagation();
        if (!phone) return;
        const cleanPhone = phone.replace(/[^\d]/g, '');
        window.open(`https://wa.me/${cleanPhone}`, '_blank');
    };

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Header section with Stats */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-primary flex items-center gap-3">
                        <Users className="w-8 h-8" /> Mis Clientes
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Tienes <span className="font-bold text-primary">{customers.length}</span> clientes registrados
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="gap-2" onClick={() => setShowMigration(!showMigration)}>
                        {showMigration ? "Ver Listado" : "Importar / Migrar"}
                    </Button>
                    <Button className="gap-2 shadow-lg shadow-primary/20">
                        <UserPlus className="w-4 h-4" /> Nuevo Cliente
                    </Button>
                </div>
            </div>

            {showMigration && (
                <CustomerMigration onImportSuccess={loadCustomers} />
            )}

            <div className="grid gap-6">
                {/* Search and Filters */}
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Buscar por nombre o RNC..."
                            className="pl-10 h-11 bg-white border-slate-200 focus:ring-primary shadow-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Main Table Card */}
                <Card className="border-none shadow-xl bg-white/80 backdrop-blur-md overflow-hidden">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="w-[400px]">Cliente</TableHead>
                                    <TableHead>RNC / Cédula</TableHead>
                                    <TableHead>Última Factura</TableHead>
                                    <TableHead className="text-right">Acción</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    [1, 2, 3, 4, 5].map(i => (
                                        <TableRow key={i}>
                                            <TableCell colSpan={4} className="h-16 animate-pulse bg-slate-50/50" />
                                        </TableRow>
                                    ))
                                ) : filteredCustomers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-64 text-center py-12">
                                            <div className="flex flex-col items-center gap-4 opacity-40">
                                                <Users className="w-16 h-16" />
                                                <p className="font-medium">No se encontraron clientes</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : filteredCustomers.map((customer) => (
                                    <TableRow
                                        key={customer._id}
                                        className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                                        onClick={() => openDetails(customer)}
                                    >
                                        <TableCell>
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                                                    {customer.rnc.length === 9 ? <Building2 className="w-5 h-5" /> : <Users className="w-5 h-5" />}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-900 leading-tight mb-1">{customer.name}</div>
                                                    <div className="flex items-center gap-3 text-[10px] text-slate-400 uppercase font-black tracking-widest">
                                                        <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {customer.phone || 'Sin tel'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="font-mono bg-white">{customer.rnc}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            {customer.lastInvoiceDate ? (
                                                <div className="flex items-center gap-2 text-slate-600 text-sm">
                                                    <Calendar className="w-4 h-4 text-emerald-500" />
                                                    {new Date(customer.lastInvoiceDate).toLocaleDateString('es-DO', { day: '2-digit', month: 'short' })}
                                                </div>
                                            ) : (
                                                <span className="text-slate-300 text-xs">- Ninguna -</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2 pr-2">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-9 w-9 p-0 hover:bg-green-50 hover:text-green-600 rounded-full"
                                                    onClick={(e) => handleWhatsApp(e, customer.phone)}
                                                    disabled={!customer.phone}
                                                >
                                                    <MessageCircle className="h-5 w-5" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-9 w-9 p-0 hover:bg-primary hover:text-white rounded-full"
                                                >
                                                    <ArrowRight className="h-5 w-5" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            <CustomerDrawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                customer={selectedCustomer}
            />
        </div>
    );
}
