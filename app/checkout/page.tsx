"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    CreditCard,
    Building2,
    ShieldCheck,
    ArrowLeft,
    Lock,
    MessageCircle
} from "lucide-react";
import Link from "next/link";

export default function CheckoutPage() {
    const [paymentMethod, setPaymentMethod] = useState<"card" | "transfer">("card");

    return (
        <div className="min-h-screen bg-lexis-bg-deep text-lexis-text-light font-sans p-6 md:p-12 selection:bg-lexis-gold/30">
            <div className="max-w-5xl mx-auto">
                {/* Header/Back */}
                <div className="mb-10">
                    <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-lexis-gold transition-colors group">
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        <span className="text-sm font-medium uppercase tracking-widest">Volver</span>
                    </Link>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                    {/* Left Side: Summary & Trust */}
                    <div className="lg:col-span-5 space-y-8">
                        <div>
                            <h1 className="font-serif text-4xl font-bold mb-4">Finalizar Suscripción</h1>
                            <p className="text-slate-400 leading-relaxed">
                                Está a un paso de automatizar su vida fiscal con Lexis Bill.
                            </p>
                        </div>

                        <Card className="bg-white/5 border-lexis-gold/20 backdrop-blur-md overflow-hidden relative">
                            <div className="absolute top-0 right-0 bg-lexis-gold text-lexis-bg-deep text-[10px] font-bold px-3 py-1 rounded-bl-lg">POPULAR</div>
                            <CardHeader className="border-b border-white/5 pb-6">
                                <CardTitle className="font-serif text-lexis-gold text-xl">Plan Profesional Mensual</CardTitle>
                                <CardDescription className="text-slate-500">Acceso total ilimitado</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-4">
                                <div className="flex justify-between items-end">
                                    <span className="text-slate-400 text-sm">Suscripción Mensual</span>
                                    <span className="font-serif text-3xl font-bold text-lexis-text-light">RD$950.00</span>
                                </div>
                                <div className="flex justify-between items-center text-[10px] text-slate-500 uppercase tracking-widest pt-4 border-t border-white/5">
                                    <span>Impuestos incluidos</span>
                                    <span>Renovación automática</span>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="p-6 rounded-2xl bg-blue-500/5 border border-blue-500/10 flex items-start gap-4">
                            <ShieldCheck className="w-6 h-6 text-blue-400 shrink-0" />
                            <div>
                                <h4 className="text-sm font-bold text-blue-400 mb-1">Privacidad y Seguridad</h4>
                                <p className="text-xs text-slate-400 leading-relaxed">
                                    No almacenamos los datos de su tarjeta. Toda la comunicación está cifrada bajo estándares de grado bancario (TLS/SSL).
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Right Side: Payment Methods */}
                    <div className="lg:col-span-7">
                        <div className="space-y-6">
                            {/* Tabs */}
                            <div className="flex p-1 bg-white/5 rounded-xl border border-white/10">
                                <button
                                    onClick={() => setPaymentMethod("card")}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-bold transition-all ${paymentMethod === "card" ? "bg-lexis-gold text-[#0A192F]" : "text-slate-400 hover:text-lexis-text-light"}`}
                                >
                                    <CreditCard className="w-4 h-4" />
                                    Tarjeta de Crédito
                                </button>
                                <button
                                    onClick={() => setPaymentMethod("transfer")}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-bold transition-all ${paymentMethod === "transfer" ? "bg-lexis-gold text-lexis-bg-deep" : "text-slate-400 hover:text-lexis-text-light"}`}
                                >
                                    <Building2 className="w-4 h-4" />
                                    Transferencia
                                </button>
                            </div>

                            <Card className="bg-transparent border-none shadow-none">
                                <CardContent className="p-0">
                                    {paymentMethod === "card" ? (
                                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="card-name" className="text-xs text-slate-400 uppercase tracking-widest">Nombre en la Tarjeta</Label>
                                                    <Input id="card-name" placeholder="DR. CARLOS ROSARIO" className="bg-white/5 border-white/10 h-12 focus:border-lexis-gold transition-all" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="card-number" className="text-xs text-slate-400 uppercase tracking-widest">Número de Tarjeta</Label>
                                                    <div className="relative">
                                                        <Input id="card-number" placeholder="0000 0000 0000 0000" className="bg-white/5 border-white/10 h-12 px-12 focus:border-lexis-gold transition-all" />
                                                        <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-2">
                                                            <div className="w-6 h-4 bg-slate-700 rounded-sm opacity-50"></div>
                                                            <div className="w-6 h-4 bg-slate-700 rounded-sm opacity-50"></div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="expiry" className="text-xs text-slate-400 uppercase tracking-widest">Vencimiento</Label>
                                                        <Input id="expiry" placeholder="MM / YY" className="bg-white/5 border-white/10 h-12 focus:border-lexis-gold transition-all" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="cvv" className="text-xs text-slate-400 uppercase tracking-widest">CVV</Label>
                                                        <div className="relative">
                                                            <Input id="cvv" placeholder="123" className="bg-white/5 border-white/10 h-12 focus:border-lexis-gold transition-all" />
                                                            <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="pt-6 border-t border-white/5">
                                                <p className="text-[10px] text-slate-500 text-center mb-2 italic">
                                                    Próximamente: pago con tarjeta vía Stripe. Los datos de tarjeta no se procesan ni almacenan en este formulario.
                                                </p>
                                                <p className="text-[10px] text-slate-500 text-center mb-4 italic">
                                                    Por ahora, usa transferencia bancaria o visita la sección Pagar.
                                                </p>
                                                <Button type="button" disabled className="relative overflow-hidden group w-full h-14 text-lg bg-lexis-gold/50 text-[#0A192F] font-bold rounded-xl cursor-not-allowed">
                                                    <span className="relative z-10">Pago con tarjeta próximamente</span>
                                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] transition-none"></div>
                                                    <style dangerouslySetInnerHTML={{
                                                        __html: `
                                                        @keyframes shimmer {
                                                            0% { transform: translateX(-100%); }
                                                            100% { transform: translateX(100%); }
                                                        }
                                                    `}} />
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                                            <div className="p-6 rounded-2xl bg-lexis-gold/5 border border-lexis-gold/20 space-y-6">
                                                <div className="space-y-2 text-center pb-4 border-b border-lexis-gold/10">
                                                    <p className="text-xs text-lexis-gold uppercase tracking-widest font-bold">Instrucciones de Pago</p>
                                                    <p className="text-[10px] text-slate-400">Realice la transferencia y envíe el comprobante por WhatsApp.</p>
                                                </div>

                                                <div className="space-y-4">
                                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 sm:gap-4 group cursor-pointer">
                                                        <span className="text-[10px] text-slate-500 uppercase tracking-widest">Banco</span>
                                                        <span className="text-sm font-bold text-lexis-text-light group-hover:text-lexis-gold transition-colors">BANCO POPULAR</span>
                                                    </div>
                                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 sm:gap-4 group cursor-pointer">
                                                        <span className="text-[10px] text-slate-500 uppercase tracking-widest">Tipo de Cuenta</span>
                                                        <span className="text-sm font-bold text-lexis-text-light">CORRIENTE RD$</span>
                                                    </div>
                                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 sm:gap-4 group cursor-pointer">
                                                        <span className="text-[10px] text-slate-500 uppercase tracking-widest">Número de Cuenta</span>
                                                        <span className="text-sm font-serif font-bold text-lexis-gold tracking-wider">792-XXXXXX-2</span>
                                                    </div>
                                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 sm:gap-4 group cursor-pointer">
                                                        <span className="text-[10px] text-slate-500 uppercase tracking-widest">Beneficiario</span>
                                                        <span className="text-sm font-bold text-lexis-text-light">LEXIS BILL SOLUTIONS SRL</span>
                                                    </div>
                                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 sm:gap-4 group cursor-pointer">
                                                        <span className="text-[10px] text-slate-500 uppercase tracking-widest">RNC</span>
                                                        <span className="text-sm font-bold text-lexis-text-light">132-XXXXX-9</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <Button asChild className="w-full h-14 text-lg border-2 border-lexis-gold text-lexis-gold hover:bg-lexis-gold hover:text-[#0A192F] bg-transparent font-bold rounded-xl transition-all">
                                                    <Link href="/pagos">Completar pago en Lexis Bill</Link>
                                                </Button>
                                                <a
                                                    href={`https://wa.me/18290000000?text=${encodeURIComponent("Hola Lexis Bill, acabo de realizar mi transferencia para el Plan Profesional. Adjunto el comprobante.")}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="w-full h-12 flex items-center justify-center gap-2 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] hover:text-white border border-[#25D366]/20 font-bold rounded-xl transition-all text-sm"
                                                >
                                                    <MessageCircle className="w-4 h-4" />
                                                    Enviar Comprobante por WhatsApp
                                                </a>
                                            </div>
                                            <p className="text-[10px] text-slate-500 text-center uppercase tracking-widest">
                                                Activación manual en menos de 15 minutos
                                            </p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>

                {/* Footer simple */}
                <div className="mt-20 pt-8 border-t border-white/5 flex justify-between items-center">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 opacity-30 grayscale pointer-events-none scale-75">
                            {/* SVG icons would go here for VISA/MC */}
                            <CreditCard className="w-6 h-6" />
                        </div>
                    </div>
                    <p className="text-[10px] text-slate-600 uppercase tracking-widest">© 2026 Lexis Bill • Facturación Segura</p>
                </div>
            </div>
        </div>
    );
}
