"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
    label: string;
    href?: string;
}

interface BreadcrumbsProps {
    items: BreadcrumbItem[];
    className?: string;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
    if (items.length === 0) return null;
    return (
        <nav aria-label="Breadcrumb" className={cn("flex items-center gap-1.5 text-sm", className)}>
            {items.map((item, i) => (
                <span key={i} className="flex items-center gap-1.5">
                    {i > 0 && <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground/70" aria-hidden />}
                    {item.href ? (
                        <Link href={item.href} className="text-muted-foreground hover:text-foreground transition-colors">
                            {item.label}
                        </Link>
                    ) : (
                        <span className="font-medium text-foreground bg-muted/80 dark:bg-muted px-2 py-0.5 rounded-md">
                            {item.label}
                        </span>
                    )}
                </span>
            ))}
        </nav>
    );
}
