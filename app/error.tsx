"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
        if (typeof Sentry?.captureException === "function") {
            Sentry.captureException(error);
        }
    }, [error]);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="text-center space-y-6 max-w-md">
                <div className="flex justify-center">
                    <div className="bg-red-50 p-6 rounded-full border border-red-100">
                        <AlertTriangle className="h-16 w-16 text-red-500" />
                    </div>
                </div>

                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
                    ¡Ups! Algo salió mal
                </h2>

                <p className="text-slate-600">
                    Lo sentimos, estamos experimentando un inconveniente técnico.
                    <br />
                    <span className="font-medium text-slate-800">Tu información está a salvo.</span>
                </p>

                <div className="pt-4 space-y-2">
                    <Button
                        onClick={() => reset()}
                        size="lg"
                        className="bg-blue-600 hover:bg-blue-700 text-white gap-2 w-full"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Intentar de nuevo
                    </Button>

                    <Button
                        variant="ghost"
                        onClick={() => window.location.href = "/dashboard"}
                        className="text-slate-500 hover:text-slate-700 w-full"
                    >
                        Ir al Dashboard
                    </Button>
                </div>
            </div>
        </div>
    );
}
