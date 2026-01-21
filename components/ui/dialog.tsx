"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

const Dialog = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & { open?: boolean; onOpenChange?: (open: boolean) => void }
>(({ className, open, onOpenChange, children, ...props }, ref) => {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in-0">
            <div
                ref={ref}
                className={cn("bg-white rounded-lg shadow-lg w-full max-w-lg mx-4 p-6 relative animate-in zoom-in-95 slide-in-from-bottom-5", className)}
                {...props}
            >
                {/* Close Button Mock (optional) */}
                {/* <button onClick={() => onOpenChange?.(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
             <X className="w-4 h-4" />
         </button> */}
                {children}
            </div>
        </div>
    )
})
Dialog.displayName = "Dialog"

const DialogContent = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={cn("", className)} {...props}>{children}</div>
)

const DialogHeader = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={cn("mb-4 text-center sm:text-left", className)} {...props}>{children}</div>
)

const DialogTitle = ({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...props}>{children}</h3>
)

const DialogDescription = ({ className, children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className={cn("text-sm text-slate-500 mt-1.5", className)} {...props}>{children}</p>
)

const DialogFooter = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-6", className)} {...props}>{children}</div>
)

export { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter }
