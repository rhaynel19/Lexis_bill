"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, UserCheck, UserX, Search, RefreshCw, Power } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

export default function SuperAdminPage() {
    // Mock Users Data (In real app, fetch from API)
    const [users, setUsers] = useState<any[]>([
        { id: 1, name: "Dr. Juan Pérez", email: "juan@medicina.com", plan: "Profesional", status: "Activo", paymentDate: "2026-01-15" },
        { id: 2, name: "Lic. María Rodriguez", email: "maria@leyes.com", plan: "Profesional", status: "Pendiente", paymentDate: "-" },
        { id: 3, name: "Ing. Pedro Martinez", email: "pedro@obras.com", plan: "Basico", status: "Inactivo", paymentDate: "2025-12-10" },
    ]);

    // Simulate loading localstorage user if exists
    useEffect(() => {
        // Here we would fetch all users. 
        // For the demo/formalization, we'll keep the mock + add the current session user if needed for context.
    }, []);

    const toggleStatus = (id: number) => {
        setUsers(users.map(u => {
            if (u.id === id) {
                const newStatus = u.status === "Activo" ? "Inactivo" : "Activo";
                toast.success(`Usuario ${u.name} ahora está: ${newStatus}`);
                return { ...u, status: newStatus };
            }
            return u;
        }));
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 p-8">
            <div className="max-w-6xl mx-auto space-y-8">
                <header className="flex justify-between items-center border-b border-slate-800 pb-6">
                    <div>
                        <h1 className="text-3xl font-black text-white flex items-center gap-3">
                            <ShieldCheck className="w-8 h-8 text-amber-500" /> Super Admin
                        </h1>
                        <p className="text-slate-400 font-mono text-sm mt-1">
                            Control Central de Accesos y Activaciones
                        </p>
                    </div>
                    <div className="flex gap-4">
                        <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
                            Simular Webhook
                        </Button>
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="bg-slate-900 border-slate-800 text-slate-200">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-slate-500 uppercase">Usuarios Totales</CardTitle>
                            <div className="text-3xl font-bold text-white">{users.length}</div>
                        </CardHeader>
                    </Card>
                    <Card className="bg-slate-900 border-slate-800 text-slate-200">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-slate-500 uppercase">Activos</CardTitle>
                            <div className="text-3xl font-bold text-emerald-400">{users.filter(u => u.status === 'Activo').length}</div>
                        </CardHeader>
                    </Card>
                    <Card className="bg-slate-900 border-slate-800 text-slate-200">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-slate-500 uppercase">Ingresos (Est.)</CardTitle>
                            <div className="text-3xl font-bold text-amber-400">RD$ {(users.filter(u => u.status === 'Activo').length * 950).toLocaleString()}</div>
                        </CardHeader>
                    </Card>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-white">Suscripciones & Pagos</h2>
                        <div className="relative w-64">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-500" />
                            <Input placeholder="Buscar por email..." className="pl-8 bg-slate-900 border-slate-800 text-slate-200 focus:border-amber-500" />
                        </div>
                    </div>

                    <Card className="bg-slate-900 border-slate-800 overflow-hidden">
                        <Table>
                            <TableHeader className="bg-slate-950">
                                <TableRow className="border-slate-800 hover:bg-slate-900">
                                    <TableHead className="text-slate-400">Usuario / Razón Social</TableHead>
                                    <TableHead className="text-slate-400">Plan</TableHead>
                                    <TableHead className="text-slate-400">Último Pago</TableHead>
                                    <TableHead className="text-slate-400">Estado</TableHead>
                                    <TableHead className="text-right text-slate-400">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map((user) => (
                                    <TableRow key={user.id} className="border-slate-800 hover:bg-slate-800/50">
                                        <TableCell>
                                            <div className="font-medium text-white">{user.name}</div>
                                            <div className="text-xm text-slate-500">{user.email}</div>
                                        </TableCell>
                                        <TableCell className="text-slate-300">{user.plan}</TableCell>
                                        <TableCell className="font-mono text-xs text-slate-400">{user.paymentDate}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={`
                                                ${user.status === 'Activo' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : ''}
                                                ${user.status === 'Pendiente' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : ''}
                                                ${user.status === 'Inactivo' ? 'bg-red-500/10 text-red-400 border-red-500/20' : ''}
                                            `}>
                                                {user.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {user.status !== "Activo" ? (
                                                <Button size="sm" onClick={() => toggleStatus(user.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white border-none">
                                                    <UserCheck className="w-4 h-4 mr-2" />
                                                    Activar
                                                </Button>
                                            ) : (
                                                <Button size="sm" variant="ghost" onClick={() => toggleStatus(user.id)} className="text-red-400 hover:text-red-300 hover:bg-red-950">
                                                    <Power className="w-4 h-4 mr-2" />
                                                    Desactivar
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>
                </div>
            </div>
        </div>
    );
}
