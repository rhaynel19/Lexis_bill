"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, ShieldCheck, Zap, Smartphone, ArrowRight, Menu } from "lucide-react";
import Link from "next/link";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export default function LandingPage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    setIsLoggedIn(!!token);
  }, []);

  return (
    <div className="min-h-screen bg-lexis-bg-deep text-lexis-text-light font-sans selection:bg-lexis-gold/30">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-lexis-bg-deep/80 backdrop-blur-md border-b-2 border-lexis-gold/40">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="text-2xl font-serif font-bold tracking-tighter">
            <span className="text-lexis-gold">Lexis</span>{" "}
            <span className="text-lexis-text-light">Bill</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <Link href="#beneficios" className="text-sm font-medium hover:text-lexis-gold transition-colors">Beneficios</Link>
            <Link href="#precio" className="text-sm font-medium hover:text-lexis-gold transition-colors">Precio</Link>
            {isLoggedIn ? (
              <Link href="/dashboard">
                <Button className="bg-lexis-gold text-lexis-bg-deep hover:bg-lexis-gold-hover transition-all text-sm font-bold uppercase tracking-widest px-8 rounded-md shadow-lg shadow-lexis-gold/20">
                  Dashboard
                </Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button variant="outline" className="text-lexis-gold border-lexis-gold hover:bg-lexis-gold hover:text-lexis-bg-deep transition-all text-xs font-bold uppercase tracking-widest px-6 rounded-md shadow-none bg-transparent">
                  Entrar
                </Button>
              </Link>
            )}
          </div>
          {/* Mobile Menu */}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-lexis-text-light hover:bg-lexis-gold/10">
                  <Menu className="w-6 h-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-lexis-bg-deep border-lexis-gold/20 text-lexis-text-light pt-20">
                <div className="flex flex-col gap-8 text-center">
                  <Link href="#beneficios" className="text-xl font-serif hover:text-lexis-gold">Beneficios</Link>
                  <Link href="#precio" className="text-xl font-serif hover:text-lexis-gold">Precio</Link>
                  {isLoggedIn ? (
                    <Link href="/dashboard">
                      <Button className="w-full bg-lexis-gold text-lexis-bg-deep font-bold py-6 rounded-xl shadow-lg shadow-lexis-gold/20 text-xl">
                        Ir al Dashboard
                      </Button>
                    </Link>
                  ) : (
                    <>
                      <Link href="/login">
                        <Button variant="outline" className="w-full text-lexis-gold border-lexis-gold py-6 rounded-xl">
                          Entrar
                        </Button>
                      </Link>
                      <Link href="/registro">
                        <Button className="w-full bg-lexis-gold text-lexis-bg-deep font-bold py-6 rounded-xl shadow-lg shadow-lexis-gold/20">
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

      {/* Hero Section */}
      <header className="relative pt-40 pb-24 md:pt-56 md:pb-40 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 opacity-20">
          <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-lexis-gold rounded-full blur-[140px]"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600 rounded-full blur-[120px]"></div>
        </div>

        <div className="container mx-auto px-6 text-center">
          <span className="inline-block text-lexis-gold text-xs font-bold tracking-[0.3em] uppercase mb-8 animate-fade-in bg-lexis-gold/10 px-4 py-2 rounded-full border border-lexis-gold/20">
            EL ÚNICO SISTEMA QUE HABLA DOMINICANO 🇩🇴
          </span>
          <h1 className="font-serif text-5xl md:text-8xl font-bold leading-tight mb-8 max-w-5xl mx-auto tracking-tight">
            Tu talento merece orden, <br />
            <span className="text-lexis-gold">tu tiempo merece paz.</span>
          </h1>
          <p className="text-xl md:text-2xl text-lexis-text-light max-w-3xl mx-auto mb-14 leading-relaxed font-light italic">
            La asistencia de lujo para el profesional que factura con su RNC y desea delegar el caos. Lexis Bill organiza tus comprobantes autorizados y prepara tus reportes, hablando el único idioma que importa: el dominicano.
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
      <section className="py-32 bg-[#081221] border-y border-lexis-gold/5">
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
                  <h4 className="font-serif text-xl font-bold mb-3">Tú mantienes el control</h4>
                  <p className="text-slate-400">Tus comprobantes siguen siendo tuyos; nosotros te ayudamos a usarlos sin errores ni olvidos.</p>
                </div>
              </div>
              <div className="flex items-start gap-6 p-8 rounded-2xl bg-white/[0.02] border border-white/5">
                <ShieldCheck className="w-7 h-7 text-lexis-gold stroke-[1px]" />
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
      <section className="py-24 bg-lexis-bg-deep">
        <div className="container mx-auto px-6">
          <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="font-serif text-4xl font-bold mb-8">¿Es Lexis Bill <br /><span className="text-lexis-gold">para mí?</span></h2>
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
              <h4 className="font-serif text-xl font-bold mb-4 text-lexis-gold">La realidad local</h4>
              <p className="text-slate-400 leading-relaxed font-light">
                Mientras otros sistemas usan lenguaje extraño, Lexis Bill entiende que tu prioridad es servir a tu cliente, no pelear con formularios electrónicos. Nosotros preparamos el camino para que la Facturación Electrónica sea un paso natural, no un trauma.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* New Section: Cómo Funciona */}
      <section className="py-32 bg-[#081221] border-y border-lexis-gold/5">
        <div className="container mx-auto px-6 text-center">
          <h2 className="font-serif text-4xl md:text-5xl font-bold mb-20 text-lexis-text-light">Tranquilidad en <span className="text-lexis-gold">3 pasos.</span></h2>
          <div className="grid md:grid-cols-3 gap-12">
            <div className="space-y-6">
              <div className="text-5xl font-serif text-lexis-gold/20 font-bold italic">01</div>
              <h3 className="text-xl font-bold">Carga tus rangos</h3>
              <p className="text-slate-400 font-light px-4">Sube los NCF que la DGII te aprobó una sola vez. Lexis Bill los organiza y te avisa antes de que se gasten.</p>
            </div>
            <div className="space-y-6">
              <div className="text-5xl font-serif text-lexis-gold/20 font-bold italic">02</div>
              <h3 className="text-xl font-bold">Prepara tu envío</h3>
              <p className="text-slate-400 font-light px-4">Entra los datos de tu cliente. Validamos su RNC al instante para que no cometas errores de digitación.</p>
            </div>
            <div className="space-y-6">
              <div className="text-5xl font-serif text-lexis-gold/20 font-bold italic">03</div>
              <h3 className="text-xl font-bold">Delegar y Respirar</h3>
              <p className="text-slate-400 font-light px-4">Envía por WhatsApp o email. Al final del mes, tus reportes 606 y 607 están listos para tu contador.</p>
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
                Validación instantánea con la DGII. Nunca vuelvas a emitir un documento con datos erróneos de tus clientes.
              </p>
            </div>
            <div className="text-center space-y-6 group cursor-default">
              <div className="w-20 h-20 bg-lexis-gold/5 rounded-full flex items-center justify-center mx-auto mb-8 border border-lexis-gold/10 group-hover:bg-lexis-gold/20 group-hover:-translate-y-2 transition-all duration-500">
                <Zap className="w-10 h-10 text-lexis-gold stroke-[1px] group-hover:opacity-80" />
              </div>
              <h3 className="font-serif text-2xl font-bold">Reportes en un Clic</h3>
              <p className="text-slate-400 leading-relaxed text-lg">
                Le hacemos el trabajo fácil a tu contador. Tus TXT se construyen solos mientras tú trabajas.
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
      <section className="py-24 bg-[#081221]">
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

      {/* FAQ Section */}
      <section className="py-32 bg-lexis-bg-deep">
        <div className="container mx-auto px-6 max-w-4xl">
          <h2 className="font-serif text-3xl md:text-5xl font-bold mb-16 text-center text-lexis-gold">Preguntas Frecuentes</h2>
          <div className="space-y-8">
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
              <h4 className="font-bold text-lg mb-2">¿Lexis Bill emite mis comprobantes?</h4>
              <p className="text-slate-400 text-sm">No. Tú mantienes el control total de tus rangos autorizados por la DGII. Nosotros somos el puente que los organiza para que los uses sin errores.</p>
            </div>
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
              <h4 className="font-bold text-lg mb-2">¿Sustituye a mi contador?</h4>
              <p className="text-slate-400 text-sm">Al contrario, lo harás muy feliz. Le entregas todo organizado en TXT listo para subir a la oficina virtual.</p>
            </div>
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
              <h4 className="font-bold text-lg mb-2">¿Puedo usar mi rango de NCF actual?</h4>
              <p className="text-slate-400 text-sm">Sí, el sistema está diseñado para que cargues tus comprobantes vigentes y continúes tu secuencia sin fricción.</p>
            </div>
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
              <h4 className="font-bold text-lg mb-2">¿Es difícil de usar?</h4>
              <p className="text-slate-400 text-sm">Está hecho para que lo uses desde el celular mientras te mueves. Si sabes enviar un WhatsApp, sabes usar Lexis Bill.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section (La Invitación) */}
      <section id="precio" className="py-24 sm:py-40 bg-gradient-to-b from-transparent to-[#081221] overflow-x-hidden">
        <div className="container mx-auto px-4 sm:px-6 text-center">
          <h2 className="font-serif text-4xl md:text-5xl font-bold mb-16 sm:mb-24 underline decoration-lexis-gold/30 underline-offset-8 italic">
            15 días para recuperar tu <br className="hidden md:block" />
            <span className="text-lexis-gold">tranquilidad fiscal.</span>
          </h2>
          <div className="max-w-lg sm:max-w-xl mx-auto relative group w-full min-w-0 px-1">
            <div className="absolute -inset-1 bg-gradient-to-r from-lexis-gold to-blue-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
            <Card className="relative bg-lexis-bg-deep border-lexis-gold/20 p-6 sm:p-10 pt-14 sm:pt-16 rounded-3xl overflow-hidden">
              <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20">
                <span className="bg-lexis-gold text-white text-[12px] font-bold px-4 py-1.5 rounded-full shadow-lg whitespace-nowrap tracking-wider">
                  MEMBRESÍA PROFESIONAL
                </span>
              </div>
              <CardHeader className="text-center pb-8 sm:pb-10 border-b border-lexis-gold/10 overflow-visible">
                <CardTitle className="font-serif text-lexis-gold text-2xl sm:text-3xl mb-6 break-words">Plan Élite</CardTitle>
                <div className="flex flex-col items-center gap-6 w-full min-w-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 w-full max-w-full">
                    <div className="w-full min-w-0 py-4 px-4 sm:px-5 rounded-xl bg-lexis-bg-deep/80 border border-lexis-gold/10 flex flex-col items-center justify-center">
                      <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Mensual</p>
                      <div className="flex items-baseline justify-center gap-1 flex-wrap text-center">
                        <span className="text-xl sm:text-2xl md:text-3xl font-bold text-lexis-text-light tabular-nums">RD$950</span>
                        <span className="text-lexis-gold text-sm sm:text-base font-semibold">/mes</span>
                      </div>
                    </div>
                    <div className="w-full min-w-0 py-4 px-4 sm:px-5 rounded-xl bg-lexis-gold/10 border-2 border-lexis-gold/30 relative flex flex-col items-center justify-center">
                      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-xs font-bold text-lexis-gold bg-lexis-bg-deep px-3 py-1 rounded-full whitespace-nowrap">⭐ Más popular</span>
                      <p className="text-xs text-slate-400 uppercase tracking-wider mb-2 mt-2">Anual</p>
                      <div className="flex items-baseline justify-center gap-1 flex-wrap text-center">
                        <span className="text-xl sm:text-2xl md:text-3xl font-bold text-lexis-text-light tabular-nums">RD$9,500</span>
                      </div>
                      <p className="text-lexis-gold text-xs sm:text-sm font-semibold mt-2 text-center">🎁 Paga 10 meses y usa 12</p>
                    </div>
                  </div>
                  <p className="text-sm md:text-base text-lexis-text-light italic break-words w-full">Si no simplifica tu vida, no pagas nada.</p>
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
                  <Button className="w-full min-h-[4rem] px-4 sm:px-6 md:px-8 py-4 text-sm sm:text-base md:text-lg bg-lexis-gold hover:bg-lexis-gold-hover text-lexis-bg-deep font-bold rounded-xl transition-all shadow-xl shadow-lexis-gold/10 flex items-center justify-center text-center whitespace-normal leading-tight">
                    Comenzar mi Prueba sin Tarjetas
                  </Button>
                </Link>
                <p className="text-xs text-slate-400 mt-8 uppercase tracking-[0.15em] font-medium text-center leading-relaxed break-words">Sin contratos. Sin tarjetas iniciales. Sin fricción.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-lexis-gold/10 bg-[#081221]">
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
