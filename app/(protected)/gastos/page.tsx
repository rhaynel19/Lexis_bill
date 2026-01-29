"use client";

import { useState, useEffect } from "react";
import {
    Plus,
    Search,
    Filter,
    Receipt,
    ScanLine,
    Trash2,
    Calendar,
    Building2,
    DollarSign,
    Loader2,
    FileText,
    TrendingUp,
    ShieldCheck,
    ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api-service";
import { AIService } from "@/lib/ai-service-mock";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const EXPENSE_CATEGORIES = [
    { id: "01", name: "Gastos de Personal" },
    { id: "02", name: "Gastos por Trabajos, Suministros y Servicios" },
    { id: "03", name: "Arrendamientos" },
    { id: "04", name: "Gastos de Activos Fijos" },
    { id: "05", name: "Gastos de Representación" },
    { id: "06", name: "Gastos Financieros" },
    { id: "07", name: "Gastos de Seguros" },
    { id: "08", name: "Gastos por Comisiones" },
    { id: "09", name: "Gastos por Honorarios y Gastos Legales" },
    { id: "10", name: "Gastos por Reparaciones y Mantenimiento" },
    { id: "11", name: "Gastos por Donaciones" },
];

export default function GastosPage() {
    const [expenses, setExpenses] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isScanning, setIsScanning] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [isAddOpen, setIsAddOpen] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        supplierName: "",
        supplierRnc: "",
        ncf: "",
        amount: "",
        itbis: "",
        category: "02",
        date: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        loadExpenses();
    }, []);

    const loadExpenses = async () => {
        try {
            setIsLoading(true);
            const data = await api.getExpenses();
            setExpenses(data);
        } catch (error) {
            toast.error("Error al cargar los gastos");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveExpense = async () => {
        if (!formData.supplierName || !formData.supplierRnc || !formData.ncf || !formData.amount) {
            toast.error("Por favor completa los campos requeridos");
            return;
        }

        try {
            const payload = {
                ...formData,
                amount: parseFloat(formData.amount),
                itbis: parseFloat(formData.itbis) || 0,
            };
            await api.saveExpense(payload);
            toast.success("Gasto registrado correctamente");
            setIsAddOpen(false);
            resetForm();
            loadExpenses();
        } catch (error) {
            toast.error("Error al guardar el gasto");
        }
    };

    const handleDeleteExpense = async (id: string) => {
        if (!confirm("¿Estás seguro de eliminar este gasto?")) return;
        try {
            await api.deleteExpense(id);
            toast.success("Gasto eliminado");
            loadExpenses();
        } catch (error) {
            toast.error("Error al eliminar");
        }
    };

    const handleScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsScanning(true);
        toast.info("Escaneando factura con IA...");

        try {
            const result = await AIService.extractExpenseData(file);
            setFormData({
                supplierName: result.supplierName,
                supplierRnc: result.supplierRnc,
                ncf: result.ncf,
                amount: result.amount.toString(),
                itbis: result.itbis.toString(),
                category: result.category,
                date: new Date().toISOString().split('T')[0]
            });
            setIsAddOpen(true);
            toast.success("Datos extraídos correctamente por la IA");
        } catch (error) {
            toast.error("No se pudo extraer la información. Por favor llena el formulario manualmente.");
            setIsAddOpen(true);
        } finally {
            setIsScanning(false);
        }
    };

    const resetForm = () => {
        setFormData({
            supplierName: "",
            supplierRnc: "",
            ncf: "",
            amount: "",
            itbis: "",
            category: "02",
            date: new Date().toISOString().split('T')[0]
        });
    };

    const filteredExpenses = expenses.filter(exp =>
        exp.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exp.ncf.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exp.supplierRnc.includes(searchQuery)
    );

    const totalGastos = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    return (
        <div className="container mx-auto px-4 py-8 pb-32">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                <div>
                    <h1 className="text-4xl font-serif font-black tracking-tight flex items-center gap-3">
                        <Receipt className="w-10 h-10 text-accent" />
                        GASTOS <span className="text-muted-foreground/30 font-light">606</span>
                    </h1>
                    <p className="text-muted-foreground mt-2 max-w-md">
                        Gestiona tus compras y gastos. La IA te ayuda a registrar tus facturas en segundos para tu reporte 606.
                    </p>
                </div>

                <div className="flex flex-wrap gap-3 w-full md:w-auto">
                    <div className="relative overflow-hidden group w-full sm:w-auto">
                        <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={handleScan}
                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                            disabled={isScanning}
                        />
                        <Button
                            variant="outline"
                            className="w-full border-accent/20 bg-accent/5 text-accent hover:bg-accent/10 h-12 px-6 font-bold flex items-center gap-2 group-hover:scale-[1.02] transition-all"
                            disabled={isScanning}
                        >
                            {isScanning ? <Loader2 className="w-5 h-5 animate-spin" /> : <ScanLine className="w-5 h-5" />}
                            Escaneo IA
                        </Button>
                    </div>

                    <Dialog open={isAddOpen} onOpenChange={(open) => { setIsAddOpen(open); if (!open) resetForm(); }}>
                        <DialogTrigger asChild>
                            <Button className="w-full sm:w-auto bg-primary text-primary-foreground h-12 px-10 font-bold shadow-lg shadow-primary/20 hover:scale-[1.05] transition-all">
                                <Plus className="w-5 h-5 mr-2" />
                                Registrar Gasto
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md bg-background border-border/20 shadow-2xl">
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-serif">Registrar Gasto</DialogTitle>
                                <DialogDescription>
                                    Ingresa los datos de la factura de tu suplidor para el reporte 606.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Suplidor / Comercio</label>
                                    <Input
                                        placeholder="Ej: Altice Dominicana"
                                        value={formData.supplierName}
                                        onChange={e => setFormData({ ...formData, supplierName: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">RNC Suplidor</label>
                                        <Input
                                            placeholder="RNC / Cédula"
                                            value={formData.supplierRnc}
                                            onChange={e => setFormData({ ...formData, supplierRnc: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">NCF</label>
                                        <Input
                                            placeholder="B01..."
                                            value={formData.ncf}
                                            onChange={e => setFormData({ ...formData, ncf: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Monto Base</label>
                                        <div className="relative">
                                            <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                type="number"
                                                className="pl-9"
                                                value={formData.amount}
                                                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">ITBIS (Opcional)</label>
                                        <Input
                                            type="number"
                                            value={formData.itbis}
                                            onChange={e => setFormData({ ...formData, itbis: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Tipo de Gasto (DGII)</label>
                                    <Select
                                        value={formData.category}
                                        onValueChange={val => setFormData({ ...formData, category: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecciona categoría" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {EXPENSE_CATEGORIES.map(cat => (
                                                <SelectItem key={cat.id} value={cat.id}>{cat.id} - {cat.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Fecha de Factura</label>
                                    <Input
                                        type="date"
                                        value={formData.date}
                                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                                    />
                                </div>
                            </div>

                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancelar</Button>
                                <Button onClick={handleSaveExpense}>Guardar Gasto</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <Card className="bg-gradient-to-br from-accent/5 to-transparent border-accent/20">
                    <CardContent className="p-6">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Total del Periodo</p>
                        <h3 className="text-2xl font-black text-foreground">RD$ {totalGastos.toLocaleString()}</h3>
                        <div className="flex items-center gap-1 mt-2 text-xs text-accent">
                            <TrendingUp className="w-3 h-3" />
                            <span>Calculado en tiempo real</span>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-border/10 bg-card/50">
                    <CardContent className="p-6">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Gastos Registrados</p>
                        <h3 className="text-2xl font-black text-foreground">{filteredExpenses.length}</h3>
                        <p className="text-[10px] text-muted-foreground mt-2">Listos para el envío mensual</p>
                    </CardContent>
                </Card>
                <BonusCard title="Salud Fiscal" icon={ShieldCheck} text="88%" color="text-green-500" />
                <BonusCard title="Reporte 606" icon={FileText} text="Pendiente" color="text-amber-500" />
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por suplidor o NCF..."
                        className="pl-10 h-10 border-border/10 focus-visible:ring-accent/30"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
                <Button variant="outline" className="h-10 border-border/10 gap-2">
                    <Filter className="w-4 h-4" />
                    Filtros
                </Button>
            </div>

            {/* List Section */}
            <div className="space-y-3">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="w-10 h-10 text-accent animate-spin" />
                        <p className="text-sm font-medium text-muted-foreground capitalize tracking-widest">Cargando registros...</p>
                    </div>
                ) : filteredExpenses.length === 0 ? (
                    <Card className="border-dashed border-border/40 bg-transparent py-40">
                        <CardContent className="flex flex-col items-center justify-center text-center">
                            <div className="w-20 h-20 rounded-full bg-accent/5 flex items-center justify-center mb-6">
                                <Receipt className="w-10 h-10 text-accent/30" />
                            </div>
                            <h3 className="text-xl font-serif font-bold mb-2">No hay gastos registrados</h3>
                            <p className="text-muted-foreground max-w-xs">
                                Comienza subiendo una foto de tus facturas o regístralas manualmente para alimentar tu 606.
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    filteredExpenses.map((exp) => (
                        <ExpenseItem
                            key={exp._id}
                            expense={exp}
                            onDelete={() => handleDeleteExpense(exp._id)}
                        />
                    ))
                )}
            </div>

            <div className="mt-8 text-center text-[10px] text-muted-foreground/30 uppercase tracking-[0.3em]">
                Lexis Bill Smart Ledger &bull; Dominican Republic
            </div>
        </div>
    );
}

function ExpenseItem({ expense, onDelete }: { expense: any, onDelete: () => void }) {
    const categoryName = EXPENSE_CATEGORIES.find(c => c.id === expense.category)?.name || "Gasto";

    return (
        <Card className="group border-border/10 hover:border-accent/30 bg-card hover:shadow-xl hover:shadow-accent/5 transition-all duration-300">
            <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center group-hover:bg-accent/10 transition-colors">
                        <Building2 className="w-6 h-6 text-muted-foreground group-hover:text-accent" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h4 className="font-bold text-lg text-foreground leading-tight">{expense.supplierName}</h4>
                            <Badge variant="secondary" className="text-[10px] bg-secondary/50 font-normal">
                                {expense.category}
                            </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground font-medium">
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(expense.date).toLocaleDateString()}</span>
                            <span className="flex items-center gap-1 uppercase tracking-tighter font-mono">NCF: {expense.ncf}</span>
                            <span className="hidden sm:inline opacity-30 text-[8px]">•</span>
                            <span className="italic">{categoryName}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-6 pl-16 sm:pl-0 border-t sm:border-0 pt-4 sm:pt-0">
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">Monto Total</p>
                        <p className="text-xl font-black text-foreground">RD$ {expense.amount.toLocaleString()}</p>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors"
                        onClick={onDelete}
                    >
                        <Trash2 className="w-5 h-5" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

function BonusCard({ title, icon: Icon, text, color }: { title: string, icon: any, text: string, color: string }) {
    return (
        <Card className="bg-card/30 border-border/5">
            <CardContent className="p-6">
                <div className="flex justify-between items-center mb-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{title}</p>
                    <Icon className={cn("w-4 h-4", color)} />
                </div>
                <h3 className="text-lg font-black">{text}</h3>
            </CardContent>
        </Card>
    );
}
