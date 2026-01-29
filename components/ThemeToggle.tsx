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
            <DropdownMenuContent align="end" className="bg-popover border-border text-popover-foreground min-w-[150px]">
                <DropdownMenuItem onClick={() => setTheme("light")} className="hover:bg-accent hover:text-accent-foreground cursor-pointer flex items-center gap-2 p-3">
                    <Sun className="h-4 w-4" />
                    <span>Light</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("midnight")} className="hover:bg-accent hover:text-accent-foreground cursor-pointer flex items-center gap-2 p-3">
                    <Moon className="h-4 w-4" />
                    <span>Midnight</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("luxury")} className="hover:bg-accent hover:text-accent-foreground cursor-pointer flex items-center gap-2 p-3 text-amber-500 font-semibold">
                    <Crown className="h-4 w-4" />
                    <span>Luxury</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")} className="hover:bg-accent hover:text-accent-foreground cursor-pointer flex items-center gap-2 p-3 border-t border-border/50">
                    <Monitor className="h-4 w-4" />
                    <span>System</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
