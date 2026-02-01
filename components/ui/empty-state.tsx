"use client";

import { LucideIcon } from "lucide-react";
import { Button } from "./button";
import Link from "next/link";

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: string;
    actionLabel?: string;
    actionHref?: string;
    onAction?: () => void;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, actionHref, onAction }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center mb-6">
                <Icon className="w-10 h-10 text-muted-foreground" strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-6">{description}</p>
            {(actionLabel && (actionHref || onAction)) && (
                actionHref ? (
                    <Link href={actionHref}>
                        <Button>{actionLabel}</Button>
                    </Link>
                ) : (
                    <Button onClick={onAction}>{actionLabel}</Button>
                )
            )}
        </div>
    );
}
