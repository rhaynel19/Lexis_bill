"use client";

import * as React from "react";
import { Crown, Moon, Monitor, Sun } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function ThemeToggle() {
    const { setTheme, theme } = useTheme();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-100 hover:bg-white/10 focus-visible:ring-0 focus-visible:ring-offset-0">
                    <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    <span className="sr-only">Toggle theme</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card border-border text-foreground min-w-[160px] shadow-xl">
                <DropdownMenuItem onClick={() => setTheme("light")} className="hover:bg-accent/50 cursor-pointer flex items-center gap-3 p-3 text-foreground focus:bg-accent/50">
                    <Sun className="h-4 w-4 text-amber-500" />
                    <span className="font-medium">Light</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("midnight")} className="hover:bg-accent/50 cursor-pointer flex items-center gap-3 p-3 text-foreground focus:bg-accent/50">
                    <Moon className="h-4 w-4 text-blue-400" />
                    <span className="font-medium">Midnight</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("luxury")} className="hover:bg-amber-500/20 cursor-pointer flex items-center gap-3 p-3 text-foreground focus:bg-amber-500/20 border-t border-border/50">
                    <Crown className="h-4 w-4 text-amber-500" />
                    <span className="font-semibold text-amber-500">Luxury</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")} className="hover:bg-accent/50 cursor-pointer flex items-center gap-3 p-3 text-foreground focus:bg-accent/50">
                    <Monitor className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">System</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
