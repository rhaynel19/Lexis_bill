"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Camera, Plus, Trash2, ArrowUpRight, ArrowDownRight, TrendingUp } from "lucide-react";

interface Expense {
    id: string;
    description: string;
    amount: number;
    category: string;
    date: string;
    receiptImage?: string; // Placeholder for now
}

export default function ExpensesPage() {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [description, setDescription] = useState("");
    const [amount, setAmount] = useState("");
    const [category, setCategory] = useState("Varios");

    // Load expenses
    useEffect(() => {
        const stored = localStorage.getItem("expenses");
        if (stored) setExpenses(JSON.parse(stored));
    }, []);

    // Add Expense
    const handleAddExpense = (e: React.FormEvent) => {
        e.preventDefault();
        if (!description || !amount) return;

        const newExpense: Expense = {
            id: Date.now().toString(),
            description,
            amount: parseFloat(amount),
            category,
            date: new Date().toISOString(),
        };

        const updated = [newExpense, ...expenses];
        setExpenses(updated);
        localStorage.setItem("expenses", JSON.stringify(updated));

        // Clear form
        setDescription("");
        setAmount("");
    };

    // Delete Expense
    const handleDelete = (id: string) => {
        const updated = expenses.filter(e => e.id !== id);
        setExpenses(updated);
        localStorage.setItem("expenses", JSON.stringify(updated));
    };

    // Calculations
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    // Calculate Monthly Profit (Simple approximation using localStorage invoices)
    const [monthlyRevenue, setMonthlyRevenue] = useState(0);
    useEffect(() => {
        const storedInv = localStorage.getItem("invoices");
        if (storedInv) {
            const invoices = JSON.parse(storedInv);
            const now = new Date();
            const revenue = invoices
                .filter((inv: any) => {
                    const d = new Date(inv.date);
                    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                })
                .reduce((sum: number, inv: any) => sum + inv.total, 0); // Using total, but net might be better
            setMonthlyRevenue(revenue);
        }
    }, [expenses]);

    // Only current month expenses for KPI? Let's use total for now or filter.
    // Simplifying to Total Expenses vs Total Revenue for this view.
    const netProfit = monthlyRevenue - totalExpenses;

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 pb-12">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8 flex justify-between items-center">
                    <div>
                        <h2 className="text-3xl font-bold text-blue-950">Mis Gastos</h2>
                        <p className="text-slate-500">Registro de gastos operativos</p>
                    </div>
                    <Link href="/">
                        <Button variant="outline">← Volver</Button>
                    </Link>
                </div>

                {/* KPIs */}
                <div className="grid gap-6 md:grid-cols-3 mb-8">
                    <Card className="bg-white border-0 shadow-lg shadow-blue-900/5">
                        <CardHeader className="pb-2">
                            <CardDescription className="text-slate-500">Total Gastos (Mes)</CardDescription>
                            <CardTitle className="text-3xl font-bold text-red-600">
                                RD${totalExpenses.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center text-red-500 text-sm">
                                <ArrowDownRight className="w-4 h-4 mr-1" />
                                <span>Salidas registradas</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border-0 shadow-lg shadow-blue-900/5">
                        <CardHeader className="pb-2">
                            <CardDescription className="text-slate-500">Beneficio Neto (Estimado)</CardDescription>
                            <CardTitle className={`text-3xl font-bold ${netProfit >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                                RD${netProfit.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center text-emerald-500 text-sm">
                                <TrendingUp className="w-4 h-4 mr-1" />
                                <span>Ingresos - Gastos</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Form & List Grid */}
                <div className="grid gap-8 md:grid-cols-3">
                    {/* Formulario */}
                    <Card className="md:col-span-1 border-0 shadow-lg h-fit">
                        <CardHeader>
                            <CardTitle className="text-lg">Registrar Gasto</CardTitle>
                            <CardDescription>Añade un nuevo gasto rápido</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleAddExpense} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="description">Descripción</Label>
                                    <Input
                                        id="description"
                                        placeholder="Ej: Gasolina, Internet..."
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="amount">Monto (RD$)</Label>
                                    <Input
                                        id="amount"
                                        type="number"
                                        placeholder="0.00"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Comprobante (Opcional)</Label>
                                    <Button type="button" variant="outline" className="w-full border-dashed border-2 h-20 flex flex-col gap-2">
                                        <Camera className="w-6 h-6 text-slate-400" />
                                        <span className="text-xs text-slate-500">Tomar foto / Subir</span>
                                    </Button>
                                </div>
                                <Button type="submit" className="w-full bg-blue-950 hover:bg-blue-900">
                                    <Plus className="w-4 h-4 mr-2" /> Guardar Gasto
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Listado */}
                    <Card className="md:col-span-2 border-0 shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-lg">Historial de Gastos</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {expenses.length === 0 ? (
                                <div className="text-center py-12 text-slate-400">
                                    <p>No hay gastos registrados.</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Fecha</TableHead>
                                            <TableHead>Descripción</TableHead>
                                            <TableHead className="text-right">Monto</TableHead>
                                            <TableHead className="w-[50px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {expenses.map((expense) => (
                                            <TableRow key={expense.id}>
                                                <TableCell className="text-slate-500 text-sm">
                                                    {new Date(expense.date).toLocaleDateString('es-DO')}
                                                </TableCell>
                                                <TableCell className="font-medium">
                                                    {expense.description}
                                                    <span className="block text-xs text-slate-400">{expense.category}</span>
                                                </TableCell>
                                                <TableCell className="text-right font-bold text-red-600">
                                                    RD${expense.amount.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                                                </TableCell>
                                                <TableCell>
                                                    <Button variant="ghost" size="sm" onClick={() => handleDelete(expense.id)}>
                                                        <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-500" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
