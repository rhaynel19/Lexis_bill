import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/ThemeProvider";
import { PreferencesProvider } from "@/components/providers/PreferencesContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Lexis Bill | El orden que te deja tranquilo",
  description: "El único sistema que habla dominicano 🇩🇴. La plataforma de facturación premium para el profesional independiente en República Dominicana.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.className} bg-slate-50 antialiased`}>
        <ThemeProvider defaultTheme="system" storageKey="lexis-theme">
          <PreferencesProvider>
            {children}
            <Toaster />
          </PreferencesProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
