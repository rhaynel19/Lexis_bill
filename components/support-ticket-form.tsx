"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function SupportTicketForm() {
    const [type, setType] = useState("problem");
    const [description, setDescription] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const userStr = localStorage.getItem("user");
            const rnc = userStr ? JSON.parse(userStr).rnc : "ANONIMO";

            // Call API (Needs to be implemented in api-service but fetch works for now)
            const res = await fetch("/api/tickets", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ rnc, type, description })
            });

            if (!res.ok) throw new Error("Error al enviar ticket");

            alert("✅ Su reporte ha sido recibido. El equipo técnico lo revisará en breve.");
            setDescription("");
        } catch (error) {
            console.error(error);
            alert("❌ Error al enviar el reporte. Intente nuevamente.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card className="mt-8 border-l-4 border-l-orange-500">
            <CardHeader>
                <CardTitle>Centro de Ayuda y Sugerencias</CardTitle>
                <CardDescription>
                    ¿Encontraste un problema o tienes una idea para mejorar Lexis Bill?
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="ticket-type">Tipo de Reporte</Label>
                            <Select value={type} onValueChange={setType}>
                                <SelectTrigger id="ticket-type">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="problem">🔴 Reportar un Problema</SelectItem>
                                    <SelectItem value="suggestion">💡 Sugerir Mejora</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Detalle</Label>
                        <Textarea
                            id="description"
                            placeholder="Describe el problema o tu sugerencia..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            required
                        />
                    </div>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? "Enviando..." : "Enviar Reporte"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
