import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Importar la fuente Inter de Google Fonts para una tipografía moderna
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Lexis Bill | El orden que te deja tranquilo",
  description: "El único sistema que habla dominicano 🇩🇴. La plataforma de facturación premium para el profesional independiente en República Dominicana.",
};

import { CommandMenu } from "@/components/command-menu";
import { Plus, FileText, Settings, LayoutDashboard } from "lucide-react";
import Link from "next/link";

import { TrialHeaderBadge } from "@/components/TrialHeaderBadge";
import { SupportChat } from "@/components/support-chat";

import { Toaster } from "sonner";

import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.className} bg-slate-50 antialiased`}>
        <CommandMenu />
        <ThemeProvider defaultTheme="system" storageKey="lexis-theme">
          <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-300">
            <header className="border-b border-[#D4AF37]/20 bg-[#0A192F] shadow-lg sticky top-0 z-50 transition-colors duration-300">
              <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                <Link href="/">
                  <div className="group">
                    <h1 className="text-2xl font-extrabold tracking-tight cursor-pointer transition-transform group-hover:scale-105">
                      <span className="text-[#D4AF37]">LEXIS</span> <span className="text-[#F9F6EE] font-light">BILL</span>
                    </h1>
                    <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-medium group-hover:text-[#D4AF37] transition-colors">
                      El orden que te deja tranquilo
                    </p>
                  </div>
                </Link>

                <div className="flex items-center gap-4">
                  <TrialHeaderBadge />
                  <ThemeToggle />
                  {/* Mobile Search Trigger Hint */}
                  <div className="text-xs text-slate-400 border border-slate-600 rounded px-2 py-1 sm:hidden">
                    Ctrl+K
                  </div>
                </div>
              </div>
            </header>

            {/* Global Toaster */}
            <Toaster />

            {/* Main Content Area with Sidebar for Desktop */}
            <div className="flex flex-1 overflow-hidden h-full">
              {/* Desktop Sidebar */}
              <aside className="hidden md:flex w-64 flex-col bg-[#0A192F] text-[#F9F6EE] border-r border-[#D4AF37]/10 sticky top-[73px] h-[calc(100vh-73px)]">
                <nav className="flex-1 px-4 py-8 space-y-2">
                  <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[#D4AF37]/10 transition-colors group">
                    <Plus className="w-5 h-5 text-[#D4AF37]" />
                    <span className="font-medium">Dashboard</span>
                  </Link>
                  <Link href="/nueva-factura" className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[#D4AF37] text-[#0A192F] font-bold shadow-lg shadow-amber-500/20 hover:scale-[1.02] transition-all">
                    <Plus className="w-5 h-5" />
                    <span>Nueva Factura</span>
                  </Link>
                  <div className="pt-4 pb-2 px-4 text-[10px] text-slate-500 uppercase tracking-widest font-bold">Documentos</div>
                  <Link href="/nueva-cotizacion" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[#D4AF37]/10 transition-colors">
                    <FileText className="w-5 h-5 text-slate-400" />
                    <span className="text-sm">Nueva Cotización</span>
                  </Link>
                  <Link href="/cotizaciones" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[#D4AF37]/10 transition-colors">
                    <LayoutDashboard className="w-5 h-5 text-slate-400" />
                    <span className="text-sm">Ver Cotizaciones</span>
                  </Link>
                  <div className="pt-4 pb-2 px-4 text-[10px] text-slate-500 uppercase tracking-widest font-bold">Gestión</div>
                  <Link href="/reportes" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[#D4AF37]/10 transition-colors">
                    <FileText className="w-5 h-5 text-slate-400" />
                    <span className="text-sm">Reportes 606/607</span>
                  </Link>
                  <Link href="/configuracion" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[#D4AF37]/10 transition-colors">
                    <Settings className="w-5 h-5 text-slate-400" />
                    <span className="text-sm">Configuración</span>
                  </Link>
                </nav>
                <div className="p-6 border-t border-[#D4AF37]/5 text-center">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest">Lexis Bill Pro</p>
                </div>
              </aside>

              {/* Contenido principal */}
              <main className="flex-grow overflow-y-auto">
                {children}
              </main>
            </div>

            <SupportChat />

            {/* Mobile FAB (Floating Action Button) */}
            <div className="fixed bottom-6 right-6 md:hidden z-50">
              <Link href="/nueva-factura">
                <button className="h-14 w-14 bg-[#D4AF37] text-white rounded-full shadow-xl shadow-amber-500/30 flex items-center justify-center hover:scale-110 active:scale-95 transition-all">
                  <Plus className="h-8 w-8" />
                </button>
              </Link>
            </div>

            {/* Mobile Bottom Navigation Bar */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0A192F] border-t border-[#D4AF37]/20 px-4 py-2 flex justify-around items-center z-40 shadow-[0_-2px_15px_rgba(0,0,0,0.3)]">
              <Link href="/dashboard" className="flex flex-col items-center gap-1 text-slate-400 hover:text-[#D4AF37]">
                <LayoutDashboard className="w-6 h-6" />
                <span className="text-[10px] font-medium uppercase">Inicio</span>
              </Link>
              <Link href="/cotizaciones" className="flex flex-col items-center gap-1 text-slate-400 hover:text-[#D4AF37]">
                <FileText className="w-6 h-6" />
                <span className="text-[10px] font-medium uppercase">Cotiza</span>
              </Link>
              <div className="w-12"></div> {/* Space for FAB */}
              <Link href="/reportes" className="flex flex-col items-center gap-1 text-slate-400 hover:text-[#D4AF37]">
                <Plus className="w-6 h-6 rotate-45" />
                <span className="text-[10px] font-medium uppercase">Fiscal</span>
              </Link>
              <Link href="/configuracion" className="flex flex-col items-center gap-1 text-slate-400 hover:text-[#D4AF37]">
                <Settings className="w-6 h-6" />
                <span className="text-[10px] font-medium uppercase">Perfil</span>
              </Link>
            </nav>

            {/* Footer */}
            <footer className="border-t bg-white py-8 pb-24 text-center text-sm text-gray-500 md:pb-8">
              <p>© 2026 LEXIS BILL. Todos los derechos reservados.</p>
            </footer>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
