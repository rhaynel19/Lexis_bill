"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import { ShieldCheck, ScrollText } from "lucide-react";
import Link from "next/link";

export function TermsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl bg-[#F9F6EE] text-[#0A192F] border-none shadow-2xl p-0 overflow-hidden">
                <DialogHeader className="p-8 pb-4 bg-[#0A192F] text-[#F9F6EE]">
                    <DialogTitle className="font-serif text-2xl flex items-center gap-3">
                        <ScrollText className="w-6 h-6 text-[#D4AF37]" />
                        Términos y Condiciones de Uso
                    </DialogTitle>
                </DialogHeader>

                <div className="p-8 max-h-[60vh] overflow-y-auto font-sans leading-[1.8] text-base space-y-8">
                    <section>
                        <h3 className="font-serif font-bold text-xl mb-3 text-[#0A192F]">1. Aceptación del Compromiso</h3>
                        <p className="text-slate-600">Al acceder y utilizar Lexis Bill, usted acepta quedar vinculado por estos términos, diseñados bajo los estándares de la Ley 07-23 de la República Dominicana sobre Facturación Electrónica.</p>
                    </section>

                    <section>
                        <h3 className="font-serif font-bold text-lg mb-2 text-[#0A192F]">2. Privacidad y Datos</h3>
                        <p>Su información está protegida por cifrado de grado bancario. Lexis Bill actúa como un procesador de datos fiscales, asegurando que su información nunca sea compartida con terceros sin su consentimiento explícito.</p>
                    </section>

                    <section>
                        <h3 className="font-serif font-bold text-lg mb-2 text-[#0A192F]">3. Responsabilidad Fiscal</h3>
                        <p>Lexis Bill facilita el cumplimiento con la DGII mediante la validación automática de RNC y NCF. Sin embargo, el usuario final es responsable de la veracidad de la información ingresada en cada comprobante.</p>
                    </section>

                    <section>
                        <h3 className="font-serif font-bold text-lg mb-2 text-[#0A192F]">4. Uso del Servicio</h3>
                        <p>El Plan Profesional otorga acceso ilimitado a la plataforma para el titular de la cuenta. El uso indebido de las secuencias de NCF proporcionadas por la DGII es responsabilidad exclusiva del profesional.</p>
                    </section>
                </div>

                <DialogFooter className="p-6 bg-slate-50 border-t border-slate-200">
                    <Button
                        onClick={onClose}
                        className="w-full bg-[#D4AF37] hover:bg-[#B8962E] text-[#0A192F] font-bold h-12 shadow-lg shadow-[#D4AF37]/20"
                    >
                        He leído y acepto los términos
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export function LegalCheckbox({ id, checked, onChange, onOpenModal }: { id: string; checked: boolean; onChange: (e: any) => void; onOpenModal: () => void }) {
    return (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100 mt-6">
            <div className="relative flex items-center h-5">
                <input
                    id={id}
                    type="checkbox"
                    checked={checked}
                    onChange={onChange}
                    className="w-4 h-4 text-[#0A192F] bg-white border-slate-300 rounded focus:ring-[#D4AF37] transition-all cursor-pointer"
                />
            </div>
            <div className="text-[11px] leading-tight text-slate-500">
                <label htmlFor={id} className="cursor-pointer">
                    He leído y acepto el {" "}
                </label>
                <button
                    type="button"
                    onClick={onOpenModal}
                    className="text-[#0A192F] font-bold underline decoration-[#D4AF37] underline-offset-2 hover:text-blue-700 transition-colors"
                >
                    Compromiso de Privacidad y T&C
                </button>
            </div>
        </div>
    );
}

export function TrustFooter() {
    return (
        <footer className="py-12 border-t border-[#D4AF37]/10 bg-[#081221] text-[#F9F6EE]">
            <div className="container mx-auto px-6">
                <div className="grid md:grid-cols-4 gap-8 mb-10">
                    <div className="col-span-1 md:col-span-2">
                        <div className="font-serif text-xl font-bold text-[#D4AF37] mb-4">Lexis Bill</div>
                        <p className="text-[11px] text-slate-400 max-w-xs leading-relaxed">
                            Tecnología protegida por cifrado de grado bancario. Adaptado a la Ley 07-23 de RD.
                        </p>
                    </div>
                    <div>
                        <h5 className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37] mb-4">Enlaces Rápidos</h5>
                        <ul className="space-y-2 text-[11px] text-slate-500 font-medium">
                            <li><Link href="/" className="hover:text-[#F9F6EE] transition-colors">Inicio</Link></li>
                            <li><Link href="/landing#precio" className="hover:text-[#F9F6EE] transition-colors">Precios</Link></li>
                            <li><a href="#" className="hover:text-[#F9F6EE] transition-colors">Soporte</a></li>
                        </ul>
                    </div>
                    <div>
                        <h5 className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37] mb-4">Legal</h5>
                        <ul className="space-y-2 text-[11px] text-slate-500 font-medium">
                            <li><Link href="/privacidad" className="hover:text-[#F9F6EE] transition-colors">Privacidad</Link></li>
                            <li><button className="hover:text-[#F9F6EE] transition-colors">Términos</button></li>
                        </ul>
                    </div>
                </div>
                <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-[10px] text-slate-600 uppercase tracking-widest">
                        © 2026 Lexis Bill. Todos los derechos reservados.
                    </p>
                    <div className="flex items-center gap-4">
                        <ShieldCheck className="w-4 h-4 text-emerald-500/50" />
                        <span className="text-[9px] text-slate-600 font-bold uppercase tracking-tighter">Verified Compliant</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
