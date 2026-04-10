import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/react";
import { ThemeProvider } from "@/components/ThemeProvider";
import { PreferencesProvider } from "@/components/providers/PreferencesContext";
import { AuthProvider } from "@/components/providers/AuthContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Trinalyze | Facturación Profesional Dominicana",
  description: "Plataforma moderna de facturación y cumplimiento fiscal en República Dominicana (Trinalyze).",
  openGraph: {
    title: "Trinalyze | El único sistema que habla dominicano",
    description: "Factura, lleva tus NCFs y genera reportes para la DGII desde tu celular. 15 días gratis sin tarjeta.",
    siteName: "Trinalyze Billing",
    locale: "es_DO",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Trinalyze | Facturación Profesional",
    description: "El único sistema de facturación hecho para independientes en RD.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0B0F1A",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.className} bg-slate-50 antialiased`}>
        <ThemeProvider defaultTheme="light" storageKey="trinalyze-theme">
          <PreferencesProvider>
            <AuthProvider>
              {children}
              <Toaster />
              <Analytics />
            </AuthProvider>
          </PreferencesProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
