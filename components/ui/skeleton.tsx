"use client";

import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn("animate-shimmer rounded-md bg-muted/60 relative overflow-hidden", className)}
            {...props}
        />
    );
}

export { Skeleton };
