"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { ChevronRight, Check, Circle } from "lucide-react"
import { Slot } from "@radix-ui/react-slot"

// Simple Context for Dropdown State
interface DropdownContextType {
    open: boolean;
    setOpen: (open: boolean) => void;
}
const DropdownContext = React.createContext<DropdownContextType>({ open: false, setOpen: () => { } });

const DropdownMenu = ({ children }: { children: React.ReactNode }) => {
    const [open, setOpen] = React.useState(false);
    return (
        <DropdownContext.Provider value={{ open, setOpen }}>
            <div className="relative inline-block text-left">{children}</div>
        </DropdownContext.Provider>
    );
}

const DropdownMenuTrigger = React.forwardRef<
    HTMLButtonElement,
    React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }
>(({ className, children, asChild, ...props }, ref) => {
    const { open, setOpen } = React.useContext(DropdownContext);
    const Comp = asChild ? Slot : "button";

    // Simple handler
    const handleClick = (e: React.MouseEvent) => {
        setOpen(!open);
        props.onClick?.(e as any);
    };

    if (asChild) {
        return (
            <Slot
                ref={ref}
                onClick={handleClick}
                className={cn(className)}
                data-state={open ? "open" : "closed"}
                {...props}
            >
                {children}
            </Slot>
        )
    }

    return (
        <button
            ref={ref}
            onClick={handleClick}
            className={cn(className)}
            data-state={open ? "open" : "closed"}
            {...props}
        >
            {children}
        </button>
    );
})
DropdownMenuTrigger.displayName = "DropdownMenuTrigger"

const DropdownMenuContent = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & { align?: "start" | "end" | "center" }
>(({ className, align = "end", ...props }, ref) => {
    const { open, setOpen } = React.useContext(DropdownContext);

    // Close on outside click (simplified)
    React.useEffect(() => {
        const handleOutsideClick = (event: MouseEvent) => {
            if (open) {
                setOpen(false);
            }
        };
        if (open) document.addEventListener("click", handleOutsideClick);
        return () => document.removeEventListener("click", handleOutsideClick);
    }, [open, setOpen]);

    if (!open) return null;

    return (
        <div
            ref={ref}
            className={cn(
                "absolute z-50 mt-2 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95",
                align === "end" ? "right-0" : "left-0",
                className
            )}
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
            {...props}
        />
    );
})
DropdownMenuContent.displayName = "DropdownMenuContent"

const DropdownMenuItem = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & { inset?: boolean }
>(({ className, inset, ...props }, ref) => {
    const { setOpen } = React.useContext(DropdownContext);
    return (
        <div
            ref={ref}
            className={cn(
                "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-slate-100 focus:bg-slate-100 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 cursor-pointer",
                inset && "pl-8",
                className
            )}
            onClick={(e) => {
                setOpen(false);
                props.onClick?.(e);
            }}
            {...props}
        />
    )
})
DropdownMenuItem.displayName = "DropdownMenuItem"

const DropdownMenuLabel = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & { inset?: boolean }
>(({ className, inset, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            "px-2 py-1.5 text-sm font-semibold",
            inset && "pl-8",
            className
        )}
        {...props}
    />
))
DropdownMenuLabel.displayName = "DropdownMenuLabel"

const DropdownMenuSeparator = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("-mx-1 my-1 h-px bg-muted", className)}
        {...props}
    />
))
DropdownMenuSeparator.displayName = "DropdownMenuSeparator"

export {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
}
