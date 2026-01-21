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
import { Plus } from "lucide-react";
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

            {/* Contenido principal */}
            <main className="flex-grow">
              {children}
            </main>

            <SupportChat />

            {/* Mobile FAB (Floating Action Button) */}
            <div className="fixed bottom-6 right-6 md:hidden z-50">
              <Link href="/nueva-factura">
                <button className="h-14 w-14 bg-[#D4AF37] text-white rounded-full shadow-xl shadow-amber-500/30 flex items-center justify-center hover:scale-110 active:scale-95 transition-all">
                  <Plus className="h-8 w-8" />
                </button>
              </Link>
            </div>

            {/* Footer */}
            <footer className="border-t bg-white py-8 text-center text-sm text-gray-500">
              <p>© 2026 LEXIS BILL. Todos los derechos reservados.</p>
            </footer>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
