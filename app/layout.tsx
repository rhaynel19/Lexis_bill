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
  title: "Factura Directa | Facturación Profesional Dominicana",
  description: "Plataforma moderna de facturación y cumplimiento fiscal en República Dominicana.",
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
