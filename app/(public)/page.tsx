"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, ShieldCheck, Zap, Smartphone, Menu, FileCheck, BarChart3, ClipboardList, Share2, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { TrinalyzeWord } from "@/components/TrinalyzeWord";
import { useAuth } from "@/components/providers/AuthContext";
import WhatsAppWidget from "@/components/WhatsAppWidget";

const faqs = [
  { question: "¿Trinalyze Billing emite mis comprobantes?", answer: "No. Tú mantienes el control total de tus rangos autorizados por la DGII. Nosotros somos el puente que los organiza para que los uses sin errores." },
  { question: "¿Sustituye a mi contador?", answer: "Al contrario, lo harás muy feliz. Le entregas todo organizado en TXT listo para subir a la oficina virtual." },
  { question: "¿Puedo usar mi rango de NCF actual?", answer: "Sí, el sistema está diseñado para que cargues tus comprobantes vigentes y continúes tu secuencia sin fricción." },
  { question: "¿Es difícil de usar?", answer: "Está hecho para que lo uses desde el celular mientras te mueves. Si sabes enviar un WhatsApp, sabes usar Trinalyze Billing." }
];

const testimonials = [
  { name: "Carlos M.", role: "Técnico en Refrigeración", text: "Hace tiempo que buscaba algo así de simple. Antes el 606 me volvía loco a fin de mes, ahora todo lo hago en minutos." },
  { name: "Dra. Amelia P.", role: "Odontóloga", text: "Por fin un sistema que no me pide un manual para hacer una simple factura con NCF. Facturo desde el celular saliendo de la cita." },
  { name: "José R.", role: "Electricista Independiente", text: "Yo no sé nada de contabilidad, pero con esto genero mi factura y se la mando por WhatsApp al cliente directo. Un palo." },
  { name: "Ing. Roberto C.", role: "Consultor de TI", text: "Se lo recomiendo a cualquier colega que trabaje independiente. Mi contador es el más feliz desde que uso Trinalyze." },
  { name: "Lic. Carmen V.", role: "Abogada Corporativa", text: "Manejar mis igualas mensuales ahora me toma 10 minutos. Confío plenamente en cómo organiza los reportes para la DGII." }
];

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
};

export default function LandingPage() {
  const { user, refresh } = useAuth();
  const isLoggedIn = !!user;
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="min-h-screen bg-trinalyze-bg-deep text-trinalyze-text-light font-sans selection:bg-trinalyze-gold/30">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-trinalyze-bg-deep/80 backdrop-blur-md border-b-2 border-trinalyze-gold/40">
        <div className="container mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <Link href="/" className="text-2xl font-serif font-bold tracking-tighter flex items-baseline gap-1">
            <TrinalyzeWord className="text-2xl" showBill={true} variant="light" />
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link href="#beneficios" className="text-sm font-medium hover:text-trinalyze-gold transition-colors">Beneficios</Link>
            <Link href="#precio" className="text-sm font-medium hover:text-trinalyze-gold transition-colors">Precio</Link>
            <Link href="/unirse-como-partner" className="text-sm font-medium hover:text-trinalyze-gold transition-colors">Ser Partner</Link>
            {isLoggedIn ? (
              <Link href="/dashboard">
                <Button className="bg-trinalyze-gold text-trinalyze-bg-deep hover:bg-trinalyze-gold-hover transition-all text-sm font-bold uppercase tracking-widest px-8 rounded-md shadow-lg shadow-trinalyze-gold/20">
                  Dashboard
                </Button>
              </Link>
            ) : (
              <div className="flex items-center gap-4">
                <Link href="/login">
                  <Button variant="outline" className="text-trinalyze-gold border-trinalyze-gold hover:bg-trinalyze-gold hover:text-trinalyze-bg-deep transition-all text-xs font-bold uppercase tracking-widest px-6 rounded-md shadow-none bg-transparent">
                    Entrar
                  </Button>
                </Link>
                <Link href="/registro">
                  <Button className="bg-trinalyze-gold text-trinalyze-bg-deep hover:bg-trinalyze-gold-hover transition-all text-sm font-bold uppercase tracking-widest px-6 rounded-md shadow-lg shadow-trinalyze-gold/20">
                    Crear cuenta gratis
                  </Button>
                </Link>
              </div>
            )}
          </div>
          {/* Mobile Menu */}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-trinalyze-text-light hover:bg-trinalyze-gold/10" aria-label="Abrir menú de navegación">
                  <Menu className="w-6 h-6" aria-hidden />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-trinalyze-bg-deep border-trinalyze-gold/20 text-trinalyze-text-light pt-20">
                <div className="flex flex-col gap-8 text-center">
                  <Link href="#beneficios" className="text-xl font-serif hover:text-trinalyze-gold">Beneficios</Link>
                  <Link href="#precio" className="text-xl font-serif hover:text-trinalyze-gold">Precio</Link>
                  <Link href="/unirse-como-partner" className="text-xl font-serif hover:text-trinalyze-gold">Ser Partner</Link>
                  {isLoggedIn ? (
                    <Link href="/dashboard">
                      <Button className="w-full bg-trinalyze-gold text-trinalyze-bg-deep font-bold py-6 rounded-xl shadow-lg shadow-trinalyze-gold/20 text-xl">
                        Ir al Dashboard
                      </Button>
                    </Link>
                  ) : (
                    <>
                      <Link href="/login">
                        <Button variant="outline" className="w-full text-trinalyze-gold border-trinalyze-gold py-6 rounded-xl">
                          Entrar
                        </Button>
                      </Link>
                      <Link href="/registro">
                        <Button className="w-full bg-trinalyze-gold text-trinalyze-bg-deep font-bold py-6 rounded-xl shadow-lg shadow-trinalyze-gold/20">
                          Crear Cuenta Gratis
                        </Button>
                      </Link>
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>

      {/* Hero Section — Posicionamiento: "habla dominicano" como argumento de venta */}
      <header className="relative pt-32 pb-20 sm:pt-40 sm:pb-24 md:pt-56 md:pb-40 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 opacity-20">
          <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-trinalyze-gold rounded-full blur-[140px]"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#DEB23E]/20 rounded-full blur-[120px]"></div>
        </div>

        <motion.div 
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.2 } }
          }}
          className="container mx-auto px-4 sm:px-6 text-center max-w-6xl"
        >
          <motion.h1 variants={fadeInUp} className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6 md:mb-8 max-w-4xl mx-auto tracking-tight text-trinalyze-text-light">
            El sistema de gestión creado para el profesional independiente dominicano.
          </motion.h1>
          <motion.p variants={fadeInUp} className="text-xl md:text-2xl lg:text-3xl text-trinalyze-gold font-semibold mb-6 md:mb-8 max-w-2xl mx-auto">
            El único sistema que habla dominicano.
          </motion.p>
          <motion.p variants={fadeInUp} className="text-base md:text-lg text-slate-400 max-w-2xl mx-auto mb-10 md:mb-12 font-light">
            Sin tecnicismos. Sin procesos complicados. Sin parecer una empresa gigante.
          </motion.p>
          <motion.div variants={fadeInUp} className="flex flex-col items-center gap-6">
            <Link href="/registro">
              <Button size="lg" className="animate-shimmer h-16 sm:h-20 px-10 sm:px-12 text-lg sm:text-xl bg-trinalyze-gold hover:bg-trinalyze-gold-hover text-trinalyze-bg-deep font-bold rounded-lg shadow-2xl shadow-trinalyze-gold/20 transition-all hover:scale-105">
                Empieza gratis — 15 días sin tarjeta
              </Button>
            </Link>
            <div className="flex flex-col items-center gap-2 mt-2">
              <p className="text-sm text-slate-500 font-light">
                Sin tarjeta. Sin compromiso. Cancela cuando quieras.
              </p>
              <div className="flex items-center gap-2 mt-4 px-4 py-2 rounded-full bg-trinalyze-gold/5 border border-trinalyze-gold/10">
                <div className="flex -space-x-2">
                  <div className="w-6 h-6 rounded-full bg-slate-800 border border-trinalyze-bg-deep flex items-center justify-center text-[10px]">👷‍♂️</div>
                  <div className="w-6 h-6 rounded-full bg-slate-800 border border-trinalyze-bg-deep flex items-center justify-center text-[10px]">👩‍⚕️</div>
                  <div className="w-6 h-6 rounded-full bg-slate-800 border border-trinalyze-bg-deep flex items-center justify-center text-[10px]">👨‍💼</div>
                </div>
                <p className="text-[11px] sm:text-xs text-trinalyze-text-light/80">
                  Confiado por médicos, abogados, técnicos independientes y consultores en la RD.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </header>

      {/* Sección diferenciadora — "Habla dominicano" como argumento emocional */}
      <section className="py-24 sm:py-32 bg-trinalyze-bg-darker border-y border-trinalyze-gold/5">
        <motion.div 
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeInUp}
          className="container mx-auto px-4 sm:px-6"
        >
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold leading-tight mb-8 text-trinalyze-text-light">
              No eres una empresa gigante.<br />
              Eres un profesional independiente.<br />
              <span className="text-trinalyze-gold">Y tu sistema debe hablar tu mismo idioma.</span>
            </h2>
            <p className="text-xl md:text-2xl text-trinalyze-gold font-semibold mb-12">
              Trinalyze Billing — El único sistema que habla dominicano.
            </p>
            <ul className="space-y-4 text-left max-w-md mx-auto">
              <li className="flex items-center gap-3 text-slate-300">
                <CheckCircle2 className="w-6 h-6 text-trinalyze-gold shrink-0" />
                Hecho para cómo trabajas realmente
              </li>
              <li className="flex items-center gap-3 text-slate-300">
                <CheckCircle2 className="w-6 h-6 text-trinalyze-gold shrink-0" />
                Pensado para la DGII
              </li>
              <li className="flex items-center gap-3 text-slate-300">
                <CheckCircle2 className="w-6 h-6 text-trinalyze-gold shrink-0" />
                Sin palabras técnicas innecesarias
              </li>
              <li className="flex items-center gap-3 text-slate-300">
                <CheckCircle2 className="w-6 h-6 text-trinalyze-gold shrink-0" />
                Fácil desde el primer minuto
              </li>
            </ul>
            <p className="mt-10 text-slate-400 font-light italic">
              Hecho para independientes, no para corporaciones.
            </p>
          </div>
        </motion.div>
      </section>

      {/* Section: Dolor (La Realidad) */}
      <section className="py-32 bg-trinalyze-bg-darker border-y border-trinalyze-gold/5">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="font-serif text-4xl md:text-5xl font-bold mb-8 text-trinalyze-text-light">
              Recupera tus noches y tus <span className="text-trinalyze-gold">fines de semana.</span>
            </h2>
            <p className="text-xl text-slate-400 leading-relaxed mb-8 font-light">
              Mientras otros se pierden en formularios de la DGII y cálculos manuales, tú ya terminaste. Trinalyze Billing automatiza la burocracia para que tu única preocupación sea la excelencia en tu servicio.
            </p>
            <p className="text-trinalyze-gold/90 font-medium mb-16">Facturar no debería ser complicado.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 text-left">
              <div className="flex items-start gap-6 p-8 rounded-2xl bg-white/[0.02] border border-white/5">
                <Zap className="w-7 h-7 text-trinalyze-gold stroke-[1px]" />
                <div>
                  <h4 className="font-serif text-xl font-bold mb-3">Tú mantienes el control</h4>
                  <p className="text-slate-400">Tus comprobantes siguen siendo tuyos; nosotros te ayudamos a usarlos sin errores ni olvidos.</p>
                </div>
              </div>
              <div className="flex items-start gap-6 p-8 rounded-2xl bg-white/[0.02] border border-white/5">
                <ShieldCheck className="w-7 h-7 text-trinalyze-gold stroke-[1px]" />
                <div>
                  <h4 className="font-serif text-xl font-bold mb-3">Previsión Inteligente</h4>
                  <p className="text-slate-400">Preparamos todo para que cumplas con la DGII, sin que tengas que convertirte en contable.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* New Section: ¿Es para mí? */}
      <section className="py-24 bg-trinalyze-bg-deep">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="font-serif text-4xl font-bold mb-8">¿Es Trinalyze Billing <br /><span className="text-trinalyze-gold">para mí?</span></h2>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 mt-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>
                  <p className="text-slate-300"><strong>SÍ</strong>, si eres médico, abogado, ingeniero o técnico que factura servicios y ya tiene su RNC.</p>
                </div>
                <div className="flex gap-4">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 mt-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>
                  <p className="text-slate-300"><strong>SÍ</strong>, si buscas una forma elegante de enviar cotizaciones y facturas por WhatsApp.</p>
                </div>
                <div className="flex gap-4">
                  <div className="w-6 h-6 rounded-full bg-red-500/10 flex items-center justify-center shrink-0 mt-1">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                  </div>
                  <p className="text-slate-400"><strong>NO</strong>, si buscas una contabilidad compleja de grandes corporaciones.</p>
                </div>
              </div>
            </div>
            <div className="p-8 rounded-3xl bg-gradient-to-br from-white/5 to-transparent border border-white/10">
              <h4 className="font-serif text-xl font-bold mb-4 text-trinalyze-gold">La realidad local</h4>
              <p className="text-slate-400 leading-relaxed font-light mb-4">
                Mientras otros sistemas usan lenguaje extraño, Trinalyze Billing entiende que tu prioridad es servir a tu cliente, no pelear con formularios electrónicos.
              </p>
              <p className="text-trinalyze-gold/90 font-medium">Tu negocio es serio — tu sistema también debe serlo. Profesional por fuera. Simple por dentro.</p>
            </div>
          </div>
        </div>
      </section>

      {/* New Section: Cómo Funciona */}
      <section className="py-32 bg-trinalyze-bg-darker border-y border-trinalyze-gold/5">
        <div className="container mx-auto px-4 sm:px-6 text-center">
          <h2 className="font-serif text-4xl md:text-5xl font-bold mb-20 text-trinalyze-text-light">Tu facturación bajo control en <span className="text-trinalyze-gold">3 pasos.</span></h2>
          <div className="grid md:grid-cols-3 gap-12">
            <div className="space-y-6 group cursor-default">
              <div className="w-16 h-16 bg-trinalyze-gold/5 rounded-full flex items-center justify-center mx-auto border border-trinalyze-gold/10 group-hover:bg-trinalyze-gold/20 transition-all duration-300">
                <ClipboardList className="w-8 h-8 text-trinalyze-gold stroke-[1px]" />
              </div>
              <div className="text-5xl font-serif text-trinalyze-gold/20 font-bold italic">01</div>
              <h3 className="text-xl font-bold">Organiza tus comprobantes desde el inicio</h3>
              <p className="text-slate-400 font-light px-4">Registra tus rangos de NCF y mantén el control de tu numeración. Trinalyze Billing te alerta cuando necesites nuevos.</p>
            </div>
            <div className="space-y-6 group cursor-default">
              <div className="w-16 h-16 bg-trinalyze-gold/5 rounded-full flex items-center justify-center mx-auto border border-trinalyze-gold/10 group-hover:bg-trinalyze-gold/20 transition-all duration-300">
                <ShieldCheck className="w-8 h-8 text-trinalyze-gold stroke-[1px]" />
              </div>
              <div className="text-5xl font-serif text-trinalyze-gold/20 font-bold italic">02</div>
              <h3 className="text-xl font-bold">Menos errores, más confianza al facturar</h3>
              <p className="text-slate-400 font-light px-4">Centraliza los datos de tus clientes y evita inconsistencias antes de emitir cualquier documento.</p>
            </div>
            <div className="space-y-6 group cursor-default">
              <div className="w-16 h-16 bg-trinalyze-gold/5 rounded-full flex items-center justify-center mx-auto border border-trinalyze-gold/10 group-hover:bg-trinalyze-gold/20 transition-all duration-300">
                <Share2 className="w-8 h-8 text-trinalyze-gold stroke-[1px]" />
              </div>
              <div className="text-5xl font-serif text-trinalyze-gold/20 font-bold italic">03</div>
              <h3 className="text-xl font-bold">Factura hoy. Reporta sin estrés.</h3>
              <p className="text-slate-400 font-light px-4">Comparte tus documentos fácilmente y mantén tus reportes listos para tu contador.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Section: Valor Único (Diferenciación) */}
      <section id="beneficios" className="py-40 bg-trinalyze-bg-deep">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-24">
            <h2 className="font-serif text-4xl md:text-6xl font-bold mb-6">
              Más que facturas, <br />
              <span className="text-trinalyze-gold">inteligencia fiscal.</span>
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto font-light">
              Pensado para la DGII y la realidad dominicana. Sin términos confusos: facturación, reportes y cobros en un solo lugar.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-12 lg:gap-16">
            <div className="text-center space-y-6 group cursor-default">
              <div className="w-20 h-20 bg-trinalyze-gold/5 rounded-full flex items-center justify-center mx-auto mb-8 border border-trinalyze-gold/10 group-hover:bg-trinalyze-gold/20 group-hover:-translate-y-2 transition-all duration-500">
                <FileCheck className="w-10 h-10 text-trinalyze-gold stroke-[1px] group-hover:opacity-80" />
              </div>
              <h3 className="font-serif text-2xl font-bold">Datos fiscales más ordenados, menos errores</h3>
              <p className="text-slate-400 leading-relaxed text-lg">
                Registra y organiza la información fiscal de tus clientes para mantener tus facturas más claras y reducir errores administrativos.
              </p>
            </div>
            <div className="text-center space-y-6 group cursor-default">
              <div className="w-20 h-20 bg-trinalyze-gold/5 rounded-full flex items-center justify-center mx-auto mb-8 border border-trinalyze-gold/10 group-hover:bg-trinalyze-gold/20 group-hover:-translate-y-2 transition-all duration-500">
                <BarChart3 className="w-10 h-10 text-trinalyze-gold stroke-[1px] group-hover:opacity-80" />
              </div>
              <h3 className="font-serif text-2xl font-bold">Reportes organizados para tu gestión contable</h3>
              <p className="text-slate-400 leading-relaxed text-lg">
                Centraliza tu información y genera reportes que facilitan el seguimiento administrativo de tu negocio.
              </p>
            </div>
            <div className="text-center space-y-6 group cursor-default">
              <div className="w-20 h-20 bg-trinalyze-gold/5 rounded-full flex items-center justify-center mx-auto mb-8 border border-trinalyze-gold/10 group-hover:bg-trinalyze-gold/20 group-hover:-translate-y-2 transition-all duration-500">
                <Smartphone className="w-10 h-10 text-trinalyze-gold stroke-[1px] group-hover:opacity-80" />
              </div>
              <h3 className="font-serif text-2xl font-bold">Factura sin atarte a una oficina</h3>
              <p className="text-slate-400 leading-relaxed text-lg">
                Accede a tu facturación desde cualquier dispositivo y gestiona tu negocio con mayor flexibilidad.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section: Nuestra Misión */}
      <section className="py-24 bg-trinalyze-bg-darker">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <span className="text-trinalyze-gold text-xs font-bold tracking-[0.4em] uppercase">El Porqué de Trinalyze Billing</span>
            <h2 className="font-serif text-3xl md:text-5xl font-bold leading-tight">
              Mientras otros miran a las corporaciones, <br />
              <span className="text-trinalyze-gold">nosotros te miramos a ti.</span>
            </h2>
            <p className="text-xl text-slate-400 leading-relaxed font-light">
              La mayoría de los sistemas fueron hechos para grandes empresas con ejércitos de contadores. Trinalyze Billing nace para el profesional autónomo, el técnico independiente y el profesional que realmente mueve la economía dominicana. Somos el aliado que te da el estatus de una multinacional, sin importar el tamaño de tu oficina hoy.
            </p>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 bg-trinalyze-bg-darker overflow-hidden border-y border-trinalyze-gold/5">
        <div className="container mx-auto px-4 sm:px-6">
          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeInUp}
            className="text-center mb-16"
          >
            <h2 className="font-serif text-3xl md:text-5xl font-bold mb-4 text-trinalyze-text-light">
              Respaldado por la <br className="md:hidden" /><span className="text-trinalyze-gold">fuerza independiente.</span>
            </h2>
            <p className="text-slate-400 font-light max-w-2xl mx-auto">Mira lo que dicen técnicos y profesionales como tú.</p>
          </motion.div>
          <div className="flex overflow-x-auto pb-8 snap-x snap-mandatory justify-start md:justify-center gap-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
            {testimonials.map((test, i) => (
              <div key={i} className="snap-center shrink-0 w-[300px] md:w-[350px] p-8 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-trinalyze-gold/20 hover:bg-white/[0.04] transition-all flex flex-col justify-between">
                <p className="text-slate-300 italic mb-6 leading-relaxed">"{test.text}"</p>
                <div>
                  <p className="font-bold text-trinalyze-text-light flex items-center gap-2">
                    {test.name}
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  </p>
                  <p className="text-xs text-trinalyze-gold uppercase tracking-wider mt-1">{test.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-32 bg-trinalyze-bg-deep">
        <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
          <h2 className="font-serif text-3xl md:text-5xl font-bold mb-16 text-center text-trinalyze-gold">Preguntas Frecuentes</h2>
          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div 
                key={idx} 
                className="rounded-2xl bg-white/[0.02] border border-white/5 overflow-hidden transition-colors hover:bg-white/[0.04]"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full flex items-center justify-between p-6 text-left cursor-pointer focus:outline-none"
                >
                  <h4 className="font-bold text-lg text-trinalyze-text-light">{faq.question}</h4>
                  <motion.div
                    animate={{ rotate: openFaq === idx ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="w-5 h-5 text-trinalyze-gold" />
                  </motion.div>
                </button>
                <AnimatePresence>
                  {openFaq === idx && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="px-6 pb-6 text-slate-400 text-sm leading-relaxed border-t border-white/5 pt-4">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section (La Invitación) */}
      <section id="precio" className="py-24 sm:py-40 bg-gradient-to-b from-transparent to-trinalyze-bg-darker overflow-x-hidden">
        <div className="container mx-auto px-4 sm:px-6 text-center">
          <h2 className="font-serif text-4xl md:text-5xl font-bold mb-16 sm:mb-24 underline decoration-trinalyze-gold/30 underline-offset-8 italic">
            15 días para recuperar tu <br className="hidden md:block" />
            <span className="text-trinalyze-gold">tranquilidad fiscal.</span>
          </h2>
          <div className="max-w-lg sm:max-w-xl mx-auto relative group w-full min-w-0 px-1">
            <div className="absolute -inset-1 bg-gradient-to-r from-trinalyze-gold to-blue-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
            <motion.div whileHover={{ y: -8 }} transition={{ duration: 0.3 }} className="h-full">
              <Card className="relative bg-trinalyze-bg-deep border-trinalyze-gold/20 p-6 sm:p-10 pt-14 sm:pt-16 rounded-3xl overflow-hidden shadow-[0_0_40px_rgba(222,178,62,0.1)]">
              <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20">
                <span className="bg-trinalyze-gold text-white text-[12px] font-bold px-4 py-1.5 rounded-full shadow-lg whitespace-nowrap tracking-wider">
                  MEMBRESÍA PROFESIONAL
                </span>
              </div>
              <CardHeader className="text-center pb-8 sm:pb-10 border-b border-trinalyze-gold/10 overflow-visible">
                <CardTitle className="font-serif text-trinalyze-gold text-2xl sm:text-3xl mb-6 break-words">Plan Élite</CardTitle>
                <div className="flex flex-col items-center gap-6 w-full min-w-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 w-full max-w-full">
                    <div className="w-full min-w-0 py-4 px-4 sm:px-5 rounded-xl bg-trinalyze-bg-deep/80 border border-trinalyze-gold/10 flex flex-col items-center justify-center">
                      <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Mensual</p>
                      <div className="flex items-baseline justify-center gap-1 flex-wrap text-center">
                        <span className="text-xl sm:text-2xl md:text-3xl font-bold text-trinalyze-text-light tabular-nums">RD$950</span>
                        <span className="text-trinalyze-gold text-sm sm:text-base font-semibold">/mes</span>
                      </div>
                    </div>
                    <div className="w-full min-w-0 py-4 px-4 sm:px-5 rounded-xl bg-trinalyze-gold/10 border-2 border-trinalyze-gold/30 relative flex flex-col items-center justify-center">
                      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-xs font-bold text-trinalyze-gold bg-trinalyze-bg-deep px-3 py-1 rounded-full whitespace-nowrap">⭐ Más popular</span>
                      <p className="text-xs text-slate-400 uppercase tracking-wider mb-2 mt-2">Anual</p>
                      <div className="flex items-baseline justify-center gap-1 flex-wrap text-center">
                        <span className="text-xl sm:text-2xl md:text-3xl font-bold text-trinalyze-text-light tabular-nums">RD$9,500</span>
                      </div>
                      <p className="text-trinalyze-gold text-xs sm:text-sm font-semibold mt-2 text-center">🎁 Paga 10 meses y usa 12</p>
                    </div>
                  </div>
                  <p className="text-sm md:text-base text-trinalyze-text-light italic break-words w-full">Si no simplifica tu vida, no pagas nada.</p>
                </div>
              </CardHeader>
              <CardContent className="pt-8 sm:pt-10 space-y-8 overflow-visible">
                <ul className="space-y-8 text-left w-full min-w-0">
                  <li className="flex items-start gap-4">
                    <ShieldCheck className="w-6 h-6 text-trinalyze-gold mt-1 shrink-0 stroke-[1px]" />
                    <div className="min-w-0">
                      <p className="font-bold text-trinalyze-text-light">Validación Instantánea de RNC</p>
                      <p className="text-sm text-slate-400 mt-1 leading-relaxed">Valida a tus clientes en segundos como una multinacional.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-4">
                    <ShieldCheck className="w-6 h-6 text-trinalyze-gold mt-1 shrink-0 stroke-[1px]" />
                    <div className="min-w-0">
                      <p className="font-bold text-trinalyze-text-light">Multiperfil de Oficios</p>
                      <p className="text-sm text-slate-400 mt-1 leading-relaxed">Ya seas abogado, plomero o médico, adaptamos tus NCF a tu necesidad.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-4">
                    <ShieldCheck className="w-6 h-6 text-trinalyze-gold mt-1 shrink-0 stroke-[1px]" />
                    <div className="min-w-0">
                      <p className="font-bold text-trinalyze-text-light">Acceso Mobile-First + WhatsApp</p>
                      <p className="text-sm text-slate-400 mt-1 leading-relaxed">Factura bajo el sol o en el consultorio y envíala al instante.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-4">
                    <ShieldCheck className="w-6 h-6 text-trinalyze-gold mt-1 shrink-0 stroke-[1px]" />
                    <div className="min-w-0">
                      <p className="font-bold text-trinalyze-text-light">Cero Contabilidad Compleja</p>
                      <p className="text-sm text-slate-400 mt-1 leading-relaxed">Nosotros hacemos el trabajo sucio de la DGII por ti.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-4">
                    <ShieldCheck className="w-6 h-6 text-trinalyze-gold mt-1 shrink-0 stroke-[1px]" />
                    <div className="min-w-0">
                      <p className="font-bold text-trinalyze-text-light">Soporte Prioritario Anacaona</p>
                    </div>
                  </li>
                </ul>
                <p className="text-trinalyze-gold font-semibold text-center pt-4">El único sistema que habla dominicano.</p>
                <Link href="/registro" className="block pt-6 w-full min-w-0">
                  <Button className="animate-shimmer w-full min-h-[4rem] px-4 sm:px-6 md:px-8 py-4 text-sm sm:text-base md:text-lg bg-trinalyze-gold hover:bg-trinalyze-gold-hover text-trinalyze-bg-deep font-bold rounded-xl transition-all shadow-xl shadow-trinalyze-gold/10 flex items-center justify-center text-center whitespace-normal leading-tight">
                    Empieza gratis — 15 días sin tarjeta
                  </Button>
                </Link>
                <p className="text-xs text-slate-400 mt-6 uppercase tracking-[0.15em] font-medium text-center leading-relaxed break-words">Sin tarjeta. Sin compromiso. Cancela cuando quieras.</p>
              </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-trinalyze-gold/10 bg-trinalyze-bg-darker">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-1 md:col-span-2">
              <div className="font-serif text-2xl font-bold mb-6 flex items-baseline gap-1">
                <TrinalyzeWord className="text-2xl" showBill={true} variant="light" />
              </div>
              <p className="text-slate-400 max-w-sm mb-6">
                Diseñado para profesionales y técnicos independientes que mueven la República Dominicana. Elegancia, cumplimiento y rapidez en un solo lugar.
              </p>
            </div>
            <div>
              <h5 className="font-bold mb-6 text-sm uppercase tracking-widest text-trinalyze-gold">Contacto</h5>
              <ul className="space-y-4 text-sm text-slate-400">
                <li>soporte@trinalyze.pro</li>
                <li>Santo Domingo, RD</li>
                <li>
                  <a href="https://wa.me/18495890656" target="_blank" rel="noopener noreferrer" className="hover:text-trinalyze-gold transition-colors">
                    WhatsApp: (849) 589-0656
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h5 className="font-bold mb-6 text-sm uppercase tracking-widest text-trinalyze-gold">Síguenos</h5>
              <div className="flex gap-4">
                <Link href="#" className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:border-trinalyze-gold hover:text-trinalyze-gold transition-all">FB</Link>
                <Link href="#" className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:border-trinalyze-gold hover:text-trinalyze-gold transition-all">IG</Link>
                <Link href="#" className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:border-trinalyze-gold hover:text-trinalyze-gold transition-all">LN</Link>
              </div>
            </div>
          </div>
          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] text-slate-500 uppercase tracking-widest">
            <p>© {new Date().getFullYear()} Trinalyze Billing. Todos los derechos reservados.</p>
            <div className="flex flex-wrap justify-center gap-6 md:gap-8">
              <Link href="/terminos" className="hover:text-trinalyze-gold">Términos y Condiciones</Link>
              <Link href="/privacidad" className="hover:text-trinalyze-gold">Privacidad</Link>
              <Link href="/uso-aceptable" className="hover:text-trinalyze-gold">Uso Aceptable</Link>
              <Link href="/limitacion-responsabilidad" className="hover:text-trinalyze-gold">Limitación de Responsabilidad</Link>
              <Link href="/reembolsos" className="hover:text-trinalyze-gold">Reembolsos</Link>
            </div>
          </div>
        </div>
      </footer>

      <WhatsAppWidget />
    </div>
  );
}

