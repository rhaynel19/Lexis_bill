import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, Zap, Smartphone, Menu } from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-lexis-bg-deep text-lexis-text-light font-sans selection:bg-lexis-gold/30">
            {/* Navigation */}
            <nav className="fixed top-0 w-full z-50 bg-lexis-bg-deep/80 backdrop-blur-md border-b border-lexis-gold/10">
                <div className="container mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="text-2xl font-serif font-bold tracking-tighter">
                        <span className="text-lexis-gold">Lexis</span>{" "}
                        <span className="text-lexis-text-light">Bill</span>
                    </div>
                    <div className="hidden md:flex items-center gap-8">
                        <Link href="#beneficios" className="text-sm font-medium hover:text-lexis-gold transition-colors">Beneficios</Link>
                        <Link href="#precio" className="text-sm font-medium hover:text-lexis-gold transition-colors">Precio</Link>
                        <Link href="/login">
                            <Button variant="outline" className="text-lexis-gold border-lexis-gold hover:bg-lexis-gold hover:text-lexis-bg-deep transition-all text-xs font-bold uppercase tracking-widest px-6 rounded-md shadow-none bg-transparent">
                                Entrar
                            </Button>
                        </Link>
                    </div>
                    <Button variant="ghost" size="icon" className="md:hidden">
                        <Menu className="w-6 h-6" />
                    </Button>
                </div>
            </nav>

            {/* Hero Section */}
            <header className="relative pt-40 pb-24 md:pt-56 md:pb-40 overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 opacity-20">
                    <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-lexis-gold rounded-full blur-[140px]" />
                    <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600 rounded-full blur-[120px]" />
                </div>

                <div className="container mx-auto px-6 text-center">
                    <span className="inline-block text-lexis-gold text-xs font-bold tracking-[0.3em] uppercase mb-8 animate-fade-in">
                        EL ÚNICO SISTEMA QUE HABLA DOMINICANO 🇩🇴
                    </span>
                    <h1 className="font-serif text-5xl md:text-8xl font-bold leading-tight mb-8 max-w-5xl mx-auto tracking-tight">
                        La distinción de un <br />
                        <span className="text-lexis-gold">negocio bien organizado.</span>
                    </h1>
                    <p className="text-xl md:text-2xl text-slate-300 max-w-3xl mx-auto mb-14 leading-relaxed font-light italic">
                        Diseñado para quienes valoran su tiempo. Una plataforma de facturación que entiende el mercado dominicano y eleva el estándar de tu práctica profesional. Comienza hoy sin tarjetas.
                    </p>
                    <div className="flex flex-col items-center gap-6">
                        <Link href="/registro">
                            <Button size="lg" className="h-20 px-12 text-xl bg-lexis-gold hover:bg-lexis-gold-hover text-lexis-bg-deep font-bold rounded-lg shadow-2xl shadow-lexis-gold/20 transition-all hover:scale-105 animate-shimmer relative overflow-hidden">
                                Probar 15 días GRATIS
                            </Button>
                        </Link>
                        <div className="space-y-2">
                            <p className="text-sm text-lexis-gold/60 font-medium tracking-widest uppercase">
                                Activación inmediata. No requiere tarjeta de crédito.
                            </p>
                            <p className="text-xs text-slate-500 font-light">
                                Únete a cientos de profesionales y técnicos dominicanos que ya recuperaron su tranquilidad.
                            </p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Section: Dolor (La Realidad) */}
            <section className="py-32 bg-lexis-bg-mid border-y border-lexis-gold/5">
                <div className="container mx-auto px-6">
                    <div className="max-w-4xl mx-auto text-center">
                        <h2 className="font-serif text-4xl md:text-5xl font-bold mb-8 text-lexis-text-light">
                            Recupera tus noches y tus <span className="text-lexis-gold">fines de semana.</span>
                        </h2>
                        <p className="text-xl text-slate-400 leading-relaxed mb-16 font-light">
                            Mientras otros se pierden en formularios de la DGII y cálculos manuales, tú ya terminaste. Lexis Bill automatiza la burocracia para que tu única preocupación sea la excelencia en tu servicio.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 text-left">
                            <div className="flex items-start gap-6 p-8 rounded-2xl bg-white/[0.02] border border-white/5">
                                <Zap className="w-7 h-7 text-lexis-gold stroke-[1px]" />
                                <div>
                                    <h4 className="font-serif text-xl font-bold mb-3">Automatización Real</h4>
                                    <p className="text-slate-400">Deja que el sistema trabaje mientras tú te enfocas en tus clientes.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-6 p-8 rounded-2xl bg-white/[0.02] border border-white/5">
                                <ShieldCheck className="w-7 h-7 text-lexis-gold stroke-[1px]" />
                                <div>
                                    <h4 className="font-serif text-xl font-bold mb-3">Paz Mental</h4>
                                    <p className="text-slate-400">Cumplimiento total con la normativa vigente, sin esfuerzo.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Section: Valor Único (Diferenciación) */}
            <section id="beneficios" className="py-40 bg-lexis-bg-deep">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-24">
                        <h2 className="font-serif text-4xl md:text-6xl font-bold mb-6">
                            Más que facturas, <br />
                            <span className="text-lexis-gold">inteligencia fiscal.</span>
                        </h2>
                        <p className="text-slate-400 max-w-2xl mx-auto font-light">
                            Mientras otros sistemas te confunden con términos extranjeros, Lexis Bill está construido desde cero pensando en la DGII y la realidad de nuestro país.
                        </p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-16">
                        <div className="text-center space-y-6 group cursor-default">
                            <div className="w-20 h-20 bg-lexis-gold/5 rounded-full flex items-center justify-center mx-auto mb-8 border border-lexis-gold/10 group-hover:bg-lexis-gold/20 group-hover:-translate-y-2 transition-all duration-500">
                                <ShieldCheck className="w-10 h-10 text-lexis-gold stroke-[1px] group-hover:opacity-80" />
                            </div>
                            <h3 className="font-serif text-2xl font-bold">Blindaje RNC</h3>
                            <p className="text-slate-400 leading-relaxed text-lg">
                                Validación instantánea. Nunca vuelvas a emitir un documento con datos erróneos.
                            </p>
                        </div>
                        <div className="text-center space-y-6 group cursor-default">
                            <div className="w-20 h-20 bg-lexis-gold/5 rounded-full flex items-center justify-center mx-auto mb-8 border border-lexis-gold/10 group-hover:bg-lexis-gold/20 group-hover:-translate-y-2 transition-all duration-500">
                                <Zap className="w-10 h-10 text-lexis-gold stroke-[1px] group-hover:opacity-80" />
                            </div>
                            <h3 className="font-serif text-2xl font-bold">Cumplimiento Silencioso</h3>
                            <p className="text-slate-400 leading-relaxed text-lg">
                                Tus reportes 606 y 607 se construyen solos mientras tú trabajas.
                            </p>
                        </div>
                        <div className="text-center space-y-6 group cursor-default">
                            <div className="w-20 h-20 bg-lexis-gold/5 rounded-full flex items-center justify-center mx-auto mb-8 border border-lexis-gold/10 group-hover:bg-lexis-gold/20 group-hover:-translate-y-2 transition-all duration-500">
                                <Smartphone className="w-10 h-10 text-lexis-gold stroke-[1px] group-hover:opacity-80" />
                            </div>
                            <h3 className="font-serif text-2xl font-bold">Movilidad Elite</h3>
                            <p className="text-slate-400 leading-relaxed text-lg">
                                Factura desde la palma de tu mano, con la misma elegancia que desde una oficina en la Anacaona.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Section: Nuestra Misión */}
            <section className="py-24 bg-lexis-bg-mid">
                <div className="container mx-auto px-6">
                    <div className="max-w-4xl mx-auto text-center space-y-8">
                        <span className="text-lexis-gold text-xs font-bold tracking-[0.4em] uppercase">El Porqué de Lexis Bill</span>
                        <h2 className="font-serif text-3xl md:text-5xl font-bold leading-tight">
                            Mientras otros miran a las corporaciones, <br />
                            <span className="text-lexis-gold">nosotros te miramos a ti.</span>
                        </h2>
                        <p className="text-xl text-slate-400 leading-relaxed font-light">
                            La mayoría de los sistemas fueron hechos para grandes empresas con ejércitos de contadores. Lexis Bill nace para el profesional autónomo, el técnico independiente y el profesional que realmente mueve la economía dominicana. Somos el aliado que te da el estatus de una multinacional, sin importar el tamaño de tu oficina hoy.
                        </p>
                    </div>
                </div>
            </section>

            {/* Pricing Section (La Invitación) */}
            <section id="precio" className="py-24 sm:py-40 bg-gradient-to-b from-transparent to-lexis-bg-mid overflow-x-hidden">
                <div className="container mx-auto px-4 sm:px-6 text-center">
                    <h2 className="font-serif text-4xl md:text-5xl font-bold mb-16 sm:mb-24 underline decoration-lexis-gold/30 underline-offset-8 italic">
                        15 días para enamorarte de tu <br className="hidden md:block" />
                        <span className="text-lexis-gold">nueva organización.</span>
                    </h2>
                    <div className="max-w-lg mx-auto relative group w-full min-w-0">
                        <div className="absolute -inset-1 bg-gradient-to-r from-lexis-gold to-blue-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000" />
                        <Card className="relative bg-lexis-bg-deep border-lexis-gold/20 p-6 sm:p-10 pt-14 sm:pt-16 rounded-3xl overflow-visible">
                            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20">
                                <span className="bg-lexis-gold text-lexis-bg-deep text-[12px] font-bold px-4 py-1.5 rounded-full shadow-lg whitespace-nowrap tracking-wider">
                                    MEMBRESÍA PROFESIONAL
                                </span>
                            </div>
                            <CardHeader className="text-center pb-8 sm:pb-10 border-b border-lexis-gold/10 overflow-visible">
                                <CardTitle className="font-serif text-lexis-gold text-2xl sm:text-3xl mb-6 break-words">Plan Profesional</CardTitle>
                                <div className="flex flex-col items-center gap-6 w-full min-w-0">
                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-end justify-center gap-6 sm:gap-8 w-full max-w-full">
                                        <div className="flex-1 min-w-0 w-full sm:min-w-[140px] py-4 sm:py-0 sm:pb-2 px-4 sm:px-6 rounded-xl bg-lexis-bg-deep/80 border border-lexis-gold/10">
                                            <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Mensual</p>
                                            <div className="flex items-baseline justify-center gap-1 flex-wrap">
                                                <span className="text-2xl sm:text-3xl md:text-4xl font-bold text-lexis-text-light">RD$950</span>
                                                <span className="text-lexis-gold text-base md:text-lg font-semibold align-bottom">/mes</span>
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0 w-full sm:min-w-[140px] py-4 sm:py-0 sm:pb-2 px-4 sm:px-6 rounded-xl bg-lexis-gold/10 border-2 border-lexis-gold/30 relative">
                                            <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-xs font-bold text-lexis-gold bg-lexis-bg-deep px-3 py-1 rounded-full whitespace-nowrap">⭐ Más popular</span>
                                            <p className="text-xs text-slate-400 uppercase tracking-wider mb-2 mt-2">Anual</p>
                                            <div className="flex items-baseline justify-center gap-1 flex-wrap">
                                                <span className="text-2xl sm:text-3xl md:text-4xl font-bold text-lexis-text-light">RD$9,500</span>
                                            </div>
                                            <p className="text-lexis-gold text-sm md:text-base font-semibold mt-2 text-center">🎁 Paga 10 meses y usa 12</p>
                                        </div>
                                    </div>
                                    <p className="text-sm md:text-base text-slate-400 italic break-words w-full">Si no simplifica tu vida, no pagas nada.</p>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-8 sm:pt-10 space-y-8 overflow-visible">
                                <ul className="space-y-8 text-left w-full min-w-0">
                                    <li className="flex items-start gap-4">
                                        <ShieldCheck className="w-6 h-6 text-lexis-gold mt-1 shrink-0 stroke-[1px]" />
                                        <div className="min-w-0">
                                            <p className="font-bold text-lexis-text-light">Validación Instantánea de RNC</p>
                                            <p className="text-sm text-slate-400 mt-1 leading-relaxed">Valida a tus clientes en segundos como una multinacional.</p>
                                        </div>
                                    </li>
                                    <li className="flex items-start gap-4">
                                        <ShieldCheck className="w-6 h-6 text-lexis-gold mt-1 shrink-0 stroke-[1px]" />
                                        <div className="min-w-0">
                                            <p className="font-bold text-lexis-text-light">Multiperfil de Oficios</p>
                                            <p className="text-sm text-slate-400 mt-1 leading-relaxed">Ya seas abogado, plomero o médico, adaptamos tus NCF a tu necesidad.</p>
                                        </div>
                                    </li>
                                    <li className="flex items-start gap-4">
                                        <ShieldCheck className="w-6 h-6 text-lexis-gold mt-1 shrink-0 stroke-[1px]" />
                                        <div className="min-w-0">
                                            <p className="font-bold text-lexis-text-light">Acceso Mobile-First + WhatsApp</p>
                                            <p className="text-sm text-slate-400 mt-1 leading-relaxed">Factura bajo el sol o en el consultorio y envíala al instante.</p>
                                        </div>
                                    </li>
                                    <li className="flex items-start gap-4">
                                        <ShieldCheck className="w-6 h-6 text-lexis-gold mt-1 shrink-0 stroke-[1px]" />
                                        <div className="min-w-0">
                                            <p className="font-bold text-lexis-text-light">Cero Contabilidad Compleja</p>
                                            <p className="text-sm text-slate-400 mt-1 leading-relaxed">Nosotros hacemos el trabajo sucio de la DGII por ti.</p>
                                        </div>
                                    </li>
                                    <li className="flex items-start gap-4">
                                        <ShieldCheck className="w-6 h-6 text-lexis-gold mt-1 shrink-0 stroke-[1px]" />
                                        <div className="min-w-0">
                                            <p className="font-bold text-lexis-text-light">Soporte Prioritario Anacaona</p>
                                        </div>
                                    </li>
                                </ul>
                                <Link href="/registro" className="block pt-8 w-full min-w-0">
                                    <Button className="w-full min-h-[4rem] px-4 sm:px-6 md:px-8 py-4 text-sm sm:text-base md:text-lg bg-lexis-gold hover:bg-lexis-gold-hover text-lexis-bg-deep font-bold rounded-xl transition-all shadow-xl shadow-lexis-gold/10 flex items-center justify-center text-center whitespace-normal leading-snug">
                                        Empezar mi Prueba de 15 Días GRATIS
                                    </Button>
                                </Link>
                                <p className="text-xs text-slate-400 mt-8 uppercase tracking-[0.15em] font-medium text-center leading-relaxed break-words">Sin contratos. Sin tarjetas iniciales. Sin fricción.</p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-20 border-t border-lexis-gold/10 bg-lexis-bg-mid">
                <div className="container mx-auto px-6">
                    <div className="grid md:grid-cols-4 gap-12 mb-16">
                        <div className="col-span-1 md:col-span-2">
                            <div className="font-serif text-2xl font-bold mb-6">
                                <span className="text-lexis-gold">Lexis</span>{" "}
                                <span className="text-lexis-text-light">Bill</span>
                            </div>
                            <p className="text-slate-400 max-w-sm mb-6">
                                Diseñado para profesionales y técnicos independientes que mueven la República Dominicana. Elegancia, cumplimiento y rapidez en un solo lugar.
                            </p>
                        </div>
                        <div>
                            <h5 className="font-bold mb-6 text-sm uppercase tracking-widest text-lexis-gold">Contacto</h5>
                            <ul className="space-y-4 text-sm text-slate-400">
                                <li>info@lexisbill.do</li>
                                <li>Santo Domingo, RD</li>
                                <li>+1 (829) 000-0000</li>
                            </ul>
                        </div>
                        <div>
                            <h5 className="font-bold mb-6 text-sm uppercase tracking-widest text-lexis-gold">Síguenos</h5>
                            <div className="flex gap-4">
                                <Link href="#" className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:border-lexis-gold hover:text-lexis-gold transition-all">FB</Link>
                                <Link href="#" className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:border-lexis-gold hover:text-lexis-gold transition-all">IG</Link>
                                <Link href="#" className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:border-lexis-gold hover:text-lexis-gold transition-all">LN</Link>
                            </div>
                        </div>
                    </div>
                    <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] text-slate-500 uppercase tracking-widest">
                        <p>© {new Date().getFullYear()} Lexis Bill. Todos los derechos reservados.</p>
                        <div className="flex gap-8">
                            <Link href="/terminos" className="hover:text-lexis-gold">Términos</Link>
                            <Link href="/privacidad" className="hover:text-lexis-gold">Privacidad</Link>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
