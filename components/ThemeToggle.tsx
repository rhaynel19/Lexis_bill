"use client";

import * as React from "react";
import { Check, Crown, Moon, Monitor, Sun } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

const THEME_LABELS: Record<string, string> = {
    light: "Luz",
    midnight: "Midnight",
    luxury: "Luxury",
    system: "Según dispositivo",
};

export function ThemeToggle() {
    const { setTheme, theme } = useTheme();

    const handleThemeChange = (newTheme: "light" | "midnight" | "luxury" | "system") => {
        setTheme(newTheme);
        const label = THEME_LABELS[newTheme] ?? newTheme;
        toast.success(`Tema cambiado a ${label}`, {
            duration: 2500,
            description: newTheme === "system" ? "Se usará luz u oscuro según tu dispositivo." : undefined,
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
                    <span className="font-medium flex-1">Light</span>
                    {theme === "light" && <Check className="h-4 w-4 text-foreground shrink-0" aria-hidden />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleThemeChange("midnight")} className="hover:bg-accent/50 cursor-pointer flex items-center gap-3 p-3 text-foreground focus:bg-accent/50 focus:text-foreground focus:outline-none">
                    <Moon className="h-4 w-4 text-blue-400 shrink-0" aria-hidden />
                    <span className="font-medium flex-1">Midnight</span>
                    {theme === "midnight" && <Check className="h-4 w-4 text-foreground shrink-0" aria-hidden />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleThemeChange("luxury")} className="hover:bg-amber-500/20 cursor-pointer flex items-center gap-3 p-3 text-foreground focus:bg-amber-500/20 focus:text-foreground border-t border-border/50 focus:outline-none">
                    <Crown className="h-4 w-4 text-amber-500 shrink-0" aria-hidden />
                    <span className="font-semibold text-amber-600 dark:text-amber-400 flex-1">Luxury</span>
                    {theme === "luxury" && <Check className="h-4 w-4 text-amber-500 shrink-0" aria-hidden />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleThemeChange("system")} className="hover:bg-accent/50 cursor-pointer flex items-center gap-3 p-3 text-foreground focus:bg-accent/50 focus:text-foreground focus:outline-none">
                    <Monitor className="h-4 w-4 text-foreground/80 shrink-0" aria-hidden />
                    <span className="font-medium flex-1">System</span>
                    {theme === "system" && <Check className="h-4 w-4 text-foreground shrink-0" aria-hidden />}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
