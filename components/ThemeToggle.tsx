"use client";

import * as React from "react";
import { Check, Crown, Moon, Monitor, Sun } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

const THEME_LABELS: Record<string, string> = {
    light: "Luz",
    dark: "Oscuro",
    system: "Según dispositivo",
};

export function ThemeToggle() {
    const { setTheme, theme } = useTheme();

    const handleThemeChange = (newTheme: "light" | "dark") => {
        setTheme(newTheme);
        const label = THEME_LABELS[newTheme] ?? newTheme;
        toast.success(`Tema cambiado a ${label}`, {
            duration: 2500,
        });
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-100 hover:bg-white/10 focus-visible:ring-0 focus-visible:ring-offset-0" aria-label="Cambiar tema de visualización">
                    <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    <span className="sr-only">Cambiar tema</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card border-border min-w-[180px] shadow-xl">
                <DropdownMenuItem onClick={() => handleThemeChange("light")} className="hover:bg-accent/50 cursor-pointer flex items-center gap-3 p-3 text-foreground focus:bg-accent/50 focus:text-foreground focus:outline-none">
                    <Sun className="h-4 w-4 text-amber-500 shrink-0" aria-hidden />
                    <span className="font-medium flex-1">Claro</span>
                    {theme === "light" && <Check className="h-4 w-4 text-foreground shrink-0" aria-hidden />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleThemeChange("dark")} className="hover:bg-accent/50 cursor-pointer flex items-center gap-3 p-3 text-foreground focus:bg-accent/50 focus:text-foreground focus:outline-none">
                    <Moon className="h-4 w-4 text-blue-400 shrink-0" aria-hidden />
                    <span className="font-medium flex-1">Oscuro</span>
                    {theme === "dark" && <Check className="h-4 w-4 text-foreground shrink-0" aria-hidden />}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );

}
