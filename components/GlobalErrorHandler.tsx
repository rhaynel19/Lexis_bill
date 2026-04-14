"use client";

import { useEffect } from "react";
import { toast } from "sonner";

/**
 * Componente que registra manejadores globales de errores para capturar 
 * promesas no manejadas, especialmente las de secureFetch (APIError).
 */
export function GlobalErrorHandler() {
    useEffect(() => {
        const handleRejection = (event: PromiseRejectionEvent) => {
            const reason = event.reason;
            
            // Si el error tiene la estructura de nuestra API (status, message, data)
            if (reason && typeof reason === 'object' && 'status' in reason && 'message' in reason) {
                console.error("[Global Promise Rejection]", reason);
                
                // Evitar que el error se propague al log de la consola como "Unhandled"
                event.preventDefault();
                
                // Si es un error crítico (500), podemos mostrar un aviso
                if (reason.status >= 500) {
                    toast.error("Error del sistema. Reintentando automáticamente...");
                }
            }
        };

        window.addEventListener("unhandledrejection", handleRejection);
        return () => window.removeEventListener("unhandledrejection", handleRejection);
    }, []);

    return null;
}
