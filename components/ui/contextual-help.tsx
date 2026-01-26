"use client";

import { Info } from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface ContextualHelpProps {
    text: string;
    className?: string;
    mode?: "tooltip" | "popover";
}

export function ContextualHelp({ text, className, mode = "tooltip" }: ContextualHelpProps) {
    // For mobile (touch), popover is often better than tooltip.
    // We can default to tooltip but allow override.

    if (mode === "popover") {
        return (
            <Popover>
                <PopoverTrigger asChild>
                    <button className={cn("inline-flex items-center justify-center text-slate-400 hover:text-amber-500 transition-colors", className)}>
                        <Info className="w-4 h-4" />
                        <span className="sr-only">Info</span>
                    </button>
                </PopoverTrigger>
                <PopoverContent className="w-64 text-sm bg-slate-900 text-slate-100 border-amber-500/20 shadow-xl">
                    <p>{text}</p>
                </PopoverContent>
            </Popover>
        );
    }

    return (
        <TooltipProvider delayDuration={300}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button className={cn("inline-flex items-center justify-center text-slate-400 hover:text-amber-500 transition-colors cursor-help", className)}>
                        <Info className="w-4 h-4" />
                        <span className="sr-only">Info</span>
                    </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs bg-slate-900 text-slate-100 border-amber-500/20 shadow-xl p-3">
                    <p className="text-sm font-light leading-snug">{text}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
