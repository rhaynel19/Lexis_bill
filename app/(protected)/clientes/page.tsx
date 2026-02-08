"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    Users,
    Search,
    FileDown,
    MessageCircle,
    ArrowRight,
    UserPlus,
    Building2,
    Calendar,
    Phone,
    Receipt,
    FileText,
    Trash2
} from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api-service";
import { CustomerMigration } from "@/components/CustomerMigration";
import { CustomerDrawer } from "@/components/CustomerDrawer";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { toast } from "sonner";

export default function CustomersPage() {
    const [customers, setCustomers] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [showMigration, setShowMigration] = useState(false);
    const [customerToDelete, setCustomerToDelete] = useState<any>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [isNewClientOpen, setIsNewClientOpen] = useState(false);
    const [newClientForm, setNewClientForm] = useState({ name: "", rnc: "", phone: "", email: "" });
    const [isSavingNew, setIsSavingNew] = useState(false);

    useEffect(() => {
        loadCustomers();
    }, []);

    useEffect(() => {
        if (!isLoading && customers.length === 0) setShowMigration(true);
    }, [isLoading, customers.length]);

    const loadCustomers = async () => {
        setIsLoading(true);
        setLoadError(null);
        try {
            const data = await api.getCustomers();
            setCustomers(data);
        } catch (error) {
            console.error("Error loading customers:", error);
            setLoadError("No se pudieron cargar los clientes. Revisa tu conexión e intenta de nuevo.");
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

    const handleDelete = async () => {
        if (!customerToDelete?._id) return;
        setIsDeleting(true);
        try {
            await api.deleteCustomer(customerToDelete._id);
            toast.success("Cliente eliminado");
            setCustomerToDelete(null);
            loadCustomers();
        } catch (err: any) {
            toast.error(err?.message || "No se pudo eliminar el cliente");
        } finally {
            setIsDeleting(false);
        }
    };

    const buildClientQuery = (c: any) => {
        const params = new URLSearchParams();
        if (c.rnc) params.set("rnc", c.rnc);
        if (c.name) params.set("name", c.name);
        if (c.phone) params.set("phone", c.phone);
        return params.toString();
    };

    const openNewClient = () => {
        setNewClientForm({ name: "", rnc: "", phone: "", email: "" });
        setIsNewClientOpen(true);
    };

    const handleSaveNewClient = async (e: React.FormEvent) => {
        e.preventDefault();
        const { name, rnc, phone, email } = newClientForm;
        const rncClean = (rnc || "").replace(/\D/g, "");
        if (!name.trim()) {
            toast.error("El nombre es obligatorio.");
            return;
        }
        if (rncClean.length < 9 || rncClean.length > 11) {
            toast.error("RNC debe tener 9 u 11 dígitos.");
            return;
        }
        setIsSavingNew(true);
        try {
            await api.saveCustomer({ name: name.trim(), rnc: rncClean, phone: phone.trim() || undefined, email: email.trim() || undefined });
            toast.success("Cliente creado.");
            setIsNewClientOpen(false);
            loadCustomers();
        } catch (err: any) {
            toast.error(err?.message || "No se pudo crear el cliente.");
        } finally {
            setIsSavingNew(false);
        }
    };

    return (
        <TooltipProvider>
        <div className="container mx-auto px-4 py-8">
            <Breadcrumbs items={[{ label: "Inicio", href: "/dashboard" }, { label: "Clientes" }]} className="mb-4 text-muted-foreground" />
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
                        {showMigration ? "Ver listado" : "Subir planilla / Migrar"}
                    </Button>
                    <Button className="gap-2 shadow-lg shadow-primary/20" onClick={openNewClient}>
                        <UserPlus className="w-4 h-4" /> Nuevo Cliente
                    </Button>
                </div>
            </div>

            {showMigration && (
                <CustomerMigration onImportSuccess={loadCustomers} />
            )}

            {!showMigration && customers.length === 0 && !isLoading && (
                <Card className="border-primary/20 bg-primary/5 mb-8">
                    <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div>
                            <h3 className="font-bold text-primary text-lg">¿Tienes una planilla de clientes?</h3>
                            <p className="text-slate-600 text-sm mt-1">Impórtala en segundos desde CSV o Excel (exportado como CSV). Sin copiar a mano.</p>
                        </div>
                        <Button className="gap-2 shrink-0" onClick={() => setShowMigration(true)}>
                            <FileDown className="w-4 h-4" /> Subir planilla / Migrar
                        </Button>
                    </CardContent>
                </Card>
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
                        {loadError && (
                            <div className="p-4 bg-destructive/10 border-b border-destructive/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                <p className="text-sm text-destructive font-medium">{loadError}</p>
                                <Button variant="outline" size="sm" onClick={loadCustomers} className="shrink-0">
                                    Reintentar
                                </Button>
                            </div>
                        )}
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
                                            <TableCell colSpan={4} className="h-16">
                                                <div className="h-4 w-full max-w-[200px] rounded animate-pulse bg-muted" />
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : filteredCustomers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-64 text-center py-12">
                                            <div className="flex flex-col items-center gap-4">
                                                <Users className="w-16 h-16 text-slate-300" aria-hidden />
                                                <p className="font-medium text-slate-600">
                                                    {customers.length === 0
                                                        ? "Aún no tienes clientes. Usa «Subir planilla / Migrar» para importar tu listado."
                                                        : "No se encontraron clientes con ese criterio."}
                                                </p>
                                                {customers.length === 0 && (
                                                    <Button variant="outline" className="gap-2 mt-2" onClick={() => setShowMigration(true)}>
                                                        <FileDown className="w-4 h-4" /> Subir planilla
                                                    </Button>
                                                )}
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
                                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex justify-end gap-1 flex-wrap">
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Link href={`/nueva-factura?${buildClientQuery(customer)}`}>
                                                            <Button size="sm" variant="ghost" className="h-9 gap-1.5 hover:bg-emerald-50 hover:text-emerald-600 rounded-lg px-2" aria-label="Facturar">
                                                                <Receipt className="h-4 w-4" /> <span className="hidden sm:inline text-xs">Facturar</span>
                                                            </Button>
                                                        </Link>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Facturar a este cliente</TooltipContent>
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Link href={`/nueva-cotizacion?${buildClientQuery(customer)}`}>
                                                            <Button size="sm" variant="ghost" className="h-9 gap-1.5 hover:bg-blue-50 hover:text-blue-600 rounded-lg px-2" aria-label="Cotizar">
                                                                <FileText className="h-4 w-4" /> <span className="hidden sm:inline text-xs">Cotizar</span>
                                                            </Button>
                                                        </Link>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Crear cotización</TooltipContent>
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-9 w-9 p-0 hover:bg-green-50 hover:text-green-600 rounded-full"
                                                            onClick={(e) => handleWhatsApp(e, customer.phone)}
                                                            disabled={!customer.phone}
                                                            aria-label="Enviar por WhatsApp"
                                                        >
                                                            <MessageCircle className="h-5 w-5" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Enviar por WhatsApp</TooltipContent>
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-9 w-9 p-0 hover:bg-primary hover:text-white rounded-full"
                                                            onClick={() => openDetails(customer)}
                                                            aria-label="Ver detalle"
                                                        >
                                                            <ArrowRight className="h-5 w-5" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Ver detalle</TooltipContent>
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-9 w-9 p-0 hover:bg-red-50 hover:text-red-600 rounded-full"
                                                            onClick={() => setCustomerToDelete(customer)}
                                                            aria-label="Eliminar"
                                                        >
                                                            <Trash2 className="h-5 w-5" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Eliminar cliente</TooltipContent>
                                                </Tooltip>
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

            <Dialog open={!!customerToDelete} onOpenChange={(open) => !open && setCustomerToDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Eliminar cliente</DialogTitle>
                        <DialogDescription>
                            ¿Eliminar a <strong>{customerToDelete?.name}</strong> (RNC {customerToDelete?.rnc})? Esta acción no se puede deshacer.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCustomerToDelete(null)} disabled={isDeleting}>Cancelar</Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                            {isDeleting ? "Eliminando…" : "Eliminar"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isNewClientOpen} onOpenChange={setIsNewClientOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <UserPlus className="w-5 h-5" /> Nuevo Cliente
                        </DialogTitle>
                        <DialogDescription>
                            Completa los datos del cliente. Nombre y RNC son obligatorios.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSaveNewClient} className="space-y-4">
                        <div>
                            <label className="text-sm font-medium text-foreground">Nombre o razón social</label>
                            <Input
                                className="mt-1"
                                placeholder="Ej. Empresa SRL"
                                value={newClientForm.name}
                                onChange={(e) => setNewClientForm((f) => ({ ...f, name: e.target.value }))}
                                required
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-foreground">RNC (9 u 11 dígitos)</label>
                            <Input
                                className="mt-1 font-mono"
                                placeholder="101010101"
                                value={newClientForm.rnc}
                                onChange={(e) => setNewClientForm((f) => ({ ...f, rnc: e.target.value.replace(/\D/g, "").slice(0, 11) }))}
                                maxLength={11}
                                required
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Teléfono (opcional)</label>
                            <Input
                                className="mt-1"
                                placeholder="8095550000"
                                value={newClientForm.phone}
                                onChange={(e) => setNewClientForm((f) => ({ ...f, phone: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Email (opcional)</label>
                            <Input
                                type="email"
                                className="mt-1"
                                placeholder="contacto@ejemplo.com"
                                value={newClientForm.email}
                                onChange={(e) => setNewClientForm((f) => ({ ...f, email: e.target.value }))}
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsNewClientOpen(false)} disabled={isSavingNew}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isSavingNew}>
                                {isSavingNew ? "Guardando…" : "Crear cliente"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
        </TooltipProvider>
    );
}
