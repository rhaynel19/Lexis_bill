"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function ThemeToggle() {
    const { setTheme } = useTheme();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-100 hover:bg-slate-800 focus-visible:ring-0 focus-visible:ring-offset-0">
                    <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    <span className="sr-only">Toggle theme</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[#0A192F] border-slate-700 text-slate-200">
                <DropdownMenuItem onClick={() => setTheme("light")} className="hover:bg-slate-800 focus:bg-slate-800 cursor-pointer">
                    Light
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")} className="hover:bg-slate-800 focus:bg-slate-800 cursor-pointer text-amber-500 font-semibold">
                    Midnight Luxury
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")} className="hover:bg-slate-800 focus:bg-slate-800 cursor-pointer">
                    System
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
